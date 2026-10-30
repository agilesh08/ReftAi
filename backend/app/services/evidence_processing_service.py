"""Evidence analysis service for AI visual consistency analysis.

Handles Gemini Vision multimodal analysis comparing customer evidence images
against merchant trusted product reference angles (FRONT, BACK, LEFT, RIGHT).
"""
import logging
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.evidence import Evidence, EvidenceStatus, EvidenceType
from app.models.evidence_event import EvidenceEvent
from app.models.verification import VerificationSession
from app.models.product_reference import ProductReference, ReferenceAngle
from app.models.visual_analysis import VisualAnalysis, VisualAnalysisStatus, utc_now
from app.schemas.evidence import EvidenceProcessPlaceholderResponse
from app.schemas.visual_analysis import VisualAnalysisResult
from app.ai.qwen_vision import qwen_vision_service
from app.utils.file_storage import get_evidence_file_path, get_reference_file_path

logger = logging.getLogger(__name__)

REQUIRED_REFERENCE_ANGLES = {
    ReferenceAngle.FRONT.value,
    ReferenceAngle.BACK.value,
    ReferenceAngle.LEFT.value,
    ReferenceAngle.RIGHT.value,
}


def guess_image_mime(path: str) -> str:
    """Guess MIME type from file extension."""
    ext = path.lower().rsplit(".", 1)[-1] if "." in path else ""
    if ext in ("jpg", "jpeg"):
        return "image/jpeg"
    elif ext == "png":
        return "image/png"
    elif ext == "webp":
        return "image/webp"
    return "image/jpeg"


def process_evidence(db: Session, evidence_identifier: str) -> EvidenceProcessPlaceholderResponse:
    """Pre-analysis queue boundary function preserved from Milestone 6."""
    evidence = db.execute(
        select(Evidence).where(
            or_(
                Evidence.evidence_id == evidence_identifier,
                Evidence.id == evidence_identifier,
            )
        )
    ).scalar_one_or_none()

    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found",
        )

    if evidence.status != EvidenceStatus.READY_FOR_ANALYSIS.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Evidence is in '{evidence.status}' state, expected READY_FOR_ANALYSIS",
        )

    logger.info("Evidence %s verified and ready for downstream analysis queue", evidence.evidence_id)

    return EvidenceProcessPlaceholderResponse(
        evidence_id=evidence.evidence_id,
        status=evidence.status,
        message="Evidence verified and queued for future AI analysis pipeline",
        placeholder=True,
    )


def process_evidence_visual_analysis(db: Session, evidence_id: str) -> Optional[VisualAnalysis]:
    """Background worker function for asynchronous customer visual evidence analysis."""
    ev = db.execute(
        select(Evidence).where(
            or_(Evidence.id == evidence_id, Evidence.evidence_id == evidence_id)
        )
    ).scalar_one_or_none()
    if not ev or ev.evidence_type != EvidenceType.CUSTOMER_IMAGE.value:
        return None
    session = db.get(VerificationSession, ev.verification_session_id)
    if not session:
        return None
    return analyze_evidence_image(
        db=db,
        merchant_id=session.merchant_id,
        verification_identifier=session.id,
        evidence_identifier=ev.id,
        force_reanalyze=True,
    )


def analyze_evidence_image(
    db: Session,
    merchant_id: str,
    verification_identifier: str,
    evidence_identifier: str,
    force_reanalyze: bool = False,
) -> VisualAnalysis:
    """Run Gemini Vision visual consistency analysis on customer image evidence.

    Args:
        db: Active database session.
        merchant_id: ID of the authenticated merchant.
        verification_identifier: VerificationSession id or human verification_id.
        evidence_identifier: Evidence id or evidence_id.
        force_reanalyze: If True, bypass cached COMPLETED results and re-run analysis.

    Returns:
        VisualAnalysis record (COMPLETED or FAILED).
    """
    # 1. Fetch verification session enforcing merchant isolation
    session = db.execute(
        select(VerificationSession).where(
            or_(
                VerificationSession.id == verification_identifier,
                VerificationSession.verification_id == verification_identifier,
            ),
            VerificationSession.merchant_id == merchant_id,
        )
    ).scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification session not found",
        )

    # 2. Fetch evidence item belonging to this session
    evidence = db.execute(
        select(Evidence).where(
            or_(
                Evidence.id == evidence_identifier,
                Evidence.evidence_id == evidence_identifier,
            ),
            Evidence.verification_session_id == session.id,
        )
    ).scalar_one_or_none()

    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence item not found for this verification session",
        )

    # 3. Validate evidence type (only CUSTOMER_IMAGE is eligible for visual analysis)
    if evidence.evidence_type != EvidenceType.CUSTOMER_IMAGE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Visual analysis is only applicable to image evidence (CUSTOMER_IMAGE), got {evidence.evidence_type}",
        )

    if not evidence.storage_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Evidence does not have an associated file path on disk",
        )

    # 4. Check retry safety / caching
    if not force_reanalyze:
        existing_completed = db.execute(
            select(VisualAnalysis)
            .where(
                VisualAnalysis.evidence_id == evidence.id,
                VisualAnalysis.status == VisualAnalysisStatus.COMPLETED.value,
            )
            .order_by(VisualAnalysis.created_at.desc())
        ).scalars().first()

        if existing_completed:
            logger.info(
                "Returning cached visual analysis %s for evidence %s",
                existing_completed.id,
                evidence.evidence_id,
            )
            return existing_completed

    # 5. Read customer evidence file from storage
    evidence_path = get_evidence_file_path(evidence.storage_path)
    evidence_bytes = evidence_path.read_bytes()
    evidence_mime = evidence.mime_type or guess_image_mime(evidence.storage_path)

    # 6. Retrieve stored ProductVisualProfile directly from DB without reconsolidating
    from app.models.product_visual_profile import ProductVisualProfile, ProductVisualProfileStatus
    profile = db.execute(
        select(ProductVisualProfile).where(ProductVisualProfile.product_id == session.product_id)
    ).scalar_one_or_none()
    profile_dict = profile.profile_json if (profile and profile.status == ProductVisualProfileStatus.READY.value) else None

    # Customer stage receives 1 customer image + stored text ProductVisualProfile (no raw reference images)
    reference_images_payload: List[Dict[str, Any]] = []

    # 7. Prepare product info and claim context
    product_info = {}
    if session.product:
        product_info = {
            "name": session.product.name,
            "sku": session.product.sku,
            "description": session.product.description or "",
            "price": str(session.product.price) if session.product.price is not None else "0.00",
        }

    claim_context = {
        "workflow_step_key": evidence.workflow_step_key,
        "customer_notes": session.refund_reason or "",
        "order_id": session.order_id,
        "customer_name": session.customer_name or "",
    }

    # 8. Create VisualAnalysis record in PROCESSING state
    analysis = VisualAnalysis(
        evidence_id=evidence.id,
        model_name=qwen_vision_service.model_name,
        prompt_version=qwen_vision_service.prompt_version,
        status=VisualAnalysisStatus.PROCESSING.value,
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    analysis_db_id = analysis.id
    evidence_db_id = evidence.id
    v_id = session.verification_id
    ev_human_id = evidence.evidence_id
    p_id = session.product_id

    import time
    start_qwen_t = time.time()

    logger.info("AI_TRACE | AI_PIPELINE_START | verification_id=%s | evidence_id=%s | product_id=%s", v_id, ev_human_id, p_id)
    logger.info("AI_TRACE | QWEN_START | verification_id=%s | evidence_id=%s | model=%s", v_id, ev_human_id, qwen_vision_service.model_name)

    # Commit active transaction to release SQLite DB lock during network call
    db.commit()

    # 9. Invoke Gemini Vision (if configured) or local Qwen2.5-VL Vision service
    try:
        result: Optional[VisualAnalysisResult] = None
        used_model = qwen_vision_service.model_name

        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip():
            try:
                from app.ai.gemini_vision import gemini_vision_service
                logger.info("AI_TRACE | GEMINI_START | verification_id=%s | evidence_id=%s | model=%s", v_id, ev_human_id, gemini_vision_service.model_name)
                # Fetch actual reference image bytes for Gemini multimodal comparison
                refs = db.execute(
                    select(ProductReference).where(ProductReference.product_id == session.product_id)
                ).scalars().all()
                gemini_refs = []
                for r in refs:
                    try:
                        p = get_reference_file_path(r.image_path)
                        gemini_refs.append({
                            "angle": r.angle,
                            "bytes": p.read_bytes(),
                            "mime_type": guess_image_mime(r.image_path),
                        })
                    except Exception as err:
                        logger.warning("Could not load reference file for angle %s: %s", r.angle, err)

                result = gemini_vision_service.analyze_evidence_image(
                    evidence_bytes=evidence_bytes,
                    evidence_mime_type=evidence_mime,
                    reference_images=gemini_refs,
                    product_info=product_info,
                    claim_context=claim_context,
                )
                used_model = gemini_vision_service.model_name
                logger.info("AI_TRACE | GEMINI_SUCCESS | verification_id=%s | evidence_id=%s", v_id, ev_human_id)
            except Exception as gem_exc:
                logger.warning("Gemini Vision customer evidence analysis failed (%s); falling back to Qwen2.5-VL", gem_exc)
                result = None

        if result is None:
            result = qwen_vision_service.analyze_evidence_image(
                evidence_bytes=evidence_bytes,
                evidence_mime_type=evidence_mime,
                reference_images=reference_images_payload,
                product_info=product_info,
                claim_context=claim_context,
                visual_profile=profile_dict,
            )
            used_model = qwen_vision_service.model_name

        dur_ms = int((time.time() - start_qwen_t) * 1000)
        logger.info(
            "AI_TRACE | QWEN_COMPLETE | verification_id=%s | evidence_id=%s | model=%s | duration_ms=%d | status=COMPLETED",
            v_id, ev_human_id, qwen_vision_service.model_name, dur_ms
        )

        analysis_rec = db.execute(
            select(VisualAnalysis).where(VisualAnalysis.id == analysis_db_id)
        ).scalar_one()
        evidence_rec = db.execute(
            select(Evidence).where(Evidence.id == evidence_db_id)
        ).scalar_one()

        analysis_rec.result_json = result.model_dump()
        analysis_rec.overall_confidence = result.overall_visual_confidence
        analysis_rec.model_name = used_model
        analysis_rec.status = VisualAnalysisStatus.COMPLETED.value
        analysis_rec.completed_at = utc_now()

        # Update evidence status to ANALYZED
        evidence_rec.status = EvidenceStatus.ANALYZED.value

        # Log audit event
        event = EvidenceEvent(
            evidence_id=evidence_rec.id,
            verification_session_id=session.id,
            event_type="AI_VISUAL_ANALYSIS_COMPLETED",
            event_data_json={
                "actor": "SYSTEM_QWEN_VISION",
                "note": f"Qwen visual analysis completed with confidence {result.overall_visual_confidence}",
                "confidence": result.overall_visual_confidence,
            },
        )
        db.add(event)
        db.commit()
        db.refresh(analysis_rec)

        logger.info("AI_TRACE | QWEN_RESULT_SAVED | verification_id=%s | evidence_id=%s", v_id, ev_human_id)
        return analysis_rec

    except Exception as exc:
        db.rollback()
        dur_ms = int((time.time() - start_qwen_t) * 1000)
        logger.error(
            "AI_TRACE | QWEN_COMPLETE | verification_id=%s | evidence_id=%s | model=%s | duration_ms=%d | status=FAILED | error=%s",
            v_id, ev_human_id, qwen_vision_service.model_name, dur_ms, exc,
            exc_info=True,
        )
        analysis_rec = db.execute(
            select(VisualAnalysis).where(VisualAnalysis.id == analysis_db_id)
        ).scalar_one_or_none()
        if analysis_rec:
            analysis_rec.status = VisualAnalysisStatus.FAILED.value
            analysis_rec.error_message = str(exc)
            analysis_rec.completed_at = utc_now()

            event = EvidenceEvent(
                evidence_id=evidence_db_id,
                verification_session_id=session.id,
                event_type="AI_VISUAL_ANALYSIS_FAILED",
                event_data_json={
                    "actor": "SYSTEM_QWEN_VISION",
                    "note": f"Qwen visual analysis failed: {str(exc)[:200]}",
                    "error": str(exc)[:500],
                },
            )
            db.add(event)
            db.commit()
            db.refresh(analysis_rec)
            return analysis_rec
        raise


def get_evidence_analysis(
    db: Session,
    merchant_id: str,
    verification_identifier: str,
    evidence_identifier: str,
) -> VisualAnalysis:
    """Retrieve the latest visual analysis for a merchant-owned evidence item.

    Args:
        db: Active database session.
        merchant_id: ID of the authenticated merchant.
        verification_identifier: VerificationSession id or verification_id.
        evidence_identifier: Evidence id or evidence_id.

    Returns:
        Latest VisualAnalysis record.
    """
    # 1. Fetch verification session enforcing merchant isolation
    session = db.execute(
        select(VerificationSession).where(
            or_(
                VerificationSession.id == verification_identifier,
                VerificationSession.verification_id == verification_identifier,
            ),
            VerificationSession.merchant_id == merchant_id,
        )
    ).scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification session not found",
        )

    # 2. Fetch evidence item
    evidence = db.execute(
        select(Evidence).where(
            or_(
                Evidence.id == evidence_identifier,
                Evidence.evidence_id == evidence_identifier,
            ),
            Evidence.verification_session_id == session.id,
        )
    ).scalar_one_or_none()

    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence item not found for this verification session",
        )

    # 3. Retrieve latest VisualAnalysis
    analysis = db.execute(
        select(VisualAnalysis)
        .where(VisualAnalysis.evidence_id == evidence.id)
        .order_by(VisualAnalysis.created_at.desc())
    ).scalars().first()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No visual analysis found for this evidence item",
        )

    return analysis

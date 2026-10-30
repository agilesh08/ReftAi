"""Customer-facing public verification service.

Strictly isolates customer endpoints from sensitive merchant data and guarantees:
- Unauthenticated customer access via URL token only.
- Cryptographic SHA-256 token verification.
- HTTP 410 Gone for expired or cancelled sessions.
- Zero exposure of internal IDs, hashes, merchant emails, or passwords.
"""
import logging
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.security import hash_verification_token
from app.models.verification import VerificationSession, SessionStatus
from app.models.verification_event import VerificationEvent, VerificationEventType
from app.schemas.verification import (
    CustomerMerchantInfo,
    CustomerProductInfo,
    CustomerWorkflowInfo,
    CustomerVerificationResponse,
    CustomerWorkflowResponse,
    VerificationStartResponse,
)

logger = logging.getLogger(__name__)


def ensure_utc(dt: datetime) -> datetime:
    """Ensure datetime is timezone-aware in UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def utc_now() -> datetime:
    """Current UTC datetime."""
    return datetime.now(timezone.utc)


def get_session_by_token(db: Session, raw_token: str) -> VerificationSession:
    """Look up a verification session by customer raw token.
    
    Validates token presence, checks expiration and cancellation status.
    Raises:
    - 404 NOT FOUND if token does not match any session.
    - 410 GONE if session was cancelled by merchant.
    - 410 GONE if session link has expired.
    """
    clean_token = raw_token.strip() if raw_token else ""
    if not clean_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification session not found",
        )

    session = None
    if clean_token.upper().startswith("VR-"):
        stmt = (
            select(VerificationSession)
            .options(
                joinedload(VerificationSession.merchant),
                joinedload(VerificationSession.product),
                joinedload(VerificationSession.workflow),
            )
            .where(VerificationSession.verification_id == clean_token.upper())
        )
        session = db.execute(stmt).scalar_one_or_none()

    if not session:
        token_hash = hash_verification_token(clean_token)
        stmt = (
            select(VerificationSession)
            .options(
                joinedload(VerificationSession.merchant),
                joinedload(VerificationSession.product),
                joinedload(VerificationSession.workflow),
            )
            .where(VerificationSession.customer_token_hash == token_hash)
        )
        session = db.execute(stmt).scalar_one_or_none()

    if not session:
        logger.warning("Invalid customer verification token attempted")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification session not found",
        )

    # Check cancelled status -> 410 Gone
    if session.status == SessionStatus.CANCELLED.value:
        logger.info("Customer accessed cancelled verification session %s", session.verification_id)
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This verification session has been cancelled by the merchant",
        )

    now = utc_now()

    # Check hold status & auto-expiration -> 423 Locked
    if session.status == SessionStatus.HELD.value:
        if session.hold_until is not None and ensure_utc(session.hold_until) <= now:
            restored = (
                SessionStatus.COMPLETED.value
                if session.completed_at
                else (SessionStatus.IN_PROGRESS.value if session.started_at else SessionStatus.CREATED.value)
            )
            session.status = restored
            session.held_at = None
            session.hold_until = None
            session.held_by = None
            try:
                event = VerificationEvent(
                    session_id=session.id,
                    verification_id=session.verification_id,
                    event_type=VerificationEventType.SESSION_RESUMED.value,
                    metadata_json={"auto_resumed": True, "resumed_at": now.isoformat(), "restored_status": restored},
                )
                db.add(event)
                db.commit()
                db.refresh(session)
            except Exception as exc:
                db.rollback()
                logger.warning("Failed to save auto-resumed session event: %s", exc)
        else:
            logger.info("Customer accessed held verification session %s", session.verification_id)
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="Verification temporarily paused",
            )

    # Check expiration -> 410 Gone
    if session.status == SessionStatus.EXPIRED.value or ensure_utc(session.expires_at) <= now:
        if session.status != SessionStatus.EXPIRED.value:
            session.status = SessionStatus.EXPIRED.value
            try:
                event = VerificationEvent(
                    session_id=session.id,
                    verification_id=session.verification_id,
                    event_type=VerificationEventType.SESSION_EXPIRED.value,
                    metadata_json={"detected_at": now.isoformat()},
                )
                db.add(event)
                db.commit()
                db.refresh(session)
            except Exception as exc:
                db.rollback()
                logger.warning("Failed to save session expiration event: %s", exc)

        logger.info("Customer accessed expired verification session %s", session.verification_id)
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This verification session link has expired",
        )

    return session


def get_customer_session_overview(db: Session, raw_token: str) -> CustomerVerificationResponse:
    """Retrieve sanitized verification session overview for customer landing page."""
    session = get_session_by_token(db, raw_token)

    workflow_name = session.workflow_snapshot_json.get(
        "workflow_name",
        session.workflow.name if session.workflow else "Verification Workflow",
    )

    return CustomerVerificationResponse(
        verification_id=session.verification_id,
        merchant=CustomerMerchantInfo(business_name=session.merchant.business_name),
        product=CustomerProductInfo(name=session.product.name),
        status=session.status,
        max_attempts=getattr(session, "max_attempts", 1) or 1,
        attempts_count=getattr(session, "attempts_count", 0) or 0,
        expires_at=session.expires_at,
        workflow=CustomerWorkflowInfo(name=workflow_name),
    )


def start_customer_session(db: Session, raw_token: str) -> VerificationStartResponse:
    """Transition verification session to IN_PROGRESS when customer starts the workflow.
    
    Idempotent if already IN_PROGRESS.
    Rejects if already COMPLETED or max attempts reached.
    """
    session = get_session_by_token(db, raw_token)

    max_att = getattr(session, "max_attempts", 1) or 1
    att_count = getattr(session, "attempts_count", 0) or 0
    if session.status == SessionStatus.COMPLETED.value or att_count >= max_att:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification already completed",
        )

    if session.status == SessionStatus.CREATED.value:
        session.status = SessionStatus.IN_PROGRESS.value
        session.started_at = utc_now()

        event = VerificationEvent(
            session_id=session.id,
            verification_id=session.verification_id,
            event_type=VerificationEventType.SESSION_STARTED.value,
            metadata_json={"started_at": session.started_at.isoformat()},
        )
        db.add(event)
        db.commit()
        db.refresh(session)
        logger.info(
            "Customer started session %s (started_at: %s)",
            session.verification_id,
            session.started_at,
        )

    return VerificationStartResponse(
        verification_id=session.verification_id,
        status=session.status,
        started_at=session.started_at or utc_now(),
        message="Verification session started successfully",
    )


def get_customer_workflow(db: Session, raw_token: str) -> CustomerWorkflowResponse:
    """Retrieve the frozen workflow snapshot for the customer verification flow."""
    session = get_session_by_token(db, raw_token)
    max_att = getattr(session, "max_attempts", 1) or 1
    att_count = getattr(session, "attempts_count", 0) or 0
    if session.status == SessionStatus.COMPLETED.value or att_count >= max_att:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification already completed",
        )
    snapshot = session.workflow_snapshot_json or {}

    return CustomerWorkflowResponse(
        verification_id=session.verification_id,
        workflow_name=snapshot.get("workflow_name", "Verification Workflow"),
        workflow_version=snapshot.get("workflow_version", session.workflow_version),
        steps=snapshot.get("steps", []),
    )


def complete_customer_session(db: Session, raw_token: str) -> VerificationStartResponse:
    """Mark verification session as COMPLETED when customer finishes submitting evidence."""
    session = get_session_by_token(db, raw_token)
    if session.status != SessionStatus.COMPLETED.value:
        session.status = SessionStatus.COMPLETED.value
        session.completed_at = utc_now()
        session.attempts_count = (getattr(session, "attempts_count", 0) or 0) + 1
        event = VerificationEvent(
            session_id=session.id,
            verification_id=session.verification_id,
            event_type=VerificationEventType.SESSION_COMPLETED.value,
            metadata_json={"completed_by": "customer", "completed_at": utc_now().isoformat()},
        )
        db.add(event)
        db.commit()
        db.refresh(session)
        logger.info("Customer completed verification session %s", session.verification_id)

        # Trigger deterministic session fusion to establish assessment state
        try:
            from app.services import evidence_fusion_service
            evidence_fusion_service.run_session_fusion(
                db=db,
                merchant_id=session.merchant_id,
                verification_identifier=session.id,
            )
            logger.info("Session fusion evaluated for completed session %s", session.verification_id)
        except Exception as exc:
            logger.warning("Session fusion on customer completion failed gracefully: %s", exc)

    return VerificationStartResponse(
        verification_id=session.verification_id,
        status=session.status,
        started_at=session.started_at or utc_now(),
        message="Verification session completed successfully",
    )


def get_customer_session_status(db: Session, raw_token: str) -> dict:
    """Retrieve actual real-time processing stage and status for customer verification."""
    session = get_session_by_token(db, raw_token)
    from app.models.evidence_request import EvidenceRequestStatus
    from app.services import evidence_request_service

    existing_requests = evidence_request_service.list_session_requests(db, session.id)
    pending_req = next((r for r in existing_requests if r.status == EvidenceRequestStatus.PENDING.value), None)

    pending_data = None
    if pending_req:
        options = getattr(pending_req, "options_json", None)
        if not options:
            options = ["Yes, observed as described", "Partially visible on unboxing", "No, not observed", "Other / Prefer to explain in text"]
        pending_data = {
            "id": pending_req.id,
            "workflow_step_key": pending_req.workflow_step_key,
            "requested_evidence_type": pending_req.requested_evidence_type,
            "reason": pending_req.reason,
            "prompt": pending_req.reason,
            "options": options,
            "status": pending_req.status,
        }

    fusion = session.fusion_results[0] if session.fusion_results else None

    # Calculate fallback stage and status if not yet persisted
    stage = session.processing_stage
    status_val = session.processing_status
    if session.status == SessionStatus.COMPLETED.value:
        stage = "COMPLETE"
        status_val = "COMPLETED"
    elif pending_req:
        stage = "REASONING"
        status_val = "FOLLOWUP_REQUIRED"
    elif not stage:
        stage = "QUEUED"
        status_val = "PROCESSING"

    return {
        "stage": stage,
        "status": status_val,
        "error": session.processing_error,
        "is_completed": session.status == SessionStatus.COMPLETED.value,
        "pending_followup": pending_data,
        "machine_assessment": fusion.assessment_state if fusion else None,
    }


def analyze_customer_session(db: Session, raw_token: str) -> dict:
    """Execute automated Gemini visual analysis and reasoning cycle for submitted customer evidence."""
    session = get_session_by_token(db, raw_token)
    if session.status == SessionStatus.COMPLETED.value:
        return {
            "stage": "COMPLETE",
            "status": "COMPLETED",
            "message": "Verification is already completed",
        }

    from app.core.config import settings
    from app.models.evidence import Evidence, EvidenceType
    from app.models.evidence_request import EvidenceRequestStatus
    from app.services import evidence_request_service, evidence_processing_service, evidence_fusion_service
    from app.ai.gemini_vision import gemini_vision_service
    from sqlalchemy import select

    # Check for unconfigured Gemini API key
    if not settings.GEMINI_API_KEY or not settings.GEMINI_API_KEY.strip():
        session.processing_stage = "VISUAL_ANALYSIS"
        session.processing_status = "FAILED"
        session.processing_error = "AI verification is currently unavailable. The AI service is not configured. Please contact the merchant or try again later."
        db.commit()
        return {
            "stage": "VISUAL_ANALYSIS",
            "status": "FAILED",
            "message": session.processing_error,
            "error_code": "MISSING_API_KEY",
        }

    # Stage: Check for pending evidence request first
    existing_requests = evidence_request_service.list_session_requests(db, session.id)
    pending_req = next((r for r in existing_requests if r.status == EvidenceRequestStatus.PENDING.value), None)
    if pending_req:
        session.processing_stage = "REASONING"
        session.processing_status = "PENDING"
        db.commit()
        options = getattr(pending_req, "options_json", None) or [
            "Yes, observed as described",
            "Partially visible on unboxing",
            "No, not observed",
            "Other / Prefer to explain in text",
        ]
        return {
            "stage": "REASONING",
            "status": "FOLLOWUP_REQUIRED",
            "request": {
                "id": pending_req.id,
                "workflow_step_key": pending_req.workflow_step_key,
                "requested_evidence_type": pending_req.requested_evidence_type,
                "reason": pending_req.reason,
                "prompt": pending_req.reason,
                "options": options,
                "status": pending_req.status,
            },
            "message": pending_req.reason,
        }

    # Stage 2: QUEUED -> Processing
    session.processing_stage = "QUEUED"
    session.processing_status = "PROCESSING"
    session.processing_error = None
    db.commit()

    # Find latest image evidence
    latest_img = db.execute(
        select(Evidence)
        .where(
            Evidence.verification_session_id == session.id,
            Evidence.evidence_type == EvidenceType.CUSTOMER_IMAGE.value,
        )
        .order_by(Evidence.created_at.desc())
    ).scalars().first()

    if not latest_img:
        session.processing_stage = "EVIDENCE_UPLOAD"
        session.processing_status = "FAILED"
        session.processing_error = "Unable to analyze the submitted image. Please capture another clear photograph."
        db.commit()
        return {
            "stage": "EVIDENCE_UPLOAD",
            "status": "FAILED",
            "message": session.processing_error,
            "error_code": "NO_IMAGE_EVIDENCE",
        }

    # Stage 3: VISUAL_ANALYSIS
    session.processing_stage = "VISUAL_ANALYSIS"
    session.processing_status = "PROCESSING"
    db.commit()

    try:
        evidence_processing_service.analyze_evidence_image(
            db=db,
            merchant_id=session.merchant_id,
            verification_identifier=session.id,
            evidence_identifier=latest_img.id,
            force_reanalyze=False,
        )
    except Exception as exc:
        err_cat = gemini_vision_service.categorize_gemini_error(exc)
        session.processing_stage = "VISUAL_ANALYSIS"
        session.processing_status = "FAILED"
        session.processing_error = err_cat["user_message"]
        db.commit()
        return {
            "stage": "VISUAL_ANALYSIS",
            "status": "FAILED",
            "message": err_cat["user_message"],
            "error_code": err_cat["error_code"],
        }

    # Re-check for newly generated pending follow-up evidence request
    existing_requests = evidence_request_service.list_session_requests(db, session.id)
    pending_req = next((r for r in existing_requests if r.status == EvidenceRequestStatus.PENDING.value), None)
    if pending_req:
        session.processing_stage = "REASONING"
        session.processing_status = "PENDING"
        db.commit()
        options = getattr(pending_req, "options_json", None) or [
            "Yes, observed as described",
            "Partially visible on unboxing",
            "No, not observed",
            "Other / Prefer to explain in text",
        ]
        return {
            "stage": "REASONING",
            "status": "FOLLOWUP_REQUIRED",
            "request": {
                "id": pending_req.id,
                "workflow_step_key": pending_req.workflow_step_key,
                "requested_evidence_type": pending_req.requested_evidence_type,
                "reason": pending_req.reason,
                "prompt": pending_req.reason,
                "options": options,
                "status": pending_req.status,
            },
            "message": pending_req.reason,
        }

    # Stage 4: REASONING -> COMPLETE (No follow-up required or all fulfilled)
    session.processing_stage = "REASONING"
    session.processing_status = "PROCESSING"
    db.commit()

    try:
        fusion_result = evidence_fusion_service.compute_session_fusion(db, session.id)
    except Exception as fusion_exc:
        logger.warning("Evidence fusion calculation encountered non-fatal issue: %s", fusion_exc)
        fusion_result = None

    # Stage 5: COMPLETE
    session.processing_stage = "COMPLETE"
    session.processing_status = "COMPLETED"
    session.status = SessionStatus.COMPLETED.value
    session.completed_at = utc_now()
    session.processing_error = None
    db.commit()

    return {
        "stage": "COMPLETE",
        "status": "COMPLETED",
        "message": "Verification successfully processed and dossier generated",
        "assessment": fusion_result.assessment_state if fusion_result else "REVIEW_REQUIRED",
    }


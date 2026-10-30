"""End-to-end integration test verifying the complete Gemini metadata architecture,
4-angle reference processing, customer verification pipeline, and merchant investigation view.
"""
import io
import os
from pathlib import Path
import pytest
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.config import settings
from app.models.merchant import Merchant
from app.models.product import Product
from app.models.product_reference import ProductReference
from app.models.product_reference_analysis import ProductReferenceVisualAnalysis, ProductReferenceAnalysisStatus
from app.models.product_visual_profile import ProductVisualProfile, ProductVisualProfileStatus
from app.models.verification import VerificationSession, SessionStatus
from app.models.workflow import Workflow
from app.models.workflow_step import WorkflowStep
from app.services import reference_service, product_profile_service, verification_service, public_verification_service, evidence_service, merchant_dashboard_service
from app.utils.file_storage import get_reference_file_path, get_evidence_file_path


def create_solid_image_bytes(color=(30, 30, 35), text="TEST") -> bytes:
    img = Image.new("RGB", (300, 300), color=color)
    draw = ImageDraw.Draw(img)
    draw.text((50, 140), text, fill=(240, 240, 240))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


@pytest.mark.live_gemini
def test_complete_gemini_metadata_and_verification_pipeline(db_session: Session):
    """Verify entire Priority 2, 3, 4, 5, 7 pipeline with real Gemini models and SQLite persistence."""
    # 1. Setup authenticated merchant and active workflow
    merchant = Merchant(
        email="test_e2e_merchant@reft.ai",
        password_hash="testhash123",
        business_name="Acoustic Labs Audio",
    )
    db_session.add(merchant)
    db_session.commit()
    db_session.refresh(merchant)

    workflow = Workflow(
        merchant_id=merchant.id,
        name="Standard Return Workflow",
        status="ACTIVE",
    )
    db_session.add(workflow)
    db_session.commit()
    db_session.refresh(workflow)

    step1 = WorkflowStep(
        workflow_id=workflow.id,
        step_key="step_claim_reason",
        step_type="TEXT",
        title="Describe Issue",
        step_order=1,
    )
    step2 = WorkflowStep(
        workflow_id=workflow.id,
        step_key="step_damage_camera",
        step_type="CAMERA",
        title="Take Damage Photo",
        step_order=2,
    )
    db_session.add_all([step1, step2])
    db_session.commit()

    # 2. Create merchant product
    product = Product(
        merchant_id=merchant.id,
        name="Acoustic Pro Studio Headphones",
        sku="APS-990-PRO",
        description="Over-ear reference studio headphones with matte aluminum pivot bezels.",
        price=18999.00,
        reference_processing_status="NOT_READY",
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)

    # 3. Priority 2: Upload 4 Canonical Product Reference Images (FRONT, BACK, LEFT, RIGHT)
    angles = ["FRONT", "BACK", "LEFT", "RIGHT"]
    for angle in angles:
        img_bytes = create_solid_image_bytes(text=f"ANGLE {angle}")
        from fastapi import UploadFile
        uf = UploadFile(
            filename=f"ref_{angle.lower()}.jpg",
            file=io.BytesIO(img_bytes),
            headers={"content-type": "image/jpeg"},
        )

        import asyncio
        ref = asyncio.run(reference_service.upload_reference_image(
            db=db_session,
            merchant_id=merchant.id,
            product_id=product.id,
            angle=angle,
            image_file=uf,
        ))
        assert ref.angle == angle

    # 4. Process all 4 reference angles via Gemini
    profile = product_profile_service.process_product_references_and_consolidate_profile(
        db=db_session,
        product_id=product.id,
        force_reanalyze=True,
    )

    db_session.refresh(product)
    assert product.reference_processing_status == "READY", "Product must be READY after 4 angles processed"
    assert profile is not None
    assert profile.status == ProductVisualProfileStatus.READY.value
    assert profile.profile_json, "Consolidated profile must be populated"

    # Verify 4 persisted metadata records
    analyses = db_session.execute(
        select(ProductReferenceVisualAnalysis).where(ProductReferenceVisualAnalysis.product_id == product.id)
    ).scalars().all()
    assert len(analyses) == 4
    for a in analyses:
        assert a.status == ProductReferenceAnalysisStatus.COMPLETED.value
        assert a.result_json.get("metadata"), "Metadata must be structured JSON"

    # Verify Storage Policy: Temporary reference image binary files removed from disk
    refs = db_session.execute(
        select(ProductReference).where(ProductReference.product_id == product.id)
    ).scalars().all()
    for r in refs:
        file_path = (Path(settings.STORAGE_PATH) / r.image_path).resolve()
        assert not file_path.exists(), f"Storage policy: original reference file {file_path} should be cleaned up"

    # 5. Customer creates verification session
    from app.schemas.verification import VerificationCreateRequest
    session_req = VerificationCreateRequest(
        product_id=product.id,
        workflow_id=workflow.id,
        order_id="ORD-E2E-AUDIO-001",
        customer_name="Rohan Sharma",
        customer_contact="rohan@example.com",
        refund_reason="Right slider snapped off during unboxing",
        refund_amount=18999.00,
    )
    v_session = verification_service.create_verification_session(
        db=db_session,
        merchant_id=merchant.id,
        data=session_req,
    )
    raw_token = v_session.customer_link.split("/")[-1]
    assert raw_token
    assert v_session.status == SessionStatus.CREATED.value

    # 6. Customer starts verification and submits evidence
    public_verification_service.start_customer_session(db_session, raw_token)

    # Customer submits claim text evidence
    from app.schemas.evidence import EvidenceTextCreateRequest
    evidence_service.create_customer_text_evidence(
        db=db_session,
        raw_token=raw_token,
        data=EvidenceTextCreateRequest(
            workflow_step_key="step_claim_reason",
            text="Right slider snapped off during unboxing",
        ),
    )

    # Customer submits live camera photo evidence
    customer_photo_bytes = create_solid_image_bytes(color=(20, 20, 25), text="CUSTOMER DAMAGE")
    uf_customer = UploadFile(
        filename="customer_live_damage.jpg",
        file=io.BytesIO(customer_photo_bytes),
        headers={"content-type": "image/jpeg"},
    )
    import asyncio
    ev_img = asyncio.run(evidence_service.create_customer_image_evidence(
        db=db_session,
        raw_token=raw_token,
        file=uf_customer,
        workflow_step_key="step_damage_camera",
    ))
    assert ev_img.id

    # Verify Customer evidence file IS retained on disk (NEVER deleted)
    ev_file_path = get_evidence_file_path(ev_img.storage_path)
    assert ev_file_path.exists(), "Customer evidence must be retained on disk"

    # 7. Customer triggers real-time verification analysis
    analysis_res = public_verification_service.analyze_customer_session(db_session, raw_token)
    assert analysis_res["status"] in ("COMPLETED", "FOLLOWUP_REQUIRED", "READY_FOR_REVIEW")

    # 8. Customer polls verification status
    status_res = public_verification_service.get_customer_session_status(db_session, raw_token)
    assert status_res["stage"] in ("VISUAL_ANALYSIS", "REASONING", "COMPLETE")
    assert status_res["status"] in ("PROCESSING", "PENDING", "COMPLETED", "FOLLOWUP_REQUIRED")

    # 9. Verify Merchant Investigation View
    db_session.refresh(v_session)
    inv_data = merchant_dashboard_service.get_verification_investigation_detail(
        db=db_session,
        merchant_id=merchant.id,
        verification_identifier=v_session.id,
    )
    assert inv_data.verification["order_id"] == "ORD-E2E-AUDIO-001"
    assert inv_data.product["name"] == "Acoustic Pro Studio Headphones"
    assert len(inv_data.evidence_items) >= 2
    print("\n--- E2E VERIFICATION PIPELINE TEST PASSED! ---")
    print(f"Product Readiness: {product.reference_processing_status}")
    print(f"Profile Status: {profile.status}")
    print(f"Evidence items collected: {len(inv_data.evidence_items)}")

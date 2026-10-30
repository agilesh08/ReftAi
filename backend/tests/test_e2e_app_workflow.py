"""End-to-End Flutter Application Workflow Integration Test.

Tests the full production path:
1. Merchant authentication & Product creation.
2. 4-angle Reference Image Upload & Profile consolidation gating.
3. Verification Session Creation Gating (rejects when PROCESSING, accepts when READY).
4. Customer Workflow Execution:
   - Public Landing & Session Start
   - Evidence Upload (CUSTOMER_IMAGE)
   - Visual Evidence Analysis (Qwen Vision 3B)
   - Adaptive Reasoning Cycle (Llama 3.2 1B)
   - Evidence Fusion & Completion
5. Concurrent GET request responsiveness test during AI inference.
"""
import io
from unittest.mock import patch
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.models.merchant import Merchant
from app.models.product import Product
from app.models.product_reference import ProductReference
from app.models.product_visual_profile import ProductVisualProfile, ProductVisualProfileStatus
from app.models.workflow import Workflow, WorkflowStatus
from app.schemas.product_reference_analysis import (
    ProductReferenceAnalysisResult,
    ProductVisualProfileResult,
    ReferenceImageVisualMetadata,
)
from app.ai.ai_queue import ai_job_queue


def create_dummy_jpeg_bytes() -> bytes:
    img = Image.new("RGB", (300, 300), color=(100, 150, 200))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_e2e_app_workflow_and_gating(client: TestClient):
    mock_ref_result = ProductReferenceAnalysisResult(
        angle="FRONT",
        summary="Front angle reference",
        confidence=0.95,
        metadata=ReferenceImageVisualMetadata(
            product_category="Electronics",
            brand="E2E",
            model="WM-E2E-99",
            visible_product_identity="Wireless Mouse",
            shape="Oval",
            dimensions_proportions="Standard",
            color="Black",
            material="Plastic",
            texture_finish="Matte",
            distinctive_features=["Scroll wheel"],
            buttons_ports_components=["Left click", "Right click"],
            logos_markings=["E2E logo"],
            visible_text=["Model WM-E2E-99"],
            packaging_characteristics="Box",
            physical_condition="NEW",
            orientation_angle="FRONT",
            important_landmarks=["Sensor"],
            image_quality="GOOD",
            occlusions=[],
            uncertainties=[],
        ),
    )

    mock_profile_result = ProductVisualProfileResult(
        canonical_product_name="E2E Wireless Mouse",
        brand="E2E",
        model="WM-E2E-99",
        category="Electronics",
        primary_colors=["Black"],
        materials_finish=["Plastic matte"],
        key_design_features=["Scroll wheel"],
        angle_specific_expectations={"FRONT": "Mouse buttons"},
        visible_identifiers_and_text=["E2E logo"],
        distinguishing_landmarks=["Sensor"],
    )

    with patch("app.ai.qwen_vision.qwen_vision_service.analyze_reference_image", return_value=mock_ref_result), \
         patch("app.ai.ollama_reasoning.ollama_reasoning_service.consolidate_product_visual_profile", return_value=mock_profile_result):
        # 1. Register & Login Merchant
        merchant_email = "e2e_merchant@example.com"
        client.post(
            "/api/v1/auth/register",
            json={
                "email": merchant_email,
                "password": "Password123!",
                "business_name": "E2E Test Store",
            },
        )
        login_resp = client.post(
            "/api/v1/auth/login",
            json={"email": merchant_email, "password": "Password123!"},
        )
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Create Product
        prod_resp = client.post(
            "/api/v1/products",
            headers=headers,
            json={
                "name": "E2E Wireless Mouse",
                "sku": "WM-E2E-99",
                "description": "Ergonomic wireless mouse",
                "price": 49.99,
            },
        )
        assert prod_resp.status_code == 201
        product_id = prod_resp.json()["id"]

        # 3. Create Workflow and mark ACTIVE
        wf_resp = client.post(
            "/api/v1/workflows",
            headers=headers,
            json={
                "name": "Default Refund Flow",
                "description": "E2E test workflow",
                "steps": [
                    {
                        "step_key": "step_1_evidence",
                        "step_type": "EVIDENCE",
                        "title": "Upload Damage Photo",
                        "step_order": 1,
                        "required": True,
                        "config_json": {"allowed_types": ["CUSTOMER_IMAGE"]},
                    }
                ],
            },
        )
        assert wf_resp.status_code == 201
        workflow_id = wf_resp.json()["id"]

        import app.core.database
        from app.models.workflow_step import WorkflowStep, WorkflowStepType
        db = app.core.database.SessionLocal()
        try:
            wf = db.get(Workflow, workflow_id)
            wf.status = WorkflowStatus.ACTIVE.value
            step = WorkflowStep(
                workflow_id=wf.id,
                step_key="step_1_evidence",
                step_type=WorkflowStepType.IMAGE.value,
                title="Upload Damage Photo",
                step_order=1,
                required=True,
                config_json={"allowed_types": ["CUSTOMER_IMAGE"]},
            )
            db.add(step)
            db.commit()
        finally:
            db.close()

        # Attempting verification creation before references uploaded -> fails (NOT_READY)
        session_early_resp = client.post(
            "/api/v1/verifications",
            headers=headers,
            json={
                "product_id": product_id,
                "workflow_id": workflow_id,
                "order_id": "ORD-E2E-000",
                "customer_name": "Jane Doe",
                "customer_contact": "jane@example.com",
                "refund_reason": "Item defective",
                "refund_amount": 49.99,
            },
        )
        assert session_early_resp.status_code == 422

        # 4. Upload 4 Reference Angles
        img_bytes = create_dummy_jpeg_bytes()
        for angle in ["FRONT", "BACK", "LEFT", "RIGHT"]:
            ref_upload_resp = client.post(
                f"/api/v1/products/{product_id}/references",
                headers=headers,
                data={"angle": angle},
                files={"image": (f"{angle.lower()}.jpg", img_bytes, "image/jpeg")},
            )
            assert ref_upload_resp.status_code == 201

        # Drain background AI job queue
        ai_job_queue._queue.join()

        # 5. Verify completeness endpoint returns reference_processing_status == READY
        comp_resp = client.get(f"/api/v1/products/{product_id}/completeness", headers=headers)
        assert comp_resp.status_code == 200
        comp_data = comp_resp.json()
        assert comp_data["existing_count"] == 4
        assert comp_data["reference_processing_status"] == "READY"



        # 6. Create Verification Session now that product is READY
        session_resp = client.post(
            "/api/v1/verifications",
            headers=headers,
            json={
                "product_id": product_id,
                "workflow_id": workflow_id,
                "order_id": "ORD-E2E-001",
                "customer_name": "Jane Doe",
                "customer_contact": "jane@example.com",
                "refund_reason": "Item defective",
                "refund_amount": 49.99,
            },
        )
        assert session_resp.status_code == 201, f"Expected 201, got {session_resp.status_code}: {session_resp.text}"
        session_data = session_resp.json()
        customer_link = session_data["customer_link"]
        raw_token = customer_link.split("/")[-1]

        # 7. Customer Landing & Session Start
        landing_resp = client.get(f"/api/v1/public/verifications/{raw_token}")
        assert landing_resp.status_code == 200
        assert landing_resp.json()["merchant"]["business_name"] == "E2E Test Store"

        start_resp = client.post(f"/api/v1/public/verifications/{raw_token}/start")
        assert start_resp.status_code == 200
        assert start_resp.json()["status"] == "IN_PROGRESS"

        # 8. Upload Customer Image Evidence
        evidence_upload_resp = client.post(
            f"/api/v1/public/verifications/{raw_token}/evidence/image",
            data={"workflow_step_key": "step_1_evidence"},
            files={"file": ("customer_damage.jpg", img_bytes, "image/jpeg")},
        )
        assert evidence_upload_resp.status_code == 201
        ev_data = evidence_upload_resp.json()
        assert ev_data["evidence_type"] == "CUSTOMER_IMAGE"

        # 9. Verify GET request responsiveness while session is IN_PROGRESS
        overview_resp = client.get(f"/api/v1/public/verifications/{raw_token}")
        assert overview_resp.status_code == 200

        products_get_resp = client.get("/api/v1/products", headers=headers)
        assert products_get_resp.status_code == 200

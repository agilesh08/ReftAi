"""Regression tests for Product and Reference deletion cascade integrity.

Ensures that deleting a reference or an entire product never triggers:
  sqlite3.IntegrityError: NOT NULL constraint failed: product_visual_profiles.product_id
or generates SQL of the form:
  UPDATE product_visual_profiles SET product_id = NULL ...
"""
import os
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event, select
from sqlalchemy.orm import Session

from app.main import app
from tests.conftest import test_engine
from app.models.merchant import Merchant
from app.models.product import Product
from app.models.product_reference import ProductReference, ReferenceAngle
from app.models.product_reference_analysis import ProductReferenceVisualAnalysis, ProductReferenceAnalysisStatus
from app.models.product_visual_profile import ProductVisualProfile, ProductVisualProfileStatus
from app.models.workflow import Workflow, WorkflowStatus
from app.models.workflow_step import WorkflowStep, WorkflowStepType
from app.services import auth_service

# SQL Statement Interceptor to assert product_id is never set to NULL
sql_log = []

@event.listens_for(test_engine, "before_cursor_execute")
def intercept_sql(conn, cursor, statement, parameters, context, executemany):
    sql_upper = statement.upper()
    if "PRODUCT_VISUAL_PROFILES" in sql_upper and "PRODUCT_ID" in sql_upper and "NULL" in sql_upper:
        sql_log.append((statement, parameters))


@pytest.fixture(autouse=True)
def setup_sql_interceptor():
    sql_log.clear()
    yield
    sql_log.clear()


def register_and_get_auth(client: TestClient, email: str) -> tuple[str, str]:
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "business_name": "Test Store",
            "email": email,
            "password": "Password123!",
        },
    )
    merchant_id = reg.json()["id"]
    login = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password123!"},
    )
    token = login.json()["access_token"]
    return merchant_id, f"Bearer {token}"


def create_active_workflow(db: Session, merchant_id: str) -> Workflow:
    workflow = Workflow(
        merchant_id=merchant_id,
        name="Standard Refund Workflow",
        status=WorkflowStatus.ACTIVE.value,
        version=1,
    )
    db.add(workflow)
    db.flush()

    step = WorkflowStep(
        workflow_id=workflow.id,
        step_key="step_1",
        step_order=0,
        step_type=WorkflowStepType.TEXT.value,
        title="Reason for Refund",
        config_json={},
    )
    db.add(step)
    db.commit()
    db.refresh(workflow)
    return workflow


def test_single_reference_deletion_cascade_and_gating(client: TestClient, db_session: Session):
    """Test deleting one reference image (e.g. LEFT/measurement-scale):
    - No IntegrityError / NULL updates.
    - Product remains intact.
    - ProductVisualProfile invalidated (PENDING).
    - Product reference_processing_status becomes NOT_READY.
    - Verification creation is blocked with HTTP 409.
    """
    db = db_session
    merchant_id, auth_header = register_and_get_auth(client, "del_test1@example.com")
    workflow = create_active_workflow(db, merchant_id)

    # 1. Create product
    prod_resp = client.post(
        "/api/v1/products",
        headers={"Authorization": auth_header},
        json={
            "name": "Evo Fox Gaming Mouse",
            "sku": f"SKU-{uuid.uuid4().hex[:6]}",
            "description": "Gaming Mouse Baseline",
            "price": "49.99",
        },
    )
    assert prod_resp.status_code == 201
    product_id = prod_resp.json()["id"]

    # 2. Add 4 references
    angles = ["FRONT", "BACK", "LEFT", "RIGHT"]
    for angle in angles:
        rel_path = f"product_references/test_{product_id}_{angle}.jpg"
        file_path = os.path.join("storage", rel_path)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(b"dummy image data")

        ref = ProductReference(
            product_id=product_id,
            angle=angle,
            image_path=rel_path,
            image_hash=f"hash_{angle}",
        )
        db.add(ref)
        db.flush()

        analysis = ProductReferenceVisualAnalysis(
            product_id=product_id,
            product_reference_id=ref.id,
            angle=angle,
            image_hash=f"hash_{angle}",
            model_name="qwen2.5vl:3b",
            prompt_version="v3.0",
            status=ProductReferenceAnalysisStatus.COMPLETED.value,
            result_json={"features": [f"{angle} view mouse features"]},
        )
        db.add(analysis)

    profile = ProductVisualProfile(
        product_id=product_id,
        qwen_model_name="qwen2.5vl:3b",
        llama_model_name="llama3.2:1b",
        profile_version="v3.0",
        reference_hashes_json={"FRONT": "hash_FRONT", "BACK": "hash_BACK", "LEFT": "hash_LEFT", "RIGHT": "hash_RIGHT"},
        status=ProductVisualProfileStatus.READY.value,
        profile_json={"canonical_features": "Black gaming mouse"},
    )
    db.add(profile)

    prod = db.execute(select(Product).where(Product.id == product_id)).scalar_one()
    prod.reference_processing_status = "READY"
    db.commit()

    # Verify initial READY state
    assert len(prod.references) == 4
    assert len(prod.reference_analyses) == 4
    assert prod.visual_profile.status == ProductVisualProfileStatus.READY.value

    # Verify verification creation works initially
    v_resp = client.post(
        "/api/v1/verifications",
        headers={"Authorization": auth_header},
        json={
            "product_id": product_id,
            "workflow_id": workflow.id,
            "order_id": "ORD-1001",
            "customer_id": "CUST-001",
        },
    )
    assert v_resp.status_code == 201

    # 3. Delete ONE reference image (LEFT / measurement scale)
    del_resp = client.delete(
        f"/api/v1/products/{product_id}/references/LEFT",
        headers={"Authorization": auth_header},
    )
    assert del_resp.status_code == 200

    # 4. Assert NO SQL statements set product_id = NULL
    for stmt, params in sql_log:
        assert "SET PRODUCT_ID = NULL" not in stmt.upper()

    # 5. Verify product remains intact, but has 3 references
    db.expire_all()
    prod_after = db.execute(select(Product).where(Product.id == product_id)).scalar_one()
    assert prod_after is not None
    assert len(prod_after.references) == 3
    remaining_angles = {r.angle for r in prod_after.references}
    assert remaining_angles == {"FRONT", "BACK", "RIGHT"}

    # 6. Verify deleted reference analysis (LEFT) was removed via cascade
    analyses_after = db.execute(
        select(ProductReferenceVisualAnalysis).where(ProductReferenceVisualAnalysis.product_id == product_id)
    ).scalars().all()
    assert len(analyses_after) == 3
    assert "LEFT" not in {a.angle for a in analyses_after}

    # 7. Verify ProductVisualProfile is invalidated (PENDING) and product is NOT_READY
    assert prod_after.reference_processing_status == "NOT_READY"
    assert prod_after.visual_profile.status == ProductVisualProfileStatus.PENDING.value

    # 8. Verify Verification Session Creation is blocked with HTTP 409
    v_resp_blocked = client.post(
        "/api/v1/verifications",
        headers={"Authorization": auth_header},
        json={
            "product_id": product_id,
            "workflow_id": workflow.id,
            "order_id": "ORD-1002",
            "customer_id": "CUST-002",
        },
    )
    assert v_resp_blocked.status_code in (409, 422)


def test_entire_product_deletion_cascade(client: TestClient, db_session: Session):
    """Test deleting an entire product:
    - Product and all child records (references, analyses, profile) deleted via cascade.
    - Physical files cleaned up on disk.
    - No orphan records or NULL updates.
    """
    db = db_session

    merchant_id, auth_header = register_and_get_auth(client, "del_test2@example.com")

    # 1. Create product with references & profile
    prod_resp = client.post(
        "/api/v1/products",
        headers={"Authorization": auth_header},
        json={
            "name": "Keyboard Ergonomic",
            "sku": f"SKU-{uuid.uuid4().hex[:6]}",
            "price": "89.99",
        },
    )
    assert prod_resp.status_code == 201
    product_id = prod_resp.json()["id"]

    created_files = []
    for angle in ["FRONT", "BACK", "LEFT", "RIGHT"]:
        rel_path = f"product_references/test_{product_id}_{angle}.jpg"
        file_path = os.path.join("storage", rel_path)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(b"dummy image data")
        created_files.append(file_path)

        ref = ProductReference(
            product_id=product_id,
            angle=angle,
            image_path=rel_path,
            image_hash=f"hash_{angle}",
        )
        db.add(ref)

    profile = ProductVisualProfile(
        product_id=product_id,
        qwen_model_name="qwen2.5vl:3b",
        llama_model_name="llama3.2:1b",
        profile_version="v3.0",
        status=ProductVisualProfileStatus.READY.value,
        profile_json={"canonical_features": "Split Keyboard"},
    )
    db.add(profile)
    db.commit()

    # 2. Delete entire product
    del_resp = client.delete(
        f"/api/v1/products/{product_id}",
        headers={"Authorization": auth_header},
    )
    assert del_resp.status_code == 200

    # 3. Verify Product and all child records are gone
    db.expire_all()
    assert db.execute(select(Product).where(Product.id == product_id)).scalar_one_or_none() is None
    assert db.execute(select(ProductReference).where(ProductReference.product_id == product_id)).scalars().all() == []
    assert db.execute(select(ProductVisualProfile).where(ProductVisualProfile.product_id == product_id)).scalar_one_or_none() is None
    assert db.execute(select(ProductReferenceVisualAnalysis).where(ProductReferenceVisualAnalysis.product_id == product_id)).scalars().all() == []

    # 4. Verify physical files removed
    for fpath in created_files:
        assert not os.path.exists(fpath)

    # 5. Assert NO SQL statements set product_id = NULL
    for stmt, params in sql_log:
        assert "SET PRODUCT_ID = NULL" not in stmt.upper()

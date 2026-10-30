import os
import sys
import uuid
from decimal import Decimal
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.core.database import SessionLocal
from app.models.merchant import Merchant
from app.models.product import Product
from app.models.verification import VerificationSession, SessionStatus
from app.models.workflow import Workflow
from app.core.security import create_access_token, hash_password

def run_tests():
    client = TestClient(app)
    db = SessionLocal()
    
    # 1. Fetch or create merchant A
    merchant_a = db.query(Merchant).filter(Merchant.email == "merchant@example.com").first()
    if not merchant_a:
        merchant_a = Merchant(
            email="merchant@example.com",
            business_name="Merchant A Store",
            password_hash=hash_password("password123"),
            is_active=True
        )
        db.add(merchant_a)
        db.commit()
        db.refresh(merchant_a)
        
    token_a = create_access_token(subject=str(merchant_a.id))
    headers_a = {"Authorization": f"Bearer {token_a}"}
    
    # 2. Fetch or create merchant B for isolation tests
    merchant_b = db.query(Merchant).filter(Merchant.email == "merchant_b@example.com").first()
    if not merchant_b:
        merchant_b = Merchant(
            email="merchant_b@example.com",
            business_name="Merchant B Store",
            password_hash=hash_password("password123"),
            is_active=True
        )
        db.add(merchant_b)
        db.commit()
        db.refresh(merchant_b)
        
    token_b = create_access_token(subject=str(merchant_b.id))
    headers_b = {"Authorization": f"Bearer {token_b}"}
    
    print("\n--- 1. Testing Product Creation & Database Persistence ---")
    sku_unique = f"SKU-{uuid.uuid4().hex[:8].upper()}"
    create_payload = {
        "name": "Precision Wireless Gaming Mouse",
        "sku": sku_unique,
        "price": 3499.00,
        "description": "Ergonomic RGB gaming mouse with 26K DPI optical sensor"
    }
    
    res = client.post("/api/v1/products", json=create_payload, headers=headers_a)
    assert res.status_code == 201, f"Failed to create product: {res.text}"
    prod_data = res.json()
    prod_id = prod_data["id"]
    print(f"Created Product ID: {prod_id}")
    print(f"Name: {prod_data['name']}, SKU: {prod_data['sku']}, Price: INR {prod_data['price']}")
    assert prod_data["name"] == create_payload["name"]
    assert prod_data["sku"] == sku_unique
    assert prod_data["reference_angles_count"] == 0
    assert prod_data["reference_processing_status"] == "NOT_READY"
    
    # Verify in SQLite DB
    db_prod = db.query(Product).filter(Product.id == prod_id).first()
    assert db_prod is not None, "Product was not persisted to SQLite database"
    assert db_prod.merchant_id == merchant_a.id
    print("Database persistence confirmed: Product exists in SQLite with correct merchant ownership.")
    
    print("\n--- 2. Testing Direct Product Retrieval by ID (GET /api/v1/products/{id}) ---")
    res_get = client.get(f"/api/v1/products/{prod_id}", headers=headers_a)
    assert res_get.status_code == 200, f"Failed to get product: {res_get.text}"
    get_data = res_get.json()
    assert get_data["id"] == prod_id
    assert get_data["sku"] == sku_unique
    assert get_data["reference_angles_count"] == 0
    print(f"Direct retrieval succeeded: {get_data['name']} (0/4 Angles Ready)")
    
    print("\n--- 3. Testing Merchant Catalog List (GET /api/v1/products) ---")
    res_list = client.get("/api/v1/products", headers=headers_a)
    assert res_list.status_code == 200
    list_items = res_list.json()
    matching = [p for p in list_items if p["id"] == prod_id]
    assert len(matching) == 1, "New product not returned in merchant catalog list"
    print(f"Catalog list verified: Product appears in catalog ({len(list_items)} total products).")
    
    print("\n--- 4. Testing Merchant Isolation (Merchant B cannot access or delete Product A) ---")
    res_b_get = client.get(f"/api/v1/products/{prod_id}", headers=headers_b)
    assert res_b_get.status_code == 404, f"Merchant B was able to view Merchant A's product: {res_b_get.status_code}"
    
    res_b_del = client.delete(f"/api/v1/products/{prod_id}", headers=headers_b)
    assert res_b_del.status_code == 404, f"Merchant B was able to delete Merchant A's product: {res_b_del.status_code}"
    print("Merchant isolation verified: Other merchant receives 404 Not Found.")
    
    print("\n--- 5. Testing Hard Deletion of Unreferenced Product ---")
    res_del = client.delete(f"/api/v1/products/{prod_id}", headers=headers_a)
    assert res_del.status_code == 200, f"Delete failed: {res_del.text}"
    del_res = res_del.json()
    print(f"Delete response: {del_res}")
    assert del_res["status"] == "deleted"
    
    # Confirm it is removed from DB
    db_del_check = db.query(Product).filter(Product.id == prod_id).first()
    assert db_del_check is None, "Product was not removed from SQLite database"
    print("Hard deletion confirmed: Product removed cleanly from database.")
    
    print("\n--- 6. Testing Historical Verification Protection (Archiving) ---")
    # Create a product that will have an associated verification session
    sku_historical = f"SKU-HIST-{uuid.uuid4().hex[:6].upper()}"
    p_hist_res = client.post("/api/v1/products", json={
        "name": "Historical Audit Protected Product",
        "sku": sku_historical,
        "price": 12999.00,
        "description": "Product tied to historical verification records"
    }, headers=headers_a)
    p_hist_id = p_hist_res.json()["id"]
    
    # Create or fetch a workflow
    wf = db.query(Workflow).filter(Workflow.merchant_id == merchant_a.id).first()
    if not wf:
        wf = Workflow(
            merchant_id=merchant_a.id,
            name="Standard Verification Flow",
            is_active=True
        )
        db.add(wf)
        db.commit()
        db.refresh(wf)
        
    from datetime import datetime, timedelta, timezone
    # Create a historical VerificationSession referencing this product
    v_session = VerificationSession(
        verification_id=f"VR-HIST-{uuid.uuid4().hex[:6].upper()}",
        merchant_id=merchant_a.id,
        product_id=p_hist_id,
        workflow_id=wf.id,
        workflow_version=1,
        workflow_snapshot_json={"steps": []},
        customer_name="Historical Customer",
        customer_contact="hist@customer.com",
        customer_token_hash=uuid.uuid4().hex,
        expires_at=datetime.now(timezone.utc) + timedelta(days=3),
        order_id="ORD-HIST-001",
        refund_reason="Damaged in transit",
        status=SessionStatus.COMPLETED.value
    )
    db.add(v_session)
    db.commit()
    print(f"Created historical VerificationSession: {v_session.verification_id} referencing product {p_hist_id}")
    
    # Now attempt to delete this product
    del_hist_res = client.delete(f"/api/v1/products/{p_hist_id}", headers=headers_a)
    assert del_hist_res.status_code == 200, f"Delete historical failed: {del_hist_res.text}"
    del_hist_data = del_hist_res.json()
    print(f"Delete response: {del_hist_data}")
    assert del_hist_data["status"] == "archived", "Product with historical sessions should be archived, not hard-deleted!"
    
    # Verify product in DB is flagged as is_archived = True
    db_hist_prod = db.query(Product).filter(Product.id == p_hist_id).first()
    assert db_hist_prod is not None, "Archived product record was deleted!"
    assert db_hist_prod.is_archived is True, "Product is_archived was not set to True!"
    
    # Verify historical session still references the product intact
    v_check = db.query(VerificationSession).filter(VerificationSession.id == v_session.id).first()
    assert v_check is not None, "VerificationSession was deleted!"
    assert v_check.product_id == p_hist_id, "VerificationSession product reference broken!"
    
    # Verify archived product does NOT appear in active products list
    res_active_list = client.get("/api/v1/products", headers=headers_a)
    active_ids = [p["id"] for p in res_active_list.json()]
    assert p_hist_id not in active_ids, "Archived product still appears in active catalog list!"
    print("Protection verified: Archived product safely excluded from active catalog while preserving historical verification audits.")
    
    # Historical investigation pages can still retrieve the archived product details by ID
    res_hist_get = client.get(f"/api/v1/products/{p_hist_id}", headers=headers_a)
    assert res_hist_get.status_code == 200, "Historical inspection cannot retrieve archived product!"
    print(f"Historical detail retrieval confirmed: Product {res_hist_get.json()['name']} still accessible for audits.")
    
    print("\nALL PRODUCT LIFECYCLE, CREATION, RETRIEVAL, DELETION AND ARCHIVE TESTS PASSED SUCCESSFULLY!")
    db.close()

if __name__ == "__main__":
    run_tests()

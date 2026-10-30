"""Product management business logic."""
import logging
from typing import List
from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.product_reference import ReferenceAngle
from app.schemas.product import (
    ProductCreateRequest,
    ProductUpdateRequest,
    ProductReferenceStatusResponse,
)
from app.utils.file_storage import delete_reference_file

logger = logging.getLogger(__name__)


def create_product(db: Session, merchant_id: str, data: ProductCreateRequest) -> Product:
    """Create a new product for the authenticated merchant with SKU uniqueness check."""
    existing = db.execute(
        select(Product).where(
            Product.merchant_id == merchant_id,
            Product.sku == data.sku,
        )
    ).scalar_one_or_none()

    if existing:
        logger.warning("Duplicate SKU '%s' attempted for merchant id %s", data.sku, merchant_id)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Product with SKU '{data.sku}' already exists in your inventory",
        )

    product = Product(
        merchant_id=merchant_id,
        name=data.name,
        sku=data.sku,
        description=data.description,
        price=data.price,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    logger.info("Created product %s (SKU: %s) for merchant %s", product.id, product.sku, merchant_id)
    return product


def list_merchant_products(db: Session, merchant_id: str, include_archived: bool = False) -> List[Product]:
    """Retrieve all products owned by the authenticated merchant (active only by default)."""
    query = select(Product).where(Product.merchant_id == merchant_id)
    if not include_archived:
        query = query.where(Product.is_archived == False)
    return list(
        db.execute(
            query.order_by(Product.created_at.desc())
        ).scalars().all()
    )


def get_merchant_product(db: Session, merchant_id: str, product_id: str) -> Product:
    """Retrieve a single product ensuring strict merchant ownership.
    
    Returns HTTP 404 if the product does not exist or belongs to another merchant.
    """
    product = db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.merchant_id == merchant_id,
        )
    ).scalar_one_or_none()

    if not product:
        # Never reveal existence of another merchant's product
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    return product


def update_merchant_product(
    db: Session,
    merchant_id: str,
    product_id: str,
    data: ProductUpdateRequest,
) -> Product:
    """Update product details with ownership and SKU uniqueness enforcement."""
    product = get_merchant_product(db, merchant_id, product_id)

    # Check for SKU conflict if SKU is being modified
    if data.sku is not None and data.sku != product.sku:
        existing = db.execute(
            select(Product).where(
                Product.merchant_id == merchant_id,
                Product.sku == data.sku,
                Product.id != product_id,
            )
        ).scalar_one_or_none()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Product with SKU '{data.sku}' already exists in your inventory",
            )
        product.sku = data.sku

    if data.name is not None:
        product.name = data.name

    if data.description is not None:
        product.description = data.description

    if data.price is not None:
        product.price = data.price

    db.commit()
    db.refresh(product)
    logger.info("Updated product %s for merchant %s", product.id, merchant_id)
    return product


def delete_merchant_product(db: Session, merchant_id: str, product_id: str) -> dict:
    """Delete a merchant's product and cleanup all associated reference image files safely.
    
    If historical verification sessions reference this product, archive it to protect
    historical verification records, customer evidence, and audit integrity.
    If unreferenced, hard delete cleanly.
    """
    product = get_merchant_product(db, merchant_id, product_id)

    from app.models.verification import VerificationSession
    session_count = db.execute(
        select(func.count()).select_from(VerificationSession).where(VerificationSession.product_id == product.id)
    ).scalar() or 0

    if session_count > 0:
        # Soft delete / archive to protect historical verification records
        product.is_archived = True
        db.commit()
        logger.info(
            "Product %s has %d historical verification session(s). Archived product to preserve historical audits for merchant %s",
            product_id, session_count, merchant_id,
        )
        return {
            "status": "archived",
            "message": f"Product '{product.name}' archived to preserve {session_count} historical verification record(s)",
            "product_id": product_id,
        }

    # No historical sessions reference this product: remove physical reference image files
    for ref in product.references:
        if ref.image_path:
            try:
                delete_reference_file(ref.image_path)
            except Exception as exc:
                logger.warning("Could not delete reference file %s: %s", ref.image_path, exc)

    db.delete(product)
    db.commit()
    logger.info("Deleted product %s and associated reference files for merchant %s", product_id, merchant_id)
    return {
        "status": "deleted",
        "message": f"Product '{product.name}' and all associated reference baselines deleted successfully",
        "product_id": product_id,
    }


def get_product_completeness(
    db: Session,
    merchant_id: str,
    product_id: str,
) -> ProductReferenceStatusResponse:
    """Calculate the availability and AI analysis status of all 4 trusted reference angles (FRONT, BACK, LEFT, RIGHT)."""
    product = get_merchant_product(db, merchant_id, product_id)

    uploaded_map = {ref.angle.upper(): ref for ref in product.references}
    uploaded_angles = set(uploaded_map.keys())

    status_map = {
        "front": ReferenceAngle.FRONT.value in uploaded_angles,
        "back": ReferenceAngle.BACK.value in uploaded_angles,
        "left": ReferenceAngle.LEFT.value in uploaded_angles,
        "right": ReferenceAngle.RIGHT.value in uploaded_angles,
    }

    # Fetch reference analysis statuses
    from app.models.product_reference_analysis import ProductReferenceVisualAnalysis
    analysis_records = db.execute(
        select(ProductReferenceVisualAnalysis).where(ProductReferenceVisualAnalysis.product_id == product.id)
    ).scalars().all()

    analysis_by_angle = {a.angle.upper(): a.status for a in analysis_records}

    angle_analysis_status: Dict[str, str] = {}
    for angle in ["FRONT", "BACK", "LEFT", "RIGHT"]:
        if angle not in uploaded_angles:
            angle_analysis_status[angle] = "MISSING"
        else:
            angle_analysis_status[angle] = analysis_by_angle.get(angle, "PENDING")

    existing_count = sum(1 for v in status_map.values() if v)
    required_count = len(status_map)
    is_comp = existing_count == required_count

    processing_status = getattr(product, "reference_processing_status", "NOT_READY") or "NOT_READY"

    return ProductReferenceStatusResponse(
        product_id=product.id,
        reference_status=status_map,
        reference_processing_status=processing_status,
        angle_analysis_status=angle_analysis_status,
        complete=is_comp,
        is_complete=is_comp,
        existing_count=existing_count,
        required_count=required_count,
    )

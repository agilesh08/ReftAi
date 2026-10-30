from decimal import Decimal
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import String, Text, Numeric, DateTime, ForeignKey, UniqueConstraint, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utc_now() -> datetime:
    """Return current UTC datetime."""
    return datetime.now(timezone.utc)


class Product(Base):
    """Registered merchant product model."""
    __tablename__ = "products"

    __table_args__ = (
        UniqueConstraint("merchant_id", "sku", name="uq_merchant_product_sku"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    merchant_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("merchants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    sku: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        default=None,
    )
    price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    reference_processing_status: Mapped[str] = mapped_column(
        String(36),
        default="NOT_READY",
        nullable=False,
    )
    is_archived: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    # Relationships
    merchant = relationship("Merchant", back_populates="products")
    references = relationship(
        "ProductReference",
        back_populates="product",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    visual_profile = relationship(
        "ProductVisualProfile",
        back_populates="product",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False,
    )
    reference_analyses = relationship(
        "ProductReferenceVisualAnalysis",
        back_populates="product",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    @property
    def reference_count(self) -> int:
        """Count of uploaded reference images."""
        return len(self.references) if self.references else 0

    @property
    def reference_angles_count(self) -> int:
        """Alias for reference_count matching frontend expectation."""
        return self.reference_count

    @property
    def is_ready(self) -> bool:
        """Strict readiness: 4 canonical angles + READY status + READY visual profile."""
        return (
            self.reference_processing_status == "READY"
            and self.reference_count >= 4
            and bool(self.visual_profile and getattr(self.visual_profile, "status", None) == "READY")
        )

    def __repr__(self) -> str:
        return f"<Product id={self.id} sku={self.sku} name={self.name} merchant_id={self.merchant_id}>"

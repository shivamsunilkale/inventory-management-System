from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class StockTransfer(Base):
    __tablename__ = "stock_transfers"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    source_location = Column(Integer, ForeignKey("locators.id", ondelete="SET NULL"), nullable=True)
    destination_location = Column(Integer, ForeignKey("locators.id", ondelete="SET NULL"), nullable=True)
    source_category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    destination_category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    quantity = Column(Integer, nullable=False)
    status = Column(String(20), default="pending")  # pending, processing, completed, cancelled
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Name columns for display without joins
    source_subinventory_name = Column(String(255), nullable=True)
    source_locator_name = Column(String(255), nullable=True)
    source_category_name = Column(String(255), nullable=True)
    source_product_name = Column(String(255), nullable=True)
    destination_subinventory_name = Column(String(255), nullable=True)
    destination_locator_name = Column(String(255), nullable=True)
    destination_category_name = Column(String(255), nullable=True)

    # Improved relationships with consistent back_populates pattern
    product = relationship("Product", back_populates="transfers")
    creator = relationship("User", back_populates="transfers_created")
    source = relationship("Locator", foreign_keys=[source_location], back_populates="outgoing_transfers")
    destination = relationship("Locator", foreign_keys=[destination_location], back_populates="incoming_transfers")
    source_category = relationship("Category", foreign_keys=[source_category_id], back_populates="outgoing_transfers")
    destination_category = relationship("Category", foreign_keys=[destination_category_id], back_populates="incoming_transfers")

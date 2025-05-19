from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Add location relationship
    locator_id = Column(Integer, ForeignKey("locators.id"), nullable=True)
    sub_inventory_id = Column(Integer, ForeignKey("sub_inventories.id"), nullable=True)
    
    # Relationships
    products = relationship("Product", back_populates="category")
    locator = relationship("Locator", back_populates="categories")
    sub_inventory = relationship("SubInventory", back_populates="categories")
    
    # Stock transfer relationships
    outgoing_transfers = relationship("StockTransfer", foreign_keys="StockTransfer.source_category_id", back_populates="source_category")
    incoming_transfers = relationship("StockTransfer", foreign_keys="StockTransfer.destination_category_id", back_populates="destination_category")

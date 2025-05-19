from sqlalchemy import Column, Integer, String, Date, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    legal_address = Column(String(500), nullable=True)
    gst_number = Column(String(50), nullable=True)
    vat_number = Column(String(50), nullable=True)
    cin = Column(String(50), nullable=True)
    pan_number = Column(String(20), nullable=True)
    start_date = Column(Date, nullable=True)
    attachment_path = Column(String(255), nullable=True)
    
    # Relationships
    sub_inventories = relationship("SubInventory", back_populates="organization", cascade="all, delete-orphan")

class SubInventory(Base):
    __tablename__ = "sub_inventories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50))  # raw, finished, etc.
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    
    # Relationships
    organization = relationship("Organization", back_populates="sub_inventories")
    locators = relationship("Locator", back_populates="sub_inventory", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="sub_inventory")

class Locator(Base):
    __tablename__ = "locators"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), nullable=False)
    description = Column(String(255))
    length = Column(Float)
    width = Column(Float)
    height = Column(Float)
    sub_inventory_id = Column(Integer, ForeignKey("sub_inventories.id"))
    
    # Relationships
    sub_inventory = relationship("SubInventory", back_populates="locators")
    categories = relationship("Category", back_populates="locator")
    outgoing_transfers = relationship("StockTransfer", 
                                    foreign_keys="StockTransfer.source_location", 
                                    back_populates="source")
    incoming_transfers = relationship("StockTransfer", 
                                    foreign_keys="StockTransfer.destination_location", 
                                    back_populates="destination")

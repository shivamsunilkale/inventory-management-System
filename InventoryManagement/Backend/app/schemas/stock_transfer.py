from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime

class StockTransferCreate(BaseModel):
    product_id: int
    source_location: int  # Source locator ID
    destination_location: int  # Destination locator ID
    quantity: int
    notes: Optional[str] = None
    source_category: Optional[int] = None  # Source category ID
    destination_category: Optional[int] = None  # Destination category ID

class StockTransferUpdate(BaseModel):
    status: str  # 'pending', 'processing', 'completed', 'cancelled'
    notes: Optional[str] = None

# Define a ProductBase schema for nested product representation
class ProductBase(BaseModel):
    id: int
    name: str
    
    class Config:
        from_attributes = True

# Define a LocatorBase schema for nested locator representation
class LocatorBase(BaseModel):
    id: int
    code: str
    
    class Config:
        from_attributes = True

class StockTransferResponse(BaseModel):
    id: int
    product_id: int
    source_location: Optional[int] = None
    destination_location: Optional[int] = None
    quantity: int
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Name fields for display without joins
    source_subinventory_name: Optional[str] = None
    source_locator_name: Optional[str] = None
    source_category_name: Optional[str] = None
    source_product_name: Optional[str] = None
    destination_subinventory_name: Optional[str] = None
    destination_locator_name: Optional[str] = None
    destination_category_name: Optional[str] = None
    
    # Enhanced relationship representations
    product: Optional[Dict[str, Any]] = None
    source: Optional[Dict[str, Any]] = None
    destination: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, obj):
        # Convert SQLAlchemy object to dict
        data = {c.name: getattr(obj, c.name) for c in obj.__table__.columns}
        
        # Add product data if available
        if hasattr(obj, 'product') and obj.product:
            data['product'] = {
                'id': obj.product.id,
                'name': obj.product.name
            }
        
        # Add source locator data if available
        if hasattr(obj, 'source') and obj.source:
            data['source'] = {
                'id': obj.source.id,
                'code': obj.source.code
            }
        
        # Add destination locator data if available
        if hasattr(obj, 'destination') and obj.destination:
            data['destination'] = {
                'id': obj.destination.id,
                'code': obj.destination.code
            }
            
        return cls(**data)

class StockHistoryResponse(BaseModel):
    id: str  # Composite ID for in/out movement
    date: datetime
    quantity: int
    type: str  # 'in' or 'out'
    location: int  # Locator ID
    product_id: int
    transfer_id: int

    class Config:
        from_attributes = True
        
    # Add this method to allow for dictionary-based instantiation
    @classmethod
    def from_dict(cls, data):
        return cls(**data)

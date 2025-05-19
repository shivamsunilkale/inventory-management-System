from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from .base import ProductBase, CategoryBase

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime
    category_id: Optional[int]
    category: Optional[CategoryBase] = None

    class Config:
        from_attributes = True

# New ProductOut schema for detailed product responses
class ProductOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: float
    stock: int
    category_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    # Include category details if needed
    category: Optional[CategoryBase] = None
    
    class Config:
        from_attributes = True  # This is equivalent to orm_mode=True in Pydantic v1

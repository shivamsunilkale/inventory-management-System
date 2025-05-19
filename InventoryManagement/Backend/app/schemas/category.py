from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from .product import Product

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    sub_inventory_id: Optional[int] = None
    locator_id: Optional[int] = None

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime
    products: List[Product] = []

    class Config:
        from_attributes = True

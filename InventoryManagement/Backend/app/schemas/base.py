from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    stock: int

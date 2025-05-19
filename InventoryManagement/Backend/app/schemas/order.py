from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from .product import Product as ProductSchema  # Add this import

class OrderItemBase(BaseModel):
    product_id: int
    quantity: int
    price: float

class OrderItem(OrderItemBase):
    id: Optional[int] = None
    order_id: Optional[int] = None
    product: Optional[ProductSchema] = None  # Add product field

    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    items: List[OrderItemBase]
    type: str = "sell"  # sell or purchase
    customer_id: Optional[int] = None

class OrderResponse(BaseModel):
    id: int
    user_id: int
    customer_id: Optional[int] = None  # Make this optional since purchases won't have customers
    customer_name: Optional[str] = None  # Add customer_name field
    order_type: str  # Added this required field
    status: str
    total: float
    created_at: datetime
    updated_at: datetime
    items: List[OrderItem]

    class Config:
        from_attributes = True

        @staticmethod
        def get_items(obj):
            return obj.order_items if hasattr(obj, 'order_items') else []

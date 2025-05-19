from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

order_products = Table(
    'order_products',
    Base.metadata,
    Column('order_id', Integer, ForeignKey('orders.id'), primary_key=True),
    Column('product_id', Integer, ForeignKey('products.id'), primary_key=True),
    Column('quantity', Integer, nullable=False),
    Column('price', Float, nullable=False),
    Column('created_at', DateTime, default=datetime.utcnow)
)

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    customer_name = Column(String(255), nullable=True)  # Added customer name column
    order_type = Column(String(50), default="sell")  # sell or purchase
    status = Column(String(50), default="pending")
    total = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="orders")
    customer = relationship("Customer", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order", lazy="joined", cascade="all, delete-orphan")

    @property
    def items(self):
        return self.order_items

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer)
    price = Column(Float)
    
    order = relationship("Order", back_populates="order_items")
    product = relationship("Product", lazy="joined")  # Change to joined loading

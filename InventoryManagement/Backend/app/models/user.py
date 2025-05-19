from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from ..database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    username = Column(String(255))
    hashed_password = Column(String(255))
    privileges = Column(Integer)

    # Relationships
    orders = relationship("Order", back_populates="user")
    transfers_created = relationship("StockTransfer", back_populates="creator")

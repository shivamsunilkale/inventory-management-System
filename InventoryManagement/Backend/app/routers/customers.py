from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.customer import Customer
from ..schemas.customer import CustomerCreate, Customer as CustomerSchema
from ..utils import get_current_user

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.post("/", response_model=CustomerSchema)
async def create_customer(
    customer: CustomerCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_customer = Customer(**customer.dict())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

@router.get("/", response_model=List[CustomerSchema])
async def get_customers(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return db.query(Customer).all()

@router.get("/{customer_id}", response_model=CustomerSchema)
async def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.put("/{customer_id}", response_model=CustomerSchema)
async def update_customer(
    customer_id: int,
    customer_data: CustomerCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Update customer attributes
    for key, value in customer_data.dict().items():
        setattr(db_customer, key, value)
    
    db.commit()
    db.refresh(db_customer)
    return db_customer

@router.delete("/{customer_id}", response_model=dict)
async def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    db.delete(db_customer)
    db.commit()
    return {"message": "Customer deleted successfully"}

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.category import Category
from ..models.organization import Locator, SubInventory
from ..schemas.category import CategoryCreate, Category as CategorySchema
from ..utils import get_current_user
from ..models.product import Product
from ..schemas.product import ProductCreate, Product as ProductSchema

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.post("/", response_model=CategorySchema)
async def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Validate sub-inventory and locator if provided
    if category.sub_inventory_id:
        sub_inventory = db.query(SubInventory).filter(SubInventory.id == category.sub_inventory_id).first()
        if not sub_inventory:
            raise HTTPException(status_code=404, detail="Sub-inventory not found")
    
    if category.locator_id:
        locator = db.query(Locator).filter(Locator.id == category.locator_id).first()
        if not locator:
            raise HTTPException(status_code=404, detail="Locator not found")
        
        # Verify locator belongs to selected sub-inventory
        if category.sub_inventory_id and locator.sub_inventory_id != category.sub_inventory_id:
            raise HTTPException(
                status_code=400, 
                detail="Locator does not belong to the selected sub-inventory"
            )

    db_category = Category(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@router.get("/", response_model=List[CategorySchema]) 
async def get_categories(db: Session = Depends(get_db)):
    # Get categories with products eagerly loaded
    return db.query(Category).all()

@router.put("/{category_id}", response_model=CategorySchema)
async def update_category(
    category_id: int,
    category: CategoryCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Update fields
    for field, value in category.dict(exclude_unset=True).items():
        setattr(db_category, field, value)
    
    try:
        db.commit()
        db.refresh(db_category)
        return db_category
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{category_id}")
async def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db.delete(category)
    db.commit()
    return {"message": "Category deleted successfully"}

@router.post("/{category_id}/products", response_model=ProductSchema)
async def add_product_to_category(
    category_id: int,
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Check if category exists
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Create new product with category_id
    product_data = product.model_dump()  # Use model_dump() instead of dict()
    db_product = Product(**product_data, category_id=category_id)
    
    try:
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        return db_product
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{category_id}/products/{product_id}", response_model=ProductSchema)
async def update_product_in_category(
    category_id: int,
    product_id: int,
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Verify category exists
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Get and verify product exists and belongs to category
    db_product = db.query(Product).filter(
        Product.id == product_id,
        Product.category_id == category_id
    ).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found in this category")

    # Update product fields
    for field, value in product.model_dump(exclude_unset=True).items():
        setattr(db_product, field, value)
    
    try:
        db.commit()
        db.refresh(db_product)
        return db_product
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{category_id}/products/{product_id}")
async def delete_product_from_category(
    category_id: int,
    product_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Verify category exists
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Get and verify product exists and belongs to category
    db_product = db.query(Product).filter(
        Product.id == product_id,
        Product.category_id == category_id
    ).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found in this category")

    try:
        db.delete(db_product)
        db.commit()
        return {"message": "Product deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
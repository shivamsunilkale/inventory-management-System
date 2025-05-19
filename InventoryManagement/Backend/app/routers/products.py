from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timedelta
from ..database import get_db
from ..models.product import Product
from ..models.stock_transfer import StockTransfer
from ..schemas.product import ProductCreate, Product as ProductSchema, ProductOut
from ..schemas.stock_transfer import StockHistoryResponse
from ..utils import get_current_user
import logging

# Add logger for debugging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/products", tags=["Products"])

@router.post("/", response_model=ProductSchema)
async def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_product = Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.get("/", response_model=List[ProductSchema])
async def get_products(db: Session = Depends(get_db)):
    # Use joinedload to eager load category relationship
    return db.query(Product).options(joinedload(Product.category)).all()

@router.get("/{product_id}", response_model=ProductSchema)
async def get_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.get("/by-category/{category_id}", response_model=List[ProductSchema])
async def get_products_by_category(
    category_id: int,
    db: Session = Depends(get_db)
):
    return db.query(Product).filter(Product.category_id == category_id).all()

@router.get("/detailed/{product_id}", response_model=ProductOut)
async def get_product_detailed(
    product_id: int,
    db: Session = Depends(get_db)
):
    """
    Fetch a product by ID with detailed information, demonstrating Pydantic from_orm usage.
    
    This endpoint shows how to:
    1. Query a SQLAlchemy model from MySQL
    2. Use Pydantic for response serialization
    3. Properly handle ORM objects with from_orm
    """
    # Query the database for the product with eager loading of category
    product = db.query(Product).options(
        joinedload(Product.category)
    ).filter(Product.id == product_id).first()
    
    # Handle case when product is not found
    if not product:
        raise HTTPException(status_code=404, detail=f"Product with ID {product_id} not found")
    
    # Convert SQLAlchemy model to Pydantic model using from_orm
    # Note: In Pydantic v2, we'd use model_validate instead of from_orm
    try:
        # Try the modern Pydantic v2 approach first
        try:
            return ProductOut.model_validate(product)
        except AttributeError:
            # Fall back to Pydantic v1 approach if model_validate is not available
            return ProductOut.from_orm(product)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error serializing product data: {str(e)}"
        )

@router.get("/{product_id}/history", response_model=List[StockHistoryResponse])
async def get_product_history(
    product_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get stock movement history for a specific product
    """
    try:
        logger.debug(f"Fetching stock history for product ID: {product_id}")
        
        # Check if product exists
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product with ID {product_id} not found")
        
        # Create a base query
        query = db.query(StockTransfer).filter(StockTransfer.product_id == product_id)
        
        # Only get completed transfers for accurate history
        query = query.filter(StockTransfer.status == 'completed')
        
        # Apply date filters if provided
        if start_date:
            try:
                start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                query = query.filter(StockTransfer.created_at >= start)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format")
        
        if end_date:
            try:
                end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query = query.filter(StockTransfer.created_at <= end)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format")
        
        # Default to last 6 months if no dates provided
        if not start_date and not end_date:
            six_months_ago = datetime.now() - timedelta(days=180)
            query = query.filter(StockTransfer.created_at >= six_months_ago)
        
        # Order by date
        transfers = query.order_by(StockTransfer.created_at).all()
        logger.debug(f"Found {len(transfers)} transfers for product ID: {product_id}")
        
        # Convert to history response format
        history_items = []
        for transfer in transfers:
            # Outgoing from source
            history_items.append({
                "id": f"{transfer.id}-out",
                "date": transfer.created_at,
                "quantity": -transfer.quantity,  # Negative for outgoing
                "type": "out",
                "notes": f"Transfer from {transfer.source_locator_name or 'unknown'} to {transfer.destination_locator_name or 'unknown'}",
                "location": transfer.source_location,
                "product_id": transfer.product_id,
                "transfer_id": transfer.id
            })
            
            # Incoming to destination
            history_items.append({
                "id": f"{transfer.id}-in",
                "date": transfer.created_at,
                "quantity": transfer.quantity,  # Positive for incoming
                "type": "in",
                "notes": f"Transfer from {transfer.source_locator_name or 'unknown'} to {transfer.destination_locator_name or 'unknown'}",
                "location": transfer.destination_location,
                "product_id": transfer.product_id,
                "transfer_id": transfer.id
            })
        
        logger.debug(f"Returning {len(history_items)} history items for product ID: {product_id}")
        return history_items
        
    except HTTPException:
        # Re-raise HTTP exceptions to preserve status code
        raise
    except Exception as e:
        logger.exception(f"Error in get_product_history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

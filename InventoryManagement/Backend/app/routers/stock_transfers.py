from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from ..database import get_db
from ..models.stock_transfer import StockTransfer
from ..models.product import Product
from ..models.organization import Locator, SubInventory  # Fixed import
from ..models.category import Category
from ..schemas.stock_transfer import StockTransferCreate, StockTransferUpdate, StockTransferResponse
from ..utils import get_current_user
from datetime import datetime, timedelta
import logging
from fastapi.responses import FileResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import os

# Create reports directory if it doesn't exist
REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)

router = APIRouter(prefix="/stock-transfers", tags=["Stock Transfers"])

# Add logger for debugging
logger = logging.getLogger(__name__)

@router.post("/", response_model=StockTransferResponse)
async def create_stock_transfer(
    transfer: StockTransferCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create a new stock transfer
    """
    try:
        logger.debug(f"Creating stock transfer: {transfer}")
        
        # Check if product exists
        product = db.query(Product).filter(Product.id == transfer.product_id).first()
        if not product:
            logger.error(f"Product ID {transfer.product_id} not found")
            raise HTTPException(status_code=404, detail="Product not found")

        # Check if source and destination locations are different
        if transfer.source_location == transfer.destination_location:
            logger.error(f"Source and destination locations are the same: {transfer.source_location}")
            raise HTTPException(status_code=400, detail="Source and destination locations must be different")

        # Check if sufficient stock is available
        if product.stock < transfer.quantity:
            logger.error(f"Insufficient stock. Available: {product.stock}, Requested: {transfer.quantity}")
            raise HTTPException(status_code=400, detail="Insufficient stock available")
            
        # Get source and destination location details including names
        
        # Get source locator with related sub-inventory
        source_locator = db.query(Locator).filter(Locator.id == transfer.source_location).first()
        if source_locator:
            source_subinventory = db.query(SubInventory).filter(SubInventory.id == source_locator.sub_inventory_id).first()
            # Get source category if provided
            source_category = None
            if hasattr(transfer, 'source_category') and transfer.source_category:
                source_category = db.query(Category).filter(Category.id == transfer.source_category).first()
        
        # Get destination locator with related sub-inventory
        destination_locator = db.query(Locator).filter(Locator.id == transfer.destination_location).first()
        if destination_locator:
            destination_subinventory = db.query(SubInventory).filter(SubInventory.id == destination_locator.sub_inventory_id).first()
            # Get destination category if provided
            destination_category = None
            if hasattr(transfer, 'destination_category') and transfer.destination_category:
                destination_category = db.query(Category).filter(Category.id == transfer.destination_category).first()

        # Create stock transfer with names
        db_transfer = StockTransfer(
            product_id=transfer.product_id,
            source_location=transfer.source_location,
            destination_location=transfer.destination_location,
            quantity=transfer.quantity,
            status="pending",
            notes=transfer.notes,
            created_by=current_user.id,
            # Add category IDs
            source_category_id=transfer.source_category if hasattr(transfer, 'source_category') else None,
            destination_category_id=transfer.destination_category if hasattr(transfer, 'destination_category') else None,
            # Add name fields
            source_product_name=product.name,
            source_locator_name=source_locator.code if source_locator else None,
            source_subinventory_name=source_subinventory.name if 'source_subinventory' in locals() and source_subinventory else None,
            source_category_name=source_category.name if 'source_category' in locals() and source_category else None,
            destination_locator_name=destination_locator.code if destination_locator else None,
            destination_subinventory_name=destination_subinventory.name if 'destination_subinventory' in locals() and destination_subinventory else None,
            destination_category_name=destination_category.name if 'destination_category' in locals() and destination_category else None
        )
        
        logger.debug(f"Adding transfer to database: {db_transfer}")
        db.add(db_transfer)
        db.commit()
        db.refresh(db_transfer)
        return db_transfer
    except HTTPException:
        # Re-raise HTTP exceptions as they're already handled
        raise
    except Exception as e:
        logger.exception(f"Error creating stock transfer: {str(e)}")
        db.rollback()  # Rollback the transaction on error
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/", response_model=List[StockTransferResponse])
async def get_stock_transfers(
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get all stock transfers with optional filtering
    """
    try:
        logger.debug("Fetching stock transfers")
        
        # Create a base query with eager loading of the product relationship
        query = db.query(StockTransfer).options(
            joinedload(StockTransfer.product, innerjoin=False)
        )
        
        # Apply filters
        if status:
            query = query.filter(StockTransfer.status == status)
            logger.debug(f"Filtering by status: {status}")
        
        if start_date:
            try:
                start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                query = query.filter(StockTransfer.created_at >= start)
                logger.debug(f"Filtering by start date: {start}")
            except ValueError as e:
                logger.error(f"Invalid start_date format: {e}")
                raise HTTPException(status_code=400, detail="Invalid start_date format")
        
        if end_date:
            try:
                end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query = query.filter(StockTransfer.created_at <= end)
                logger.debug(f"Filtering by end date: {end}")
            except ValueError as e:
                logger.error(f"Invalid end_date format: {e}")
                raise HTTPException(status_code=400, detail="Invalid end_date format")
        
        # Order by most recent first
        transfers = query.order_by(StockTransfer.created_at.desc()).all()
        logger.debug(f"Found {len(transfers)} transfers")
        
        # Handle empty results
        if not transfers:
            logger.info("No transfers found")
            return []
        
        # Safely create response objects
        response_transfers = []
        for transfer in transfers:
            # Create base transfer dictionary
            transfer_dict = {
                "id": transfer.id,
                "product_id": transfer.product_id,
                "source_location": transfer.source_location,
                "destination_location": transfer.destination_location,
                "quantity": transfer.quantity,
                "status": transfer.status,
                "notes": transfer.notes,
                "created_at": transfer.created_at,
                "updated_at": transfer.updated_at,
                "source_subinventory_name": transfer.source_subinventory_name,
                "source_locator_name": transfer.source_locator_name,
                "source_category_name": transfer.source_category_name,
                "source_product_name": transfer.source_product_name,
                "destination_subinventory_name": transfer.destination_subinventory_name,
                "destination_locator_name": transfer.destination_locator_name,
                "destination_category_name": transfer.destination_category_name,
                # Safely handle product relationship
                "product": None
            }
            
            # Check if product exists and add its details
            if hasattr(transfer, 'product') and transfer.product is not None:
                transfer_dict["product"] = {
                    "id": transfer.product.id,
                    "name": transfer.product.name
                }
            # If using query without eager loading, fetch product manually
            elif transfer.product_id:
                product = db.query(Product).filter(Product.id == transfer.product_id).first()
                if product:
                    transfer_dict["product"] = {
                        "id": product.id,
                        "name": product.name
                    }
            
            response_transfers.append(transfer_dict)
        
        return response_transfers
        
    except HTTPException:
        # Re-raise HTTP exceptions as they're already handled
        raise
    except Exception as e:
        logger.exception(f"Error in get_stock_transfers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{transfer_id}", response_model=StockTransferResponse)
async def get_stock_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get a specific stock transfer by ID
    """
    try:
        # Query with eager loading of all relationships
        transfer = db.query(StockTransfer).options(
            joinedload(StockTransfer.product),
            joinedload(StockTransfer.source),
            joinedload(StockTransfer.destination),
            joinedload(StockTransfer.creator)
        ).filter(StockTransfer.id == transfer_id).first()
        
        if not transfer:
            raise HTTPException(status_code=404, detail="Stock transfer not found")
            
        # Use the from_orm method from our enhanced schema
        return StockTransferResponse.from_orm(transfer)
        
    except Exception as e:
        logger.exception(f"Error fetching stock transfer {transfer_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.put("/{transfer_id}/approve", response_model=StockTransferResponse)
async def approve_stock_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Approve a stock transfer (change status to processing)
    """
    try:
        # Query with eager loading of relationships
        transfer = db.query(StockTransfer).options(
            joinedload(StockTransfer.product)
        ).filter(StockTransfer.id == transfer_id).first()
        
        if not transfer:
            raise HTTPException(status_code=404, detail="Stock transfer not found")
        
        if transfer.status != "pending":
            raise HTTPException(status_code=400, detail=f"Cannot approve transfer with status '{transfer.status}'")
        
        transfer.status = "processing"
        transfer.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(transfer)
        
        # Use the from_orm method for consistent response handling
        return StockTransferResponse.from_orm(transfer)
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        logger.exception(f"Error approving stock transfer {transfer_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.put("/{transfer_id}/complete", response_model=StockTransferResponse)
async def complete_stock_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Complete a stock transfer (move the stock and change status to completed)
    """
    try:
        logger.info(f"Processing completion of transfer ID: {transfer_id}")
        
        # Begin transaction with proper relationship loading
        transfer = db.query(StockTransfer).options(
            joinedload(StockTransfer.product),
            joinedload(StockTransfer.source),
            joinedload(StockTransfer.destination)
        ).filter(StockTransfer.id == transfer_id).first()
        
        if not transfer:
            raise HTTPException(status_code=404, detail="Stock transfer not found")
        
        if transfer.status != "processing":
            raise HTTPException(status_code=400, detail=f"Cannot complete transfer with status '{transfer.status}'")
        
        # Get source product - use the relationship if available
        source_product = transfer.product
        if not source_product:
            # Fallback to direct query if relationship isn't loaded
            source_product = db.query(Product).filter(Product.id == transfer.product_id).first()
            if not source_product:
                raise HTTPException(status_code=404, detail=f"Source product ID {transfer.product_id} not found")
        
        # Check if sufficient stock is still available
        if source_product.stock < transfer.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock available. Requested: {transfer.quantity}, Available: {source_product.stock}")
        
        # Handle destination product
        # First check if this product already exists at the destination location & category
        destination_product = None
        
        # Get proper destination category ID
        destination_category_id = None
        
        # Log what we're doing with debug info
        logger.info(f"Transfer data: destination_category_name={transfer.destination_category_name}")
        
        # Direct approach: Use destination_category_id from transfer if available
        if transfer.destination_category_id is not None:
            destination_category_id = transfer.destination_category_id
            logger.info(f"Using direct destination_category_id: {destination_category_id}")
        # Fallback approach - use the destination_category_name to find the category
        elif transfer.destination_category_name:
            destination_category = db.query(Category).filter(
                Category.name == transfer.destination_category_name
            ).first()
            if destination_category:
                destination_category_id = destination_category.id
                logger.info(f"Found destination category ID {destination_category_id} from name lookup")
            else:
                logger.warning(f"Could not find category with name: {transfer.destination_category_name}")
        else:
            logger.warning("No destination category information found in transfer record")
        
        logger.info(f"Final destination category ID for product creation: {destination_category_id}")
        logger.info(f"Checking for existing product '{source_product.name}' at destination with category ID: {destination_category_id}")

        if destination_category_id:
            destination_product = db.query(Product).filter(
                Product.name == source_product.name,
                Product.category_id == destination_category_id
            ).first()
        
        if destination_product:
            # Product exists at destination - update the stock
            logger.info(f"Found existing product at destination. Adding {transfer.quantity} units to existing stock of {destination_product.stock}")
            destination_product.stock += transfer.quantity
        else:
            # Product doesn't exist at destination - create a new product entry
            logger.info(f"Creating new product entry at destination for '{source_product.name}'")
            destination_product = Product(
                name=source_product.name,
                description=source_product.description,
                price=source_product.price,
                stock=transfer.quantity,
                category_id=destination_category_id
            )
            db.add(destination_product)
        
        # Deduct stock from source product
        logger.info(f"Deducting {transfer.quantity} units from source product {source_product.id} ({source_product.name})")
        source_product.stock -= transfer.quantity
        
        # Update the transfer status
        transfer.status = "completed"
        transfer.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(transfer)
        logger.info(f"Successfully completed transfer ID: {transfer_id}")
        
        # Use the from_orm method for consistent response handling
        return StockTransferResponse.from_orm(transfer)
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        logger.exception(f"Error completing stock transfer: {str(e)}")
        db.rollback()  # Rollback the transaction on error
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.put("/{transfer_id}/cancel", response_model=StockTransferResponse)
async def cancel_stock_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Cancel a stock transfer
    """
    try:
        # Query with eager loading of relationships
        transfer = db.query(StockTransfer).options(
            joinedload(StockTransfer.product)
        ).filter(StockTransfer.id == transfer_id).first()
        
        if not transfer:
            raise HTTPException(status_code=404, detail="Stock transfer not found")
        
        if transfer.status == "completed":
            raise HTTPException(status_code=400, detail="Cannot cancel a completed transfer")
        
        transfer.status = "cancelled"
        transfer.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(transfer)
        
        # Use the from_orm method for consistent response handling
        return StockTransferResponse.from_orm(transfer)
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        logger.exception(f"Error cancelling stock transfer {transfer_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

def generate_stock_transfer_report(transfer: StockTransfer, db: Session) -> str:
    """
    Generate a PDF report for a stock transfer
    """
    try:
        report_path = os.path.join(REPORTS_DIR, f"stock_transfer_{transfer.id}.pdf")
        
        c = canvas.Canvas(report_path, pagesize=letter)
        width, height = letter
        
        # Draw report content
        c.setFont("Helvetica-Bold", 24)
        c.drawString(50, height - 50, f"Stock Transfer #{transfer.id}")
        
        # Add status in a highlighted box
        status = transfer.status.upper() if transfer.status else "UNKNOWN"
        c.setFillColorRGB(0.9, 0.9, 0.9)  # Light gray background
        c.rect(width - 150, height - 60, 100, 25, fill=True, stroke=False)
        c.setFillColorRGB(0, 0, 0)  # Black text
        c.setFont("Helvetica-Bold", 14)
        c.drawString(width - 145, height - 45, f"{status}")
        
        # Basic transfer details
        c.setFont("Helvetica", 12)
        
        # Handle date formatting defensively
        try:
            if transfer.created_at:
                c.drawString(50, height - 80, f"Date: {transfer.created_at.strftime('%Y-%m-%d %H:%M')}")
            else:
                c.drawString(50, height - 80, "Date: Unknown")
        except Exception as date_error:
            logger.warning(f"Error formatting created_at date: {date_error}")
            c.drawString(50, height - 80, "Date: Format error")
            
        try:
            if transfer.updated_at:
                c.drawString(50, height - 100, f"Last Updated: {transfer.updated_at.strftime('%Y-%m-%d %H:%M')}")
        except Exception as date_error:
            logger.warning(f"Error formatting updated_at date: {date_error}")
        
        # Get product details
        product = None
        if transfer.product_id:
            try:
                product = db.query(Product).filter(Product.id == transfer.product_id).first()
            except Exception as prod_error:
                logger.warning(f"Error fetching product {transfer.product_id}: {prod_error}")
        
        # Product details
        y = height - 130
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, y, "Product Information")
        y -= 20
        
        c.setFont("Helvetica", 12)
        if product:
            c.drawString(50, y, f"Name: {product.name}")
        else:
            product_name = transfer.source_product_name or 'Unknown Product'
            c.drawString(50, y, f"Name: {product_name}")
        y -= 20
        
        c.drawString(50, y, f"Quantity: {transfer.quantity}")
        y -= 30
        
        # Transfer details
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, y, "Transfer Information")
        y -= 20
        
        c.setFont("Helvetica", 12)
        source_sub = transfer.source_subinventory_name or ''
        source_loc = transfer.source_locator_name or 'Unknown'
        source_info = f"{source_sub} > {source_loc}"
        c.drawString(50, y, f"From: {source_info}")
        y -= 20
        
        dest_sub = transfer.destination_subinventory_name or ''
        dest_loc = transfer.destination_locator_name or 'Unknown'
        dest_info = f"{dest_sub} > {dest_loc}"
        c.drawString(50, y, f"To: {dest_info}")
        y -= 30
        
        # Category information
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, y, "Category Information")
        y -= 20
        
        c.setFont("Helvetica", 12)
        if transfer.source_category_name:
            c.drawString(50, y, f"Source Category: {transfer.source_category_name}")
            y -= 20
        
        if transfer.destination_category_name:
            c.drawString(50, y, f"Destination Category: {transfer.destination_category_name}")
            y -= 30
        
        # Notes section if present
        if transfer.notes:
            c.setFont("Helvetica-Bold", 14)
            c.drawString(50, y, "Notes")
            y -= 20
            
            c.setFont("Helvetica", 12)
            try:
                # Split notes into multiple lines if needed
                max_width = width - 100
                notes_lines = []
                current_line = ""
                for word in transfer.notes.split():
                    test_line = current_line + " " + word if current_line else word
                    if c.stringWidth(test_line, "Helvetica", 12) < max_width:
                        current_line = test_line
                    else:
                        notes_lines.append(current_line)
                        current_line = word
                if current_line:
                    notes_lines.append(current_line)
                
                for line in notes_lines:
                    c.drawString(50, y, line)
                    y -= 15
            except Exception as notes_error:
                logger.warning(f"Error formatting notes: {notes_error}")
                c.drawString(50, y, "(Error displaying notes)")
                y -= 15
        
        # Add company footer
        y = 50
        # Use Helvetica instead of Helvetica-Italic which might not be available
        c.setFont("Helvetica", 10)
        c.drawString(50, y, "This document was generated by Inventory Management System")
        y -= 15
        c.drawString(50, y, f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        
        c.save()
        return report_path
    except Exception as e:
        logger.error(f"Failed to generate PDF for stock transfer {transfer.id}: {str(e)}", exc_info=True)
        # Instead of returning None, raise the exception to get proper error handling
        raise e

@router.get("/{transfer_id}/report")
async def get_stock_transfer_report(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get a PDF report for a specific stock transfer
    """
    try:
        logger.info(f"Generating PDF report for stock transfer ID: {transfer_id}")
        
        # Query with eager loading of all relationships
        transfer = db.query(StockTransfer).options(
            joinedload(StockTransfer.product),
            joinedload(StockTransfer.source),
            joinedload(StockTransfer.destination),
            joinedload(StockTransfer.creator)
        ).filter(StockTransfer.id == transfer_id).first()
        
        if not transfer:
            logger.error(f"Stock transfer with ID {transfer_id} not found")
            raise HTTPException(status_code=404, detail="Stock transfer not found")
        
        logger.info(f"Found stock transfer {transfer_id}, generating PDF report")
        
        # Always generate a fresh report to ensure latest data
        try:
            report_path = generate_stock_transfer_report(transfer, db)
            
            if not report_path or not os.path.exists(report_path):
                logger.error(f"Report file not found at expected path: {report_path}")
                raise HTTPException(status_code=500, detail="Report file not found after generation")
            
            logger.info(f"Successfully generated report at {report_path}")
            
            return FileResponse(
                report_path,
                media_type="application/pdf",
                filename=f"stock_transfer_{transfer.id}_report.pdf"
            )
        except Exception as report_error:
            logger.exception(f"Failed to generate report for transfer {transfer_id}: {str(report_error)}")
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to generate report: {str(report_error)}"
            )
        
    except HTTPException:
        # Re-raise HTTP exceptions as they already have appropriate status codes and details
        raise
    except Exception as e:
        logger.exception(f"Unexpected error serving report for stock transfer {transfer_id}: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Unexpected error generating report: {str(e)}"
        )

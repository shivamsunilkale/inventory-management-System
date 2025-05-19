from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.stock_transfer import StockTransfer
from ..schemas.stock_transfer import StockHistoryResponse
from ..utils import get_current_user
from datetime import datetime, timedelta
import logging

# Add logger for debugging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stock-history", tags=["Stock History"])

@router.get("/", response_model=List[StockHistoryResponse])
async def get_stock_history(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get stock movement history for dashboard visualizations
    """
    try:
        logger.debug("Fetching stock history data")
        
        # Create a base query
        query = db.query(StockTransfer)
        
        # Only get completed transfers for accurate history
        query = query.filter(StockTransfer.status == 'completed')
        
        # Apply date filters if provided
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
        
        # Default to last 6 months if no dates provided
        if not start_date and not end_date:
            six_months_ago = datetime.now() - timedelta(days=180)
            query = query.filter(StockTransfer.created_at >= six_months_ago)
            logger.debug(f"Using default date range: {six_months_ago} to now")
        
        # Order by date
        transfers = query.order_by(StockTransfer.created_at).all()
        logger.debug(f"Found {len(transfers)} transfers")
        
        # Generate empty history if no transfers found
        if not transfers:
            logger.info("No transfers found, returning empty history")
            return []
            
        # Convert to history response format
        history_items = []
        for transfer in transfers:
            # Outgoing from source
            history_items.append({
                "id": f"{transfer.id}-out",
                "date": transfer.created_at,
                "quantity": transfer.quantity,
                "type": "out",
                "location": transfer.source_location,
                "product_id": transfer.product_id,
                "transfer_id": transfer.id
            })
            
            # Incoming to destination
            history_items.append({
                "id": f"{transfer.id}-in",
                "date": transfer.created_at,
                "quantity": transfer.quantity,
                "type": "in",
                "location": transfer.destination_location,
                "product_id": transfer.product_id,
                "transfer_id": transfer.id
            })
        
        logger.debug(f"Returning {len(history_items)} history items")
        return history_items
        
    except Exception as e:
        logger.exception(f"Error in get_stock_history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

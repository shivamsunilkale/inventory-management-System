from fastapi import APIRouter, Depends, HTTPException, Response, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from typing import List
from ..database import get_db
from ..models.order import Order, OrderItem
from ..models.product import Product
from ..schemas.order import OrderCreate, OrderResponse
from ..utils import get_current_user
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import os
import json
from pydantic import BaseModel
from datetime import datetime
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Create reports directory if it doesn't exist
REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post("/", response_model=OrderResponse)
async def create_order(
    order: OrderCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Calculate total and create order
    total = sum(item.quantity * item.price for item in order.items)
    
    # Get customer_name if customer_id is provided
    customer_name = None
    if hasattr(order, 'customer_id') and order.customer_id:
        from ..models.customer import Customer
        customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
        if customer:
            customer_name = customer.name
    
    # Create order with type and customer information if provided
    db_order = Order(
        user_id=current_user.id,
        customer_id=getattr(order, 'customer_id', None),
        customer_name=customer_name,
        order_type=getattr(order, 'type', 'sell'),
        total=total
    )
    db.add(db_order)
    db.flush()  # Get order ID without committing

    # Create order items and validate stock availability but don't update stock yet
    for item in order.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        
        # For sell orders, only check if there's enough stock
        if order.type == 'sell':
            if product.stock < item.quantity:
                db.rollback()
                raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}")
            # No stock deduction here - will happen at approval time
        
        # Create order item
        order_item = OrderItem(
            order_id=db_order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            price=item.price
        )
        db.add(order_item)

    # Generate initial report
    report_path = generate_order_report(db_order, db)
    db_order.report_url = report_path

    db.commit()
    return db_order

def generate_order_report(order: Order, db: Session) -> str:
    try:
        report_path = os.path.join(REPORTS_DIR, f"order_{order.id}.pdf")
        
        c = canvas.Canvas(report_path, pagesize=letter)
        width, height = letter
        
        # Draw report content
        c.setFont("Helvetica-Bold", 24)
        c.drawString(50, height - 50, f"Order #{order.id}")
        
        # Add order type in a highlighted box
        order_type = order.order_type.upper() if order.order_type else "UNKNOWN"
        c.setFillColorRGB(0.9, 0.9, 0.9)  # Light gray background
        c.rect(width - 150, height - 60, 100, 25, fill=True, stroke=False)
        c.setFillColorRGB(0, 0, 0)  # Black text
        c.setFont("Helvetica-Bold", 14)
        c.drawString(width - 145, height - 45, f"{order_type} ORDER")
        
        # Fetch customer details if customer_id exists
        customer = None
        if order.customer_id:
            from ..models.customer import Customer
            customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
        
        # Order details
        c.setFont("Helvetica", 12)
        c.drawString(50, height - 80, f"Date: {order.created_at.strftime('%Y-%m-%d %H:%M')}")
        c.drawString(50, height - 100, f"Status: {order.status}")
        
        # Customer details
        y = height - 120
        if customer:
            c.setFont("Helvetica-Bold", 14)
            c.drawString(50, y, "Customer Information")
            y -= 20
            
            c.setFont("Helvetica", 12)
            c.drawString(50, y, f"Name: {customer.name}")
            y -= 20
            
            if customer.email:
                c.drawString(50, y, f"Email: {customer.email}")
                y -= 20
                
            if customer.address:
                c.drawString(50, y, f"Address: {customer.address}")
                y -= 20
                
            if customer.city and customer.state:
                c.drawString(50, y, f"City/State: {customer.city}, {customer.state} {customer.pin if customer.pin else ''}")
                y -= 20
                
            if customer.gst:
                c.drawString(50, y, f"GST Number: {customer.gst}")
                y -= 20
        elif order.customer_name:
            c.setFont("Helvetica-Bold", 14)
            c.drawString(50, y, "Customer Information")
            y -= 20
            
            c.setFont("Helvetica", 12)
            c.drawString(50, y, f"Name: {order.customer_name}")
            y -= 20
            
        # Add spacing before product table
        y -= 20
            
        # Products table header
        c.setFont("Helvetica-Bold", 10)
        c.drawString(50, y, "Product")
        c.drawString(250, y, "Quantity")
        c.drawString(350, y, "Price (Rs)")
        c.drawString(450, y, "Total (Rs)")
        
        # Products list
        y -= 20
        total = 0
        c.setFont("Helvetica", 10)
        for item in order.order_items:
            product = db.query(Product).get(item.product_id)
            if product:
                c.drawString(50, y, product.name[:30])
                c.drawString(250, y, str(item.quantity))
                c.drawString(350, y, f"Rs{item.price:.2f}")
                item_total = item.quantity * item.price
                c.drawString(450, y, f"Rs{item_total:.2f}")
                total += item_total
                y -= 20

        # Total
        c.setFont("Helvetica-Bold", 12)
        c.drawString(350, y - 20, f"Total: Rs{total:.2f}")
        
        c.save()
        return report_path
    except Exception as e:
        logger.error(f"Failed to generate PDF for order {order.id}: {str(e)}")
        return None

@router.get("/", response_model=List[OrderResponse])
async def get_orders(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        # Check if the user is an inventory manager (privileges=1) or admin (privileges=3)
        if current_user.privileges in [1, 3]:  # 1=inventory_manager, 3=admin
            orders = (
                db.query(Order)
                .options(
                    joinedload(Order.order_items).joinedload(OrderItem.product)
                )
                .all()
            )
        else:
            orders = (
                db.query(Order)
                .filter(Order.user_id == current_user.id)
                .options(
                    joinedload(Order.order_items).joinedload(OrderItem.product)
                )
                .all()
            )
        return orders
    except Exception as e:
        logger.error(f"Error fetching orders: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching orders: {str(e)}")

@router.get("/{order_id}/report")
async def get_order_report(
    order_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Check if the user is an inventory manager (privileges=1) or admin (privileges=3)
    if current_user.privileges in [1, 3]:  # 1=inventory_manager, 3=admin
        # Admins and inventory managers can view any order report
        order = db.query(Order).options(
            joinedload(Order.order_items).joinedload(OrderItem.product)
        ).filter(Order.id == order_id).first()
    else:
        # Regular users can only view their own order reports
        order = db.query(Order).options(
            joinedload(Order.order_items).joinedload(OrderItem.product)
        ).filter(
            Order.id == order_id,
            Order.user_id == current_user.id
        ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    try:
        # Check if report already exists
        report_path = os.path.join(REPORTS_DIR, f"order_{order.id}.pdf")
        # Always regenerate the report to ensure it has the latest data
        report_path = generate_order_report(order, db)
        
        if not report_path or not os.path.exists(report_path):
            raise HTTPException(status_code=500, detail="Failed to generate report")
        
        return FileResponse(
            report_path,
            media_type="application/pdf",
            filename=f"order_{order.id}_report.pdf"
        )
    except Exception as e:
        logger.error(f"Error serving report for order {order_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating report")

class OrderStatusUpdate(BaseModel):
    status: str

@router.put("/{order_id}/status")
async def update_order_status(
    order_id: int,
    status_update: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Optional: Validate status
    valid_statuses = ["pending", "processing", "completed"]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    order.status = status_update.status
    db.commit()
    return {"message": "Order status updated successfully"}

@router.delete("/{order_id}")
async def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Check if the user is an inventory manager or admin
    if current_user.privileges in [1, 3]:  # 1=inventory_manager, 3=admin
        order = db.query(Order).filter(Order.id == order_id).first()
    else:
        # Regular users can only delete their own orders
        order = db.query(Order).filter(
            Order.id == order_id,
            Order.user_id == current_user.id
        ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    try:
        # Delete associated order items first
        db.query(OrderItem).filter(OrderItem.order_id == order_id).delete()
        
        # Then delete the order
        db.delete(order)
        db.commit()
        
        return {"message": "Order deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{order_id}/approve")
async def approve_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Approve an order and update inventory accordingly.
    This endpoint should be used by inventory managers to approve pending orders.
    """
    # Find the order without filtering by user_id to allow inventory managers to approve any order
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Validate order status - only pending or processing orders can be approved
    if order.status not in ["pending", "processing"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot approve order with status '{order.status}'. Only pending or processing orders can be approved."
        )
    
    try:
        # Update order status to completed
        order.status = "completed"
        order.updated_at = datetime.utcnow()
        
        # For sell orders, decrement product stock
        # For purchase orders, increment product stock
        for item in order.order_items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Product with ID {item.product_id} not found")
            
            if order.order_type == "sell":
                # Check if there's enough stock
                if product.stock < item.quantity:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Insufficient stock for {product.name}. Required: {item.quantity}, Available: {product.stock}"
                    )
                product.stock -= item.quantity
            else:  # purchase order
                product.stock += item.quantity
        
        # Commit all changes
        db.commit()
        
        return {
            "message": "Order approved successfully",
            "order_id": order.id,
            "status": order.status
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error approving order {order_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to approve order: {str(e)}")

@router.put("/{order_id}/reject")
async def reject_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Reject an order. This will set the status to cancelled and no inventory changes will occur.
    This endpoint should be used by inventory managers to reject pending orders.
    """
    # Find the order without filtering by user_id to allow inventory managers to reject any order
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Validate order status - only pending or processing orders can be rejected
    if order.status not in ["pending", "processing"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot reject order with status '{order.status}'. Only pending or processing orders can be rejected."
        )
    
    try:
        # Update order status to cancelled
        order.status = "cancelled"
        order.updated_at = datetime.utcnow()
        
        # Commit changes
        db.commit()
        
        return {
            "message": "Order rejected successfully",
            "order_id": order.id,
            "status": order.status
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error rejecting order {order_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to reject order: {str(e)}")

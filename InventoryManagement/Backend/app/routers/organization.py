from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from datetime import date, datetime
from ..database import get_db
from ..models.organization import Organization, SubInventory, Locator
from ..schemas.organization import (
    OrganizationCreate, Organization as OrgSchema,
    SubInventoryCreate, SubInventory as SubInvSchema,
    LocatorCreate, Locator as LocatorSchema
)
from ..utils import get_current_user

router = APIRouter(prefix="/organization", tags=["Organization"])

# Create upload directory
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Print the actual upload directory path for debugging
print(f"Organization attachment upload directory: {UPLOAD_DIR}")

# Helper function to fix file paths
def get_correct_file_path(stored_path):
    """Convert stored DB path to actual file path if needed"""
    # If it's already an absolute path and exists, return it
    if os.path.isabs(stored_path) and os.path.exists(stored_path):
        return stored_path
        
    # Try to find the file in UPLOAD_DIR
    filename = os.path.basename(stored_path)
    alternative_path = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(alternative_path):
        return alternative_path
        
    return stored_path  # Return original if alternatives don't work

@router.post("/", response_model=OrgSchema)
async def create_organization(
    organization: OrganizationCreate = Depends(OrganizationCreate.as_form),
    attachment: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        # Check if organization already exists and update it instead of creating new
        existing_org = db.query(Organization).first()
        
        if existing_org:
            # Update existing organization
            for field, value in organization.dict().items():
                if hasattr(existing_org, field):
                    setattr(existing_org, field, value)
            
            # Handle attachment update
            if attachment:
                # Remove old attachment if exists
                if existing_org.attachment_path and os.path.isfile(existing_org.attachment_path):
                    try:
                        os.remove(existing_org.attachment_path)
                    except Exception as e:
                        print(f"Error removing old attachment: {e}")
                
                # Save new attachment
                timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
                file_extension = os.path.splitext(attachment.filename)[1]
                safe_filename = f"org_doc_{timestamp}{file_extension}"
                file_path = os.path.join(UPLOAD_DIR, safe_filename)
                
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(attachment.file, buffer)
                existing_org.attachment_path = file_path
                print(f"Updated organization attachment path: {file_path}")
                
            db.commit()
            db.refresh(existing_org)  # Make sure to refresh to get the latest data
            return existing_org
        else:
            # Create new organization
            db_org = Organization(
                **organization.dict(exclude={'start_date'}) if organization.start_date is None 
                else organization.dict()
            )
            
            # Handle attachment if provided
            if attachment:
                timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
                file_extension = os.path.splitext(attachment.filename)[1]
                safe_filename = f"org_doc_{timestamp}{file_extension}"
                file_path = os.path.join(UPLOAD_DIR, safe_filename)
                
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(attachment.file, buffer)
                db_org.attachment_path = file_path
                print(f"New organization attachment path: {file_path}")
            
            db.add(db_org)
            db.commit()
            db.refresh(db_org)
            return db_org
    except Exception as e:
        if attachment:
            attachment.file.close()  # Ensure file is closed
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[OrgSchema])
async def get_organizations(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    orgs = db.query(Organization).all()
    # Log attachment paths for debugging
    for org in orgs:
        if org.attachment_path:
            print(f"Organization {org.id} has attachment path: {org.attachment_path}")
            print(f"File exists: {os.path.exists(org.attachment_path)}")
    return orgs

@router.get("/{org_id}/attachment")
async def get_organization_attachment(
    org_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        # Get the organization
        organization = db.query(Organization).filter(Organization.id == org_id).first()
        if not organization:
            print(f"Organization with ID {org_id} not found")
            raise HTTPException(status_code=404, detail="Organization not found")
        
        # Check if attachment path is set
        if not organization.attachment_path:
            print(f"Organization {org_id} has no attachment path")
            raise HTTPException(status_code=404, detail="No attachment path defined")
        
        # Print the path for debugging
        print(f"Attachment path from DB: {organization.attachment_path}")
        
        # Try to fix the path if needed
        corrected_path = get_correct_file_path(organization.attachment_path)
        print(f"Corrected attachment path: {corrected_path}")
        print(f"File exists: {os.path.isfile(corrected_path)}")
        print(f"Parent directory exists: {os.path.isdir(os.path.dirname(corrected_path))}")
        
        # Check if attachment exists
        if not os.path.isfile(corrected_path):
            print(f"Attachment file not found at: {corrected_path}")
            
            # Try to find file by name in uploads directory as a fallback
            filename = os.path.basename(organization.attachment_path)
            fallback_path = os.path.join(UPLOAD_DIR, filename)
            print(f"Trying fallback path: {fallback_path}")
            print(f"Fallback exists: {os.path.isfile(fallback_path)}")
            
            if os.path.isfile(fallback_path):
                corrected_path = fallback_path
            else:
                raise HTTPException(status_code=404, detail="Attachment file not found")
        
        # Get filename from path
        filename = os.path.basename(corrected_path)
        
        # Determine media type based on file extension
        file_extension = os.path.splitext(filename)[1].lower()
        media_type = None
        if file_extension in ['.pdf']:
            media_type = 'application/pdf'
        elif file_extension in ['.doc', '.docx']:
            media_type = 'application/msword'
        elif file_extension in ['.jpg', '.jpeg']:
            media_type = 'image/jpeg'
        elif file_extension in ['.png']:
            media_type = 'image/png'
        else:
            # Default to octet-stream for unknown types
            media_type = 'application/octet-stream'
            
        print(f"Serving file: {corrected_path}, type: {media_type}")
        
        # Return the file
        return FileResponse(
            path=corrected_path,
            filename=filename,
            media_type=media_type
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error serving attachment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error serving attachment: {str(e)}")

@router.post("/{org_id}/sub-inventory", response_model=SubInvSchema)
async def create_sub_inventory(
    org_id: int,
    sub_inv: SubInventoryCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_org = db.query(Organization).filter(Organization.id == org_id).first()
    if not db_org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    db_sub_inv = SubInventory(**sub_inv.dict(), organization_id=org_id)
    db.add(db_sub_inv)
    db.commit()
    db.refresh(db_sub_inv)
    return db_sub_inv

@router.post("/{org_id}/sub-inventory/{sub_inv_id}/locator", response_model=LocatorSchema)
async def create_locator(
    org_id: int,
    sub_inv_id: int,
    locator: LocatorCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_sub_inv = db.query(SubInventory).filter(
        SubInventory.id == sub_inv_id,
        SubInventory.organization_id == org_id
    ).first()
    
    if not db_sub_inv:
        raise HTTPException(status_code=404, detail="Sub-inventory not found")
        
    db_locator = Locator(**locator.dict(), sub_inventory_id=sub_inv_id)
    db.add(db_locator)
    db.commit()
    db.refresh(db_locator)
    return db_locator

@router.put("/{org_id}/sub-inventory/{sub_inv_id}", response_model=SubInvSchema)
async def update_sub_inventory(
    org_id: int,
    sub_inv_id: int,
    sub_inv_data: SubInventoryCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Verify the sub-inventory exists and belongs to this organization
    db_sub_inv = db.query(SubInventory).filter(
        SubInventory.id == sub_inv_id,
        SubInventory.organization_id == org_id
    ).first()
    
    if not db_sub_inv:
        raise HTTPException(status_code=404, detail="Sub-inventory not found")
    
    # Update fields
    for key, value in sub_inv_data.dict().items():
        setattr(db_sub_inv, key, value)
    
    db.commit()
    db.refresh(db_sub_inv)
    return db_sub_inv

@router.delete("/{org_id}/sub-inventory/{sub_inv_id}")
async def delete_sub_inventory(
    org_id: int,
    sub_inv_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        # Verify the sub-inventory exists and belongs to this organization
        db_sub_inv = db.query(SubInventory).filter(
            SubInventory.id == sub_inv_id,
            SubInventory.organization_id == org_id
        ).first()
        
        if not db_sub_inv:
            raise HTTPException(status_code=404, detail="Sub-inventory not found")
        
        # Handle categories associated with this sub-inventory
        if db_sub_inv.categories and len(db_sub_inv.categories) > 0:
            print(f"Found {len(db_sub_inv.categories)} categories associated with sub-inventory {sub_inv_id}")
            # Update categories to remove the sub_inventory reference
            for category in db_sub_inv.categories:
                category.sub_inventory_id = None
                category.locator_id = None
            db.commit()
        
        # Check for stock transfers associated with this sub-inventory's locators
        locator_ids = [locator.id for locator in db_sub_inv.locators]
        if locator_ids:
            # Import needed here to avoid circular imports
            from ..models.product import StockTransfer
            
            # Check for any pending transfers related to these locators
            pending_transfers = db.query(StockTransfer).filter(
                (StockTransfer.source_location.in_(locator_ids) | 
                StockTransfer.destination_location.in_(locator_ids)) &
                (StockTransfer.status != "completed") &
                (StockTransfer.status != "cancelled")
            ).all()
            
            if pending_transfers:
                # Cancel any pending transfers
                print(f"Cancelling {len(pending_transfers)} pending transfers for sub-inventory {sub_inv_id}")
                for transfer in pending_transfers:
                    transfer.status = "cancelled"
                    transfer.notes = f"{transfer.notes or ''} | Cancelled due to sub-inventory deletion"
                db.commit()
        
        # Delete the sub-inventory (this will cascade delete all locators)
        db.delete(db_sub_inv)
        db.commit()
        
        return {"detail": "Sub-inventory deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error deleting sub-inventory: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete sub-inventory: {str(e)}")

@router.put("/{org_id}/sub-inventory/{sub_inv_id}/locator/{locator_id}", response_model=LocatorSchema)
async def update_locator(
    org_id: int,
    sub_inv_id: int,
    locator_id: int,
    locator_data: LocatorCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Verify the locator exists and belongs to this sub-inventory
    db_locator = db.query(Locator).filter(
        Locator.id == locator_id,
        Locator.sub_inventory_id == sub_inv_id
    ).first()
    
    if not db_locator:
        raise HTTPException(status_code=404, detail="Locator not found")
    
    # Verify the sub-inventory belongs to this organization
    db_sub_inv = db.query(SubInventory).filter(
        SubInventory.id == sub_inv_id,
        SubInventory.organization_id == org_id
    ).first()
    
    if not db_sub_inv:
        raise HTTPException(status_code=404, detail="Sub-inventory not found")
    
    # Update fields
    for key, value in locator_data.dict().items():
        setattr(db_locator, key, value)
    
    db.commit()
    db.refresh(db_locator)
    return db_locator

@router.delete("/{org_id}/sub-inventory/{sub_inv_id}/locator/{locator_id}")
async def delete_locator(
    org_id: int,
    sub_inv_id: int,
    locator_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Verify the locator exists and belongs to this sub-inventory
    db_locator = db.query(Locator).filter(
        Locator.id == locator_id,
        Locator.sub_inventory_id == sub_inv_id
    ).first()
    
    if not db_locator:
        raise HTTPException(status_code=404, detail="Locator not found")
    
    # Verify the sub-inventory belongs to this organization
    db_sub_inv = db.query(SubInventory).filter(
        SubInventory.id == sub_inv_id,
        SubInventory.organization_id == org_id
    ).first()
    
    if not db_sub_inv:
        raise HTTPException(status_code=404, detail="Sub-inventory not found")
    
    db.delete(db_locator)
    db.commit()
    return {"detail": "Locator deleted successfully"}

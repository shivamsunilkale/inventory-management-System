from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from pydantic import BaseModel
from ..database import get_db
from ..models.user import User
from ..schemas.user import User as UserSchema
from ..utils import get_current_user, verify_password, hash_password
import logging

# Configure logger
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])

# Add this new model for password change
class PasswordChange(BaseModel):
    current_password: str
    new_password: str

@router.get("/", response_model=List[Dict])
async def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only admin users can view all users
    if current_user.privileges != 3:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to view user list"
        )
    
    users = db.query(User).all()
    # Log the users being returned
    logger.info(f"Returning {len(users)} users")
    for user in users:
        logger.info(f"User: {user.username}, privileges: {user.privileges}, type: {type(user.privileges)}")
    
    # Convert to dictionaries to ensure privileges is properly serialized as an integer
    return [
        {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "privileges": int(user.privileges)  # Explicitly cast to int
        }
        for user in users
    ]

@router.get("/me", response_model=Dict)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    # Log the current user information for debugging
    logger.info(f"Fetching user info: {current_user.username}, {current_user.email}, {current_user.privileges}")
    
    # Make sure to include privileges in the response
    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "privileges": current_user.privileges
    }

# Add this new endpoint for password change
@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify current password
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )
    
    # Update the password
    current_user.hashed_password = hash_password(password_data.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}

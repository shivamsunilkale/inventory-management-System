from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.orm import Session
from passlib.hash import bcrypt
import logging
from pydantic import BaseModel, EmailStr
from .schemas.user import UserCreate, UserLogin, TokenData
from .models.user import User
from .database import get_db
from .utils import create_access_token, create_refresh_token, verify_token
from dotenv import load_dotenv
import os

# Configure logger
logger = logging.getLogger(__name__)

load_dotenv()
router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/signup")
def register(user: UserCreate, db: Session = Depends(get_db)):
    try:
        if db.query(User).filter(User.email == user.email).first():
            raise HTTPException(status_code=400, detail="Email already registered")
            
        # Validate privilege level
        valid_privileges = {1: 'Worker', 2: 'Stock Keeper', 3: 'Admin'}
        if user.privileges not in valid_privileges:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid privilege level. Must be one of: {list(valid_privileges.values())}"
            )
            
        hashed_pw = bcrypt.hash(user.password)
        db_user = User(
            email=user.email,
            username=user.username,
            hashed_password=hashed_pw,
            privileges=user.privileges  # Store the privilege level
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        return {
            "message": "User created successfully",
            "status": "success",
            "user": {
                "email": user.email,
                "username": user.username,
                "privileges": user.privileges,
                "role": valid_privileges[user.privileges]
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=TokenData)
def login(user_data: UserLogin, response: Response, db: Session = Depends(get_db)):
    try:
        # Find user by email
        db_user = db.query(User).filter(User.email == user_data.email).first()
        
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # Use a try-catch block for bcrypt verification to handle potential issues
        try:
            if not bcrypt.verify(user_data.password, db_user.hashed_password):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )
        except ValueError as e:
            logger.error(f"BCrypt verification error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error verifying password"
            )

        # Check admin status
        if user_data.isAdmin and db_user.privileges != 3:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Admin privileges required."
            )

        if not user_data.isAdmin and db_user.privileges == 3:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please use admin login."
            )

        # Generate tokens
        token_data = {"sub": db_user.email, "privileges": db_user.privileges}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        # Add tokens to response cookies
        response.set_cookie(
            "access_token",
            access_token,
            httponly=True,
            samesite='lax',
            max_age=900  # 15 minutes
        )
        response.set_cookie(
            "refresh_token",
            refresh_token,
            httponly=True,
            samesite='lax',
            max_age=604800  # 7 days
        )
        
        user_data = {
            "email": db_user.email,
            "username": db_user.username,
            "privileges": db_user.privileges
        }

        return TokenData(
            access_token=access_token,
            refresh_token=refresh_token,
            user=user_data
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing your request"
        )

@router.post("/refresh", response_model=TokenData)
def refresh_token(response: Response, request: Request):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")

    try:
        payload = verify_token(refresh_token, os.getenv("JWT_REFRESH_SECRET_KEY"))
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
            
        email = payload.get("sub")
        token_data = {"sub": email}

        new_access_token = create_access_token(token_data)
        new_refresh_token = create_refresh_token(token_data)

        response.set_cookie("access_token", new_access_token, httponly=True)
        response.set_cookie("refresh_token", new_refresh_token, httponly=True)

        return {"access_token": new_access_token, "refresh_token": new_refresh_token}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

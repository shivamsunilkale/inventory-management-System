from pydantic import BaseModel, EmailStr
from typing import Optional, Dict

class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str
    privileges: Optional[int] = 1  # Changed to int with default value 1

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenData(BaseModel):
    access_token: str
    refresh_token: str
    user: Dict  # Add this field

class User(UserBase):
    id: int
    
    class Config:
        from_attributes = True  # This replaces orm_mode in Pydantic v2

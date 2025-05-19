from pydantic import BaseModel, EmailStr
from typing import Optional, Dict

class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str
    privileges: Optional[int] = 1

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    isAdmin: bool = False  # Add this field with a default value of False

class TokenData(BaseModel):
    access_token: str
    refresh_token: str
    user: Dict

class User(UserBase):
    id: int
    
    class Config:
        from_attributes = True

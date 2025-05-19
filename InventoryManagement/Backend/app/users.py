from fastapi import APIRouter, Depends
from .utils import get_current_user
from .models import User

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me")
def get_profile(user: User = Depends(get_current_user)):
    return {
        "email": user.email,
        "username": user.username,
        "privileges": user.privileges
    }

@router.get("/protected")
def protected(user: User = Depends(get_current_user)):
    return {"message": f"Hello {user.username}, you are authenticated"}

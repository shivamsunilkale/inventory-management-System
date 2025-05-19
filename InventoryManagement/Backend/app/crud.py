from sqlalchemy.orm import Session
from . import models, schemas

# Create a user
def create_user(db: Session, user: schemas.UserCreate):
    db_user = models.User(
        email=user.email,
        username=user.username,
        hashed_password=user.password,  # In production, hash the password before storing
        privileges=user.privileges
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

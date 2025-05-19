from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "mysql+mysqlconnector://root:1209@localhost/inventory_management"  # Replace with your database name

# Create a database engine
engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_size=10, max_overflow=20, pool_recycle=3600)

# Sessionmaker for creating DB sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Function to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from sqlalchemy import create_engine, MetaData, Table, Column, Integer, String, DateTime, text
from datetime import datetime

def create_customers_table(engine):
    meta = MetaData()
    
    customers = Table(
        'customers', meta,
        Column('id', Integer, primary_key=True),
        Column('name', String(255), nullable=False),
        Column('email', String(255), unique=True, nullable=False),
        Column('phone', String(20)),
        Column('address', String(500)),
        Column('created_at', DateTime, default=datetime.utcnow),
        Column('updated_at', DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    )
    
    meta.create_all(engine)

if __name__ == "__main__":
    from app.database import engine
    create_customers_table(engine)

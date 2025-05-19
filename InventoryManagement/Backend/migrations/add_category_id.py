from sqlalchemy import create_engine, MetaData, Table, Column, Integer, ForeignKey

def upgrade(engine):
    meta = MetaData(bind=engine)
    products = Table('products', meta, autoload=True)
    
    # Add category_id column with foreign key
    products.create_column(Column('category_id', Integer, ForeignKey('categories.id')))

def downgrade(engine):
    meta = MetaData(bind=engine)
    products = Table('products', meta, autoload=True)
    products.drop_column('category_id')

if __name__ == "__main__":
    from app.database import engine
    upgrade(engine)

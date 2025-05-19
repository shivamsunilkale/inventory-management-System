from sqlalchemy import create_engine, text
import mysql.connector
from mysql.connector import Error
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database connection parameters - update these to match your setup
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '1209',
    'database': 'inventory_management'
}

def execute_migration():
    """Add customer_name column to orders table"""
    connection = None
    try:
        # Connect to the MySQL database
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        # Check if the column already exists
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = %s 
            AND TABLE_NAME = 'orders' 
            AND COLUMN_NAME = 'customer_name'
        """, (DB_CONFIG['database'],))
        
        existing_columns = [col[0] for col in cursor.fetchall()]
        
        # Add customer_name column if it doesn't exist
        if 'customer_name' not in existing_columns:
            logger.info("Adding customer_name column to orders table...")
            cursor.execute("ALTER TABLE orders ADD COLUMN customer_name VARCHAR(255)")
            logger.info("Added customer_name column successfully.")
        else:
            logger.info("customer_name column already exists.")
            
        # Commit the changes
        connection.commit()
        logger.info("Migration completed successfully.")
        
        # Populate customer_name field for existing orders
        logger.info("Updating existing orders with customer names...")
        cursor.execute("""
            UPDATE orders o 
            JOIN customers c ON o.customer_id = c.id 
            SET o.customer_name = c.name 
            WHERE o.customer_id IS NOT NULL AND o.customer_name IS NULL
        """)
        
        rows_updated = cursor.rowcount
        connection.commit()
        logger.info(f"Updated {rows_updated} existing orders with customer names.")
        
    except Error as e:
        logger.error(f"Database error: {e}")
        # Rollback in case of error
        if connection and connection.is_connected():
            connection.rollback()
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()
            logger.info("Database connection closed.")

if __name__ == "__main__":
    logger.info("Starting migration to add customer_name column to orders table...")
    execute_migration()
    logger.info("Migration script completed.")
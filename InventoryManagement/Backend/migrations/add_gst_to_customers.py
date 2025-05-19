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
    'password': '1209',  # Update this with your actual password
    'database': 'inventory_management'
}

def execute_migration():
    """Add GST, city, state, and pin columns to customers table"""
    connection = None
    try:
        # Connect to the MySQL database
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        # Check if the columns already exist
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = %s 
            AND TABLE_NAME = 'customers' 
            AND COLUMN_NAME IN ('gst', 'city', 'state', 'pin')
        """, (DB_CONFIG['database'],))
        
        existing_columns = [col[0] for col in cursor.fetchall()]
        
        # Add gst column if it doesn't exist
        if 'gst' not in existing_columns:
            logger.info("Adding gst column to customers table...")
            cursor.execute("ALTER TABLE customers ADD COLUMN gst VARCHAR(20)")
            logger.info("Added gst column successfully.")
        else:
            logger.info("gst column already exists.")
            
        # Add city column if it doesn't exist
        if 'city' not in existing_columns:
            logger.info("Adding city column to customers table...")
            cursor.execute("ALTER TABLE customers ADD COLUMN city VARCHAR(100)")
            logger.info("Added city column successfully.")
        else:
            logger.info("city column already exists.")
            
        # Add state column if it doesn't exist
        if 'state' not in existing_columns:
            logger.info("Adding state column to customers table...")
            cursor.execute("ALTER TABLE customers ADD COLUMN state VARCHAR(100)")
            logger.info("Added state column successfully.")
        else:
            logger.info("state column already exists.")
            
        # Add pin column if it doesn't exist
        if 'pin' not in existing_columns:
            logger.info("Adding pin column to customers table...")
            cursor.execute("ALTER TABLE customers ADD COLUMN pin INT")
            logger.info("Added pin column successfully.")
        else:
            logger.info("pin column already exists.")
            
        # Commit the changes
        connection.commit()
        logger.info("Migration completed successfully.")
        
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
    logger.info("Starting migration to add columns to customers table...")
    execute_migration()
    logger.info("Migration script completed.")
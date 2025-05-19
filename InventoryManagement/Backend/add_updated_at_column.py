from sqlalchemy import create_engine
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
    """Add the missing updated_at column to stock_transfers table"""
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
            AND TABLE_NAME = 'stock_transfers' 
            AND COLUMN_NAME = 'updated_at'
        """, (DB_CONFIG['database'],))
        
        column_exists = cursor.fetchone() is not None
        
        # Add updated_at column if it doesn't exist
        if not column_exists:
            logger.info("Adding updated_at column to stock_transfers table...")
            cursor.execute("""
                ALTER TABLE stock_transfers 
                ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            """)
            logger.info("Added updated_at column successfully with DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
            
            # Update all existing rows to set updated_at equal to created_at 
            # (since we don't know when they were last updated)
            logger.info("Updating existing rows to set updated_at = created_at...")
            cursor.execute("""
                UPDATE stock_transfers
                SET updated_at = created_at
                WHERE updated_at IS NULL
            """)
            logger.info(f"Updated {cursor.rowcount} rows successfully.")
        else:
            logger.info("updated_at column already exists.")
            
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
    logger.info("Starting migration to add updated_at column to stock_transfers table...")
    execute_migration()
    logger.info("Migration script completed.")
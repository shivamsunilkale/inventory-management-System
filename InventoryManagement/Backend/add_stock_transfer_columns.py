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
    'password': '1209',
    'database': 'inventory_management'
}

def execute_migration():
    """Add missing columns to stock_transfers table"""
    try:
        # Connect to the MySQL database
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        # Check if the columns already exist
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = %s 
            AND TABLE_NAME = 'stock_transfers' 
            AND COLUMN_NAME IN ('source_location', 'destination_location')
        """, (DB_CONFIG['database'],))
        
        existing_columns = [col[0] for col in cursor.fetchall()]
        
        # Add source_location column if it doesn't exist
        if 'source_location' not in existing_columns:
            logger.info("Adding source_location column to stock_transfers table...")
            cursor.execute("""
                ALTER TABLE stock_transfers 
                ADD COLUMN source_location INT,
                ADD CONSTRAINT fk_source_location 
                FOREIGN KEY (source_location) REFERENCES locators(id) 
                ON DELETE SET NULL
            """)
            logger.info("Added source_location column successfully.")
        else:
            logger.info("source_location column already exists.")
            
        # Add destination_location column if it doesn't exist
        if 'destination_location' not in existing_columns:
            logger.info("Adding destination_location column to stock_transfers table...")
            cursor.execute("""
                ALTER TABLE stock_transfers 
                ADD COLUMN destination_location INT,
                ADD CONSTRAINT fk_destination_location 
                FOREIGN KEY (destination_location) REFERENCES locators(id) 
                ON DELETE SET NULL
            """)
            logger.info("Added destination_location column successfully.")
        else:
            logger.info("destination_location column already exists.")
            
        # Commit the changes
        connection.commit()
        logger.info("Migration completed successfully.")
        
    except Error as e:
        logger.error(f"Database error: {e}")
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()
            logger.info("Database connection closed.")

if __name__ == "__main__":
    logger.info("Starting migration to add columns to stock_transfers table...")
    execute_migration()
    logger.info("Migration script completed.")
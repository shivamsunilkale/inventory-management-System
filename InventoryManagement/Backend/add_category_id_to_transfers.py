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
    """Add category ID columns to stock_transfers table"""
    try:
        # Connect to the MySQL database
        logger.info("Connecting to database...")
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        # Check if the columns already exist
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = %s 
            AND TABLE_NAME = 'stock_transfers' 
            AND COLUMN_NAME IN ('source_category_id', 'destination_category_id')
        """, (DB_CONFIG['database'],))
        
        existing_columns = [col[0] for col in cursor.fetchall()]
        logger.info(f"Found existing columns: {existing_columns}")
        
        # Add source_category_id column if it doesn't exist
        if 'source_category_id' not in existing_columns:
            logger.info("Adding source_category_id column to stock_transfers table...")
            cursor.execute("""
                ALTER TABLE stock_transfers 
                ADD COLUMN source_category_id INT,
                ADD CONSTRAINT fk_source_category_id 
                FOREIGN KEY (source_category_id) REFERENCES categories(id) 
                ON DELETE SET NULL
            """)
            logger.info("Added source_category_id column successfully.")
        else:
            logger.info("source_category_id column already exists.")
            
        # Add destination_category_id column if it doesn't exist
        if 'destination_category_id' not in existing_columns:
            logger.info("Adding destination_category_id column to stock_transfers table...")
            cursor.execute("""
                ALTER TABLE stock_transfers 
                ADD COLUMN destination_category_id INT,
                ADD CONSTRAINT fk_destination_category_id 
                FOREIGN KEY (destination_category_id) REFERENCES categories(id) 
                ON DELETE SET NULL
            """)
            logger.info("Added destination_category_id column successfully.")
        else:
            logger.info("destination_category_id column already exists.")
            
        # Update existing records with category IDs where possible
        logger.info("Attempting to update existing records with category IDs...")
        try:
            # Update source category IDs
            cursor.execute("""
                UPDATE stock_transfers st
                JOIN categories c ON st.source_category_name = c.name
                SET st.source_category_id = c.id
                WHERE st.source_category_name IS NOT NULL
            """)
            logger.info(f"Updated {cursor.rowcount} records with source category IDs.")
            
            # Update destination category IDs
            cursor.execute("""
                UPDATE stock_transfers st
                JOIN categories c ON st.destination_category_name = c.name
                SET st.destination_category_id = c.id
                WHERE st.destination_category_name IS NOT NULL
            """)
            logger.info(f"Updated {cursor.rowcount} records with destination category IDs.")
        except Error as update_error:
            logger.warning(f"Could not update existing records: {update_error}")
            logger.warning("You may need to update the records manually or with a separate script.")
        
        # Commit the changes
        connection.commit()
        logger.info("Migration completed successfully.")
        
    except Error as e:
        logger.error(f"Database error: {e}")
        # Rollback in case of error
        if 'connection' in locals() and connection.is_connected():
            connection.rollback()
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()
            logger.info("Database connection closed.")

if __name__ == "__main__":
    logger.info("Starting migration to add category ID columns to stock_transfers table...")
    execute_migration()
    logger.info("Migration script completed.")
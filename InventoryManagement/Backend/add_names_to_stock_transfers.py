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
    """Add name columns to stock_transfers table for better display without joins"""
    try:
        # Connect to the MySQL database
        logger.info("Connecting to database...")
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        # Check which columns already exist to avoid errors
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = %s 
            AND TABLE_NAME = 'stock_transfers' 
            AND COLUMN_NAME IN (
                'source_subinventory_name', 'source_locator_name', 'source_category_name', 'source_product_name',
                'destination_subinventory_name', 'destination_locator_name', 'destination_category_name'
            )
        """, (DB_CONFIG['database'],))
        
        existing_columns = [col[0] for col in cursor.fetchall()]
        logger.info(f"Found existing columns: {existing_columns}")
        
        # Add source name columns
        if 'source_subinventory_name' not in existing_columns:
            logger.info("Adding source_subinventory_name column...")
            cursor.execute("""
                ALTER TABLE stock_transfers 
                ADD COLUMN source_subinventory_name VARCHAR(255)
            """)
            
        if 'source_locator_name' not in existing_columns:
            logger.info("Adding source_locator_name column...")
            cursor.execute("""
                ALTER TABLE stock_transfers 
                ADD COLUMN source_locator_name VARCHAR(255)
            """)
            
        if 'source_category_name' not in existing_columns:
            logger.info("Adding source_category_name column...")
            cursor.execute("""
                ALTER TABLE stock_transfers 
                ADD COLUMN source_category_name VARCHAR(255)
            """)
            
        if 'source_product_name' not in existing_columns:
            logger.info("Adding source_product_name column...")
            cursor.execute("""
                ALTER TABLE stock_transfers 
                ADD COLUMN source_product_name VARCHAR(255)
            """)
        
        # Add destination name columns
        if 'destination_subinventory_name' not in existing_columns:
            logger.info("Adding destination_subinventory_name column...")
            cursor.execute("""
                ALTER TABLE stock_transfers 
                ADD COLUMN destination_subinventory_name VARCHAR(255)
            """)
            
        if 'destination_locator_name' not in existing_columns:
            logger.info("Adding destination_locator_name column...")
            cursor.execute("""
                ALTER TABLE stock_transfers 
                ADD COLUMN destination_locator_name VARCHAR(255)
            """)
            
        if 'destination_category_name' not in existing_columns:
            logger.info("Adding destination_category_name column...")
            cursor.execute("""
                ALTER TABLE stock_transfers 
                ADD COLUMN destination_category_name VARCHAR(255)
            """)
            
        # Commit the changes
        connection.commit()
        logger.info("Migration completed successfully.")
        
        # Update existing records with name data
        logger.info("Attempting to update existing records with name data...")
        try:
            # Update product names
            cursor.execute("""
                UPDATE stock_transfers st
                JOIN products p ON st.product_id = p.id
                SET st.source_product_name = p.name
                WHERE st.source_product_name IS NULL
            """)
            
            # Update source location names
            cursor.execute("""
                UPDATE stock_transfers st
                JOIN locators l ON st.source_location = l.id
                JOIN sub_inventories si ON l.sub_inventory_id = si.id
                SET 
                    st.source_locator_name = l.code,
                    st.source_subinventory_name = si.name
                WHERE st.source_locator_name IS NULL
            """)
            
            # Update destination location names
            cursor.execute("""
                UPDATE stock_transfers st
                JOIN locators l ON st.destination_location = l.id
                JOIN sub_inventories si ON l.sub_inventory_id = si.id
                SET 
                    st.destination_locator_name = l.code,
                    st.destination_subinventory_name = si.name
                WHERE st.destination_locator_name IS NULL
            """)
            
            # Commit updates
            connection.commit()
            logger.info("Successfully updated existing records.")
        except Error as update_error:
            logger.warning(f"Could not update existing records: {update_error}")
            logger.warning("You may need to update the records manually or with a separate script.")
        
    except Error as e:
        logger.error(f"Database error: {e}")
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()
            logger.info("Database connection closed.")

if __name__ == "__main__":
    logger.info("Starting migration to add name columns to stock_transfers table...")
    execute_migration()
    logger.info("Migration script completed.")
import mysql.connector
import sys

# Database connection parameters
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '1209',
    'database': 'inventory_management'
}

def verify_table():
    """Verify the structure of the stock_transfers table"""
    try:
        # Connect to the MySQL database
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        # Get table structure
        print("Checking stock_transfers table structure...")
        cursor.execute("DESCRIBE stock_transfers")
        columns = cursor.fetchall()
        
        print("\nColumns in stock_transfers table:")
        print("=" * 60)
        print(f"{'Field':<20}{'Type':<15}{'Null':<6}{'Key':<6}{'Default':<15}{'Extra'}")
        print("-" * 60)
        for column in columns:
            print(f"{column[0]:<20}{column[1]:<15}{column[2]:<6}{column[3]:<6}{str(column[4]):<15}{column[5]}")
        
        print("\n\nChecking foreign keys for stock_transfers table...")
        cursor.execute("""
            SELECT 
                CONSTRAINT_NAME,
                COLUMN_NAME, 
                REFERENCED_TABLE_NAME, 
                REFERENCED_COLUMN_NAME
            FROM 
                INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE 
                TABLE_SCHEMA = %s AND
                TABLE_NAME = 'stock_transfers' AND
                REFERENCED_TABLE_NAME IS NOT NULL
        """, (DB_CONFIG['database'],))
        
        constraints = cursor.fetchall()
        if constraints:
            print("\nForeign Keys:")
            print("=" * 80)
            print(f"{'Constraint':<20}{'Column':<20}{'References':<20}{'Ref Column'}")
            print("-" * 80)
            for constraint in constraints:
                print(f"{constraint[0]:<20}{constraint[1]:<20}{constraint[2]:<20}{constraint[3]}")
        else:
            print("\nNo foreign key constraints found for stock_transfers table.")
        
    except mysql.connector.Error as e:
        print(f"Database error: {e}")
        sys.exit(1)
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()
            print("\nDatabase connection closed.")

if __name__ == "__main__":
    verify_table()
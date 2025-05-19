import requests
import json
import logging
import sys

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# API Configuration
BASE_URL = "http://localhost:8000"
STOCK_TRANSFERS_ENDPOINT = f"{BASE_URL}/stock-transfers/"

def get_auth_token():
    """Get an authentication token for API requests.
    
    Replace the credentials with valid login details for your application.
    """
    login_data = {
        "email": "your_email@example.com",  # Replace with valid credentials
        "password": "your_password"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            return response.json().get("access_token")
        else:
            logger.error(f"Failed to get auth token: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        logger.error(f"Error getting auth token: {e}")
        return None

def test_create_stock_transfer():
    """Test creating a stock transfer"""
    # Get auth token
    token = get_auth_token()
    if not token:
        logger.error("Cannot proceed without authentication token")
        return
    
    # Prepare test data - update with valid values for your database
    test_data = {
        "product_id": 1,  # Replace with a valid product ID from your database
        "source_location": 1,  # Replace with a valid source location ID
        "destination_location": 2,  # Replace with a valid destination location ID (different from source)
        "quantity": 5,
        "notes": "Test transfer created by diagnostic script"
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Origin": "http://localhost:5173"
    }
    
    logger.info("Starting Stock Transfer API test...")
    logger.info(f"Test Payload: {json.dumps(test_data, indent=2)}")
    
    # Make the request
    try:
        response = requests.post(
            STOCK_TRANSFERS_ENDPOINT,
            json=test_data,
            headers=headers
        )
        
        logger.info(f"Status Code: {response.status_code}")
        
        # Print headers for debugging
        logger.info("Response Headers:")
        for key, value in response.headers.items():
            logger.info(f"  {key}: {value}")
        
        # Handle response based on status code
        if response.status_code == 200 or response.status_code == 201:
            logger.info("Successfully created stock transfer! 🎉")
            logger.info(f"Response: {json.dumps(response.json(), indent=2)}")
        elif response.status_code == 500:
            logger.error("Server error occurred (500 Internal Server Error)")
            logger.error("This could be due to the missing 'updated_at' column in the stock_transfers table")
            logger.error("Run the add_updated_at_column.py script to fix this issue")
            
            # Try to parse any error details
            try:
                error_details = response.json()
                logger.error(f"Error details: {json.dumps(error_details, indent=2)}")
            except:
                logger.error(f"Raw error response: {response.text}")
        elif response.status_code == 401:
            logger.error("Authentication error - invalid or expired token")
        elif response.status_code == 400:
            logger.error(f"Bad request - input validation failed: {response.text}")
        else:
            logger.error(f"Unexpected response: {response.status_code}")
            logger.error(f"Response body: {response.text}")
            
    except Exception as e:
        logger.error(f"Request failed with exception: {e}")

if __name__ == "__main__":
    print("===== Stock Transfers API Test =====")
    print("This script will test creating a stock transfer and help diagnose any issues.")
    print("Make sure your FastAPI server is running before proceeding.")
    print("\nNote: You may need to update the login credentials and test data")
    print("with valid values for your application.\n")
    
    proceed = input("Do you want to proceed? (y/n): ").strip().lower()
    if proceed == 'y':
        test_create_stock_transfer()
    else:
        print("Test cancelled.")
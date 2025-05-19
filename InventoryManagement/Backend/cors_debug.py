import requests
import json

# Define test functions
def test_cors_headers():
    """Test if CORS headers are properly set on the FastAPI backend"""
    print("\n=== Testing CORS Headers ===")
    
    # Test simple GET request for CORS headers
    url = "http://localhost:8000/products"
    origin = "http://localhost:5173"
    
    # First make an OPTIONS request (preflight)
    headers = {
        "Origin": origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type, authorization",
    }
    
    try:
        print("Making OPTIONS preflight request...")
        response = requests.options(url, headers=headers, timeout=5)
        print(f"Status Code: {response.status_code}")
        print("Response Headers:")
        for key, value in response.headers.items():
            print(f"  {key}: {value}")
        
        # Check for CORS headers
        has_allow_origin = "Access-Control-Allow-Origin" in response.headers
        has_allow_methods = "Access-Control-Allow-Methods" in response.headers
        has_allow_headers = "Access-Control-Allow-Headers" in response.headers
        
        if has_allow_origin and has_allow_methods and has_allow_headers:
            print("\nPreflight CORS headers are correctly set! ✅")
        else:
            print("\nPreflight CORS headers are missing! ❌")
            if not has_allow_origin:
                print("  Missing: Access-Control-Allow-Origin")
            if not has_allow_methods:
                print("  Missing: Access-Control-Allow-Methods")
            if not has_allow_headers:
                print("  Missing: Access-Control-Allow-Headers")
    except Exception as e:
        print(f"Error making OPTIONS request: {e}")
    
    # Now make a GET request
    try:
        print("\nMaking GET request with Origin header...")
        response = requests.get(url, headers={"Origin": origin}, timeout=5)
        print(f"Status Code: {response.status_code}")
        print("Response Headers:")
        for key, value in response.headers.items():
            print(f"  {key}: {value}")
        
        # Check for CORS headers
        has_allow_origin = "Access-Control-Allow-Origin" in response.headers
        
        if has_allow_origin:
            print("\nGET request CORS header is correctly set! ✅")
            print(f"  Access-Control-Allow-Origin: {response.headers.get('Access-Control-Allow-Origin')}")
        else:
            print("\nGET request CORS header is missing! ❌")
            print("  Missing: Access-Control-Allow-Origin")
    except Exception as e:
        print(f"Error making GET request: {e}")

def test_stock_transfers_endpoint():
    """Test the stock-transfers endpoint to diagnose the 500 error"""
    print("\n=== Testing Stock Transfers Endpoint ===")
    
    url = "http://localhost:8000/stock-transfers/"
    origin = "http://localhost:5173"
    
    # Example payload for creating a stock transfer
    # You should modify this with valid data for your application
    payload = {
        "product_id": 1,  
        "source_location": 1,
        "destination_location": 2,
        "quantity": 5,
        "notes": "Test transfer"
    }
    
    headers = {
        "Origin": origin,
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_ACCESS_TOKEN_HERE"  # Replace with a valid token
    }
    
    # First test OPTIONS request
    try:
        print("Making OPTIONS preflight request to stock-transfers endpoint...")
        options_headers = {
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type, authorization",
        }
        response = requests.options(url, headers=options_headers, timeout=5)
        print(f"Status Code: {response.status_code}")
        
        # Check CORS headers
        has_allow_origin = "Access-Control-Allow-Origin" in response.headers
        if has_allow_origin:
            print("CORS preflight headers present ✅")
        else:
            print("CORS preflight headers missing ❌")
    except Exception as e:
        print(f"Error making OPTIONS request: {e}")
    
    # Then test POST request
    try:
        print("\nMaking POST request to stock-transfers endpoint...")
        response = requests.post(url, json=payload, headers=headers, timeout=5)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 500:
            print("Received 500 Internal Server Error")
            print("This suggests a server-side processing error, not a CORS issue")
            print("Check your server logs for detailed error information")
        elif response.status_code == 401:
            print("Authentication error - check your authorization token")
        else:
            print("Response Headers:")
            for key, value in response.headers.items():
                print(f"  {key}: {value}")
                
            print("\nResponse Body:")
            try:
                print(json.dumps(response.json(), indent=2))
            except:
                print(response.text)
    except Exception as e:
        print(f"Error making POST request: {e}")

if __name__ == "__main__":
    print("CORS and API Testing Script")
    print("==========================")
    print("This script tests if your FastAPI backend correctly handles CORS requests.")
    print("Make sure your FastAPI server is running before proceeding.")
    
    input("Press Enter to start testing...")
    
    test_cors_headers()
    test_stock_transfers_endpoint()
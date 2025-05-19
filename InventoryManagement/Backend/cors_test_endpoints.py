"""
CORS Test Script - Check specific problematic endpoints
This script tests the CORS configuration for specific organization endpoints
"""
import requests
import json

def test_endpoint(method, endpoint, origin="http://localhost:5173"):
    """Test a specific endpoint for CORS headers"""
    url = f"http://localhost:8000{endpoint}"
    print(f"\n=== Testing {method} {endpoint} ===")
    
    # First make an OPTIONS request (preflight)
    headers = {
        "Origin": origin,
        "Access-Control-Request-Method": method,
        "Access-Control-Request-Headers": "content-type, authorization",
    }
    
    try:
        print(f"Making OPTIONS preflight request for {method}...")
        response = requests.options(url, headers=headers, timeout=5)
        print(f"Status Code: {response.status_code}")
        print("Response Headers:")
        for key, value in response.headers.items():
            if key.lower().startswith("access-control"):
                print(f"  {key}: {value}")
        
        # Check for CORS headers
        has_allow_origin = "access-control-allow-origin" in response.headers.keys()
        has_allow_methods = "access-control-allow-methods" in response.headers.keys()
        has_allow_headers = "access-control-allow-headers" in response.headers.keys()
        
        if has_allow_origin and has_allow_methods and has_allow_headers:
            print("\nCORS headers are correctly set! ✅")
        else:
            print("\nCORS headers are missing! ❌")
            if not has_allow_origin:
                print("  Missing: Access-Control-Allow-Origin")
            if not has_allow_methods:
                print("  Missing: Access-Control-Allow-Methods")
            if not has_allow_headers:
                print("  Missing: Access-Control-Allow-Headers")
    except Exception as e:
        print(f"Error making OPTIONS request: {e}")

if __name__ == "__main__":
    print("CORS Endpoint Testing Script")
    print("============================")
    print("This script tests if your FastAPI backend correctly handles CORS requests.")
    print("Make sure your FastAPI server is running before proceeding.\n")
    
    # Test the problematic organization endpoint
    test_endpoint("DELETE", "/organization/1/sub-inventory/3")
    
    # Test a regular GET endpoint for comparison
    test_endpoint("GET", "/products")
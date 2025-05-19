import uvicorn
from dotenv import load_dotenv
import sys
import os

# Add parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        timeout_keep_alive=75,
        log_level="debug",
        workers=1
    )

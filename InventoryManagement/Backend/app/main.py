from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import logging
import os
from .database import Base, engine
from .routers.products import router as products_router
from .routers.orders import router as orders_router
from .auth import router as auth_router
from .routers.categories import router as categories_router
from .routers.organization import router as organization_router
from .routers.users import router as users_router
from .routers.customers import router as customers_router
from .routers.stock_transfers import router as stock_transfers_router
from .routers.stock_history import router as stock_history_router

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create reports directory at startup
REPORTS_DIR = os.path.join(os.path.dirname(__file__), "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)

# Create the FastAPI app instance
app = FastAPI(
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS properly for development
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # Add wildcards for development flexibility
    "*localhost*",
    "*127.0.0.1*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["Content-Type", "Content-Length", "Authorization"],
    max_age=86400  # Cache preflight requests for 24 hours
)

# Log requests middleware for debugging
@app.middleware("http")
async def log_requests(request, call_next):
    logger.debug(f"Incoming request: {request.method} {request.url}")
    logger.debug(f"Request headers: {request.headers}")
    response = await call_next(request)
    logger.debug(f"Response status: {response.status_code}")
    
    # Log CORS headers for debugging
    if 'origin' in request.headers:
        cors_headers = {k: v for k, v in response.headers.items() if k.startswith('access-control')}
        logger.debug(f"CORS response headers: {cors_headers}")
    
    return response

# Create the database tables
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

# Include routers
app.include_router(auth_router)
app.include_router(products_router)
app.include_router(orders_router)
app.include_router(categories_router)
app.include_router(organization_router)
app.include_router(users_router)
app.include_router(customers_router)
app.include_router(stock_transfers_router)
app.include_router(stock_history_router)

# Root route for health check
@app.get("/")
async def root():
    return {"status": "ok", "message": "API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        timeout_keep_alive=65,
        log_level="debug"
    )

"""
ClipKing - AI Video Generator API
Main FastAPI application
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import time

from app.core.config import settings, validate_production_settings
from app.api import api_router
from app.db import test_connection
from app.queue.connection import test_redis_connection, init_redis
import logging

logger = logging.getLogger(__name__)

# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    print("🚀 Starting Reelr API...")
    print(f"📊 Environment: {settings.APP_ENV}")

    # Validate production settings
    config_errors = validate_production_settings()
    if config_errors:
        for err in config_errors:
            print(f"❌ Config error: {err}")
        raise RuntimeError(
            f"Production config validation failed with {len(config_errors)} error(s). "
            "Fix the above issues before starting in production mode."
        )

    # Test database connection
    if test_connection():
        print("✅ Database connected successfully")
    else:
        if settings.APP_ENV == "production":
            raise RuntimeError("Database connection failed — cannot start in production mode")
        print("⚠️  Warning: Database connection failed")

    # Test Redis connection
    if test_redis_connection():
        init_redis()
        print("✅ Redis connected successfully")
    else:
        print("⚠️  Warning: Redis connection failed - job queue unavailable")

    yield

    # Shutdown
    print("👋 Shutting down Reelr API...")


# Initialize FastAPI app
app = FastAPI(
    title="Reelr API",
    description="AI Video Generator - Kling 2.6 + Flux 1.1 Pro Pipeline",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/redoc" if settings.APP_ENV != "production" else None,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add X-Process-Time header to all responses"""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Global exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": exc.errors(),
            "message": "Validation error"
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler — never leak internal details in production"""
    logger.exception(f"Unhandled exception on {request.method} {request.url.path}")

    if settings.APP_ENV == "production":
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "message": "Internal server error"
            }
        )
    else:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": str(exc),
                "message": "Internal server error"
            }
        )


# Root endpoint
@app.get("/")
def root():
    """API root endpoint"""
    return {
        "message": "Welcome to Reelr API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
def root_health_check():
    """Root health check for AWS ELB"""
    return {"status": "healthy"}


# Include API routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# Development hot reload message
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )

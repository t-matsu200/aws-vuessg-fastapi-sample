import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from modules.sample_form.routers import router as sample_form_router
from core.logging_config import configure_logging
from core.middleware import TraceIdMiddleware, ProcessTimeMiddleware

# Initialize logger globally
logger = logging.getLogger("fastapi_app")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    An asynchronous context manager for managing the application's lifespan events.

    This function is executed when the application starts up and shuts down.
    It's used to initialize resources (like database connections, logging)
    and clean them up gracefully.

    Args:
        app (FastAPI): The FastAPI application instance.
    """
    # Code to be executed before the application starts accepting requests
    logger.info("Application startup event triggered.")
    # e.g., initialize database connections, load ML models

    yield

    # Code to be executed after the application has finished handling requests
    logger.info("Application shutdown event triggered.")
    # e.g., close database connections


def create_app() -> FastAPI:
    app_env = os.getenv("APP_ENV", "production")
    app = FastAPI(
        lifespan=lifespan,
        docs_url="/api/docs" if app_env == "development" else None,
        openapi_url="/api/openapi.json" if app_env == "development" else None
    )
    configure_logging()

    # Add TraceIdMiddleware
    app.add_middleware(TraceIdMiddleware)
    app.add_middleware(ProcessTimeMiddleware)

    # Global Exception Handlers
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        logger.error(f"HTTP Exception: {exc.detail}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.detail,
                "code": exc.status_code
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.error(f"Validation Error: {exc.errors()}")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "detail": exc.errors(),
                "code": status.HTTP_400_BAD_REQUEST
            },
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logger.exception("An unexpected error occurred.") # Logs traceback
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "An unexpected error occurred.",
                "code": status.HTTP_500_INTERNAL_SERVER_ERROR
            },
        )

    @app.get("/api/health")
    async def health_check():
        logger.info("Health check endpoint accessed.")
        return {"status": "ok"}

    app.include_router(sample_form_router, prefix="/api", tags=["sample_form"])

    return app

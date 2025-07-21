import contextvars
import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

trace_id_var = contextvars.ContextVar("trace_id", default=None)

logger = logging.getLogger(__name__)

class TraceIdMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        trace_id = request.headers.get("X-Trace-ID")
        token = trace_id_var.set(trace_id)
        try:
            response = await call_next(request)
            if trace_id:
                response.headers["X-Trace-ID"] = trace_id
        finally:
            trace_id_var.reset(token)
        return response

class ProcessTimeMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        logger.info(f'Request {request.method} {request.url.path} processed in {process_time:.4f} secs')
        return response

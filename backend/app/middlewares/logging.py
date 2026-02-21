import time 
import logging 
from starlette.middleware.base import BaseHTTPMiddleware 
from fastapi import Request 

logger = logging.getLogger("api_logger")

logging.basicConfig(
    filename = "app.log",
    level = logging.INFO,
    format = "%(asctime)s | %(levelname)s | %(message)s"
)

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start_time = time.time()

        method = request.method 
        path = request.url.path 
        client = request.client.host 

        response = await call_next(request) 

        duration = round((time.time() - start_time) * 1000, 2)

        status_code = response.status_code
        
        logger.info(
            f"{client} | {method} {path} | {status_code} | {duration}ms"
        )

        return response
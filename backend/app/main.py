from fastapi import FastAPI

from middlewares.auth import AuthMiddleware
from middlewares.logging import LoggingMiddleware
from middlewares.rate_limit import RateLimitMiddleware

app = FastAPI()

app.add_middleware(AuthMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(LoggingMiddleware)


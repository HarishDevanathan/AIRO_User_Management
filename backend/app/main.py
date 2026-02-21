from fastapi import FastAPI

#from middlewares.auth import AuthMiddleware
from app.middlewares.logging import LoggingMiddleware
from app.middlewares.rate_limit import RateLimitMiddleware

from app.routes.auth_routes import auth_router

app = FastAPI()

#app.add_middleware(AuthMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(LoggingMiddleware)

app.include_router(auth_router)
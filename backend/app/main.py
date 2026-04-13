# app/main.py
import logging
import os

from contextlib import asynccontextmanager

# FIX: Silences the passlib/bcrypt 72-byte padding bug

logging.getLogger("passlib").handlers = [logging.NullHandler()]

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Import routers
from app.api.routes import groups, users, posts, social, events, notifications, admin, chat, auth
from app.core.config import settings
from app.core.database import connect_db, close_db

limiter = Limiter(key_func=get_remote_address, default_limits=["200/15minutes"])

@asynccontextmanager
async def lifespan(app: FastAPI):
    # This calls the function that initializes Beanie and MongoDB
    await connect_db()
    yield
    await close_db()

app = FastAPI(
    title="CivicImpact API",
    description="Social platform for public good",
    version="3.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration
origins = [
    str(settings.FRONTEND_URL), 
    "https://impacthub-dnjr.vercel.app",
    "https://impacthub-dnjr-git-main-tanishs-projects-de6a879e.vercel.app",
    "https://impacthub-dnjr-a8uiow79p-tanishs-projects-de6a879e.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ROUTER REGISTRATION ---
# All routes are prefixed with /api
app.include_router(auth.router,          prefix="/api")
app.include_router(users.router,         prefix="/api")
app.include_router(posts.router,         prefix="/api")
app.include_router(social.router,        prefix="/api")
app.include_router(groups.router,        prefix="/api") # Groups is now registered!
app.include_router(events.router,        prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(admin.router,         prefix="/api")
app.include_router(chat.router,          prefix="/api")

@app.get("/health")
@app.head("/health")
def health():
    return {"status": "ok"}

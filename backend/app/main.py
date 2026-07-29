from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.db.mongodb import connect_db, close_db
from app.routers import auth, cases, dashboard, admin
from app.routers.classify import router as classify_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    # Ensure storage directories exist
    Path(settings.STORAGE_PATH, "images").mkdir(parents=True, exist_ok=True)
    Path(settings.STORAGE_PATH, "reports").mkdir(parents=True, exist_ok=True)
    yield
    await close_db()


app = FastAPI(
    title="SceneSolver API",
    description="AI-Powered Crime Scene Investigation Assistant",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploaded images and reports
storage_path = Path(settings.STORAGE_PATH)
storage_path.mkdir(parents=True, exist_ok=True)
app.mount("/storage", StaticFiles(directory=str(storage_path)), name="storage")

# Routers
app.include_router(auth.router)
app.include_router(cases.router)
app.include_router(dashboard.router)
app.include_router(admin.router)
app.include_router(classify_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "SceneSolver API", "version": "1.0.0"}

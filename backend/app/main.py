import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.seed import init_db
from app.routers import telemetry, rooms, alerts, verification, simulator, settings as settings_router
from app.routers import laptop_sensor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("currentguard")

import asyncio
from app.database import SessionLocal

async def background_telemetry_collector():
    """
    Autonomous background worker: persists telemetry readings,
    evaluates AI anomalies, and records CampusSnapshots even if
    no client browser window is currently open.
    """
    logger.info("Background telemetry collector started.")
    while True:
        try:
            await asyncio.sleep(5)
            db = SessionLocal()
            try:
                telemetry.get_live_telemetry(db=db)
            finally:
                db.close()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.debug(f"Background collector tick exception: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB and seeds
    logger.info("Initializing CurrentGuard AI SQLite database...")
    init_db()
    logger.info("CurrentGuard AI Stage 2 Engine online and ready.")
    collector_task = asyncio.create_task(background_telemetry_collector())
    yield
    # Shutdown
    collector_task.cancel()
    try:
        await collector_task
    except asyncio.CancelledError:
        pass
    logger.info("CurrentGuard AI Engine shutting down...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="CurrentGuard AI: Intelligent Electricity Loss and Energy Waste Management System — Stage 2 Prototype API",
    version="2.0.0",
    lifespan=lifespan
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(telemetry.router, prefix=settings.API_V1_STR)
app.include_router(rooms.router, prefix=settings.API_V1_STR)
app.include_router(alerts.router, prefix=settings.API_V1_STR)
app.include_router(verification.router, prefix=settings.API_V1_STR)
app.include_router(simulator.router, prefix=settings.API_V1_STR)
app.include_router(settings_router.router, prefix=settings.API_V1_STR)
app.include_router(laptop_sensor.router, prefix=settings.API_V1_STR)

@app.get("/api/info")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "version": "2.0.0",
        "status": "OPERATIONAL",
        "documentation": "/docs",
        "safety_mandate": "Student prototype: simulated readings & safe low-voltage hardware only. No direct 230V mains connection."
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "currentguard-backend"}


# ---------------------------------------------------------------------------
# Serve the built React dashboard (used when deployed, e.g. on Zoho Catalyst).
# The deploy script copies frontend/dist into a "static" folder next to app/.
# Locally (no static folder) the API runs on its own and Vite serves the UI.
# ---------------------------------------------------------------------------
import os
from pathlib import Path
from fastapi import HTTPException
from fastapi.responses import FileResponse

STATIC_DIR = Path(os.getenv("FRONTEND_DIST", Path(__file__).resolve().parent.parent / "static"))
INDEX_FILE = STATIC_DIR / "index.html"

if INDEX_FILE.is_file():
    logger.info(f"Serving dashboard from {STATIC_DIR}")

    @app.get("/", include_in_schema=False)
    def dashboard_index():
        return FileResponse(INDEX_FILE)

    @app.get("/{full_path:path}", include_in_schema=False)
    def dashboard_files(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        candidate = (STATIC_DIR / full_path).resolve()
        if candidate.is_file() and STATIC_DIR.resolve() in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(INDEX_FILE)  # client-side routes fall back to the app
else:
    @app.get("/", include_in_schema=False)
    def root_info():
        return root()

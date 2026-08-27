from fastapi import FastAPI

from fastapi.middleware.cors import (
    CORSMiddleware,
)

from app.routes.auth import (
    router as auth_router,
)

from app.routes.ocean import (
    router as ocean_router,
)

from app.routes.reports import (
    router as reports_router,
)


# =========================================================
# AQUORA APPLICATION
# =========================================================

app = FastAPI(
    title="AQUORA API",

    description=(
        "Interactive ocean intelligence "
        "and observational evidence platform."
    ),

    version="1.0.0",
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# =========================================================
# AUTHENTICATION ROUTES
#
# auth.py already contains:
# prefix="/api/auth"
# =========================================================

app.include_router(
    auth_router
)


# =========================================================
# OCEAN ROUTES
#=========================================================

app.include_router(
    ocean_router,
    prefix="/api/ocean",
    tags=["Ocean Data"],
)


# =========================================================
# REPORT ROUTES
# =========================================================

app.include_router(
    reports_router,
    prefix="/api/reports",
    tags=["Reports"],
)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
async def root():

    return {
        "service":
            "AQUORA API",

        "status":
            "operational",

        "version":
            "1.0.0",
    }


# =========================================================
# HEALTH
# =========================================================

@app.get("/health")
async def health():

    return {
        "status":
            "healthy"
    }
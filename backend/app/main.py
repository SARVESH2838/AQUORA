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
# AQUORA API
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

        # AQUORA production frontend
        "https://aquora-olive.vercel.app",
    ],

    # Also allows Vercel preview deployment URLs.
    allow_origin_regex=r"https://.*\.vercel\.app",

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# =========================================================
# AUTHENTICATION
#
# auth.py already contains /api/auth prefix.
# =========================================================

app.include_router(
    auth_router
)


# =========================================================
# OCEAN DATA
# =========================================================

app.include_router(
    ocean_router,
    prefix="/api/ocean",
    tags=["Ocean Data"],
)


# =========================================================
# REPORTS
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
        "service": "AQUORA API",
        "status": "operational",
        "version": "1.0.0",
    }


# =========================================================
# HEALTH
# =========================================================

@app.get("/health")
async def health():

    return {
        "status": "healthy",
        "service": "AQUORA API",
    }
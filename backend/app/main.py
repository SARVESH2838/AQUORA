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
#
# AQUORA authentication uses JWT Bearer tokens,
# not browser cookies.
#
# Therefore credentials do not need to be enabled.
#
# For this prototype we allow all frontend origins so:
# - Vercel production works
# - Vercel preview URLs work
# - localhost works
#
# Production release can later restrict this list.
# =========================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "*"
    ],

    allow_credentials=False,

    allow_methods=[
        "*"
    ],

    allow_headers=[
        "*"
    ],

    expose_headers=[
        "*"
    ],
)


# =========================================================
# AUTHENTICATION
#
# auth.py already contains:
# /api/auth
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

    tags=[
        "Ocean Data"
    ],
)


# =========================================================
# REPORTS
# =========================================================

app.include_router(
    reports_router,

    prefix="/api/reports",

    tags=[
        "Reports"
    ],
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
# HEALTH CHECK
# =========================================================

@app.get("/health")
async def health():

    return {
        "status":
            "healthy",

        "service":
            "AQUORA API",
    }
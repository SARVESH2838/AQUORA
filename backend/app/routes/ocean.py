from fastapi import APIRouter, HTTPException, Query
from app.services.argovis import (
    get_nearby_argo_profiles,
    get_argo_profile,
)
from app.services.noaa import (
    get_latest_sst,
    get_sst_history,
)


router = APIRouter()
@router.get("/sst/history")
async def sst_history(
    lat: float = Query(
        ...,
        ge=-90,
        le=90,
    ),

    lon: float = Query(
        ...,
        ge=-180,
        le=180,
    ),

    days: int = Query(
        7,
        ge=2,
        le=14,
    ),
):
    try:

        return await get_sst_history(
            latitude=lat,
            longitude=lon,
            days=days,
        )

    except Exception as exc:

        print(
            "SST HISTORY ERROR:",
            repr(exc),
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Unable to retrieve "
                "recent SST history."
            ),
        )

@router.get("/sst")
async def ocean_sst(
    lat: float = Query(
        ...,
        ge=-90,
        le=90,
    ),

    lon: float = Query(
        ...,
        ge=-180,
        le=180,
    ),
):
    try:

        data = await get_latest_sst(
            latitude=lat,
            longitude=lon,
        )

        return data

    except Exception as exc:

        print("NOAA ERROR:", repr(exc))

        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve NOAA ocean data.",
        )
@router.get("/argo/nearby")
async def nearby_argo(
    lat: float = Query(
        ...,
        ge=-90,
        le=90,
    ),

    lon: float = Query(
        ...,
        ge=-180,
        le=180,
    ),

    radius: float = Query(
        250,
        ge=10,
        le=1000,
    ),
):
    try:

        profiles = (
            await
            get_nearby_argo_profiles(
                latitude=lat,
                longitude=lon,
                radius_km=radius,
            )
        )

        return {
            "available":
                len(profiles) > 0,

            "count":
                len(profiles),

            "search": {
                "latitude": lat,
                "longitude": lon,
                "radiusKm": radius,
            },

            "profiles":
                profiles,
        }

    except Exception as exc:

        print(
            "ARGO ERROR:",
            repr(exc)
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Unable to retrieve "
                "Argovis Argo data."
            ),
        )
@router.get("/argo/profile/{profile_id}")
async def argo_profile(
    profile_id: str,
):
    try:

        profile = await get_argo_profile(
            profile_id
        )

        if profile is None:
            raise HTTPException(
                status_code=404,
                detail="Argo profile not found.",
            )

        return {
            "available": True,
            "profile": profile,
        }

    except HTTPException:
        raise

    except Exception as exc:

        print(
            "ARGO PROFILE ERROR:",
            repr(exc),
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Unable to retrieve "
                "Argo vertical profile."
            ),
        )
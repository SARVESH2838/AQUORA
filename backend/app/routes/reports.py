from fastapi import (
    APIRouter,
    HTTPException,
    Query,
)

from app.services.report_engine import (
    generate_ocean_report,
)


router = APIRouter()


@router.post("/generate")
async def generate_report(
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

        return await generate_ocean_report(
            latitude=lat,
            longitude=lon,
        )

    except Exception as exc:

        print(
            "REPORT ERROR:",
            repr(exc),
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Unable to generate "
                "AQUORA evidence report."
            ),
        )
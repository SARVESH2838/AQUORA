# =========================================================
# ARGOVIS NEARBY CACHE
#
# Prevent repeated expensive profile searches.
# Data remains REAL Argovis data.
# =========================================================

ARGO_NEARBY_CACHE = {}

ARGO_NEARBY_CACHE_TTL = 1800
from datetime import datetime, timedelta, timezone
import math
import time

from copy import deepcopy
import httpx


ARGOVIS_API = "https://argovis-api.colorado.edu/argo"


def haversine_km(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:

    radius = 6371.0

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)

    delta_phi = math.radians(
        lat2 - lat1
    )

    delta_lambda = math.radians(
        lon2 - lon1
    )

    a = (
        math.sin(delta_phi / 2) ** 2
        +
        math.cos(phi1)
        * math.cos(phi2)
        * math.sin(delta_lambda / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a),
    )

    return radius * c


async def _fetch_nearby_argo_profiles(
    latitude: float,
    longitude: float,
    radius_km: float = 250,
):
    """
    Fetch recent Argo profiles around
    a selected AQUORA location.
    """

    now = datetime.now(timezone.utc)

    # Search recent observations first.
    # We can widen this later if needed.
    start = now - timedelta(days=90)

    start_date = (
        start
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )

    end_date = (
        now
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )

    params = {
        "startDate": start_date,
        "endDate": end_date,

        # Argovis spatial search
        "center":
            f"{longitude},{latitude}",

        "radius":
            radius_km,

        # Explicit variables requested.
        "data": (
            "temperature,"
            "pressure,"
            "salinity,"
            "temperature_argoqc,"
            "pressure_argoqc,"
            "salinity_argoqc,"
            "except-data-values"
        ),
    }

    headers = {
        "x-argokey": "guest",
    }

    async with httpx.AsyncClient(
        timeout=30.0,
        follow_redirects=True,
    ) as client:

        response = await client.get(
            ARGOVIS_API,
            params=params,
            headers=headers,
        )

        print(
            "ARGOVIS URL:",
            response.request.url
        )

        if response.status_code != 200:

            print(
                "ARGOVIS RESPONSE:",
                response.status_code,
                response.text[:1500],
            )

        response.raise_for_status()

        profiles = response.json()

    if not isinstance(
        profiles,
        list,
    ):
        raise ValueError(
            "Unexpected Argovis response."
        )

    results = []

    for profile in profiles:

        geolocation = (
            profile.get("geolocation")
            or {}
        )

        coordinates = (
            geolocation.get(
                "coordinates"
            )
        )

        if (
            not coordinates
            or len(coordinates) < 2
        ):
            continue

        profile_lon = float(
            coordinates[0]
        )

        profile_lat = float(
            coordinates[1]
        )

        distance = haversine_km(
            latitude,
            longitude,
            profile_lat,
            profile_lon,
        )

        profile_id = profile.get("_id")

        platform_id = (
            profile.get("platform_id")
            or profile.get("platform")
            or (
                profile_id.split("_")[0]
                if profile_id
                and "_" in profile_id
                else None
            )
        )

        results.append({
            "id": profile_id,

            "platform": platform_id,

            "cycle":
                profile.get(
                    "cycle_number"
                ),

            "latitude":
                profile_lat,

            "longitude":
                profile_lon,

            "observedAt":
                profile.get(
                    "timestamp"
                ),

            "distanceKm":
                round(
                    distance,
                    2
                ),
        })

    results.sort(
        key=lambda item:
        item["distanceKm"]
    )

    # Keep UI manageable
    return results[:10]

# =========================================================
# CACHED PUBLIC ARGOVIS NEARBY FUNCTION
# =========================================================

async def get_nearby_argo_profiles(
    latitude: float,
    longitude: float,
    radius_km: float = 500,
):

    # -----------------------------------------------------
    # Use a slightly rounded location as the cache key.
    #
    # This prevents tiny coordinate differences from
    # generating another expensive Argovis search.
    # -----------------------------------------------------

    cache_key = (
        round(
            latitude,
            2,
        ),

        round(
            longitude,
            2,
        ),

        round(
            radius_km,
        ),
    )


    now = (
        time.monotonic()
    )


    cached = (
        ARGO_NEARBY_CACHE.get(
            cache_key
        )
    )


    # -----------------------------------------------------
    # FRESH CACHE
    # -----------------------------------------------------

    if cached:

        age = (
            now
            - cached[
                "timestamp"
            ]
        )


        if (
            age
            < ARGO_NEARBY_CACHE_TTL
        ):

            print(
                "ARGOVIS CACHE HIT:",
                cache_key,
                "age:",
                round(
                    age,
                    1,
                ),
                "seconds",
            )


            return deepcopy(
                cached[
                    "profiles"
                ]
            )


    # -----------------------------------------------------
    # NETWORK REQUEST
    # -----------------------------------------------------

    try:

        profiles = (
            await _fetch_nearby_argo_profiles(
                latitude=
                    latitude,

                longitude=
                    longitude,

                radius_km=
                    radius_km,
            )
        )


        # -------------------------------------------------
        # CACHE ONLY SUCCESSFUL REAL RESULTS
        # -------------------------------------------------

        if profiles:

            ARGO_NEARBY_CACHE[
                cache_key
            ] = {

                "timestamp":
                    now,

                "profiles":
                    deepcopy(
                        profiles
                    ),
            }


            print(
                "ARGOVIS CACHE STORED:",
                cache_key,
                "profiles:",
                len(
                    profiles
                ),
            )


        return profiles


    except Exception as exc:

        # -------------------------------------------------
        # ARGOVIS RATE LIMIT
        #
        # Existing cached REAL observations are preferred.
        # -------------------------------------------------

        response = getattr(
            exc,
            "response",
            None,
        )


        status_code = getattr(
            response,
            "status_code",
            None,
        )


        if status_code == 429:

            print(
                "ARGOVIS RATE LIMIT:"
                " provider returned 429."
            )


            # ---------------------------------------------
            # STALE CACHE IS STILL REAL DATA.
            # Use it rather than failing the whole app.
            # ---------------------------------------------

            if cached:

                print(
                    "ARGOVIS:"
                    " USING EXISTING REAL CACHE"
                )


                return deepcopy(
                    cached[
                        "profiles"
                    ]
                )


            # ---------------------------------------------
            # No cache available.
            #
            # Return an empty result rather than causing
            # the whole AQUORA endpoint to become 502.
            # ---------------------------------------------

            print(
                "ARGOVIS:"
                " NO CACHE AVAILABLE."
                " Returning empty profile list."
            )


            return []


        # -------------------------------------------------
        # OTHER ARGOVIS FAILURE
        # -------------------------------------------------

        print(
            "ARGOVIS NEARBY ERROR:",
            repr(
                exc
            ),
        )


        if cached:

            print(
                "ARGOVIS:"
                " USING REAL CACHE AFTER"
                " PROVIDER FAILURE."
            )


            return deepcopy(
                cached[
                    "profiles"
                ]
            )


        return []

async def get_argo_profile(
    profile_id: str,
):
    """
    Fetch and normalize one complete
    Argo profile for AQUORA Ocean X-Ray.
    """

    params = {
        "id": profile_id,

        "data": (
            "temperature,"
            "pressure,"
            "salinity,"
            "temperature_argoqc,"
            "pressure_argoqc,"
            "salinity_argoqc"
        ),
    }

    headers = {
        "x-argokey": "guest",
    }

    async with httpx.AsyncClient(
        timeout=30.0,
        follow_redirects=True,
    ) as client:

        response = await client.get(
            ARGOVIS_API,
            params=params,
            headers=headers,
        )

        print(
            "ARGO PROFILE URL:",
            response.request.url,
        )

        if response.status_code != 200:
            print(
                "ARGO PROFILE ERROR:",
                response.status_code,
                response.text[:2000],
            )

        if response.status_code == 404:
            return None

        response.raise_for_status()

        payload = response.json()

    if (
        not isinstance(payload, list)
        or len(payload) == 0
    ):
        return None

    profile = payload[0]

    data_info = profile.get(
        "data_info",
        []
    )

    data = profile.get(
        "data",
        []
    )

    if (
        not data_info
        or not isinstance(data_info, list)
        or not data
    ):
        raise ValueError(
            "Argo profile contains no level data."
        )

    # Argovis stores variable names
    # in data_info[0].
    variable_names = data_info[0]

    if not isinstance(
        variable_names,
        list
    ):
        raise ValueError(
            "Unexpected Argovis data_info format."
        )

    def get_series(
        variable_name: str
    ):
        try:
            index = variable_names.index(
                variable_name
            )

            if index >= len(data):
                return []

            values = data[index]

            if isinstance(values, list):
                return values

            return []

        except ValueError:
            return []

    pressure = get_series(
        "pressure"
    )

    temperature = get_series(
        "temperature"
    )

    salinity = get_series(
        "salinity"
    )

    pressure_qc = get_series(
        "pressure_argoqc"
    )

    temperature_qc = get_series(
        "temperature_argoqc"
    )

    salinity_qc = get_series(
        "salinity_argoqc"
    )

    def safe_value(
        values,
        index,
    ):
        if index >= len(values):
            return None

        value = values[index]

        if value is None:
            return None

        return value

    levels = []

    # Pressure defines vertical levels.
    for index in range(
        len(pressure)
    ):

        pres = safe_value(
            pressure,
            index,
        )

        if pres is None:
            continue

        temp = safe_value(
            temperature,
            index,
        )

        psal = safe_value(
            salinity,
            index,
        )

        pres_qc = safe_value(
            pressure_qc,
            index,
        )

        temp_qc = safe_value(
            temperature_qc,
            index,
        )

        psal_qc = safe_value(
            salinity_qc,
            index,
        )

        levels.append({
            "pressureDbar":
                float(pres),

            "temperatureC":
                (
                    float(temp)
                    if temp is not None
                    else None
                ),

            "salinityPsu":
                (
                    float(psal)
                    if psal is not None
                    else None
                ),

            "pressureQc":
                (
                    str(pres_qc)
                    if pres_qc is not None
                    else None
                ),

            "temperatureQc":
                (
                    str(temp_qc)
                    if temp_qc is not None
                    else None
                ),

            "salinityQc":
                (
                    str(psal_qc)
                    if psal_qc is not None
                    else None
                ),
        })

    # Sort shallow → deep
    levels.sort(
        key=lambda item:
        item["pressureDbar"]
    )

    geolocation = profile.get(
        "geolocation",
        {}
    )

    coordinates = geolocation.get(
        "coordinates",
        [None, None],
    )

    longitude = (
        coordinates[0]
        if len(coordinates) > 0
        else None
    )

    latitude = (
        coordinates[1]
        if len(coordinates) > 1
        else None
    )

    platform_id = (
        profile.get("platform_id")
        or (
            profile_id.split("_")[0]
            if "_" in profile_id
            else profile_id
        )
    )

    return {
        "profileId":
            profile.get(
                "_id",
                profile_id,
            ),

        "platformId":
            platform_id,

        "cycle":
            profile.get(
                "cycle_number"
            ),

        "latitude":
            latitude,

        "longitude":
            longitude,

        "observedAt":
            profile.get(
                "timestamp"
            ),

        "profileDirection":
            profile.get(
                "profile_direction"
            ),

        "verticalSamplingScheme":
            profile.get(
                "vertical_sampling_scheme"
            ),

        "levelCount":
            len(levels),

        "maxPressureDbar":
            (
                levels[-1][
                    "pressureDbar"
                ]
                if levels
                else None
            ),

        "levels":
            levels,

        "source": {
            "provider":
                "Argo / Argovis",

            "measurementType":
                "In-situ profiling float",
        },
    }
import asyncio
import csv
import io

from copy import deepcopy
from datetime import (
    datetime,
    timedelta,
    timezone,
)

import httpx


# =========================================================
# AQUORA NOAA OISST SERVICE
#
# PRIMARY:
# NOAA PSL THREDDS / NCSS
#
# FALLBACK:
# NOAA NCEI ERDDAP
#
# Both provide NOAA/NCEI OISST v2.1 data.
# =========================================================


# =========================================================
# NOAA PSL
# =========================================================

PSL_BASE = (
    "https://psl.noaa.gov/thredds/ncss/grid/"
    "Datasets/noaa.oisst.v2.highres"
)


# =========================================================
# NOAA NCEI ERDDAP
# =========================================================

NCEI_ERDDAP = (
    "https://www.ncei.noaa.gov/"
    "erddap/griddap"
)

FINAL_DATASET_ID = (
    "ncdc_oisst_v2_avhrr_by_time_zlev_lat_lon"
)

PRELIM_DATASET_ID = (
    "ncdc_oisst_v2_avhrr_prelim_by_time_zlev_lat_lon"
)


# =========================================================
# GRID
# =========================================================

LAT_MIN = -89.875
LON_MIN = 0.125

GRID_STEP = 0.25

LAT_COUNT = 720
LON_COUNT = 1440


# =========================================================
# CACHE
# =========================================================

LATEST_CACHE = {}

HISTORY_CACHE = {}


# =========================================================
# HELPERS
# =========================================================

def utc_now():
    return datetime.now(
        timezone.utc
    ).isoformat()


def clamp(
    value: int,
    minimum: int,
    maximum: int,
):
    return max(
        minimum,
        min(
            value,
            maximum,
        ),
    )


def longitude_to_noaa(
    longitude: float,
):
    if longitude < 0:
        return longitude + 360

    return longitude


def calculate_grid_indices(
    latitude: float,
    longitude: float,
):
    noaa_lon = longitude_to_noaa(
        longitude
    )

    lat_index = round(
        (
            latitude
            - LAT_MIN
        )
        / GRID_STEP
    )

    lon_index = round(
        (
            noaa_lon
            - LON_MIN
        )
        / GRID_STEP
    )

    lat_index = clamp(
        lat_index,
        0,
        LAT_COUNT - 1,
    )

    lon_index = clamp(
        lon_index,
        0,
        LON_COUNT - 1,
    )

    grid_latitude = (
        LAT_MIN
        + lat_index
        * GRID_STEP
    )

    grid_longitude = (
        LON_MIN
        + lon_index
        * GRID_STEP
    )

    return (
        lat_index,
        lon_index,
        noaa_lon,
        grid_latitude,
        grid_longitude,
    )


# =========================================================
# SOURCE METADATA
# =========================================================

def psl_source():
    return {
        "provider":
            "NOAA/NCEI",

        "dataset":
            "OISST v2.1 Daily",

        "datasetId":
            "NOAA_PSL_OISST_V2.1",

        "datasetStatus":
            "NOAA PSL Access",

        "variable":
            "Sea Surface Temperature",

        "units":
            "°C",

        "resolution":
            "0.25°",

        "retrievalMode":
            "NOAA PSL THREDDS",
    }


def erddap_source(
    preliminary: bool,
):
    return {
        "provider":
            "NOAA/NCEI",

        "dataset":
            (
                "OISST v2.1 AVHRR Daily Preliminary"
                if preliminary
                else "OISST v2.1 AVHRR Daily"
            ),

        "datasetId":
            (
                PRELIM_DATASET_ID
                if preliminary
                else FINAL_DATASET_ID
            ),

        "datasetStatus":
            (
                "Preliminary"
                if preliminary
                else "Final"
            ),

        "variable":
            "Sea Surface Temperature",

        "units":
            "°C",

        "resolution":
            "0.25°",

        "retrievalMode":
            "NCEI ERDDAP",
    }


# =========================================================
# HTTP CLIENT
# =========================================================

def make_timeout():
    return httpx.Timeout(
        connect=10.0,
        read=30.0,
        write=10.0,
        pool=10.0,
    )


async def get_text(
    url: str,
    params: dict | None = None,
):
    try:
        async with httpx.AsyncClient(
            timeout=make_timeout(),
            follow_redirects=True,
            headers={
                "User-Agent":
                    "AQUORA-Ocean-Intelligence/1.0",
            },
        ) as client:

            response = await client.get(
                url,
                params=params,
            )

        print(
            "NOAA REQUEST:",
            response.url,
        )

        print(
            "NOAA STATUS:",
            response.status_code,
        )

        response.raise_for_status()

        return response.text

    except Exception as exc:
        print(
            "NOAA REQUEST ERROR:",
            repr(exc),
        )

        return None


async def get_json(
    url: str,
):
    try:
        async with httpx.AsyncClient(
            timeout=make_timeout(),
            follow_redirects=True,
            headers={
                "User-Agent":
                    "AQUORA-Ocean-Intelligence/1.0",
            },
        ) as client:

            response = await client.get(
                url
            )

        print(
            "NOAA ERDDAP STATUS:",
            response.status_code,
        )

        response.raise_for_status()

        return response.json()

    except Exception as exc:
        print(
            "NOAA ERDDAP ERROR:",
            repr(exc),
        )

        return None


# =========================================================
# CSV HELPERS FOR NOAA PSL
# =========================================================

def find_field(
    row: dict,
    wanted: str,
):
    wanted = wanted.lower()

    for key, value in row.items():
        clean = (
            key
            .strip()
            .lower()
        )

        if clean == wanted:
            return value

        if clean.startswith(
            wanted
        ):
            return value

    return None


def find_time(
    row: dict,
):
    for key, value in row.items():

        clean = (
            key
            .strip()
            .lower()
        )

        if (
            "date" in clean
            or "time" in clean
        ):
            return value

    return None


def parse_psl_csv(
    text: str | None,
    variable: str,
):
    if not text:
        return []

    reader = csv.DictReader(
        io.StringIO(text)
    )

    results = []

    for row in reader:

        raw_value = find_field(
            row,
            variable,
        )

        if raw_value is None:
            continue

        try:
            value = float(
                raw_value
            )
        except (
            TypeError,
            ValueError,
        ):
            # Skips units rows etc.
            continue

        latitude_raw = (
            find_field(
                row,
                "lat",
            )
        )

        longitude_raw = (
            find_field(
                row,
                "lon",
            )
        )

        try:
            grid_latitude = (
                float(
                    latitude_raw
                )
                if latitude_raw
                is not None
                else None
            )
        except ValueError:
            grid_latitude = None

        try:
            grid_longitude = (
                float(
                    longitude_raw
                )
                if longitude_raw
                is not None
                else None
            )
        except ValueError:
            grid_longitude = None

        results.append(
            {
                "observedAt":
                    find_time(
                        row
                    ),

                "value":
                    value,

                "latitude":
                    grid_latitude,

                "longitude":
                    grid_longitude,
            }
        )

    return results


def date_key(
    value: str | None,
):
    if not value:
        return None

    return value[:10]


# =========================================================
# NOAA PSL LATEST
# =========================================================

async def fetch_psl_latest(
    latitude: float,
    longitude: float,
):
    year = datetime.now(
        timezone.utc
    ).year

    noaa_lon = (
        longitude_to_noaa(
            longitude
        )
    )

    sst_url = (
        f"{PSL_BASE}/"
        f"sst.day.mean.{year}.nc"
    )

    anomaly_url = (
        f"{PSL_BASE}/"
        f"sst.day.anom.{year}.nc"
    )

    common = {
        "latitude":
            str(latitude),

        "longitude":
            str(noaa_lon),

        "accept":
            "csv",
    }

    sst_params = {
        **common,
        "var":
            "sst",
    }

    anomaly_params = {
        **common,
        "var":
            "anom",
    }

    (
        sst_text,
        anomaly_text,
    ) = await asyncio.gather(
        get_text(
            sst_url,
            sst_params,
        ),
        get_text(
            anomaly_url,
            anomaly_params,
        ),
    )

    sst_rows = parse_psl_csv(
        sst_text,
        "sst",
    )

    anomaly_rows = parse_psl_csv(
        anomaly_text,
        "anom",
    )

    if not sst_rows:
        return None

    latest_sst = sst_rows[-1]

    anomaly_by_date = {
        date_key(
            item["observedAt"]
        ):
            item["value"]

        for item in anomaly_rows
        if date_key(
            item["observedAt"]
        )
    }

    key = date_key(
        latest_sst[
            "observedAt"
        ]
    )

    anomaly = (
        anomaly_by_date.get(
            key
        )
    )

    (
        _,
        _,
        source_lon,
        calculated_lat,
        calculated_lon,
    ) = calculate_grid_indices(
        latitude,
        longitude,
    )

    return {
        "available":
            True,

        "requestedLatitude":
            latitude,

        "requestedLongitude":
            longitude,

        "latitude":
            (
                latest_sst[
                    "latitude"
                ]
                if latest_sst[
                    "latitude"
                ]
                is not None
                else calculated_lat
            ),

        "longitude":
            (
                latest_sst[
                    "longitude"
                ]
                if latest_sst[
                    "longitude"
                ]
                is not None
                else calculated_lon
            ),

        "sourceLongitude":
            source_lon,

        "temperatureC":
            latest_sst[
                "value"
            ],

        "anomalyC":
            anomaly,

        "observedAt":
            latest_sst[
                "observedAt"
            ],

        "fetchedAt":
            utc_now(),

        "cacheUsed":
            False,

        "source":
            psl_source(),
    }


# =========================================================
# NOAA NCEI ERDDAP LATEST FALLBACK
# =========================================================

async def fetch_erddap_latest(
    latitude: float,
    longitude: float,
    preliminary: bool,
):
    (
        lat_index,
        lon_index,
        source_lon,
        grid_lat,
        grid_lon,
    ) = calculate_grid_indices(
        latitude,
        longitude,
    )

    dataset_id = (
        PRELIM_DATASET_ID
        if preliminary
        else FINAL_DATASET_ID
    )

    query = (
        f"sst[last][0]"
        f"[{lat_index}]"
        f"[{lon_index}],"
        f"anom[last][0]"
        f"[{lat_index}]"
        f"[{lon_index}]"
    )

    url = (
        f"{NCEI_ERDDAP}/"
        f"{dataset_id}.json?"
        f"{query}"
    )

    payload = await get_json(
        url
    )

    if not payload:
        return None

    table = payload.get(
        "table",
        {}
    )

    columns = table.get(
        "columnNames",
        []
    )

    rows = table.get(
        "rows",
        []
    )

    if not rows:
        return None

    data = dict(
        zip(
            columns,
            rows[0],
        )
    )

    temperature = data.get(
        "sst"
    )

    if temperature is None:
        return None

    anomaly = data.get(
        "anom"
    )

    return {
        "available":
            True,

        "requestedLatitude":
            latitude,

        "requestedLongitude":
            longitude,

        "latitude":
            data.get(
                "latitude",
                grid_lat,
            ),

        "longitude":
            data.get(
                "longitude",
                grid_lon,
            ),

        "sourceLongitude":
            source_lon,

        "temperatureC":
            float(
                temperature
            ),

        "anomalyC":
            (
                float(
                    anomaly
                )
                if anomaly
                is not None
                else None
            ),

        "observedAt":
            data.get(
                "time"
            ),

        "fetchedAt":
            utc_now(),

        "cacheUsed":
            False,

        "source":
            erddap_source(
                preliminary
            ),
    }


# =========================================================
# PUBLIC LATEST SST
# =========================================================

async def get_latest_sst(
    latitude: float,
    longitude: float,
):
    (
        lat_index,
        lon_index,
        _,
        _,
        _,
    ) = calculate_grid_indices(
        latitude,
        longitude,
    )

    cache_key = (
        lat_index,
        lon_index,
    )

    # -----------------------------------------------------
    # 1. NOAA PSL
    # -----------------------------------------------------

    result = await fetch_psl_latest(
        latitude,
        longitude,
    )

    if result:
        print(
            "NOAA SUCCESS: PSL"
        )

        LATEST_CACHE[
            cache_key
        ] = deepcopy(
            result
        )

        return result

    # -----------------------------------------------------
    # 2. NCEI PRELIMINARY
    # -----------------------------------------------------

    result = await fetch_erddap_latest(
        latitude,
        longitude,
        True,
    )

    if result:
        print(
            "NOAA SUCCESS: "
            "NCEI PRELIMINARY"
        )

        LATEST_CACHE[
            cache_key
        ] = deepcopy(
            result
        )

        return result

    # -----------------------------------------------------
    # 3. NCEI FINAL
    # -----------------------------------------------------

    result = await fetch_erddap_latest(
        latitude,
        longitude,
        False,
    )

    if result:
        print(
            "NOAA SUCCESS: "
            "NCEI FINAL"
        )

        LATEST_CACHE[
            cache_key
        ] = deepcopy(
            result
        )

        return result

    # -----------------------------------------------------
    # 4. REAL CACHE
    # -----------------------------------------------------

    cached = LATEST_CACHE.get(
        cache_key
    )

    if cached:

        restored = deepcopy(
            cached
        )

        restored[
            "cacheUsed"
        ] = True

        restored[
            "fetchedAt"
        ] = utc_now()

        return restored

    # -----------------------------------------------------
    # NOTHING AVAILABLE
    # -----------------------------------------------------

    return {
        "available":
            False,

        "reason":
            (
                "NOAA/NCEI OISST could not "
                "be retrieved from either "
                "NOAA PSL or NCEI ERDDAP."
            ),

        "requestedLatitude":
            latitude,

        "requestedLongitude":
            longitude,

        "fetchedAt":
            utc_now(),

        "cacheUsed":
            False,

        "source": {
            "provider":
                "NOAA/NCEI",

            "dataset":
                "OISST v2.1 Daily",

            "datasetStatus":
                "Unavailable",

            "units":
                "°C",

            "resolution":
                "0.25°",
        },
    }


# =========================================================
# NOAA PSL HISTORY
# =========================================================

async def fetch_psl_history(
    latitude: float,
    longitude: float,
    days: int,
):
    year = datetime.now(
        timezone.utc
    ).year

    noaa_lon = (
        longitude_to_noaa(
            longitude
        )
    )

    sst_url = (
        f"{PSL_BASE}/"
        f"sst.day.mean.{year}.nc"
    )

    anomaly_url = (
        f"{PSL_BASE}/"
        f"sst.day.anom.{year}.nc"
    )

    # Give enough room for a few days
    # of publication delay.
    start = (
        datetime.now(
            timezone.utc
        )
        - timedelta(
            days=days + 10
        )
    )

    start_text = (
        start.strftime(
            "%Y-%m-%dT00:00:00Z"
        )
    )

    common = {
        "latitude":
            str(latitude),

        "longitude":
            str(noaa_lon),

        "time_start":
            start_text,

        "time_end":
            "present",

        "accept":
            "csv",
    }

    (
        sst_text,
        anomaly_text,
    ) = await asyncio.gather(
        get_text(
            sst_url,
            {
                **common,
                "var":
                    "sst",
            },
        ),
        get_text(
            anomaly_url,
            {
                **common,
                "var":
                    "anom",
            },
        ),
    )

    sst_rows = parse_psl_csv(
        sst_text,
        "sst",
    )

    anomaly_rows = parse_psl_csv(
        anomaly_text,
        "anom",
    )

    if not sst_rows:
        return None

    sst_rows = (
        sst_rows[
            -days:
        ]
    )

    anomaly_by_date = {
        date_key(
            item["observedAt"]
        ):
            item["value"]

        for item in anomaly_rows
        if date_key(
            item["observedAt"]
        )
    }

    observations = []

    for item in sst_rows:

        key = date_key(
            item[
                "observedAt"
            ]
        )

        observations.append(
            {
                "observedAt":
                    item[
                        "observedAt"
                    ],

                "temperatureC":
                    item[
                        "value"
                    ],

                "anomalyC":
                    anomaly_by_date.get(
                        key
                    ),
            }
        )

    if not observations:
        return None

    return observations


# =========================================================
# HISTORY SUMMARY
# =========================================================

def calculate_history_summary(
    observations: list,
):
    temperatures = [
        item[
            "temperatureC"
        ]

        for item in observations

        if item.get(
            "temperatureC"
        )
        is not None
    ]

    anomalies = [
        item[
            "anomalyC"
        ]

        for item in observations

        if item.get(
            "anomalyC"
        )
        is not None
    ]

    mean_temperature = (
        sum(
            temperatures
        )
        / len(
            temperatures
        )
        if temperatures
        else None
    )

    mean_anomaly = (
        sum(
            anomalies
        )
        / len(
            anomalies
        )
        if anomalies
        else None
    )

    positive_days = sum(
        1
        for value in anomalies
        if value > 0
    )

    elevated_days = sum(
        1
        for value in anomalies
        if value >= 1.0
    )

    consecutive = 0

    for observation in reversed(
        observations
    ):
        anomaly = observation.get(
            "anomalyC"
        )

        if (
            anomaly is not None
            and anomaly >= 1.0
        ):
            consecutive += 1

        else:
            break

    return {
        "meanTemperatureC":
            (
                round(
                    mean_temperature,
                    3,
                )
                if mean_temperature
                is not None
                else None
            ),

        "meanAnomalyC":
            (
                round(
                    mean_anomaly,
                    3,
                )
                if mean_anomaly
                is not None
                else None
            ),

        "minimumTemperatureC":
            (
                min(
                    temperatures
                )
                if temperatures
                else None
            ),

        "maximumTemperatureC":
            (
                max(
                    temperatures
                )
                if temperatures
                else None
            ),

        "positiveAnomalyDays":
            positive_days,

        "elevatedAnomalyDays":
            elevated_days,

        "consecutiveElevatedDays":
            consecutive,

        "analysisThreshold": {
            "anomalyC":
                1.0,

            "meaning":
                (
                    "AQUORA prototype "
                    "analysis threshold only; "
                    "not an official marine "
                    "hazard threshold."
                ),
        },
    }


# =========================================================
# PUBLIC SST HISTORY
# =========================================================

async def get_sst_history(
    latitude: float,
    longitude: float,
    days: int = 7,
):
    days = max(
        2,
        min(
            days,
            14,
        ),
    )

    (
        lat_index,
        lon_index,
        source_lon,
        _,
        _,
    ) = calculate_grid_indices(
        latitude,
        longitude,
    )

    cache_key = (
        lat_index,
        lon_index,
        days,
    )

    observations = (
        await fetch_psl_history(
            latitude,
            longitude,
            days,
        )
    )

    if observations:

        response = {
            "available":
                True,

            "requestedLatitude":
                latitude,

            "requestedLongitude":
                longitude,

            "sourceLongitude":
                source_lon,

            "requestedDays":
                days,

            "observationCount":
                len(
                    observations
                ),

            "observations":
                observations,

            "summary":
                calculate_history_summary(
                    observations
                ),

            "source":
                psl_source(),

            "fetchedAt":
                utc_now(),

            "cacheUsed":
                False,
        }

        HISTORY_CACHE[
            cache_key
        ] = deepcopy(
            response
        )

        return response

    cached = HISTORY_CACHE.get(
        cache_key
    )

    if cached:

        result = deepcopy(
            cached
        )

        result[
            "cacheUsed"
        ] = True

        result[
            "fetchedAt"
        ] = utc_now()

        return result

    return {
        "available":
            False,

        "reason":
            (
                "Recent NOAA/NCEI "
                "OISST history could "
                "not be retrieved."
            ),

        "requestedLatitude":
            latitude,

        "requestedLongitude":
            longitude,

        "requestedDays":
            days,

        "observationCount":
            0,

        "observations":
            [],

        "summary":
            None,

        "fetchedAt":
            utc_now(),

        "cacheUsed":
            False,

        "source":
            psl_source(),
    }
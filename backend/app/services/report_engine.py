import asyncio
import uuid

from datetime import (
    datetime,
    timezone,
)

from app.services.noaa import (
    get_latest_sst,
    get_sst_history,
)

from app.services.argovis import (
    get_nearby_argo_profiles,
)


# =========================================================
# CURRENT SURFACE ASSESSMENT
# =========================================================

def classify_surface_anomaly(
    anomaly: float | None,
):
    """
    AQUORA prototype interpretation bands.

    These are NOT official marine hazard thresholds.
    """

    if anomaly is None:

        return {
            "classification":
                "SURFACE_DATA_LIMITED",

            "label":
                "Insufficient Surface Evidence",

            "severity":
                "limited",
        }


    if anomaly >= 2.0:

        return {
            "classification":
                "STRONG_POSITIVE_ANOMALY",

            "label":
                "Strong Positive SST Anomaly",

            "severity":
                "high",
        }


    if anomaly >= 1.0:

        return {
            "classification":
                "POSITIVE_ANOMALY",

            "label":
                "Elevated SST Anomaly",

            "severity":
                "moderate",
        }


    if anomaly <= -2.0:

        return {
            "classification":
                "STRONG_NEGATIVE_ANOMALY",

            "label":
                "Strong Negative SST Anomaly",

            "severity":
                "high",
        }


    if anomaly <= -1.0:

        return {
            "classification":
                "NEGATIVE_ANOMALY",

            "label":
                "Reduced SST Anomaly",

            "severity":
                "moderate",
        }


    return {
        "classification":
            "NO_MAJOR_SURFACE_ANOMALY",

        "label":
            "No Major SST Anomaly Detected",

        "severity":
            "low",
    }


# =========================================================
# HISTORICAL SURFACE INTERPRETATION
# =========================================================

def interpret_surface_history(
    history: dict,
):
    """
    Interpret recent NOAA observations.

    This is observational context only.

    AQUORA does NOT claim official marine heatwave
    detection or hazard classification here.
    """

    if not history.get(
        "available",
        False,
    ):

        return {
            "classification":
                "HISTORY_UNAVAILABLE",

            "label":
                "Historical Context Unavailable",

            "description":
                (
                    "Recent SST history could not "
                    "be retrieved for this location."
                ),
        }


    summary = (
        history.get(
            "summary"
        )
        or {}
    )


    observation_count = (
        history.get(
            "observationCount",
            0,
        )
    )


    consecutive = (
        summary.get(
            "consecutiveElevatedDays",
            0,
        )
        or 0
    )


    elevated_days = (
        summary.get(
            "elevatedAnomalyDays",
            0,
        )
        or 0
    )


    positive_days = (
        summary.get(
            "positiveAnomalyDays",
            0,
        )
        or 0
    )


    # -----------------------------------------------------
    # Too little history
    # -----------------------------------------------------

    if observation_count < 3:

        return {
            "classification":
                "LIMITED_HISTORY",

            "label":
                "Limited Historical Context",

            "description":
                (
                    "Too few recent observations "
                    "are available for a meaningful "
                    "surface persistence assessment."
                ),
        }


    # -----------------------------------------------------
    # Several consecutive observations >= +1 °C
    #
    # Still NOT an official marine heatwave claim.
    # -----------------------------------------------------

    if consecutive >= 3:

        return {
            "classification":
                "RECENT_ELEVATED_SEQUENCE",

            "label":
                "Recent Elevated SST Sequence",

            "description":
                (
                    f"{consecutive} consecutive recent "
                    "observations met or exceeded the "
                    "AQUORA +1.0 °C prototype anomaly "
                    "analysis threshold."
                ),
        }


    # -----------------------------------------------------
    # Elevated observations exist but not consecutively
    # -----------------------------------------------------

    if elevated_days > 0:

        return {
            "classification":
                "INTERMITTENT_ELEVATED_ANOMALY",

            "label":
                "Intermittent Elevated SST Observations",

            "description":
                (
                    f"{elevated_days} recent observation"
                    f"{'' if elevated_days == 1 else 's'} "
                    "met or exceeded the AQUORA "
                    "+1.0 °C prototype analysis threshold, "
                    "without a sustained recent sequence."
                ),
        }


    # -----------------------------------------------------
    # Positive but below elevated threshold
    # -----------------------------------------------------

    if (
        observation_count > 0
        and positive_days
        >= observation_count * 0.7
    ):

        return {
            "classification":
                "PREDOMINANTLY_POSITIVE_ANOMALIES",

            "label":
                "Predominantly Positive SST Anomalies",

            "description":
                (
                    "Most recent observations show "
                    "positive SST anomalies, but they "
                    "do not meet AQUORA's prototype "
                    "elevated-anomaly threshold."
                ),
        }


    return {
        "classification":
            "NO_ELEVATED_PERSISTENCE",

        "label":
            "No Elevated SST Persistence Identified",

        "description":
            (
                "Recent observations do not show "
                "persistent SST anomalies at or above "
                "the AQUORA +1.0 °C prototype threshold."
            ),
    }


# =========================================================
# EVIDENCE COVERAGE
# =========================================================

def calculate_evidence_score(
    sst_available: bool,
    nearest_argo_distance: float | None,
    argo_count: int,
    history_available: bool,
):
    """
    Evidence coverage score.

    This measures observation availability.

    It is NOT:
    - probability
    - scientific certainty
    - event confidence
    """

    score = 0

    reasons = []


    # -----------------------------------------------------
    # CURRENT SST
    # -----------------------------------------------------

    if sst_available:

        score += 40

        reasons.append(
            "A valid NOAA/NCEI SST observation is available."
        )


    # -----------------------------------------------------
    # RECENT SST HISTORY
    # -----------------------------------------------------

    if history_available:

        score += 15

        reasons.append(
            "Recent NOAA/NCEI SST historical context is available."
        )


    # -----------------------------------------------------
    # ARGO SPATIAL EVIDENCE
    # -----------------------------------------------------

    if nearest_argo_distance is not None:

        if nearest_argo_distance <= 100:

            score += 30

            reasons.append(
                "A compatible Argo observation exists within 100 km."
            )


        elif nearest_argo_distance <= 250:

            score += 25

            reasons.append(
                "A compatible Argo observation exists within 250 km."
            )


        elif nearest_argo_distance <= 500:

            score += 15

            reasons.append(
                "A compatible Argo observation exists within the 500 km search region."
            )


    # -----------------------------------------------------
    # MULTIPLE ARGO OBSERVATIONS
    # -----------------------------------------------------

    if argo_count >= 3:

        score += 15

        reasons.append(
            "Multiple nearby Argo observations are available."
        )


    score = min(
        score,
        100,
    )


    if score >= 80:

        label = "STRONG"


    elif score >= 50:

        label = "PARTIAL"


    else:

        label = "LIMITED"


    return {
        "score":
            score,

        "label":
            label,

        "meaning":
            (
                "Availability of supporting observations, "
                "not event probability or scientific certainty."
            ),

        "reasons":
            reasons,
    }


# =========================================================
# SAFE ARGO FETCH
# =========================================================

async def safe_get_argo(
    latitude: float,
    longitude: float,
):
    try:

        return await get_nearby_argo_profiles(
            latitude=latitude,
            longitude=longitude,
            radius_km=500,
        )


    except Exception as exc:

        print(
            "REPORT ARGO WARNING:",
            repr(exc),
        )

        return []


# =========================================================
# GENERATE REPORT
# =========================================================

async def generate_ocean_report(
    latitude: float,
    longitude: float,
):
    """
    Generate an AQUORA observational evidence report.

    Latest SST, historical SST and nearby Argo queries
    are executed concurrently to reduce report latency.
    """

    (
        sst_result,
        history_result,
        argo_profiles,
    ) = await asyncio.gather(

        get_latest_sst(
            latitude=latitude,
            longitude=longitude,
        ),

        get_sst_history(
            latitude=latitude,
            longitude=longitude,
            days=7,
        ),

        safe_get_argo(
            latitude=latitude,
            longitude=longitude,
        ),
    )


    sst = (
        sst_result
        if isinstance(
            sst_result,
            dict,
        )
        else {}
    )


    history = (
        history_result
        if isinstance(
            history_result,
            dict,
        )
        else {
            "available":
                False,

            "observations":
                [],

            "summary":
                None,
        }
    )


    # -----------------------------------------------------
    # NEAREST ARGO
    # -----------------------------------------------------

    nearest_argo = None


    if argo_profiles:

        nearest_argo = min(
            argo_profiles,

            key=lambda profile:
                profile.get(
                    "distanceKm",
                    float("inf"),
                ),
        )


    # -----------------------------------------------------
    # CURRENT SURFACE ANOMALY
    # -----------------------------------------------------

    anomaly = (
        sst.get(
            "anomalyC"
        )
        if sst.get(
            "available",
            False,
        )
        else None
    )


    assessment = (
        classify_surface_anomaly(
            anomaly
        )
    )


    # -----------------------------------------------------
    # HISTORICAL INTERPRETATION
    # -----------------------------------------------------

    persistence = (
        interpret_surface_history(
            history
        )
    )


    # -----------------------------------------------------
    # EVIDENCE COVERAGE
    # -----------------------------------------------------

    evidence = (
        calculate_evidence_score(

            sst_available=
                sst.get(
                    "available",
                    False,
                ),

            nearest_argo_distance=(
                nearest_argo.get(
                    "distanceKm"
                )
                if nearest_argo
                else None
            ),

            argo_count=
                len(
                    argo_profiles
                ),

            history_available=
                history.get(
                    "available",
                    False,
                ),
        )
    )


    generated_at = (
        datetime.now(
            timezone.utc
        ).isoformat()
    )


    report_id = (
        "AQR-"
        + uuid.uuid4()
        .hex[:8]
        .upper()
    )


    # =====================================================
    # RESPONSE
    # =====================================================

    return {

        "reportId":
            report_id,

        "generatedAt":
            generated_at,

        "reportType":
            "OCEAN_EVIDENCE_REPORT",

        "status":
            "OBSERVATIONAL_ASSESSMENT",


        # -------------------------------------------------
        # LOCATION
        # -------------------------------------------------

        "location": {

            "latitude":
                latitude,

            "longitude":
                longitude,
        },


        # -------------------------------------------------
        # LATEST SURFACE OBSERVATION
        # -------------------------------------------------

        "surface": {

            "available":
                sst.get(
                    "available",
                    False,
                ),

            "temperatureC":
                sst.get(
                    "temperatureC"
                ),

            "anomalyC":
                anomaly,

            "observedAt":
                sst.get(
                    "observedAt"
                ),

            "fetchedAt":
                sst.get(
                    "fetchedAt"
                ),

            "gridLatitude":
                sst.get(
                    "latitude"
                ),

            "gridLongitude":
                sst.get(
                    "longitude"
                ),

            "source":
                sst.get(
                    "source"
                ),
        },


        # -------------------------------------------------
        # CURRENT ASSESSMENT
        # -------------------------------------------------

        "assessment":
            assessment,


        # -------------------------------------------------
        # 7-DAY HISTORY
        # -------------------------------------------------

        "surfaceHistory": {

            "available":
                history.get(
                    "available",
                    False,
                ),

            "requestedDays":
                history.get(
                    "requestedDays",
                    7,
                ),

            "observationCount":
                history.get(
                    "observationCount",
                    0,
                ),

            "observations":
                history.get(
                    "observations",
                    [],
                ),

            "summary":
                history.get(
                    "summary"
                ),

            "source":
                history.get(
                    "source"
                ),

            "fetchedAt":
                history.get(
                    "fetchedAt"
                ),
        },


        # -------------------------------------------------
        # PERSISTENCE INTERPRETATION
        # -------------------------------------------------

        "surfacePersistence":
            persistence,


        # -------------------------------------------------
        # SUBSURFACE EVIDENCE
        # -------------------------------------------------

        "subsurfaceEvidence": {

            "available":
                nearest_argo
                is not None,

            "nearbyProfileCount":
                len(
                    argo_profiles
                ),

            "nearestProfile":
                nearest_argo,
        },


        # -------------------------------------------------
        # EVIDENCE COVERAGE
        # -------------------------------------------------

        "evidence":
            evidence,


        # -------------------------------------------------
        # SOURCES
        # -------------------------------------------------

        "sources": [
            "NOAA/NCEI OISST",
            "Argo / Argovis",
        ],


        # -------------------------------------------------
        # SCIENTIFIC NOTICE
        # -------------------------------------------------

        "scientificNotice":
            (
                "This report summarizes available "
                "observational evidence and recent "
                "surface-temperature context. AQUORA's "
                "prototype anomaly thresholds are analytical "
                "display rules only and are not official "
                "marine heatwave definitions, hazard warnings, "
                "or government advisories."
            ),
    }
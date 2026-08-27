const AQUORA_API =
  import.meta.env.VITE_API_BASE ||
  "http://127.0.0.1:8000";


/* =========================================================
   NOAA SST SOURCE
========================================================= */

export interface SSTSource {
  provider: string;

  dataset: string;

  datasetId?: string;

  datasetStatus?: string;

  variable?: string;

  units?: string;

  resolution?: string;
}


/* =========================================================
   LATEST NOAA SST
========================================================= */

export interface SSTData {
  available: boolean;

  reason?: string;

  /*
   * User-selected coordinates.
   */
  requestedLatitude?: number;

  requestedLongitude?: number;


  /*
   * Actual NOAA grid coordinates.
   */
  latitude?: number;

  longitude?: number;

  sourceLongitude?: number;


  /*
   * Measurements.
   */
  temperatureC?: number;

  anomalyC?: number | null;


  /*
   * Observation metadata.
   */
  observedAt?: string | null;

  fetchedAt?: string | null;

  source?: SSTSource;
}


/* =========================================================
   ARGO NEARBY PROFILE
========================================================= */

export interface ArgoProfile {
  /*
   * Argovis profile ID.
   * Example:
   * 5907171_053
   */
  id: string;


  /*
   * Float / platform number.
   */
  platform?: string | null;


  cycle?: number | null;


  latitude: number;

  longitude: number;


  observedAt?: string | null;


  /*
   * Distance from AQUORA selected location.
   */
  distanceKm: number;
}


/* =========================================================
   NEARBY ARGO RESPONSE
========================================================= */

export interface NearbyArgoResponse {
  available: boolean;

  count: number;

  search: {
    latitude: number;

    longitude: number;

    radiusKm: number;
  };

  profiles: ArgoProfile[];
}


/* =========================================================
   ARGO PROFILE LEVEL
========================================================= */

export interface ArgoLevel {
  /*
   * Argo directly measures pressure.
   *
   * AQUORA intentionally does not treat
   * pressure as exact geometric depth.
   */
  pressureDbar: number;


  temperatureC: number | null;

  salinityPsu: number | null;


  pressureQc: string | null;

  temperatureQc: string | null;

  salinityQc: string | null;
}


/* =========================================================
   FULL ARGO PROFILE
   USED BY OCEAN X-RAY
========================================================= */

export interface ArgoFullProfile {
  profileId: string;

  platformId: string;


  cycle?: number | null;


  latitude?: number | null;

  longitude?: number | null;


  observedAt?: string | null;


  profileDirection?: string | null;

  verticalSamplingScheme?: string | null;


  levelCount: number;

  maxPressureDbar?: number | null;


  levels: ArgoLevel[];


  source: {
    provider: string;

    measurementType: string;
  };
}


/* =========================================================
   FULL ARGO PROFILE API RESPONSE
========================================================= */

export interface ArgoProfileResponse {
  available: boolean;

  profile: ArgoFullProfile;
}


/* =========================================================
   7-DAY SST HISTORY OBSERVATION
========================================================= */

export interface SSTHistoryObservation {
  observedAt: string | null;

  temperatureC: number;

  anomalyC: number | null;
}


/* =========================================================
   7-DAY SST HISTORY SUMMARY
========================================================= */

export interface SSTHistorySummary {
  meanTemperatureC: number | null;

  meanAnomalyC: number | null;


  minimumTemperatureC: number | null;

  maximumTemperatureC: number | null;


  positiveAnomalyDays: number;

  elevatedAnomalyDays: number;

  consecutiveElevatedDays: number;


  analysisThreshold?: {
    anomalyC: number;

    meaning: string;
  };
}


/* =========================================================
   SURFACE HISTORY
========================================================= */

export interface SurfaceHistory {
  available: boolean;


  requestedDays: number;

  observationCount: number;


  observations:
    SSTHistoryObservation[];


  summary:
    SSTHistorySummary | null;


  source?: SSTSource;


  fetchedAt?: string | null;
}


/* =========================================================
   SURFACE PERSISTENCE INTERPRETATION
========================================================= */

export interface SurfacePersistence {
  classification: string;

  label: string;

  description: string;
}


/* =========================================================
   AQUORA EVIDENCE REPORT
========================================================= */

export interface OceanEvidenceReport {
  reportId: string;

  generatedAt: string;

  reportType: string;

  status: string;


  /* -------------------------------------------------------
     LOCATION
  ------------------------------------------------------- */

  location: {
    latitude: number;

    longitude: number;
  };


  /* -------------------------------------------------------
     CURRENT SURFACE EVIDENCE
  ------------------------------------------------------- */

  surface: {
    available: boolean;


    temperatureC:
      number | null;


    anomalyC:
      number | null;


    observedAt:
      string | null;


    fetchedAt:
      string | null;


    gridLatitude:
      number | null;


    gridLongitude:
      number | null;


    source?: SSTSource;
  };


  /* -------------------------------------------------------
     CURRENT SURFACE ASSESSMENT
  ------------------------------------------------------- */

  assessment: {
    classification: string;

    label: string;

    severity: string;
  };


  /* -------------------------------------------------------
     RECENT SURFACE HISTORY
  ------------------------------------------------------- */

  surfaceHistory:
    SurfaceHistory;


  /* -------------------------------------------------------
     SURFACE PERSISTENCE
  ------------------------------------------------------- */

  surfacePersistence:
    SurfacePersistence;


  /* -------------------------------------------------------
     SUBSURFACE ARGO EVIDENCE
  ------------------------------------------------------- */

  subsurfaceEvidence: {
    available: boolean;


    nearbyProfileCount:
      number;


    nearestProfile:
      ArgoProfile | null;
  };


  /* -------------------------------------------------------
     EVIDENCE COVERAGE
  ------------------------------------------------------- */

  evidence: {
    score: number;

    label: string;

    meaning: string;

    reasons: string[];
  };


  /* -------------------------------------------------------
     PROVENANCE
  ------------------------------------------------------- */

  sources: string[];


  scientificNotice: string;
}


/* =========================================================
   OPTIONAL DIRECT SST HISTORY API RESPONSE
========================================================= */

export interface SSTHistoryResponse {
  available: boolean;

  reason?: string;


  requestedLatitude?: number;

  requestedLongitude?: number;

  sourceLongitude?: number;


  requestedDays: number;

  observationCount?: number;


  observations:
    SSTHistoryObservation[];


  summary:
    SSTHistorySummary | null;


  source?: SSTSource;


  fetchedAt?: string | null;
}


/* =========================================================
   GENERIC API RESPONSE HANDLER
========================================================= */

async function parseApiResponse<T>(
  response: Response
): Promise<T> {

  if (!response.ok) {

    let message =
      `AQUORA API returned ${response.status}`;

    try {

      const body =
        await response.json();

      if (body?.detail) {

        message =
          typeof body.detail === "string"
            ? body.detail
            : JSON.stringify(body.detail);

      }

    } catch {
      // Ignore response body parsing failure.
    }

    throw new Error(message);
  }

  const data =
    await response.json();

  return data as T;
}


/* =========================================================
   FETCH LATEST SST
========================================================= */

export async function fetchSST(
  latitude: number,
  longitude: number
): Promise<SSTData> {

  const params =
    new URLSearchParams({

      lat:
        latitude.toString(),

      lon:
        longitude.toString(),

    });


  const response =
    await fetch(

      `${AQUORA_API}/api/ocean/sst?${params}`

    );


  return (
    parseApiResponse<SSTData>(
      response
    )
  );
}


/* =========================================================
   FETCH 7-DAY / RECENT SST HISTORY
========================================================= */

export async function fetchSSTHistory(
  latitude: number,
  longitude: number,
  days = 7
): Promise<SSTHistoryResponse> {

  const params =
    new URLSearchParams({

      lat:
        latitude.toString(),

      lon:
        longitude.toString(),

      days:
        days.toString(),

    });


  const response =
    await fetch(

      `${AQUORA_API}/api/ocean/sst/history?${params}`

    );


  return (
    parseApiResponse<SSTHistoryResponse>(
      response
    )
  );
}


/* =========================================================
   FETCH NEARBY ARGO PROFILES
========================================================= */

export async function fetchNearbyArgo(
  latitude: number,
  longitude: number,
  radius = 500
): Promise<NearbyArgoResponse> {

  const params =
    new URLSearchParams({

      lat:
        latitude.toString(),

      lon:
        longitude.toString(),

      radius:
        radius.toString(),

    });


  const response =
    await fetch(

      `${AQUORA_API}/api/ocean/argo/nearby?${params}`

    );


  return (
    parseApiResponse<NearbyArgoResponse>(
      response
    )
  );
}


/* =========================================================
   FETCH FULL ARGO PROFILE
   USED BY OCEAN X-RAY
========================================================= */

export async function fetchArgoProfile(
  profileId: string
): Promise<ArgoProfileResponse> {

  const encodedProfileId =
    encodeURIComponent(
      profileId
    );


  const response =
    await fetch(

      `${AQUORA_API}/api/ocean/argo/profile/${encodedProfileId}`

    );


  return (
    parseApiResponse<ArgoProfileResponse>(
      response
    )
  );
}


/* =========================================================
   GENERATE AQUORA OCEAN EVIDENCE REPORT
========================================================= */

export async function generateOceanReport(
  latitude: number,
  longitude: number
): Promise<OceanEvidenceReport> {

  const params =
    new URLSearchParams({

      lat:
        latitude.toString(),

      lon:
        longitude.toString(),

    });


  const response =
    await fetch(

      `${AQUORA_API}/api/reports/generate?${params}`,

      {
        method:
          "POST",
      }

    );


  return (
    parseApiResponse<OceanEvidenceReport>(
      response
    )
  );
}
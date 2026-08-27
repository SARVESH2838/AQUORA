import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar";
import GlobeMap from "../components/GlobeMap";
import OceanXRay from "../components/OceanXRay";

import {
  fetchSST,
  fetchNearbyArgo,
  fetchArgoProfile,
  generateOceanReport,
  type SSTData,
  type ArgoProfile,
  type ArgoFullProfile,
  type OceanEvidenceReport,
} from "../services/oceanApi";

/* =========================================================
   TYPES
========================================================= */

export interface SelectedLocation {
  latitude: number;
  longitude: number;
}

interface ExploreProps {
  onReportGenerated: (report: OceanEvidenceReport) => void;
}

/* =========================================================
   HELPERS
========================================================= */

function formatCoordinate(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(4)}° ${value >= 0 ? positive : negative}`;
}

function formatTimestamp(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function getObservationAge(
  observedAt?: string | null,
  fetchedAt?: string | null,
) {
  if (!observedAt) {
    return "Observation time unavailable";
  }

  const observed = new Date(observedAt);

  const reference = fetchedAt ? new Date(fetchedAt) : new Date();

  if (Number.isNaN(observed.getTime()) || Number.isNaN(reference.getTime())) {
    return "Freshness unavailable";
  }

  const differenceMs = reference.getTime() - observed.getTime();

  const hours = Math.max(0, Math.floor(differenceMs / (1000 * 60 * 60)));

  if (hours < 1) {
    return "Observed less than 1 hour ago";
  }

  if (hours < 24) {
    return `Observed ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  const days = Math.floor(hours / 24);

  return `Observed ${days} ${days === 1 ? "day" : "days"} ago`;
}

/* =========================================================
   EXPLORE PAGE
========================================================= */

function Explore({ onReportGenerated }: ExploreProps) {
  const navigate = useNavigate();

  /* =======================================================
     LOCATION
  ======================================================= */

  const [selectedLocation, setSelectedLocation] =
    useState<SelectedLocation | null>(null);

  const [searchLocation, setSearchLocation] = useState<SelectedLocation | null>(
    null,
  );

  /* =======================================================
     NOAA SST
  ======================================================= */

  const [sstData, setSstData] = useState<SSTData | null>(null);

  const [loadingOcean, setLoadingOcean] = useState(false);

  const [oceanError, setOceanError] = useState("");

  /* =======================================================
     ARGO
  ======================================================= */

  const [argoProfiles, setArgoProfiles] = useState<ArgoProfile[]>([]);

  const [selectedArgo, setSelectedArgo] = useState<ArgoProfile | null>(null);

  /* =======================================================
     OCEAN X-RAY
  ======================================================= */

  const [xrayProfile, setXrayProfile] = useState<ArgoFullProfile | null>(null);

  const [xrayLoading, setXrayLoading] = useState(false);

  const [xrayError, setXrayError] = useState("");

  /* =======================================================
     REPORT
  ======================================================= */

  const [reportLoading, setReportLoading] = useState(false);

  const [reportError, setReportError] = useState("");

  /* =======================================================
     RESET DATA WHEN LOCATION CHANGES
  ======================================================= */

  useEffect(() => {
    setSstData(null);

    setArgoProfiles([]);

    setSelectedArgo(null);

    setXrayProfile(null);

    setXrayError("");

    setOceanError("");

    setReportError("");
  }, [selectedLocation]);

  /* =======================================================
     EXPLORE OCEAN DATA
  ======================================================= */

  const exploreOceanData = async () => {
    if (!selectedLocation) {
      return;
    }

    setLoadingOcean(true);

    setOceanError("");

    setReportError("");

    setSstData(null);

    setArgoProfiles([]);

    setSelectedArgo(null);

    setXrayProfile(null);

    /* ---------------------------------------------------
         NOAA SST
      --------------------------------------------------- */

    try {
      const sstResult = await fetchSST(
        selectedLocation.latitude,
        selectedLocation.longitude,
      );

      setSstData(sstResult);
    } catch (error) {
      console.error("SST ERROR:", error);

      /*
       * NOAA failure should not stop
       * the Argo layer from loading.
       */

      setOceanError(
        "Sea surface temperature could not be retrieved. Available Argo observations can still be explored.",
      );
    }

    /* ---------------------------------------------------
         ARGO
      --------------------------------------------------- */

    try {
      const argoResult = await fetchNearbyArgo(
        selectedLocation.latitude,
        selectedLocation.longitude,
        500,
      );

      if (argoResult.available) {
        setArgoProfiles(argoResult.profiles);
      } else {
        setArgoProfiles([]);
      }
    } catch (error) {
      console.error("ARGO ERROR:", error);

      /*
       * Argo failure should not remove
       * valid NOAA surface evidence.
       */
    }

    setLoadingOcean(false);
  };

  /* =======================================================
     OCEAN X-RAY
  ======================================================= */

  const openOceanXRay = async () => {
    if (!selectedArgo) {
      return;
    }

    try {
      setXrayLoading(true);

      setXrayError("");

      setXrayProfile(null);

      const result = await fetchArgoProfile(selectedArgo.id);

      if (!result.available || !result.profile) {
        throw new Error("Profile unavailable");
      }

      setXrayProfile(result.profile);
    } catch (error) {
      console.error("OCEAN X-RAY ERROR:", error);

      setXrayError(
        "This Argo profile is not available for detailed X-Ray analysis. Try another nearby observation.",
      );
    } finally {
      setXrayLoading(false);
    }
  };

  /* =======================================================
     GENERATE OCEAN EVIDENCE REPORT
  ======================================================= */

  const createEvidenceReport = async () => {
    if (!selectedLocation) {
      return;
    }

    try {
      setReportLoading(true);

      setReportError("");

      const report = await generateOceanReport(
        selectedLocation.latitude,
        selectedLocation.longitude,
      );

      /*
       * Pass report to App.tsx.
       * App can store it in state/localStorage.
       */

      onReportGenerated(report);

      /*
       * Navigate to Reports page.
       */

      navigate("/reports");
    } catch (error) {
      console.error("REPORT ERROR:", error);

      setReportError(
        "AQUORA could not generate the evidence report. Please try again.",
      );
    } finally {
      setReportLoading(false);
    }
  };

  /* =======================================================
     CLOSE LOCATION
  ======================================================= */

  const closeLocation = () => {
    setSelectedLocation(null);

    setSearchLocation(null);

    setSstData(null);

    setArgoProfiles([]);

    setSelectedArgo(null);

    setXrayProfile(null);

    setOceanError("");

    setReportError("");
  };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="app-shell">
      {/* ===================================================
          NAVBAR
      =================================================== */}

      <Navbar
        onSearch={setSearchLocation}
        selectedLocation={selectedLocation}
        showSearch={true}
      />

      {/* ===================================================
          MAIN EXPLORE PAGE
      =================================================== */}

      <main className="explore-page">
        {/* =================================================
            INTERACTIVE EARTH
        ================================================= */}

        <GlobeMap
          searchLocation={searchLocation}
          selectedLocation={selectedLocation}
          onLocationSelect={setSelectedLocation}
          argoProfiles={argoProfiles}
          selectedArgo={selectedArgo}
          onArgoSelect={setSelectedArgo}
        />

        {/* =================================================
            WELCOME CARD
        ================================================= */}

        {!selectedLocation && (
          <div className="welcome-card">
            <span className="eyebrow">EXPLORE THE OCEAN</span>

            <h1>Discover what's happening beneath the surface.</h1>

            <p>
              Search using latitude and longitude, or click anywhere on the
              globe to begin exploring real ocean observations.
            </p>
          </div>
        )}

        {/* =================================================
            SELECTED LOCATION CARD
        ================================================= */}

        {selectedLocation && !xrayProfile && (
          <div className="location-card">
            {/* ---------------------------------------------
                HEADER
            --------------------------------------------- */}

            <div className="location-card-header">
              <div>
                <span className="eyebrow">SELECTED LOCATION</span>

                <h2>Selected Location</h2>
              </div>

              <button
                className="close-button"
                onClick={closeLocation}
                aria-label="Close selected location"
              >
                ×
              </button>
            </div>

            {/* ---------------------------------------------
                COORDINATES
            --------------------------------------------- */}

            <div className="coordinate-grid">
              <div>
                <span>Latitude</span>

                <strong>
                  {formatCoordinate(selectedLocation.latitude, "N", "S")}
                </strong>
              </div>

              <div>
                <span>Longitude</span>

                <strong>
                  {formatCoordinate(selectedLocation.longitude, "E", "W")}
                </strong>
              </div>
            </div>

            {/* ---------------------------------------------
                INITIAL MESSAGE
            --------------------------------------------- */}

            {!sstData &&
              argoProfiles.length === 0 &&
              !loadingOcean &&
              !oceanError && (
                <p className="location-description">
                  Check whether verified ocean observations are available near
                  this position.
                </p>
              )}

            {/* ---------------------------------------------
                INITIAL EXPLORE BUTTON
            --------------------------------------------- */}

            {!sstData && argoProfiles.length === 0 && !loadingOcean && (
              <button className="primary-button" onClick={exploreOceanData}>
                Explore Ocean Data
              </button>
            )}

            {/* ---------------------------------------------
                LOADING
            --------------------------------------------- */}

            {loadingOcean && (
              <div className="ocean-loading">
                <div className="loading-spinner" />

                <div>
                  <strong>Retrieving ocean observations</strong>

                  <span>
                    Contacting NOAA and searching nearby Argo profiles
                  </span>
                </div>
              </div>
            )}

            {/* ---------------------------------------------
                GENERAL PROVIDER ERROR
            --------------------------------------------- */}

            {oceanError && <div className="ocean-error">{oceanError}</div>}

            {/* =================================================
                NOAA UNAVAILABLE / NO SST
            ================================================= */}

            {sstData && !sstData.available && (
              <div className="no-ocean-data">
                <strong>Surface SST unavailable</strong>

                <span>
                  {sstData.reason ??
                    "No valid NOAA sea surface temperature observation is currently available for this location."}
                </span>

                {argoProfiles.length > 0 && (
                  <span>
                    Subsurface Argo observations are available and can still be
                    used as evidence.
                  </span>
                )}
              </div>
            )}

            {/* =================================================
                REAL NOAA SST RESULT
            ================================================= */}

            {sstData?.available && (
              <div className="sst-result">
                {/* -----------------------------------------
                    SST HEADER
                ----------------------------------------- */}

                <div className="sst-header">
                  <div>
                    <span className="sst-label">SEA SURFACE TEMPERATURE</span>

                    <div className="sst-temperature">
                      {sstData.temperatureC !== undefined
                        ? sstData.temperatureC.toFixed(2)
                        : "N/A"}

                      <span> °C</span>
                    </div>
                  </div>

                  <div className="real-data-badge">REAL OBSERVATION</div>
                </div>

                {/* -----------------------------------------
                    FRESHNESS
                ----------------------------------------- */}

                <div className="freshness-notice">
                  <div className="freshness-dot" />

                  <div>
                    <strong>Data freshness</strong>

                    <span>
                      {getObservationAge(sstData.observedAt, sstData.fetchedAt)}
                    </span>
                  </div>
                </div>

                {/* -----------------------------------------
                    SST ANOMALY
                ----------------------------------------- */}

                {sstData.anomalyC !== null &&
                  sstData.anomalyC !== undefined && (
                    <div className="anomaly-card">
                      <span>SST Anomaly</span>

                      <strong
                        className={
                          sstData.anomalyC >= 0
                            ? "positive-anomaly"
                            : "negative-anomaly"
                        }
                      >
                        {sstData.anomalyC > 0 ? "+" : ""}
                        {sstData.anomalyC.toFixed(2)} °C
                      </strong>
                    </div>
                  )}

                {/* -----------------------------------------
                    SST METADATA
                ----------------------------------------- */}

                <div className="sst-details">
                  <div className="detail-row">
                    <span>NOAA Grid Point</span>

                    <strong>
                      {sstData.latitude !== undefined
                        ? sstData.latitude.toFixed(3)
                        : "N/A"}
                      °,{" "}
                      {sstData.longitude !== undefined
                        ? sstData.longitude.toFixed(3)
                        : "N/A"}
                      °
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>Resolution</span>

                    <strong>{sstData.source?.resolution ?? "N/A"}</strong>
                  </div>

                  <div className="detail-row">
                    <span>Observed</span>

                    <strong>{formatTimestamp(sstData.observedAt)}</strong>
                  </div>

                  <div className="detail-row">
                    <span>Retrieved</span>

                    <strong>{formatTimestamp(sstData.fetchedAt)}</strong>
                  </div>

                  <div className="detail-row">
                    <span>Source</span>

                    <strong>{sstData.source?.provider ?? "NOAA/NCEI"}</strong>
                  </div>
                </div>

                {/* -----------------------------------------
                    DATASET
                ----------------------------------------- */}

                <div className="source-footer">
                  <span>Dataset</span>

                  <strong>
                    {sstData.source?.dataset ?? "OISST v2.1 AVHRR Daily"}
                  </strong>
                </div>

                {/* -----------------------------------------
                    REFRESH
                ----------------------------------------- */}

                <button
                  className="secondary-button"
                  onClick={exploreOceanData}
                  disabled={loadingOcean}
                >
                  Refresh Observation
                </button>
              </div>
            )}

            {/* =================================================
                ARGO SUMMARY
            ================================================= */}

            {argoProfiles.length > 0 && (
              <div className="argo-summary">
                <span>SUBSURFACE OBSERVATIONS</span>

                <strong>
                  {argoProfiles.length} nearby Argo
                  {argoProfiles.length === 1 ? " observation" : " observations"}
                </strong>

                <p>
                  Green markers represent nearby Argo profiling-float
                  observations. Select a marker to inspect its metadata and
                  Ocean X-Ray profile.
                </p>
              </div>
            )}

            {/* =================================================
                GENERATE EVIDENCE REPORT

                IMPORTANT:
                This is OUTSIDE the SST available block.

                Therefore:
                SST available       -> report button
                SST unavailable     -> report button
                Argo available      -> report button
            ================================================= */}

            {!loadingOcean && (sstData !== null || argoProfiles.length > 0) && (
              <div className="report-action-section">
                <div className="report-action-info">
                  <strong>Ocean Evidence Report</strong>

                  <span>
                    Generate a scientific evidence summary using the
                    observations currently available for this location.
                  </span>
                </div>

                <button
                  className="generate-report-button"
                  onClick={createEvidenceReport}
                  disabled={reportLoading}
                >
                  {reportLoading
                    ? "Generating Evidence Report..."
                    : "Generate Evidence Report"}
                </button>

                {reportError && (
                  <div className="ocean-error">{reportError}</div>
                )}
              </div>
            )}

            {/* =================================================
                RETRY WHEN NOTHING RETURNED
            ================================================= */}

            {!loadingOcean &&
              !sstData &&
              argoProfiles.length === 0 &&
              oceanError && (
                <button className="secondary-button" onClick={exploreOceanData}>
                  Retry Ocean Data
                </button>
              )}
          </div>
        )}

        {/* =================================================
            SELECTED ARGO OBSERVATION CARD
        ================================================= */}

        {selectedArgo && !xrayProfile && (
          <div className="argo-info-card">
            {/* ---------------------------------------------
                HEADER
            --------------------------------------------- */}

            <div className="argo-card-header">
              <div>
                <span className="argo-eyebrow">ARGO OBSERVATION</span>

                <h3>Float {selectedArgo.platform ?? "Unknown"}</h3>
              </div>

              <button
                className="close-button"
                onClick={() => {
                  setSelectedArgo(null);

                  setXrayError("");
                }}
                aria-label="Close Argo observation"
              >
                ×
              </button>
            </div>

            {/* ---------------------------------------------
                PROFILE INFO
            --------------------------------------------- */}

            <div className="argo-info-grid">
              <div>
                <span>Cycle</span>

                <strong>{selectedArgo.cycle ?? "N/A"}</strong>
              </div>

              <div>
                <span>Distance</span>

                <strong>{selectedArgo.distanceKm.toFixed(1)} km</strong>
              </div>

              <div>
                <span>Latitude</span>

                <strong>{selectedArgo.latitude.toFixed(3)}°</strong>
              </div>

              <div>
                <span>Longitude</span>

                <strong>{selectedArgo.longitude.toFixed(3)}°</strong>
              </div>
            </div>

            {/* ---------------------------------------------
                OBSERVED TIME
            --------------------------------------------- */}

            <div className="argo-observed">
              <span>Observed</span>

              <strong>{formatTimestamp(selectedArgo.observedAt)}</strong>
            </div>

            {/* ---------------------------------------------
                X-RAY BUTTON
            --------------------------------------------- */}

            <button
              className="primary-button"
              onClick={openOceanXRay}
              disabled={xrayLoading}
            >
              {xrayLoading ? "Loading Ocean X-Ray..." : "View Ocean X-Ray"}
            </button>

            {/* ---------------------------------------------
                X-RAY ERROR
            --------------------------------------------- */}

            {xrayError && <div className="ocean-error">{xrayError}</div>}
          </div>
        )}

        {/* =================================================
            OCEAN X-RAY
        ================================================= */}

        {xrayProfile && (
          <OceanXRay
            profile={xrayProfile}
            onClose={() => {
              setXrayProfile(null);

              setXrayError("");
            }}
          />
        )}
      </main>
    </div>
  );
}

export default Explore;

import {
  Activity,
  Database,
  MapPin,
  Printer,
  ShieldCheck,
  Thermometer,
  Waves,
} from "lucide-react";
import ReportDepth3D from "../components/ReportDepth3D";
import { Link } from "react-router-dom";

import Navbar from "../components/Navbar";

import SurfaceHistoryChart from "../components/SurfaceHistoryChart";

import type { OceanEvidenceReport } from "../services/oceanApi";

/* =========================================================
   PROPS
========================================================= */

interface ReportsProps {
  report: OceanEvidenceReport | null;
}

/* =========================================================
   HELPERS
========================================================= */

function formatDate(value?: string | null) {
  if (!value) {
    return "Unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

/* =========================================================
   REPORTS PAGE
========================================================= */

function Reports({ report }: ReportsProps) {
  /* =======================================================
     PRINT / SAVE PDF
  ======================================================= */

  const handlePrintReport = () => {
    window.print();
  };

  /* =======================================================
     EMPTY REPORT STATE
  ======================================================= */

  if (!report) {
    return (
      <div className="app-shell">
        <Navbar
          onSearch={() => {}}
          selectedLocation={null}
          showSearch={false}
        />

        <main className="reports-empty">
          <div className="reports-empty-card">
            <div className="reports-empty-icon">
              <Waves size={40} />
            </div>

            <h1>No Ocean Report Yet</h1>

            <p>
              Select an ocean location from Explore, retrieve available
              observations, and generate an AQUORA Ocean Evidence Report.
            </p>

            <Link to="/" className="reports-explore-link">
              Explore Ocean Data
            </Link>
          </div>
        </main>
      </div>
    );
  }

  /* =======================================================
     BASIC REPORT VALUES
  ======================================================= */

  const hasSurfaceData = report.surface.available;

  const hasArgoData = report.subsurfaceEvidence.available;

  const hasHistory = report.surfaceHistory?.available ?? false;

  const gridPoint =
    report.surface.gridLatitude !== null &&
    report.surface.gridLongitude !== null
      ? `${report.surface.gridLatitude.toFixed(
          3,
        )}°, ${report.surface.gridLongitude.toFixed(3)}°`
      : "Unavailable";

  const temperature =
    report.surface.temperatureC !== null
      ? `${report.surface.temperatureC.toFixed(2)} °C`
      : "N/A";

  const anomaly =
    report.surface.anomalyC !== null
      ? `${
          report.surface.anomalyC > 0 ? "+" : ""
        }${report.surface.anomalyC.toFixed(2)} °C`
      : "N/A";

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="app-shell">
      {/* ===================================================
          NAVBAR
      =================================================== */}

      <Navbar onSearch={() => {}} selectedLocation={null} showSearch={false} />

      {/* ===================================================
          REPORT PAGE
      =================================================== */}

      <main className="reports-page">
        <div className="report-container">
          {/* =================================================
              REPORT HEADER
          ================================================= */}

          <div className="report-heading">
            <div>
              <span className="report-eyebrow">
                AQUORA OCEAN EVIDENCE REPORT
              </span>

              <h1>{report.assessment.label}</h1>

              <p>Report ID: {report.reportId}</p>
            </div>

            <div className="report-header-actions">
              {/* PRINT */}

              <button
                type="button"
                className="report-print-button"
                onClick={handlePrintReport}
              >
                <Printer size={15} />
                Print / Save PDF
              </button>

              {/* STATUS */}

              <div className={`report-status ${report.assessment.severity}`}>
                {report.assessment.severity}
              </div>
            </div>
          </div>

          {/* =================================================
              PRIMARY METRICS
          ================================================= */}

          <div className="report-metrics">
            {/* LOCATION */}

            <div className="report-metric">
              <MapPin size={20} />

              <span>Location</span>

              <strong>
                {report.location.latitude.toFixed(4)}
                °, {report.location.longitude.toFixed(4)}°
              </strong>
            </div>

            {/* SST */}

            <div className="report-metric">
              <Thermometer size={20} />

              <span>Sea Surface Temperature</span>

              <strong>{temperature}</strong>
            </div>

            {/* SST ANOMALY */}

            <div className="report-metric">
              <Activity size={20} />

              <span>SST Anomaly</span>

              <strong>{anomaly}</strong>
            </div>

            {/* EVIDENCE */}

            <div className="report-metric">
              <ShieldCheck size={20} />

              <span>Evidence Coverage</span>

              <strong>
                {report.evidence.score}% {report.evidence.label}
              </strong>
            </div>
          </div>

          {/* =================================================
              SURFACE EVIDENCE
          ================================================= */}

          <section className="report-section">
            <div className="report-section-heading">
              <div>
                <h2>Surface Evidence</h2>

                <p>Satellite-derived surface ocean observations.</p>
              </div>

              <span
                className={
                  hasSurfaceData ? "source-available" : "source-unavailable"
                }
              >
                {hasSurfaceData ? "Available" : "Unavailable"}
              </span>
            </div>

            <div className="report-info-grid">
              {/* SST OBSERVATION */}

              <div>
                <span>SST Observation</span>

                <strong>{temperature}</strong>
              </div>

              {/* NOAA GRID */}

              <div>
                <span>NOAA Grid Point</span>

                <strong>{gridPoint}</strong>
              </div>

              {/* OBSERVED */}

              <div>
                <span>Observed At</span>

                <strong>{formatDate(report.surface.observedAt)}</strong>
              </div>

              {/* RETRIEVED */}

              <div>
                <span>Retrieved At</span>

                <strong>{formatDate(report.surface.fetchedAt)}</strong>
              </div>
            </div>
          </section>

          {/* =================================================
              7-DAY SURFACE CONTEXT
          ================================================= */}

          <section className="report-section">
            <div className="report-section-heading">
              <div>
                <h2>7-Day Surface Context</h2>

                <p>
                  Recent NOAA/NCEI SST observations for the selected grid
                  location.
                </p>
              </div>

              <span
                className={
                  hasHistory ? "source-available" : "source-unavailable"
                }
              >
                {hasHistory ? "Available" : "Unavailable"}
              </span>
            </div>

            {hasHistory && report.surfaceHistory.summary ? (
              <>
                {/* =========================================
                    HISTORY SUMMARY
                ========================================= */}

                <div className="history-summary-grid">
                  {/* MEAN SST */}

                  <div>
                    <span>Mean SST</span>

                    <strong>
                      {report.surfaceHistory.summary.meanTemperatureC !== null
                        ? `${report.surfaceHistory.summary.meanTemperatureC.toFixed(
                            2,
                          )} °C`
                        : "N/A"}
                    </strong>
                  </div>

                  {/* MEAN ANOMALY */}

                  <div>
                    <span>Mean Anomaly</span>

                    <strong>
                      {report.surfaceHistory.summary.meanAnomalyC !== null
                        ? `${
                            report.surfaceHistory.summary.meanAnomalyC > 0
                              ? "+"
                              : ""
                          }${report.surfaceHistory.summary.meanAnomalyC.toFixed(
                            2,
                          )} °C`
                        : "N/A"}
                    </strong>
                  </div>

                  {/* ELEVATED OBSERVATIONS */}

                  <div>
                    <span>Elevated Observations</span>

                    <strong>
                      {report.surfaceHistory.summary.elevatedAnomalyDays}/
                      {report.surfaceHistory.observationCount}
                    </strong>
                  </div>

                  {/* RECENT SEQUENCE */}

                  <div>
                    <span>Recent Elevated Sequence</span>

                    <strong>
                      {report.surfaceHistory.summary.consecutiveElevatedDays}{" "}
                      observation
                      {report.surfaceHistory.summary.consecutiveElevatedDays ===
                      1
                        ? ""
                        : "s"}
                    </strong>
                  </div>
                </div>

                {/* =========================================
                    PERSISTENCE ASSESSMENT
                ========================================= */}

                <div className="history-persistence-card">
                  <span>SURFACE PERSISTENCE ASSESSMENT</span>

                  <strong>{report.surfacePersistence.label}</strong>

                  <p>{report.surfacePersistence.description}</p>
                </div>

                {/* =========================================
                    TREND CHART
                ========================================= */}

                <SurfaceHistoryChart
                  observations={report.surfaceHistory.observations}
                />
              </>
            ) : (
              <div className="no-ocean-data">
                <strong>Historical context unavailable</strong>

                <span>
                  Recent NOAA/NCEI SST history could not be retrieved for this
                  report.
                </span>
              </div>
            )}
          </section>

          {/* =================================================
              SUBSURFACE EVIDENCE
          ================================================= */}

          <section className="report-section">
            <div className="report-section-heading">
              <div>
                <h2>Subsurface Evidence</h2>

                <p>In-situ Argo profiling-float observations.</p>
              </div>

              <span
                className={
                  hasArgoData ? "source-available" : "source-unavailable"
                }
              >
                {hasArgoData ? "Available" : "Unavailable"}
              </span>
            </div>

            {hasArgoData ? (
              <div className="subsurface-report">
                <Database size={22} />

                <div>
                  <strong>
                    {report.subsurfaceEvidence.nearbyProfileCount} nearby Argo
                    {report.subsurfaceEvidence.nearbyProfileCount === 1
                      ? " observation"
                      : " observations"}
                  </strong>

                  {report.subsurfaceEvidence.nearestProfile && (
                    <span>
                      Nearest: Float{" "}
                      {report.subsurfaceEvidence.nearestProfile.platform ??
                        "Unknown"}
                      {" · "}
                      {report.subsurfaceEvidence.nearestProfile.distanceKm.toFixed(
                        1,
                      )}{" "}
                      km
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="no-ocean-data">
                <strong>No nearby Argo evidence</strong>

                <span>
                  No compatible Argo profiling observations were available
                  within the configured search region.
                </span>
              </div>
            )}
          </section>

          <section className="report-section">
            <div className="report-section-heading">
              <div>
                <h2>3D Depth Visualization</h2>
                <p>
                  Subsurface profile rendered as a 3D depth slab using available
                  Argo observations.
                </p>
              </div>
            </div>

            <ReportDepth3D report={report} />
          </section>

          {/* =================================================
              EVIDENCE ASSESSMENT
          ================================================= */}

          <section className="report-section">
            <h2>Evidence Assessment</h2>

            <div className="evidence-score">
              <div className="evidence-number">
                {report.evidence.score}

                <span>%</span>
              </div>

              <div>
                <strong>{report.evidence.label} EVIDENCE COVERAGE</strong>

                <p>{report.evidence.meaning}</p>
              </div>
            </div>

            {report.evidence.reasons.length > 0 && (
              <ul className="evidence-reasons">
                {report.evidence.reasons.map((reason, index) => (
                  <li key={`${reason}-${index}`}>{reason}</li>
                ))}
              </ul>
            )}
          </section>

          {/* =================================================
              DATA SOURCES
          ================================================= */}

          <section className="report-section">
            <h2>Data Sources</h2>

            <div className="report-source-status-list">
              {/* NOAA CURRENT */}

              <div className="report-source-status">
                <div>
                  <strong>NOAA/NCEI OISST</strong>

                  <span>
                    Satellite-derived sea surface temperature observation
                  </span>
                </div>

                <span
                  className={
                    hasSurfaceData ? "source-available" : "source-unavailable"
                  }
                >
                  {hasSurfaceData ? "Available" : "Unavailable"}
                </span>
              </div>

              {/* NOAA HISTORY */}

              <div className="report-source-status">
                <div>
                  <strong>NOAA/NCEI OISST History</strong>

                  <span>Recent daily surface temperature context</span>
                </div>

                <span
                  className={
                    hasHistory ? "source-available" : "source-unavailable"
                  }
                >
                  {hasHistory ? "Available" : "Unavailable"}
                </span>
              </div>

              {/* ARGO */}

              <div className="report-source-status">
                <div>
                  <strong>Argo / Argovis</strong>

                  <span>In-situ profiling-float observations</span>
                </div>

                <span
                  className={
                    hasArgoData ? "source-available" : "source-unavailable"
                  }
                >
                  {hasArgoData ? "Available" : "Unavailable"}
                </span>
              </div>
            </div>
          </section>

          {/* =================================================
              SCIENTIFIC NOTICE
          ================================================= */}

          <div className="scientific-notice">
            <strong>Scientific Notice</strong>

            <span>{report.scientificNotice}</span>
          </div>

          {/* =================================================
              GENERATED TIME
          ================================================= */}

          <div className="report-generated">
            Generated: {formatDate(report.generatedAt)}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Reports;

import {
  useState,
} from "react";

import {
  Route,
  Routes,
} from "react-router-dom";

import Explore
  from "./pages/Explore";

import Reports
  from "./pages/Reports";

import Login
  from "./pages/Login";

import Register
  from "./pages/Register";

import type {
  OceanEvidenceReport,
} from "./services/oceanApi";


const REPORT_STORAGE_KEY =
  "aquora_latest_report";


/* =========================================================
   RESTORE REPORT
========================================================= */

function loadSavedReport():
  OceanEvidenceReport | null {

  try {

    const saved =
      localStorage.getItem(
        REPORT_STORAGE_KEY
      );


    if (!saved) {
      return null;
    }


    const parsed =
      JSON.parse(
        saved
      ) as OceanEvidenceReport;


    if (
      !parsed ||
      !parsed.reportId ||
      !parsed.location ||
      !parsed.evidence
    ) {

      localStorage.removeItem(
        REPORT_STORAGE_KEY
      );

      return null;
    }


    return parsed;

  } catch {

    localStorage.removeItem(
      REPORT_STORAGE_KEY
    );

    return null;
  }
}


/* =========================================================
   APP
========================================================= */

function App() {

  const [
    latestReport,
    setLatestReport,
  ] =
    useState<OceanEvidenceReport | null>(
      () =>
        loadSavedReport()
    );


  const handleReportGenerated =
    (
      report:
        OceanEvidenceReport
    ) => {

      setLatestReport(
        report
      );


      try {

        localStorage.setItem(
          REPORT_STORAGE_KEY,
          JSON.stringify(
            report
          )
        );

      } catch (error) {

        console.error(
          "AQUORA REPORT SAVE ERROR:",
          error
        );

      }

    };


  return (

    <Routes>

      <Route
        path="/"
        element={
          <Explore
            onReportGenerated={
              handleReportGenerated
            }
          />
        }
      />


      <Route
        path="/reports"
        element={
          <Reports
            report={
              latestReport
            }
          />
        }
      />


      <Route
        path="/login"
        element={
          <Login />
        }
      />


      <Route
        path="/register"
        element={
          <Register />
        }
      />

    </Routes>

  );
}


export default App;
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  Database,
  Waves,
} from "lucide-react";

import {
  fetchArgoProfile,
} from "../services/oceanApi";

import type {
  ArgoFullProfile,
  OceanEvidenceReport,
} from "../services/oceanApi";


/* =========================================================
   PROPS
========================================================= */

interface ReportDepth3DProps {
  report: OceanEvidenceReport;
}


/* =========================================================
   FORMATTERS
========================================================= */

function formatTemperature(
  value: number | null
) {

  if (
    value === null ||
    !Number.isFinite(value)
  ) {

    return "N/A";

  }

  return `${value.toFixed(2)} °C`;
}


function formatSalinity(
  value: number | null
) {

  if (
    value === null ||
    !Number.isFinite(value)
  ) {

    return "N/A";

  }

  return `${value.toFixed(2)} PSU`;
}


/* =========================================================
   TEMPERATURE COLOUR
========================================================= */

function temperatureColor(
  value: number | null,
  minimum: number,
  maximum: number
) {

  if (
    value === null ||
    !Number.isFinite(value)
  ) {

    return "#8fa5bb";

  }


  if (maximum === minimum) {

    return "#2584e8";

  }


  const ratio =
    (value - minimum) /
    (maximum - minimum);


  if (ratio < 0.2) {
    return "#1f63d3";
  }

  if (ratio < 0.4) {
    return "#26a6e8";
  }

  if (ratio < 0.6) {
    return "#23c99c";
  }

  if (ratio < 0.8) {
    return "#f4aa32";
  }

  return "#ee5547";
}


/* =========================================================
   COMPONENT
========================================================= */

function ReportDepth3D({
  report,
}: ReportDepth3DProps) {


  const [
    profile,
    setProfile,
  ] =
    useState<ArgoFullProfile | null>(
      null
    );


  const [
    loading,
    setLoading,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );


  /* =======================================================
     NEAREST PROFILE ID
  ======================================================= */

  const nearestProfile =
    report
      .subsurfaceEvidence
      .nearestProfile;


  const profileId =
    nearestProfile?.id ??
    null;


  /* =======================================================
     FETCH REAL ARGO PROFILE
  ======================================================= */

  useEffect(() => {

    let cancelled =
      false;


    async function loadProfile() {

      if (!profileId) {

        setProfile(null);

        return;

      }


      setLoading(true);

      setError(null);


      try {

        const result =
          await fetchArgoProfile(
            profileId
          );


        if (
          !cancelled &&
          result.available &&
          result.profile
        ) {

          setProfile(
            result.profile
          );

        }

      } catch (err) {

        if (!cancelled) {

          setProfile(null);

          setError(
            err instanceof Error
              ? err.message
              : "Detailed Argo profile unavailable."
          );

        }

      } finally {

        if (!cancelled) {

          setLoading(false);

        }

      }

    }


    loadProfile();


    return () => {

      cancelled = true;

    };

  }, [
    profileId
  ]);


  /* =======================================================
     VALID LEVELS
  ======================================================= */

  const levels =
    useMemo(
      () => {

        if (!profile) {

          return [];

        }


        return profile.levels
          .filter(
            (level) =>
              Number.isFinite(
                level.pressureDbar
              )
          )
          .sort(
            (a, b) =>
              a.pressureDbar -
              b.pressureDbar
          );

      },
      [
        profile
      ]
    );


  /* =======================================================
     LOADING STATE
  ======================================================= */

  if (loading) {

    return (

      <div className="depth3d-empty">

        <strong>
          Building 3D water-column profile...
        </strong>

        <span>

          AQUORA is retrieving the
          detailed measurements from the
          nearest Argo profiling float.

        </span>

      </div>

    );

  }


  /* =======================================================
     NO PROFILE
  ======================================================= */

  if (
    !profileId
  ) {

    return (

      <div className="depth3d-empty">

        <strong>
          No subsurface profile available
        </strong>

        <span>

          A nearby compatible Argo profile
          was not available for this report.

        </span>

      </div>

    );

  }


  /* =======================================================
     FETCH FAILED
  ======================================================= */

  if (
    error ||
    !profile ||
    levels.length < 2
  ) {

    return (

      <div className="depth3d-empty">

        <strong>
          Detailed 3D profile unavailable
        </strong>

        <span>

          {
            error ??
            (
              "The selected Argo observation "
              + "does not contain enough usable "
              + "vertical measurements for "
              + "3D rendering."
            )
          }

        </span>

      </div>

    );

  }


  /* =======================================================
     PROFILE STATISTICS
  ======================================================= */

  const temperatures =
    levels
      .map(
        (level) =>
          level.temperatureC
      )
      .filter(
        (
          value
        ): value is number =>
          value !== null &&
          Number.isFinite(
            value
          )
      );


  const minimumTemperature =
    temperatures.length > 0

      ? Math.min(
          ...temperatures
        )

      : 0;


  const maximumTemperature =
    temperatures.length > 0

      ? Math.max(
          ...temperatures
        )

      : 30;


  const maximumPressure =
    Math.max(
      ...levels.map(
        (level) =>
          level.pressureDbar
      ),
      1
    );


  const surfaceLevel =
    levels[0];


  const deepestLevel =
    levels[
      levels.length - 1
    ];


  /* =======================================================
     SVG DIMENSIONS
  ======================================================= */

  const width = 760;

  const height = 400;


  const frontX = 145;

  const frontY = 78;

  const frontWidth = 390;

  const frontHeight = 235;


  /* =======================================================
     VERTICAL POSITION
  ======================================================= */

  function pressureY(
    pressure: number
  ) {

    return (

      frontY +

      (
        pressure /
        maximumPressure
      ) *

      frontHeight

    );

  }


  /* =======================================================
     TEMPERATURE POSITION
  ======================================================= */

  function temperatureX(
    temperature: number | null
  ) {

    if (
      temperature === null ||
      !Number.isFinite(
        temperature
      )
    ) {

      return (
        frontX +
        frontWidth / 2
      );

    }


    if (
      maximumTemperature ===
      minimumTemperature
    ) {

      return (
        frontX +
        frontWidth / 2
      );

    }


    const ratio =

      (
        temperature -
        minimumTemperature
      )

      /

      (
        maximumTemperature -
        minimumTemperature
      );


    return (

      frontX +
      ratio *
      frontWidth

    );

  }


  /* =======================================================
     SVG PROFILE PATH
  ======================================================= */

  const profilePath =
    levels
      .map(
        (
          level,
          index
        ) => {

          const x =
            temperatureX(
              level.temperatureC
            );


          const y =
            pressureY(
              level.pressureDbar
            );


          return (

            `${index === 0 ? "M" : "L"} `
            + `${x} ${y}`

          );

        }
      )
      .join(" ");


  /* =======================================================
     PRESSURE GRID
  ======================================================= */

  const pressureTicks = [

    0,

    maximumPressure *
      0.25,

    maximumPressure *
      0.5,

    maximumPressure *
      0.75,

    maximumPressure,

  ];


  /* =======================================================
     REDUCE DISPLAY POINTS IF PROFILE IS VERY LARGE
  ======================================================= */

  const displayStep =
    Math.max(
      1,
      Math.ceil(
        levels.length / 35
      )
    );


  const displayLevels =
    levels.filter(
      (
        _,
        index
      ) =>
        index %
        displayStep ===
        0
    );


  /* =======================================================
     UI
  ======================================================= */

  return (

    <div className="depth3d-card">


      {/* ===================================================
          STATISTICS
      =================================================== */}

      <div className="depth3d-meta">


        <div className="depth3d-stat">

          <Waves size={17} />

          <span>
            Surface Temperature
          </span>

          <strong>

            {
              formatTemperature(
                surfaceLevel
                  .temperatureC
              )
            }

          </strong>

        </div>


        <div className="depth3d-stat">

          <Activity size={17} />

          <span>
            Maximum Pressure
          </span>

          <strong>

            {
              maximumPressure
                .toFixed(
                  0
                )
            }

            {" "}dbar

          </strong>

        </div>


        <div className="depth3d-stat">

          <Database size={17} />

          <span>
            Measured Levels
          </span>

          <strong>

            {levels.length}

          </strong>

        </div>


        <div className="depth3d-stat">

          <Database size={17} />

          <span>
            Argo Float
          </span>

          <strong>

            {
              profile.platformId ??
              nearestProfile?.platform ??
              "Unknown"
            }

          </strong>

        </div>


      </div>


      {/* ===================================================
          3D VISUALIZATION
      =================================================== */}

      <div className="depth3d-visual">


        <svg
          viewBox={
            `0 0 ${width} ${height}`
          }
          className="depth3d-svg"
          role="img"
          aria-label=
            "Three dimensional Argo water column profile"
        >


          <defs>


            <linearGradient
              id="aquora-ocean-front"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >

              <stop
                offset="0%"
                stopColor="#bcecff"
              />

              <stop
                offset="25%"
                stopColor="#55bcea"
              />

              <stop
                offset="55%"
                stopColor="#1676c7"
              />

              <stop
                offset="100%"
                stopColor="#082f55"
              />

            </linearGradient>


            <linearGradient
              id="aquora-ocean-top"
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >

              <stop
                offset="0%"
                stopColor="#e7faff"
              />

              <stop
                offset="100%"
                stopColor="#6fc9ef"
              />

            </linearGradient>


            <linearGradient
              id="aquora-ocean-side"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >

              <stop
                offset="0%"
                stopColor="#58b8e8"
              />

              <stop
                offset="100%"
                stopColor="#062c51"
              />

            </linearGradient>


            <filter
              id="aquora-profile-glow"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >

              <feGaussianBlur
                stdDeviation="3"
                result="blur"
              />

              <feMerge>

                <feMergeNode
                  in="blur"
                />

                <feMergeNode
                  in="SourceGraphic"
                />

              </feMerge>

            </filter>


          </defs>


          {/* ===============================================
              TOP OCEAN SURFACE
          =============================================== */}

          <polygon
            points=
              "145,78 535,78 610,32 220,32"
            fill=
              "url(#aquora-ocean-top)"
            opacity="0.94"
          />


          {/* Surface grid */}

          <line
            x1="220"
            y1="32"
            x2="220"
            y2="78"
            stroke=
              "rgba(255,255,255,0.45)"
          />

          <line
            x1="340"
            y1="32"
            x2="340"
            y2="78"
            stroke=
              "rgba(255,255,255,0.4)"
          />

          <line
            x1="460"
            y1="32"
            x2="460"
            y2="78"
            stroke=
              "rgba(255,255,255,0.4)"
          />


          {/* ===============================================
              SIDE FACE
          =============================================== */}

          <polygon
            points=
              "535,78 610,32 610,267 535,313"
            fill=
              "url(#aquora-ocean-side)"
            opacity="0.95"
          />


          {/* ===============================================
              FRONT WATER COLUMN
          =============================================== */}

          <rect
            x={frontX}
            y={frontY}
            width={frontWidth}
            height={frontHeight}
            rx="10"
            fill=
              "url(#aquora-ocean-front)"
          />


          {/* ===============================================
              PRESSURE GRID
          =============================================== */}

          {
            pressureTicks.map(
              (
                tick,
                index
              ) => {

                const y =
                  pressureY(
                    tick
                  );


                return (

                  <g
                    key={
                      `pressure-${index}`
                    }
                  >


                    <line
                      x1={
                        frontX
                      }
                      y1={y}
                      x2={
                        frontX +
                        frontWidth
                      }
                      y2={y}
                      stroke=
                        "rgba(255,255,255,0.25)"
                      strokeDasharray=
                        "5 5"
                    />


                    <line
                      x1={
                        frontX +
                        frontWidth
                      }
                      y1={y}
                      x2="610"
                      y2={
                        y - 46
                      }
                      stroke=
                        "rgba(255,255,255,0.18)"
                      strokeDasharray=
                        "5 5"
                    />


                    <text
                      x="625"
                      y={
                        y - 41
                      }
                      fill="#56728d"
                      fontSize="11"
                      fontWeight="600"
                    >

                      {
                        tick.toFixed(
                          0
                        )
                      }

                      {" "}dbar

                    </text>


                  </g>

                );

              }
            )
          }


          {/* ===============================================
              VERTICAL PROFILE
          =============================================== */}

          <path
            d={
              profilePath
            }
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter=
              "url(#aquora-profile-glow)"
            opacity="0.96"
          />


          {/* ===============================================
              REAL ARGO MEASURED LEVELS
          =============================================== */}

          {
            displayLevels.map(
              (
                level,
                index
              ) => {

                const x =
                  temperatureX(
                    level.temperatureC
                  );


                const y =
                  pressureY(
                    level.pressureDbar
                  );


                return (

                  <g
                    key={
                      `${level.pressureDbar}-${index}`
                    }
                  >


                    <circle
                      cx={x}
                      cy={y}
                      r="5"
                      fill={
                        temperatureColor(
                          level.temperatureC,
                          minimumTemperature,
                          maximumTemperature
                        )
                      }
                      stroke="#ffffff"
                      strokeWidth="2"
                    >


                      <title>

                        {
                          `${level.pressureDbar.toFixed(
                            1
                          )} dbar`
                        }

                        {
                          level.temperatureC !==
                          null

                            ? ` · ${level.temperatureC.toFixed(
                                2
                              )} °C`

                            : ""
                        }

                        {
                          level.salinityPsu !==
                          null

                            ? ` · ${level.salinityPsu.toFixed(
                                2
                              )} PSU`

                            : ""
                        }

                      </title>


                    </circle>


                  </g>

                );

              }
            )
          }


          {/* ===============================================
              LABELS
          =============================================== */}

          <text
            x="145"
            y="350"
            fill="#173d63"
            fontSize="15"
            fontWeight="700"
          >

            Argo Vertical Ocean Profile

          </text>


          <text
            x="145"
            y="372"
            fill="#6d8298"
            fontSize="11"
          >

            Temperature distribution across measured pressure levels

          </text>


        </svg>


      </div>


      {/* ===================================================
          PROFILE SUMMARY
      =================================================== */}

      <div className="depth3d-table">


        <div className="depth3d-row">

          <span>
            Surface
          </span>

          <span>

            {
              formatTemperature(
                surfaceLevel
                  .temperatureC
              )
            }

          </span>

          <span>

            {
              formatSalinity(
                surfaceLevel
                  .salinityPsu
              )
            }

          </span>

        </div>


        <div className="depth3d-row">

          <span>

            {
              (
                maximumPressure *
                0.5
              ).toFixed(
                0
              )
            }

            {" "}dbar region

          </span>

          <span>
            Water Column
          </span>

          <span>
            In-situ profile
          </span>

        </div>


        <div className="depth3d-row">

          <span>
            Deepest measurement
          </span>

          <span>

            {
              formatTemperature(
                deepestLevel
                  .temperatureC
              )
            }

          </span>

          <span>

            {
              formatSalinity(
                deepestLevel
                  .salinityPsu
              )
            }

          </span>

        </div>


      </div>


      {/* ===================================================
          SCIENTIFIC NOTICE
      =================================================== */}

      <div className="depth3d-note">

        <strong>
          Measurement interpretation:
        </strong>

        {" "}

        This visualization is generated
        from actual Argo profile levels.
        Argo measures pressure in decibars,
        which AQUORA uses as the vertical
        coordinate. Pressure is closely
        related to ocean depth but is not
        presented here as exact geometric
        depth. Connecting lines and the
        3D water volume are visualization
        aids only and do not represent
        interpolated measurements.

      </div>


    </div>

  );

}


export default ReportDepth3D;
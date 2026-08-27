import {
  useMemo,
  useState,
} from "react";

import {
  Droplets,
  ShieldCheck,
  Thermometer,
  X,
} from "lucide-react";

import type {
  ArgoFullProfile,
  ArgoLevel,
} from "../services/oceanApi";


interface OceanXRayProps {
  profile: ArgoFullProfile;
  onClose: () => void;
}


type VariableType =
  | "temperature"
  | "salinity";


function formatDate(
  value?: string | null
) {
  if (!value) {
    return "Unavailable";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString();
}


function isRejectedQc(
  value?: string | null
) {
  if (!value) {
    return false;
  }

  return [
    "3",
    "4",
    "9",
  ].includes(value);
}


function OceanXRay({
  profile,
  onClose,
}: OceanXRayProps) {

  const [
    variable,
    setVariable,
  ] = useState<VariableType>(
    "temperature"
  );


  const plotData =
    useMemo(() => {

      return profile.levels.filter(
        (level: ArgoLevel) => {

          if (
            isRejectedQc(
              level.pressureQc
            )
          ) {
            return false;
          }

          if (
            variable ===
            "temperature"
          ) {

            return (
              level.temperatureC !==
                null &&
              !isRejectedQc(
                level.temperatureQc
              )
            );
          }

          return (
            level.salinityPsu !== null &&
            !isRejectedQc(
              level.salinityQc
            )
          );
        }
      );

    }, [
      profile,
      variable,
    ]);


  const values =
    plotData
      .map((level) =>
        variable ===
        "temperature"
          ? level.temperatureC
          : level.salinityPsu
      )
      .filter(
        (value):
          value is number =>
            value !== null
      );


  const pressures =
    plotData.map(
      (level) =>
        level.pressureDbar
    );


  let minimumValue =
    values.length
      ? Math.min(...values)
      : 0;

  let maximumValue =
    values.length
      ? Math.max(...values)
      : 1;


  if (
    minimumValue ===
    maximumValue
  ) {
    minimumValue -= 1;
    maximumValue += 1;
  }


  const maximumPressure =
    Math.max(
      profile.maxPressureDbar ??
        0,

      ...pressures,
      1
    );


  /*
   * SVG plot dimensions
   */

  const width = 390;
  const height = 430;

  const left = 58;
  const right = 20;
  const top = 20;
  const bottom = 52;

  const plotWidth =
    width -
    left -
    right;

  const plotHeight =
    height -
    top -
    bottom;


  const xPosition = (
    value: number
  ) => {

    return (
      left +
      (
        (
          value -
          minimumValue
        ) /
        (
          maximumValue -
          minimumValue
        )
      ) *
        plotWidth
    );
  };


  const yPosition = (
    pressure: number
  ) => {

    return (
      top +
      (
        pressure /
        maximumPressure
      ) *
        plotHeight
    );
  };


  const polylinePoints =
    plotData
      .map((level) => {

        const value =
          variable ===
          "temperature"
            ? level.temperatureC
            : level.salinityPsu;

        if (
          value === null
        ) {
          return "";
        }

        return `${xPosition(
          value
        )},${yPosition(
          level.pressureDbar
        )}`;

      })
      .filter(Boolean)
      .join(" ");


  const pressureTicks = [
    0,
    0.25,
    0.5,
    0.75,
    1,
  ].map(
    (ratio) =>
      maximumPressure *
      ratio
  );


  const valueTicks = [
    0,
    0.25,
    0.5,
    0.75,
    1,
  ].map(
    (ratio) =>
      minimumValue +
      (
        maximumValue -
        minimumValue
      ) *
        ratio
  );


  const rejectedLevels =
    profile.levels.filter(
      (level) => {

        if (
          isRejectedQc(
            level.pressureQc
          )
        ) {
          return true;
        }

        if (
          variable ===
          "temperature"
        ) {
          return isRejectedQc(
            level.temperatureQc
          );
        }

        return isRejectedQc(
          level.salinityQc
        );
      }
    ).length;


  return (
    <aside className="xray-panel">

      <div className="xray-header">

        <div>
          <span className="xray-eyebrow">
            AQUORA OCEAN X-RAY
          </span>

          <h2>
            Vertical Ocean Profile
          </h2>

          <p>
            Argo Float{" "}
            {profile.platformId}
            {" · "}
            Cycle{" "}
            {profile.cycle ??
              "N/A"}
          </p>
        </div>

        <button
          className="xray-close"
          onClick={onClose}
        >
          <X size={19} />
        </button>

      </div>


      <div className="xray-summary-grid">

        <div>
          <span>
            Measured Levels
          </span>

          <strong>
            {profile.levelCount}
          </strong>
        </div>

        <div>
          <span>
            Max Pressure
          </span>

          <strong>
            {profile.maxPressureDbar
              ?.toFixed(0) ??
              "N/A"}
            {" "}dbar
          </strong>
        </div>

      </div>


      <div className="xray-variable-tabs">

        <button
          className={
            variable ===
            "temperature"
              ? "active"
              : ""
          }
          onClick={() =>
            setVariable(
              "temperature"
            )
          }
        >
          <Thermometer
            size={16}
          />

          Temperature
        </button>

        <button
          className={
            variable ===
            "salinity"
              ? "active"
              : ""
          }
          onClick={() =>
            setVariable(
              "salinity"
            )
          }
        >
          <Droplets
            size={16}
          />

          Salinity
        </button>

      </div>


      <div className="xray-chart-card">

        <div className="xray-chart-title">

          <div>
            <strong>
              {variable ===
              "temperature"
                ? "Temperature"
                : "Salinity"}
            </strong>

            <span>
              vs Pressure
            </span>
          </div>

          <div className="xray-unit">
            {variable ===
            "temperature"
              ? "°C"
              : "PSU"}
          </div>

        </div>


        {plotData.length > 1 ? (

          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="xray-chart"
          >

            {/* Horizontal pressure guides */}

            {pressureTicks.map(
              (
                tick,
                index
              ) => {

                const y =
                  yPosition(
                    tick
                  );

                return (
                  <g
                    key={`pressure-${index}`}
                  >

                    <line
                      x1={left}
                      x2={
                        width -
                        right
                      }
                      y1={y}
                      y2={y}
                      className="xray-grid-line"
                    />

                    <text
                      x={
                        left -
                        8
                      }
                      y={
                        y + 4
                      }
                      textAnchor="end"
                      className="xray-axis-text"
                    >
                      {tick.toFixed(
                        0
                      )}
                    </text>

                  </g>
                );
              }
            )}


            {/* Value ticks */}

            {valueTicks.map(
              (
                tick,
                index
              ) => {

                const x =
                  xPosition(
                    tick
                  );

                return (
                  <g
                    key={`value-${index}`}
                  >

                    <line
                      x1={x}
                      x2={x}
                      y1={top}
                      y2={
                        height -
                        bottom
                      }
                      className="xray-grid-line vertical"
                    />

                    <text
                      x={x}
                      y={
                        height -
                        25
                      }
                      textAnchor="middle"
                      className="xray-axis-text"
                    >
                      {tick.toFixed(
                        variable ===
                        "temperature"
                          ? 1
                          : 2
                      )}
                    </text>

                  </g>
                );
              }
            )}


            {/* Visual guide line */}

            <polyline
              points={
                polylinePoints
              }
              fill="none"
              className={
                variable ===
                "temperature"
                  ? "xray-profile-line temperature"
                  : "xray-profile-line salinity"
              }
            />


            {/* Actual measured points */}

            {plotData.map(
              (
                level,
                index
              ) => {

                const value =
                  variable ===
                  "temperature"
                    ? level.temperatureC
                    : level.salinityPsu;

                if (
                  value ===
                  null
                ) {
                  return null;
                }

                return (
                  <circle
                    key={
                      `${level.pressureDbar}-${index}`
                    }
                    cx={xPosition(
                      value
                    )}
                    cy={yPosition(
                      level.pressureDbar
                    )}
                    r="3"
                    className={
                      variable ===
                      "temperature"
                        ? "xray-point temperature"
                        : "xray-point salinity"
                    }
                  />
                );
              }
            )}


            {/* Y axis label */}

            <text
              x="15"
              y={
                height /
                2
              }
              transform={
                `rotate(-90 15 ${
                  height /
                  2
                })`
              }
              textAnchor="middle"
              className="xray-axis-label"
            >
              Pressure (dbar)
            </text>

          </svg>

        ) : (

          <div className="xray-no-data">
            No suitable QC-approved
            measurements are available.
          </div>

        )}


        <div className="xray-chart-note">
          Points represent measured
          Argo levels. Connecting lines
          are visual guides only.
        </div>

      </div>


      <div className="xray-quality-card">

        <ShieldCheck
          size={18}
        />

        <div>
          <strong>
            Scientific QC applied
          </strong>

          <span>
            {plotData.length}
            {" "}
            suitable measurements
            displayed
            {rejectedLevels > 0
              ? ` · ${rejectedLevels} flagged levels excluded`
              : ""}
          </span>
        </div>

      </div>


      <div className="xray-metadata">

        <div>
          <span>
            Observed
          </span>

          <strong>
            {formatDate(
              profile.observedAt
            )}
          </strong>
        </div>


        <div>
          <span>
            Position
          </span>

          <strong>
            {profile.latitude
              ?.toFixed(4) ??
              "N/A"}
            °,
            {" "}
            {profile.longitude
              ?.toFixed(4) ??
              "N/A"}
            °
          </strong>
        </div>


        <div>
          <span>
            Source
          </span>

          <strong>
            {profile.source
              .provider}
          </strong>
        </div>

      </div>


      <div className="pressure-disclaimer">
        Vertical position is shown
        using measured pressure in
        dbar. AQUORA does not treat
        pressure as exact geometric
        depth.
      </div>

    </aside>
  );
}

export default OceanXRay;
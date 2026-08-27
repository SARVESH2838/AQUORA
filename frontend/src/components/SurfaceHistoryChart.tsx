import type {
  SSTHistoryObservation,
} from "../services/oceanApi";


interface SurfaceHistoryChartProps {
  observations:
    SSTHistoryObservation[];
}


function formatDay(
  value: string | null
) {

  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleDateString(
    undefined,
    {
      day: "2-digit",
      month: "short",
    }
  );
}


function SurfaceHistoryChart({
  observations,
}: SurfaceHistoryChartProps) {

  const valid =
    observations.filter(
      (item) =>
        Number.isFinite(
          item.temperatureC
        )
    );


  if (valid.length < 2) {

    return (

      <div className="history-chart-empty">

        Not enough historical
        observations to draw a trend.

      </div>

    );

  }


  const width = 760;

  const height = 245;

  const padding = {
    top: 22,
    right: 22,
    bottom: 42,
    left: 50,
  };


  const temperatures =
    valid.map(
      (item) =>
        item.temperatureC
    );


  const rawMin =
    Math.min(
      ...temperatures
    );


  const rawMax =
    Math.max(
      ...temperatures
    );


  /*
   * Small padding avoids a completely
   * flat-looking chart.
   */
  const minTemperature =
    rawMin - 0.25;

  const maxTemperature =
    rawMax + 0.25;


  const chartWidth =
    width -
    padding.left -
    padding.right;


  const chartHeight =
    height -
    padding.top -
    padding.bottom;


  const range =
    maxTemperature -
    minTemperature || 1;


  const points =
    valid.map(
      (
        observation,
        index
      ) => {

        const x =
          padding.left +
          (
            index /
            (
              valid.length -
              1
            )
          ) *
          chartWidth;


        const y =
          padding.top +
          (
            (
              maxTemperature -
              observation.temperatureC
            ) /
            range
          ) *
          chartHeight;


        return {
          x,
          y,
          observation,
        };

      }
    );


  const polyline =
    points
      .map(
        (point) =>
          `${point.x},${point.y}`
      )
      .join(" ");


  const gridValues = [
    maxTemperature,
    (
      maxTemperature +
      minTemperature
    ) / 2,
    minTemperature,
  ];


  return (

    <div className="history-chart-wrapper">

      <svg
        className="history-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Recent sea surface temperature observations"
      >

        {/* =====================================
            HORIZONTAL GRID
        ====================================== */}

        {gridValues.map(
          (
            value,
            index
          ) => {

            const y =
              padding.top +
              (
                index /
                (
                  gridValues.length -
                  1
                )
              ) *
              chartHeight;


            return (

              <g
                key={
                  `grid-${index}`
                }
              >

                <line
                  x1={
                    padding.left
                  }
                  x2={
                    width -
                    padding.right
                  }
                  y1={y}
                  y2={y}
                  className="history-grid-line"
                />

                <text
                  x={
                    padding.left -
                    9
                  }
                  y={
                    y + 3
                  }
                  textAnchor="end"
                  className="history-axis-text"
                >
                  {value.toFixed(1)}°
                </text>

              </g>

            );

          }
        )}


        {/* =====================================
            TREND LINE
        ====================================== */}

        <polyline
          points={
            polyline
          }
          fill="none"
          className="history-temperature-line"
        />


        {/* =====================================
            OBSERVATIONS
        ====================================== */}

        {points.map(
          (
            point,
            index
          ) => (

            <g
              key={
                `${point.observation.observedAt}-${index}`
              }
            >

              <circle
                cx={point.x}
                cy={point.y}
                r="4.5"
                className="history-temperature-point"
              />


              <text
                x={point.x}
                y={
                  height - 16
                }
                textAnchor="middle"
                className="history-date-label"
              >
                {formatDay(
                  point.observation
                    .observedAt
                )}
              </text>


              <title>

                {`${formatDay(
                  point.observation
                    .observedAt
                )}: ${point.observation
                  .temperatureC
                  .toFixed(2)} °C${
                    point.observation
                      .anomalyC !== null
                      ? `, anomaly ${
                          point.observation
                            .anomalyC >
                          0
                            ? "+"
                            : ""
                        }${point.observation
                          .anomalyC
                          .toFixed(2)} °C`
                      : ""
                  }`}

              </title>

            </g>

          )
        )}

      </svg>


      <div className="history-chart-note">

        Points represent measured
        NOAA/NCEI daily grid observations.
        Connecting lines are visual guides
        only.

      </div>

    </div>

  );

}


export default SurfaceHistoryChart;
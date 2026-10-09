import { useEffect, useMemo, useState } from "react";
import { clearApiCache, fetchOpenF1 } from "./api.js";
import { predictDriverPace, predictSessionPace } from "./analysis.js";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 4 }, (_, index) => CURRENT_YEAR - index);
const TYRE_COLORS = {
  SOFT: "#fa3555",
  MEDIUM: "#ffd64a",
  HARD: "#e8edf5",
  INTERMEDIATE: "#36d49b",
  WET: "#5496ff",
};
const CIRCUIT_LAYOUTS = [
  { match: ["melbourne", "albert park"], name: "Albert Park", turns: 14, length: "5.278 KM", path: "M65 40 L123 35 L161 49 L181 40 L203 55 L217 85 L245 91 L250 120 L225 133 L218 158 L191 166 L177 148 L150 156 L129 145 L112 162 L86 156 L73 131 L48 125 L39 101 L54 83 Z" },
  { match: ["shanghai"], name: "Shanghai International Circuit", turns: 16, length: "5.451 KM", path: "M147 24 L173 38 L197 37 L218 48 L224 67 L205 83 L224 96 L250 94 L260 115 L245 140 L216 149 L200 169 L175 164 L164 141 L142 132 L123 149 L95 153 L76 141 L50 146 L36 128 L51 109 L79 99 L88 80 L73 61 L86 41 L113 35 Z" },
  { match: ["suzuka"], name: "Suzuka International Racing Course", turns: 18, length: "5.807 KM", path: "M54 44 L92 35 L115 47 L106 67 L76 68 L65 87 L82 104 L112 104 L132 86 L160 85 L178 98 L164 119 L136 124 L122 144 L143 158 L172 153 L192 134 L219 131 L239 148 L225 166 L196 162 L175 177 L145 173 L120 158 L97 161 L81 141 L65 128 L49 108 L37 82 Z" },
  { match: ["bahrain", "sakhir"], name: "Bahrain International Circuit", turns: 15, length: "5.412 KM", path: "M78 39 L113 31 L142 41 L166 30 L196 40 L211 59 L231 69 L239 91 L219 107 L229 130 L211 151 L182 158 L159 148 L134 157 L111 146 L84 153 L61 139 L47 118 L54 94 L42 75 L58 56 Z" },
  { match: ["monaco"], name: "Circuit de Monaco", turns: 19, length: "3.337 KM", path: "M62 34 L100 34 L120 48 L151 47 L168 60 L194 56 L218 68 L220 85 L197 96 L179 92 L168 107 L187 119 L218 117 L237 132 L228 151 L199 157 L174 146 L151 156 L126 142 L105 153 L82 141 L73 120 L53 112 L43 92 L53 76 L40 59 Z" },
  { match: ["silverstone"], name: "Silverstone Circuit", turns: 18, length: "5.891 KM", path: "M61 37 L96 34 L119 45 L145 39 L162 53 L190 47 L213 60 L230 79 L221 98 L239 116 L230 139 L205 142 L189 158 L163 151 L144 167 L119 156 L99 164 L77 150 L66 130 L46 119 L39 94 L51 75 L42 56 Z" },
  { match: ["spa"], name: "Circuit de Spa-Francorchamps", turns: 19, length: "7.004 KM", path: "M58 31 L91 35 L112 54 L128 48 L146 32 L168 37 L181 58 L199 70 L222 66 L243 84 L232 105 L212 117 L201 143 L180 159 L158 153 L140 171 L118 161 L108 136 L85 128 L70 108 L48 97 L42 74 Z" },
  { match: ["monza"], name: "Autodromo Nazionale Monza", turns: 11, length: "5.793 KM", path: "M88 32 L121 29 L148 35 L174 30 L202 40 L215 58 L205 76 L224 91 L230 113 L216 132 L195 130 L183 151 L155 162 L127 155 L105 165 L81 152 L72 129 L51 112 L47 89 L64 72 L69 49 Z" },
  { match: ["singapore", "marina bay"], name: "Marina Bay Street Circuit", turns: 19, length: "4.940 KM", path: "M49 42 L82 38 L101 50 L121 45 L139 54 L160 46 L184 54 L193 70 L216 73 L230 87 L225 105 L242 119 L230 139 L207 145 L190 162 L166 153 L146 164 L127 150 L104 154 L85 139 L66 142 L55 123 L40 113 L48 94 L38 76 Z" },
  { match: ["yas marina", "abu dhabi"], name: "Yas Marina Circuit", turns: 16, length: "5.281 KM", path: "M76 35 L111 31 L133 41 L155 32 L181 39 L199 54 L213 76 L237 87 L241 108 L223 122 L218 144 L195 157 L174 147 L154 161 L132 151 L110 163 L88 151 L73 132 L52 122 L46 101 L57 82 L47 61 L60 44 Z" },
  { match: ["cota", "austin"], name: "Circuit of The Americas", turns: 20, length: "5.513 KM", path: "M133 29 L156 37 L170 56 L189 63 L210 57 L224 71 L220 92 L241 105 L233 128 L213 137 L195 158 L170 162 L150 149 L129 157 L107 147 L81 152 L62 138 L49 118 L59 99 L44 82 L57 61 L78 54 L98 40 L119 44 Z" },
  { match: ["zandvoort"], name: "Circuit Zandvoort", turns: 14, length: "4.259 KM", path: "M83 36 L111 33 L139 43 L158 36 L184 46 L204 42 L223 58 L232 80 L218 99 L235 118 L224 141 L201 151 L181 145 L164 165 L139 160 L121 145 L96 153 L75 139 L65 117 L48 102 L53 78 L63 58 Z" },
  { match: ["interlagos", "sao paulo", "são paulo"], name: "Autódromo José Carlos Pace", turns: 15, length: "4.309 KM", path: "M76 42 L105 36 L128 45 L152 36 L174 48 L194 44 L214 61 L224 82 L211 100 L224 121 L206 139 L184 144 L169 163 L146 154 L129 164 L109 148 L87 153 L70 136 L53 123 L47 101 L60 84 L50 64 Z" },
];

function getCircuitLayout(circuitName = "") {
  const normalizedName = circuitName.toLowerCase();
  return CIRCUIT_LAYOUTS.find((layout) => layout.match.some((match) => normalizedName.includes(match))) || null;
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatLap(value) {
  const seconds = safeNumber(value);
  if (seconds === null || seconds <= 0) return "—";
  const minutes = Math.floor(seconds / 60);
  return `${minutes ? `${minutes}:` : ""}${minutes ? (seconds % 60).toFixed(3).padStart(6, "0") : seconds.toFixed(3)}`;
}

function formatClock(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function driverName(driver) {
  return driver?.broadcast_name || driver?.name_acronym || driver?.full_name || "Unknown";
}

function isValidLap(lap) {
  const duration = safeNumber(lap?.lap_duration);
  return duration !== null && duration > 0 && !lap?.is_pit_out_lap;
}

function teamColor(driver) {
  const color = String(driver?.team_colour || "e10600").replace("#", "");
  return `#${color}`;
}

const SECTOR_KEYS = [
  { key: "duration_sector_1", label: "Sector 1" },
  { key: "duration_sector_2", label: "Sector 2" },
  { key: "duration_sector_3", label: "Sector 3" },
];

function summarizeLaps(rows) {
  const valid = rows.filter(isValidLap);
  if (!valid.length) return { count: 0, best: null, average: null, median: null, consistency: null, topSpeed: null, sectors: [] };
  const times = valid.map((lap) => Number(lap.lap_duration)).sort((a, b) => a - b);
  const average = times.reduce((total, time) => total + time, 0) / times.length;
  const median = times.length % 2
    ? times[Math.floor(times.length / 2)]
    : (times[times.length / 2 - 1] + times[times.length / 2]) / 2;
  return {
    count: valid.length,
    best: valid.reduce((best, lap) => Number(lap.lap_duration) < Number(best.lap_duration) ? lap : best),
    average,
    median,
    consistency: medianOf(times.map((time) => Math.abs(time - median))),
    topSpeed: Math.max(...valid.map((lap) => safeNumber(lap.st_speed) || 0)) || null,
    sectors: SECTOR_KEYS.map(({ key, label }) => ({
      key,
      label,
      best: valid.map((lap) => safeNumber(lap[key])).filter((time) => time !== null && time > 0).sort((a, b) => a - b)[0] || null,
    })),
  };
}

function medianOf(values) {
  const sorted = values.filter((value) => value !== null && Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function formatDelta(value, suffix = "s") {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(3)}${suffix}`;
}

function SectionHeading({ eyebrow, title, detail, action }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
        {detail && <p>{detail}</p>}
      </div>
      {action}
    </div>
  );
}

function Metric({ label, value, note, accent = false }) {
  return (
    <div className={`metric-card${accent ? " metric-card-accent" : ""}`}>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      {note && <span className="metric-note">{note}</span>}
    </div>
  );
}

function DriverPortrait({ driver, className = "" }) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [driver?.headshot_url]);
  return (
    <div className={`portrait-frame ${className}`} style={{ "--team-color": teamColor(driver) }}>
      {driver?.headshot_url && !imageFailed ? (
        <img src={driver.headshot_url} alt={driverName(driver)} onError={() => setImageFailed(true)} />
      ) : (
        <span className="portrait-fallback">{String(driver?.name_acronym || driverName(driver)).slice(0, 3)}</span>
      )}
    </div>
  );
}

function PaceChart({ primary, comparison, primaryColor, comparisonColor }) {
  const primaryLaps = primary.filter(isValidLap).sort((a, b) => Number(a.lap_number) - Number(b.lap_number));
  const comparisonLaps = comparison.filter(isValidLap).sort((a, b) => Number(a.lap_number) - Number(b.lap_number));
  const values = [...primaryLaps, ...comparisonLaps].map((lap) => Number(lap.lap_duration));
  if (!values.length) return <div className="empty-state">No comparable lap times were recorded for this session.</div>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pointString = (rows) => rows.map((lap, index) => {
    const x = 42 + (index / Math.max(rows.length - 1, 1)) * 700;
    const y = 18 + ((Number(lap.lap_duration) - min) / span) * 120;
    return `${x},${y}`;
  }).join(" ");
  return (
    <div className="pace-chart-wrap">
      <div className="pace-chart-legend">
        <span><i style={{ background: primaryColor }} />PRIMARY · {primaryLaps.length} LAPS</span>
        {comparisonLaps.length > 0 && <span><i style={{ background: comparisonColor }} />COMPARISON · {comparisonLaps.length} LAPS</span>}
        <span className="pace-chart-note">LOWER IS FASTER</span>
      </div>
      <svg className="pace-chart" viewBox="0 0 780 158" role="img" aria-label="Lap time comparison across the session">
        {[0, 1, 2, 3].map((line) => {
          const y = 20 + line * 40;
          const time = max - (span * line) / 3;
          return <g key={line}><line x1="42" x2="750" y1={y} y2={y} /><text x="0" y={y + 3}>{time.toFixed(1)}s</text></g>;
        })}
        <polyline className="pace-line" points={pointString(primaryLaps)} style={{ stroke: primaryColor }} />
        {comparisonLaps.length > 0 && <polyline className="pace-line" points={pointString(comparisonLaps)} style={{ stroke: comparisonColor }} />}
        {primaryLaps.map((lap, index) => (
          <circle key={`p-${lap.lap_number}`} cx={42 + (index / Math.max(primaryLaps.length - 1, 1)) * 700} cy={18 + ((Number(lap.lap_duration) - min) / span) * 120} r="2.5" style={{ fill: primaryColor }}>
            <title>Lap {lap.lap_number}: {formatLap(lap.lap_duration)}</title>
          </circle>
        ))}
      </svg>
      <div className="pace-chart-axis"><span>EARLIER LAPS</span><span>LAP SEQUENCE →</span><span>LATER LAPS</span></div>
    </div>
  );
}

function SectorBars({ sectors, primaryColor, comparisonColor }) {
  const available = sectors.filter((sector) => sector.primary !== null || sector.comparison !== null || sector.field !== null);
  if (!available.length) return <div className="empty-state">Sector timing is not available in this session.</div>;
  return (
    <div className="sector-list">
      {available.map((sector) => {
        const values = [sector.primary, sector.comparison, sector.field].filter((value) => value !== null);
        const reference = Math.max(...values);
        return (
          <div className="sector-item" key={sector.label}>
            <div className="sector-title"><strong>{sector.label}</strong><span>FIELD BEST {sector.field ? `${sector.field.toFixed(3)}s` : "—"}</span></div>
            <div className="sector-row">
              <span>YOU</span><div className="sector-track"><i style={{ width: `${sector.primary ? (sector.primary / reference) * 100 : 0}%`, background: primaryColor }} /></div>
              <strong>{sector.primary ? `${sector.primary.toFixed(3)}s` : "—"}</strong>
            </div>
            {sector.comparison !== null && (
              <div className="sector-row">
                <span>RIVAL</span><div className="sector-track"><i style={{ width: `${(sector.comparison / reference) * 100}%`, background: comparisonColor }} /></div>
                <strong>{sector.comparison.toFixed(3)}s</strong>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ForecastChart({ forecasts, colors }) {
  const active = forecasts.filter((item) => item.forecast.length);
  if (!active.length) return <div className="empty-state">Collect at least five valid laps in a stint to build a pace forecast.</div>;
  const values = active.flatMap((item) => item.forecast.flatMap((point) => [point.lower, point.upper]));
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;
  const y = (value) => 18 + ((maximum - value) / range) * 116;
  const x = (index) => 65 + index * 215;
  return (
    <div className="forecast-chart-wrap">
      <svg className="forecast-chart" viewBox="0 0 760 160" role="img" aria-label="Three-lap pace projection with uncertainty band">
        {[0, 1, 2].map((line) => {
          const value = maximum - (range * line) / 2;
          return <g key={line}><line x1="55" x2="745" y1={y(value)} y2={y(value)} /><text x="0" y={y(value) + 3}>{formatLap(value)}</text></g>;
        })}
        {[0, 1, 2].map((index) => <text className="forecast-x-label" key={index} x={x(index)} y="154" textAnchor="middle">LAP {active[0].forecast[index]?.lapNumber ?? "—"}</text>)}
        {active.map((item, itemIndex) => {
          const color = colors[itemIndex];
          const upper = item.forecast.map((point, index) => `${x(index)},${y(point.upper)}`);
          const lower = [...item.forecast].reverse().map((point, index) => `${x(item.forecast.length - index - 1)},${y(point.lower)}`);
          const medianPoints = item.forecast.map((point, index) => `${x(index)},${y(point.lapTime)}`).join(" ");
          return (
            <g key={item.driver.driver_number}>
              <polygon points={[...upper, ...lower].join(" ")} style={{ fill: color, opacity: .11 }} />
              <polyline className="forecast-line" points={medianPoints} style={{ stroke: color }} />
              {item.forecast.map((point, index) => (
                <circle key={point.lapNumber} cx={x(index)} cy={y(point.lapTime)} r="4" style={{ fill: color }}>
                  <title>{item.driver.name_acronym} projected lap {point.lapNumber}: {formatLap(point.lapTime)} ± {item.uncertainty?.toFixed(2)}s</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function downloadForecastCsv(rows, meetingName, sessionName) {
  const fields = [
    ["driver", (row) => row.driver.full_name || driverName(row.driver)],
    ["team", (row) => row.driver.team_name || ""],
    ["confidence", (row) => row.status],
    ["clean_laps_used", (row) => row.sampleSize],
    ["last_lap", (row) => row.lastLap?.lap_number ?? ""],
    ["projected_next_lap_seconds", (row) => row.forecast[0]?.lapTime ?? ""],
    ["forecast_lower_seconds", (row) => row.forecast[0]?.lower ?? ""],
    ["forecast_upper_seconds", (row) => row.forecast[0]?.upper ?? ""],
    ["trend_seconds_per_lap", (row) => row.trendPerLap ?? ""],
    ["tyre_compound", (row) => row.tyreCompound || ""],
    ["tyre_age_laps", (row) => row.tyreAge ?? ""],
    ["rolling_backtest_mae_seconds", (row) => row.backtest.mae ?? ""],
  ];
  const escape = (value) => `"${String(value).replaceAll('"', '""')}"`;
  const lines = [
    ["grand_prix", "session", ...fields.map(([name]) => name)].map(escape).join(","),
    ...rows.map((row) => [meetingName, sessionName, ...fields.map(([, value]) => value(row))].map(escape).join(",")),
  ];
  const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `apex-pace-projection-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function TrackMap({ points, color, circuitName, circuitImage, progressIndex = null }) {
  const [imageFailed, setImageFailed] = useState(false);
  const normalizedPoints = useMemo(() => {
    const valid = points
      .map((point) => ({ x: safeNumber(point.x), y: safeNumber(point.y) }))
      .filter((point) => point.x !== null && point.y !== null);
    if (valid.length < 2) return [];
    const xs = valid.map((point) => point.x);
    const ys = valid.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    return valid.map((point) => ({
      x: 12 + ((point.x - minX) / spanX) * 276,
      y: 188 - ((point.y - minY) / spanY) * 166,
    }));
  }, [points]);
  const visiblePoints = normalizedPoints.filter((_, index) => index % Math.max(1, Math.floor(normalizedPoints.length / 500)) === 0);
  const normalized = visiblePoints.map((point) => `${point.x},${point.y}`).join(" ");
  const activePoint = Number.isInteger(progressIndex) && normalizedPoints.length
    ? normalizedPoints[Math.min(progressIndex, normalizedPoints.length - 1)]
    : null;
  const completedTrace = activePoint
    ? normalizedPoints.slice(0, Math.min(progressIndex + 1, normalizedPoints.length))
      .filter((_, index) => index % Math.max(1, Math.floor(normalizedPoints.length / 500)) === 0)
      .map((point) => `${point.x},${point.y}`).join(" ")
    : "";

  const layout = getCircuitLayout(circuitName);
  const layoutStart = layout?.path.match(/M\s*([\d.]+)[ ,]+([\d.]+)/);
  useEffect(() => setImageFailed(false), [circuitImage]);

  return (
    <div className="track-map">
      {normalizedPoints.length > 1 ? (
        <svg viewBox="0 0 300 200" role="img" aria-label="Driver track position trace">
          <polyline className="track-shadow" points={normalized} />
          {activePoint && <polyline className="track-future" points={normalized} />}
          <polyline points={activePoint ? completedTrace : normalized} style={{ stroke: color }} />
          <circle className="track-start" cx={normalizedPoints[0].x} cy={normalizedPoints[0].y} r="3" />
          {activePoint && (
            <>
              <circle className="track-driver-halo" cx={activePoint.x} cy={activePoint.y} r="8" style={{ fill: color }} />
              <circle className="track-driver-dot" cx={activePoint.x} cy={activePoint.y} r="4" style={{ fill: color }} />
            </>
          )}
        </svg>
      ) : layout && (!circuitImage || imageFailed) ? (
        <svg className="circuit-layout" viewBox="0 0 300 200" role="img" aria-label={`${layout.name} circuit schematic`}>
          <path className="track-shadow" d={layout.path} />
          <path d={layout.path} />
          <path className="track-centerline" d={layout.path} />
          <circle className="track-start" cx={layoutStart?.[1]} cy={layoutStart?.[2]} r="4" />
          <text className="track-turn-count" x="270" y="25">{layout.turns} TURNS</text>
        </svg>
      ) : circuitImage && !imageFailed ? (
        <img
          className="official-circuit-image"
          src={circuitImage}
          alt={`${circuitName} official circuit layout`}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="empty-state">Track coordinates are not available for this lap.</div>
      )}
      <span className="map-caption">
        <i style={{ background: color }} />
        {normalizedPoints.length > 1
          ? "DRIVER GPS TRACE"
          : circuitImage && !imageFailed
            ? `${circuitName.toUpperCase()} · OFFICIAL MAP`
            : layout
              ? `${layout.name.toUpperCase()} · SCHEMATIC`
              : "CIRCUIT DATA"}
      </span>
    </div>
  );
}

function DriverReplay({ points, color, circuitName, circuitImage }) {
  const [pointIndex, setPointIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const orderedPoints = useMemo(
    () => points
      .filter((point) => safeNumber(point.x) !== null && safeNumber(point.y) !== null)
      .sort((left, right) => new Date(left.date || 0) - new Date(right.date || 0)),
    [points],
  );
  const lastIndex = orderedPoints.length - 1;
  const currentPoint = orderedPoints[Math.min(pointIndex, lastIndex)];
  const elapsedValue = currentPoint && orderedPoints[0]
    ? (new Date(currentPoint.date).getTime() - new Date(orderedPoints[0].date).getTime()) / 1000
    : 0;
  const elapsed = Number.isFinite(elapsedValue) ? Math.max(0, elapsedValue) : 0;

  useEffect(() => {
    setPointIndex(0);
    setPlaying(false);
  }, [orderedPoints]);

  useEffect(() => {
    if (!playing || lastIndex < 1) return undefined;
    const timer = window.setInterval(() => {
      setPointIndex((current) => Math.min(current + 1, lastIndex));
    }, 250 / speed);
    return () => window.clearInterval(timer);
  }, [playing, lastIndex, speed]);

  useEffect(() => {
    if (pointIndex >= lastIndex) setPlaying(false);
  }, [pointIndex, lastIndex]);

  return (
    <div className="driver-replay">
      <TrackMap
        points={orderedPoints}
        color={color}
        circuitName={circuitName}
        circuitImage={circuitImage}
        progressIndex={orderedPoints.length > 1 ? pointIndex : null}
      />
      {orderedPoints.length > 1 ? (
        <div className="replay-controls">
          <div className="replay-actions">
            <button
              type="button"
              className="replay-button"
              onClick={() => {
                if (playing) {
                  setPlaying(false);
                } else {
                  if (pointIndex >= lastIndex) setPointIndex(0);
                  setPlaying(true);
                }
              }}
              aria-label={playing ? "Pause driver replay" : "Play driver replay"}
            >
              {playing ? "Ⅱ PAUSE" : pointIndex >= lastIndex ? "↻ REPLAY" : "▶ PLAY"}
            </button>
            <button
              type="button"
              className="replay-speed"
              onClick={() => setSpeed((current) => current === 1 ? 2 : 1)}
              aria-label={`Playback speed ${speed}x; click to change`}
            >
              {speed}×
            </button>
            <span className="replay-time">+{elapsed.toFixed(1)} SEC</span>
            <span className="replay-samples">{orderedPoints.length} GPS SAMPLES</span>
          </div>
          <input
            className="replay-scrubber"
            type="range"
            min="0"
            max={lastIndex}
            value={Math.min(pointIndex, lastIndex)}
            aria-label="Scrub through the driver's lap"
            onChange={(event) => {
              setPlaying(false);
              setPointIndex(Number(event.target.value));
            }}
          />
          <div className="replay-axis"><span>START</span><span>LAP TIMELINE</span><span>FINISH</span></div>
        </div>
      ) : (
        <div className="empty-state replay-empty">
          GPS position samples are not available for this lap. The circuit layout is shown for reference.
        </div>
      )}
    </div>
  );
}

function LapSparkline({ laps, color }) {
  const valid = laps
    .map((lap) => safeNumber(lap.lap_duration))
    .filter((value) => value !== null && value > 0);
  if (valid.length < 2) return <div className="spark-empty">No lap trend</div>;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const span = max - min || 1;
  const points = valid.map((value, index) => `${(index / (valid.length - 1)) * 250},${38 - ((value - min) / span) * 28}`).join(" ");
  return (
    <svg className="sparkline" viewBox="0 0 250 44" preserveAspectRatio="none" aria-label="Lap time trend">
      <polyline points={points} style={{ stroke: color }} />
    </svg>
  );
}

function WeatherChart({ rows }) {
  const values = rows
    .map((row) => ({
      air: safeNumber(row.air_temperature),
      track: safeNumber(row.track_temperature),
      time: row.date,
    }))
    .filter((row) => row.air !== null);
  if (!values.length) return <div className="empty-state">Weather data is not available for this session.</div>;
  const sample = values.filter((_, index) => index % Math.max(1, Math.floor(values.length / 20)) === 0);
  const maxTemp = Math.max(...sample.map((row) => Math.max(row.air, row.track ?? row.air)), 1);
  return (
    <div className="weather-chart">
      <div className="weather-bars">
        {sample.map((row, index) => (
          <div className="weather-column" key={`${row.time}-${index}`} title={`${formatClock(row.time)} · Air ${row.air}°C · Track ${row.track ?? "—"}°C`}>
            <span className="weather-track" style={{ height: `${Math.max(5, ((row.track ?? row.air) / maxTemp) * 100)}%` }} />
            <span className="weather-air" style={{ height: `${Math.max(5, (row.air / maxTemp) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="weather-axis"><span>{formatClock(sample[0]?.time)}</span><span>{formatClock(sample.at(-1)?.time)}</span></div>
    </div>
  );
}

export default function App() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [meetings, setMeetings] = useState([]);
  const [meetingKey, setMeetingKey] = useState("");
  const [sessions, setSessions] = useState([]);
  const [sessionKey, setSessionKey] = useState("");
  const [drivers, setDrivers] = useState([]);
  const [driverNumber, setDriverNumber] = useState("");
  const [compareNumber, setCompareNumber] = useState("");
  const [laps, setLaps] = useState([]);
  const [stints, setStints] = useState([]);
  const [weather, setWeather] = useState([]);
  const [positions, setPositions] = useState([]);
  const [telemetry, setTelemetry] = useState([]);
  const [location, setLocation] = useState([]);
  const [activeTab, setActiveTab] = useState("Race overview");
  const [loading, setLoading] = useState({ calendar: false, session: false, telemetry: false });
  const [errors, setErrors] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading((current) => ({ ...current, calendar: true }));
    setErrors([]);
    fetchOpenF1("meetings", { year })
      .then((data) => {
        if (cancelled) return;
        const orderedMeetings = [...new Map(data.map((item) => [item.meeting_key, item])).values()]
          .sort((a, b) => new Date(a.date_start || 0) - new Date(b.date_start || 0));
        setMeetings(orderedMeetings);
        const latestCompleted = [...orderedMeetings]
          .filter((meeting) => new Date(meeting.date_end || meeting.date_start || 0).getTime() <= Date.now())
          .at(-1);
        const latest = latestCompleted || orderedMeetings.at(-1);
        setMeetingKey((current) => orderedMeetings.some((item) => String(item.meeting_key) === String(current))
          ? current
          : String(latest?.meeting_key || ""));
        if (!data.length) setErrors([`No Grand Prix meetings were returned for ${year}. Try another season.`]);
      })
      .catch((error) => {
        if (!cancelled) setErrors([error.message]);
      })
      .finally(() => {
        if (!cancelled) setLoading((current) => ({ ...current, calendar: false }));
      });
    return () => { cancelled = true; };
  }, [year]);

  const selectedMeeting = meetings.find((meeting) => String(meeting.meeting_key) === String(meetingKey));

  useEffect(() => {
    let cancelled = false;
    if (!meetingKey) {
      setSessions([]);
      setSessionKey("");
      return () => { cancelled = true; };
    }
    fetchOpenF1("sessions", { meeting_key: meetingKey })
      .then((data) => {
        if (cancelled) return;
        const ordered = data.sort((a, b) => new Date(a.date_start || 0) - new Date(b.date_start || 0));
        setSessions(ordered);
        const latestCompleted = [...ordered]
          .filter((session) => new Date(session.date_end || session.date_start || 0).getTime() <= Date.now())
          .at(-1);
        const preferred = latestCompleted || [...ordered].reverse().find((session) => /race|sprint/i.test(session.session_name || ""));
        setSessionKey((current) => ordered.some((session) => String(session.session_key) === String(current))
          ? current
          : String((preferred || ordered.at(-1))?.session_key || ""));
      })
      .catch((error) => {
        if (!cancelled) setErrors((current) => [...current, error.message]);
      });
    return () => { cancelled = true; };
  }, [meetingKey]);

  useEffect(() => {
    let cancelled = false;
    if (!sessionKey) {
      setDrivers([]);
      setDriverNumber("");
      return () => { cancelled = true; };
    }
    setLoading((current) => ({ ...current, session: true }));
    fetchOpenF1("drivers", { session_key: sessionKey })
      .then((data) => {
        if (cancelled) return;
        const sorted = data.sort((a, b) => Number(a.driver_number) - Number(b.driver_number));
        setDrivers(sorted);
        const first = sorted[0];
        setDriverNumber((current) => sorted.some((driver) => String(driver.driver_number) === String(current))
          ? current
          : String(first?.driver_number || ""));
        setCompareNumber((current) => sorted.some((driver) => String(driver.driver_number) === String(current))
          ? current
          : String(sorted.find((driver) => String(driver.driver_number) !== String(first?.driver_number))?.driver_number || ""));
      })
      .catch((error) => {
        if (!cancelled) setErrors((current) => [...current, error.message]);
      })
      .finally(() => {
        if (!cancelled) setLoading((current) => ({ ...current, session: false }));
      });
    return () => { cancelled = true; };
  }, [sessionKey]);

  useEffect(() => {
    let cancelled = false;
    if (!sessionKey) return () => { cancelled = true; };
    setLoading((current) => ({ ...current, session: true }));
    setErrors([]);
    Promise.allSettled([
      fetchOpenF1("laps", { session_key: sessionKey }),
      fetchOpenF1("stints", { session_key: sessionKey }),
      fetchOpenF1("weather", { session_key: sessionKey }),
      fetchOpenF1("position", { session_key: sessionKey }),
    ]).then((results) => {
      if (cancelled) return;
      const setters = [setLaps, setStints, setWeather, setPositions];
      const labels = ["lap timing", "tyre strategy", "weather", "race positions"];
      const failed = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") setters[index](result.value);
        else failed.push(`${labels[index]}: ${result.reason.message}`);
      });
      if (failed.length) setErrors(failed);
      setLastUpdated(new Date());
    }).finally(() => {
      if (!cancelled) setLoading((current) => ({ ...current, session: false }));
    });
    return () => { cancelled = true; };
  }, [sessionKey]);

  const selectedDriver = drivers.find((driver) => String(driver.driver_number) === String(driverNumber));
  const compareDriver = drivers.find((driver) => String(driver.driver_number) === String(compareNumber));
  const driverLaps = laps.filter((lap) => String(lap.driver_number) === String(driverNumber));
  const compareLaps = laps.filter((lap) => String(lap.driver_number) === String(compareNumber));
  const driverStats = summarizeLaps(driverLaps);
  const compareStats = summarizeLaps(compareLaps);
  const sessionForecasts = useMemo(
    () => predictSessionPace(drivers, laps, stints),
    [drivers, laps, stints],
  );
  const selectedForecast = sessionForecasts.find((row) => String(row.driver.driver_number) === String(driverNumber));
  const compareForecast = sessionForecasts.find((row) => String(row.driver.driver_number) === String(compareNumber));
  const forecastBacktest = sessionForecasts
    .filter((row) => row.backtest.count > 0)
    .reduce((summary, row) => ({
      count: summary.count + row.backtest.count,
      totalError: summary.totalError + row.backtest.mae * row.backtest.count,
    }), { count: 0, totalError: 0 });
  const fieldMeanAbsoluteError = forecastBacktest.count
    ? forecastBacktest.totalError / forecastBacktest.count
    : null;
  const fieldSectorBests = SECTOR_KEYS.map(({ key, label }) => ({
    key,
    label,
    best: laps.filter(isValidLap).map((lap) => safeNumber(lap[key]))
      .filter((time) => time !== null && time > 0)
      .reduce((best, time) => best === null || time < best ? time : best, null),
  }));
  const analysisSectors = fieldSectorBests.map((sector, index) => ({
    label: sector.label,
    primary: driverStats.sectors[index]?.best ?? null,
    comparison: compareDriver ? compareStats.sectors[index]?.best ?? null : null,
    field: sector.best,
  }));
  const driverPositions = positions.filter((item) => String(item.driver_number) === String(driverNumber))
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  const startPosition = safeNumber(driverPositions[0]?.position);
  const endPosition = safeNumber(driverPositions.at(-1)?.position);
  const placesGained = startPosition !== null && endPosition !== null ? startPosition - endPosition : null;
  const fastestLaps = [...driverLaps].filter(isValidLap)
    .sort((a, b) => Number(a.lap_duration) - Number(b.lap_duration))
    .slice(0, 8);
  const orderedDriverLaps = [...driverLaps].filter(isValidLap)
    .sort((a, b) => Number(a.lap_number) - Number(b.lap_number));
  const openingPace = medianOf(orderedDriverLaps.slice(0, 5).map((lap) => Number(lap.lap_duration)));
  const closingPace = medianOf(orderedDriverLaps.slice(-5).map((lap) => Number(lap.lap_duration)));
  const sessionPaceDrift = openingPace !== null && closingPace !== null ? closingPace - openingPace : null;
  const fastestLap = driverLaps.filter(isValidLap)
    .reduce((best, lap) => !best || Number(lap.lap_duration) < Number(best.lap_duration) ? lap : best, null);
  const compareFastest = compareLaps.filter(isValidLap)
    .reduce((best, lap) => !best || Number(lap.lap_duration) < Number(best.lap_duration) ? lap : best, null);
  const selectedStints = stints.filter((stint) => String(stint.driver_number) === String(driverNumber))
    .sort((a, b) => Number(a.stint_number) - Number(b.stint_number));
  const leaderboard = useMemo(() => {
    const latestByDriver = new Map();
    for (const item of positions) {
      const current = latestByDriver.get(String(item.driver_number));
      if (!current || new Date(item.date || 0) > new Date(current.date || 0)) latestByDriver.set(String(item.driver_number), item);
    }
    const order = [...latestByDriver.values()].sort((a, b) => Number(a.position) - Number(b.position));
    if (order.length) {
      return order.map((item) => ({
        driver: drivers.find((entry) => String(entry.driver_number) === String(item.driver_number)),
        position: item.position,
      })).filter((item) => item.driver);
    }
    return drivers.map((driver) => ({
      driver,
      position: null,
      lap: laps.filter((lap) => String(lap.driver_number) === String(driver.driver_number) && isValidLap(lap))
        .reduce((best, lap) => !best || Number(lap.lap_duration) < Number(best.lap_duration) ? lap : best, null),
    })).sort((a, b) => Number(a.lap?.lap_duration || Infinity) - Number(b.lap?.lap_duration || Infinity));
  }, [drivers, laps, positions]);

  useEffect(() => {
    let cancelled = false;
    setTelemetry([]);
    setLocation([]);
    if (!sessionKey || !driverNumber || !fastestLap?.date_start) return () => { cancelled = true; };
    const start = new Date(fastestLap.date_start);
    const end = new Date(start.getTime() + Number(fastestLap.lap_duration || 0) * 1000);
    const params = {
      session_key: sessionKey,
      driver_number: driverNumber,
      "date>=": start.toISOString(),
      "date<=": end.toISOString(),
    };
    setLoading((current) => ({ ...current, telemetry: true }));
    Promise.allSettled([
      fetchOpenF1("car_data", params),
      fetchOpenF1("location", params),
    ]).then(([carResult, locationResult]) => {
      if (cancelled) return;
      if (carResult.status === "fulfilled") setTelemetry(carResult.value);
      else if (carResult.reason.status !== 404) setErrors((current) => [...current, `Car telemetry: ${carResult.reason.message}`]);
      if (locationResult.status === "fulfilled") setLocation(locationResult.value);
      else if (locationResult.reason.status !== 404) setErrors((current) => [...current, `Track position: ${locationResult.reason.message}`]);
    }).finally(() => {
      if (!cancelled) setLoading((current) => ({ ...current, telemetry: false }));
    });
    return () => { cancelled = true; };
  }, [sessionKey, driverNumber, fastestLap?.date_start, fastestLap?.lap_duration]);

  const refresh = () => {
    clearApiCache();
    setYear((current) => current);
    setLastUpdated(new Date());
    if (sessionKey) {
      setLoading((current) => ({ ...current, session: true }));
      Promise.allSettled([
        fetchOpenF1("laps", { session_key: sessionKey }),
        fetchOpenF1("stints", { session_key: sessionKey }),
        fetchOpenF1("weather", { session_key: sessionKey }),
        fetchOpenF1("position", { session_key: sessionKey }),
      ]).then((results) => {
        const setters = [setLaps, setStints, setWeather, setPositions];
        results.forEach((result, index) => {
          if (result.status === "fulfilled") setters[index](result.value);
          else setErrors((current) => [...current, result.reason.message]);
        });
        setLastUpdated(new Date());
      }).finally(() => setLoading((current) => ({ ...current, session: false })));
    }
  };

  const fastestOverall = [...laps].filter(isValidLap)
    .reduce((best, lap) => !best || Number(lap.lap_duration) < Number(best.lap_duration) ? lap : best, null);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="F1 Race Intelligence home">
          <img className="brand-mark" src="/f1-logo.png" alt="" />
          <span className="brand-sub">RACE INTELLIGENCE</span>
        </a>
        <div className="sidebar-rule" />
        <div className="side-label">RACE CONTROL</div>
        <label className="field-label" htmlFor="season">SEASON</label>
        <select id="season" value={year} onChange={(event) => setYear(Number(event.target.value))}>
          {YEARS.map((item) => <option key={item} value={item}>{item} SEASON</option>)}
        </select>
        <label className="field-label" htmlFor="event">GRAND PRIX</label>
        <select id="event" value={meetingKey} onChange={(event) => setMeetingKey(event.target.value)} disabled={!meetings.length}>
          {!meetings.length && <option value="">{loading.calendar ? "Loading calendar…" : "No events found"}</option>}
          {meetings.map((meeting) => <option key={meeting.meeting_key} value={meeting.meeting_key}>{meeting.meeting_name}</option>)}
        </select>
        <div className="calendar-count">{meetings.length ? `${meetings.length} ROUNDS · ${year} CALENDAR` : "CALENDAR LOADING"}</div>
        <label className="field-label" htmlFor="session">SESSION</label>
        <select id="session" value={sessionKey} onChange={(event) => setSessionKey(event.target.value)} disabled={!sessions.length}>
          {!sessions.length && <option value="">Select event first</option>}
          {sessions.map((session) => <option key={session.session_key} value={session.session_key}>{session.session_name}</option>)}
        </select>

        <div className="sidebar-rule" />
        <div className="side-label">DRIVER FOCUS</div>
        <label className="field-label" htmlFor="driver">PRIMARY DRIVER</label>
        <select id="driver" value={driverNumber} onChange={(event) => setDriverNumber(event.target.value)} disabled={!drivers.length}>
          {drivers.map((driver) => <option key={driver.driver_number} value={driver.driver_number}>{driverName(driver)} · {driver.driver_number}</option>)}
        </select>
        <label className="field-label" htmlFor="compare">HEAD-TO-HEAD</label>
        <select id="compare" value={compareNumber} onChange={(event) => setCompareNumber(event.target.value)} disabled={!drivers.length}>
          <option value="">No comparison</option>
          {drivers.filter((driver) => String(driver.driver_number) !== String(driverNumber)).map((driver) => (
            <option key={driver.driver_number} value={driver.driver_number}>{driverName(driver)} · {driver.driver_number}</option>
          ))}
        </select>

        {selectedDriver && (
          <div className="driver-profile" style={{ "--team-color": teamColor(selectedDriver) }}>
            <DriverPortrait driver={selectedDriver} className="sidebar-portrait" />
            <div className="driver-profile-info">
              <span>DRIVER PROFILE · #{selectedDriver.driver_number}</span>
              <strong>{driverName(selectedDriver)}</strong>
              <em>{selectedDriver.team_name || "F1 TEAM"}</em>
            </div>
          </div>
        )}

        <div className="sidebar-bottom">
          <div className="live-dot"><i /> DATA LINK {loading.session ? "UPDATING" : "ACTIVE"}</div>
          <span>Powered by OpenF1</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">F1 <span>/</span> {year} SEASON <span>/</span> {selectedMeeting?.country_name || "RACE CONTROL"}</div>
          <div className="topbar-actions">
            <span className="sync-time">{lastUpdated ? `SYNC ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "AWAITING DATA"}</span>
            <button className="icon-button" onClick={refresh} aria-label="Refresh race data" title="Refresh data">↻</button>
            <div className="avatar">AP</div>
          </div>
        </header>

        <div className="page-wrap">
          {(errors.length > 0) && (
            <div className="error-banner" role="status">
              <span>{errors.join(" · ")}</span>
              <button onClick={() => setErrors([])} aria-label="Dismiss data errors">×</button>
            </div>
          )}

          <section className="hero">
            <div className="hero-copy">
              <div className="event-kicker"><span className="red-dash" /> {selectedMeeting?.country_name || "FORMULA 1"} GRAND PRIX · {year}</div>
              <h1>{selectedMeeting?.meeting_name || (loading.calendar ? "Loading race calendar" : "Race Intelligence")}</h1>
              <p>{selectedMeeting?.circuit_short_name || "Global circuit data"} <span>•</span> {selectedMeeting?.location || selectedMeeting?.country_name || "OpenF1 live data"} <span>•</span> {sessions.find((item) => String(item.session_key) === String(sessionKey))?.session_name || "Select a session"}</p>
            </div>
            <div className="hero-meta">
              <span className="session-badge"><i /> {loading.session ? "SYNCING" : "SESSION DATA"}</span>
              <span className="hero-date">{formatClock(sessions.find((item) => String(item.session_key) === String(sessionKey))?.date_start)} LOCAL</span>
            </div>
            <div className="hero-streak" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /></div>
          </section>

          {selectedDriver && (
            <section className="driver-spotlight" style={{ "--team-color": teamColor(selectedDriver) }}>
              <div className="spotlight-image"><DriverPortrait driver={selectedDriver} className="spotlight-portrait" /></div>
              <div className="spotlight-copy">
                <span className="eyebrow">DRIVER SPOTLIGHT · #{selectedDriver.driver_number}</span>
                <h2>{selectedDriver.full_name || driverName(selectedDriver)}</h2>
                <p>{selectedDriver.team_name || "Formula 1"} <span>·</span> {selectedDriver.country_code || selectedDriver.country_name || "DRIVER"}</p>
                <div className="spotlight-tags"><span>FASTEST {formatLap(driverStats.best?.lap_duration)}</span><span>{driverStats.count} TIMED LAPS</span>{driverStats.topSpeed && <span>{driverStats.topSpeed} KM/H TOP SPEED</span>}</div>
              </div>
              <div className="spotlight-stat"><span>BEST LAP</span><strong>{formatLap(driverStats.best?.lap_duration)}</strong><small>{driverStats.best?.lap_number ? `LAP ${driverStats.best.lap_number}` : "NO TIME"}</small></div>
              <div className="spotlight-number">#{selectedDriver.driver_number}</div>
            </section>
          )}

          <nav className="tabs" aria-label="Dashboard sections">
            {["Race overview", "Race analysis", "Pace forecast", "Telemetry lab", "Tyre strategy", "Track conditions"].map((tab, index) => (
              <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>
                <span className="tab-index">0{index + 1}</span>{tab}
              </button>
            ))}
          </nav>

          {loading.calendar && !meetings.length ? (
            <div className="loading-screen"><div className="loader" /><span>Connecting to race control…</span></div>
          ) : (
            <>
              {activeTab === "Race overview" && (
                <div className="dashboard-grid">
                  <section className="metrics-row">
                    <Metric label="SESSION FASTEST" value={formatLap(fastestOverall?.lap_duration)} note={drivers.find((driver) => String(driver.driver_number) === String(fastestOverall?.driver_number))?.name_acronym || "BEST LAP"} accent />
                    <Metric label="LAPS LOGGED" value={laps.length || "—"} note="ALL DRIVERS" />
                    <Metric label="TRACK TEMP" value={weather.length ? `${weather.at(-1)?.track_temperature ?? "—"}°` : "—"} note="DEGREES CELSIUS" />
                    <Metric label="DRIVERS ON TRACK" value={drivers.length || "—"} note="SESSION ENTRY" />
                  </section>

                  <section className="panel leaderboard-panel">
                    <SectionHeading eyebrow="SESSION TIMING" title="Running order" detail={`${leaderboard.length} drivers · sorted by latest position`} action={<span className="live-pill"><i /> TIMING</span>} />
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>POS</th><th>DRIVER</th><th>TEAM</th><th>BEST LAP</th><th>LAST LAP</th><th>TYRE</th></tr></thead>
                        <tbody>
                          {leaderboard.slice(0, 10).map(({ driver, position, lap }, index) => {
                            const best = laps.filter((item) => String(item.driver_number) === String(driver.driver_number) && isValidLap(item))
                              .reduce((record, item) => !record || Number(item.lap_duration) < Number(record.lap_duration) ? item : record, null);
                            const latestStint = stints.filter((item) => String(item.driver_number) === String(driver.driver_number))
                              .reduce((latest, item) => !latest || Number(item.stint_number) > Number(latest.stint_number) ? item : latest, null);
                            return (
                              <tr key={driver.driver_number} className={String(driver.driver_number) === String(driverNumber) ? "selected-row" : ""} onClick={() => setDriverNumber(String(driver.driver_number))}>
                                <td><span className="pos-number">{position || index + 1}</span></td>
                                <td><span className="driver-cell"><i style={{ background: teamColor(driver) }} />{driver.name_acronym || driverName(driver)}</span></td>
                                <td className="muted-cell">{driver.team_name || "—"}</td>
                                <td className="time-cell">{formatLap(best?.lap_duration)}</td>
                                <td className="muted-cell">{formatLap(lap?.lap_duration)}</td>
                                <td>{latestStint?.compound ? <span className="tyre-tag"><i style={{ borderColor: TYRE_COLORS[latestStint.compound] || "#8b94a5" }} />{latestStint.compound.slice(0, 1)}</span> : "—"}</td>
                              </tr>
                            );
                          })}
                          {!leaderboard.length && <tr><td colSpan="6" className="table-empty">{loading.session ? "Timing data loading…" : "No classified drivers in this session."}</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="panel track-panel">
                    <SectionHeading eyebrow="CIRCUIT TELEMETRY" title="Track layout" detail={location.length && selectedDriver ? `${driverName(selectedDriver)} · live GPS trace` : selectedMeeting?.circuit_short_name || "Circuit schematic"} />
                    <TrackMap points={location} color={teamColor(selectedDriver)} circuitName={selectedMeeting?.circuit_short_name || selectedMeeting?.meeting_name || ""} circuitImage={selectedMeeting?.circuit_image} />
                    <div className="panel-footer"><span>FASTEST LAP</span><strong>{formatLap(fastestLap?.lap_duration)}</strong><span>LAP {fastestLap?.lap_number || "—"}</span></div>
                  </section>

                  <section className="panel comparison-panel">
                    <SectionHeading eyebrow="PERFORMANCE DELTA" title="Head-to-head" detail="Fastest lap comparison" />
                    {compareDriver ? (
                      <div className="comparison-content">
                        <div className="compare-row"><span style={{ "--team-color": teamColor(selectedDriver) }}>{selectedDriver?.name_acronym || "DRIVER"}</span><strong>{formatLap(fastestLap?.lap_duration)}</strong></div>
                        <div className="compare-track"><i style={{ width: `${fastestLap && compareFastest ? Math.min(100, (Number(fastestLap.lap_duration) / Math.max(Number(fastestLap.lap_duration), Number(compareFastest.lap_duration))) * 100) : 50}%`, background: teamColor(selectedDriver) }} /></div>
                        <div className="compare-row"><span style={{ "--team-color": teamColor(compareDriver) }}>{compareDriver.name_acronym || driverName(compareDriver)}</span><strong>{formatLap(compareFastest?.lap_duration)}</strong></div>
                        <div className="delta-copy">
                          {fastestLap && compareFastest
                            ? `${(Math.abs(Number(fastestLap.lap_duration) - Number(compareFastest.lap_duration))).toFixed(3)}s ${Number(fastestLap.lap_duration) < Number(compareFastest.lap_duration) ? "ahead" : "behind"}`
                            : "Waiting for lap times"}
                        </div>
                      </div>
                    ) : <div className="empty-state">Choose a second driver from the sidebar to compare pace.</div>}
                  </section>
                </div>
              )}

              {activeTab === "Race analysis" && (
                <div className="analysis-layout">
                  <section className="analysis-intro">
                    <div className="analysis-intro-copy">
                      <span className="eyebrow">APEX PERFORMANCE INTELLIGENCE</span>
                      <h2>Every lap tells<br /><em>a story.</em></h2>
                      <p>Compare pace, repeatability and sector performance across the session.</p>
                    </div>
                    <div className="analysis-intro-image"><DriverPortrait driver={selectedDriver} className="analysis-portrait" /></div>
                    <div className="analysis-intro-driver"><span>ANALYSING</span><strong>{selectedDriver?.name_acronym || "DRIVER"}</strong><i style={{ background: teamColor(selectedDriver) }} /></div>
                  </section>

                  <section className="analysis-metrics">
                    <Metric label="BEST LAP" value={formatLap(driverStats.best?.lap_duration)} note={driverStats.best?.lap_number ? `PERSONAL BEST · LAP ${driverStats.best.lap_number}` : "NO TIMED LAP"} accent />
                    <Metric label="MEDIAN PACE" value={formatLap(driverStats.median)} note={`${driverStats.count} VALID TIMED LAPS`} />
                    <Metric label="TYPICAL LAP SPREAD" value={driverStats.consistency !== null ? `±${driverStats.consistency.toFixed(3)}s` : "—"} note="MEDIAN ABSOLUTE DEVIATION" />
                    <Metric label="SESSION PACE DRIFT" value={sessionPaceDrift === null ? "—" : formatDelta(sessionPaceDrift)} note="LAST 5 MEDIAN − FIRST 5 MEDIAN" />
                    <Metric label="POSITION CHANGE" value={placesGained === null ? "—" : `${placesGained > 0 ? "+" : ""}${placesGained}`} note={startPosition !== null && endPosition !== null ? `P${startPosition} START → P${endPosition} LATEST` : "POSITION FEED UNAVAILABLE"} />
                  </section>

                  <section className="panel analysis-pace-panel">
                    <SectionHeading
                      eyebrow="LAP-BY-LAP PACE"
                      title="Session pace trace"
                      detail="Each marker is a valid timed lap. Pit-out laps are excluded."
                      action={<span className="analysis-tag">LOWER LAP TIME = FASTER</span>}
                    />
                    <PaceChart
                      primary={driverLaps}
                      comparison={compareLaps}
                      primaryColor={teamColor(selectedDriver)}
                      comparisonColor={teamColor(compareDriver)}
                    />
                  </section>

                  <section className="panel sector-panel">
                    <SectionHeading eyebrow="MICRO-SECTOR BREAKDOWN" title="Sector benchmarks" detail="Personal bests against the fastest sector recorded in the field" />
                    <SectorBars sectors={analysisSectors} primaryColor={teamColor(selectedDriver)} comparisonColor={teamColor(compareDriver)} />
                    <p className="analysis-footnote">Sector benchmarks are independent bests, not a single-lap result. A missing sector means the timing feed did not provide that split.</p>
                  </section>

                  <section className="panel analysis-detail-panel">
                    <SectionHeading eyebrow="PACE PROFILE" title="Driver comparison" detail="Session-level view · pit-out laps excluded" />
                    <div className="analysis-driver-head">
                      <div><i style={{ background: teamColor(selectedDriver) }} /><span>{selectedDriver?.name_acronym || "PRIMARY"}</span></div>
                      {compareDriver && <div><i style={{ background: teamColor(compareDriver) }} /><span>{compareDriver.name_acronym || driverName(compareDriver)}</span></div>}
                    </div>
                    <div className="analysis-comparison-table">
                      {[
                        ["BEST LAP", driverStats.best?.lap_duration, compareStats.best?.lap_duration],
                        ["MEDIAN LAP", driverStats.median, compareStats.median],
                        ["AVERAGE LAP", driverStats.average, compareStats.average],
                        ["TYPICAL SPREAD (MAD)", driverStats.consistency, compareStats.consistency],
                      ].map(([label, primary, rival]) => (
                        <div className="analysis-comparison-row" key={label}>
                          <span>{label}</span><strong>{primary === null || primary === undefined ? "—" : `${label.includes("CONSISTENCY") ? "±" : ""}${Number(primary).toFixed(3)}s`}</strong>
                          {compareDriver && <strong className="rival-value">{rival === null || rival === undefined ? "—" : `${label.includes("CONSISTENCY") ? "±" : ""}${Number(rival).toFixed(3)}s`}</strong>}
                        </div>
                      ))}
                    </div>
                    <p className="analysis-footnote">Typical spread is the median absolute deviation from median lap time, a robust measure less affected by pit-stop outliers. Session pace still reflects fuel, traffic, tyre compound and track evolution.</p>
                  </section>

                  <section className="panel fastest-laps-panel">
                    <SectionHeading eyebrow="PERSONAL BESTS" title="Fastest laps" detail={`${selectedDriver ? driverName(selectedDriver) : "Selected driver"} · top ${fastestLaps.length} valid laps`} />
                    {fastestLaps.length ? (
                      <div className="table-wrap">
                        <table>
                          <thead><tr><th>RANK</th><th>LAP</th><th>TIME</th><th>Δ TO BEST</th><th>S1</th><th>S2</th><th>S3</th><th>TRAP</th></tr></thead>
                          <tbody>{fastestLaps.map((lap, index) => {
                            const duration = Number(lap.lap_duration);
                            const fastestTime = Number(driverStats.best?.lap_duration);
                            return (
                              <tr key={`${lap.lap_number}-${lap.date_start}`}>
                                <td><span className={`rank-chip${index === 0 ? " rank-chip-best" : ""}`}>{String(index + 1).padStart(2, "0")}</span></td>
                                <td className="muted-cell">{lap.lap_number}</td>
                                <td className="time-cell">{formatLap(duration)}</td>
                                <td className={index === 0 ? "analysis-best-delta" : "muted-cell"}>{index === 0 ? "BEST" : `+${(duration - fastestTime).toFixed(3)}s`}</td>
                                {SECTOR_KEYS.map(({ key }) => <td className="muted-cell" key={key}>{safeNumber(lap[key])?.toFixed(3) || "—"}</td>)}
                                <td className="muted-cell">{lap.st_speed ? `${lap.st_speed}` : "—"}</td>
                              </tr>
                            );
                          })}</tbody>
                        </table>
                      </div>
                    ) : <div className="empty-state">No valid lap times are available to rank.</div>}
                  </section>

                  <section className="analysis-caveat"><span>i</span><p><strong>How to read this analysis</strong> · Lap spread is the median absolute deviation from median lap time, which is less sensitive to pit-stop outliers. Pace change compares the first and last five valid laps. Both also reflect strategy and track evolution—not only driver pace.</p></section>
                </div>
              )}

              {activeTab === "Pace forecast" && (
                <div className="forecast-layout">
                  <section className="forecast-hero">
                    <div className="forecast-hero-copy">
                      <span className="eyebrow">APEX PACE MODEL · SESSION DATA</span>
                      <h2>Read the pace.<br /><em>Not the headlines.</em></h2>
                      <p>An explainable short-horizon forecast, fitted to recent clean laps from the latest tyre stint.</p>
                    </div>
                    <div className="forecast-hero-icon" aria-hidden="true"><span>↗</span><i /><i /><i /></div>
                    <div className="forecast-hero-chip"><i /> LAP-TIME PROJECTION</div>
                  </section>

                  <section className="forecast-summary">
                    <Metric
                      label="NEXT LAP PROJECTION"
                      value={formatLap(selectedForecast?.forecast[0]?.lapTime)}
                      note={selectedForecast?.forecast[0] ? `LAP ${selectedForecast.forecast[0].lapNumber} · ${selectedForecast.sampleSize} CLEAN LAPS` : "NEED 5 CLEAN LAPS IN STINT"}
                      accent
                    />
                    <Metric
                      label="MODEL UNCERTAINTY"
                      value={selectedForecast?.uncertainty !== null && selectedForecast?.uncertainty !== undefined ? `±${selectedForecast.uncertainty.toFixed(2)}s` : "—"}
                      note={selectedForecast?.status ? `${selectedForecast.sampleSize} FITTED LAPS · ROBUST RESIDUAL BAND` : "INSUFFICIENT HISTORY"}
                    />
                    <Metric
                      label="ROLLING BACKTEST MAE"
                      value={selectedForecast?.backtest.mae !== null && selectedForecast?.backtest.mae !== undefined ? `±${selectedForecast.backtest.mae.toFixed(2)}s` : "—"}
                      note={selectedForecast?.backtest.count ? `${selectedForecast.backtest.count} HISTORICAL ONE-LAP TESTS` : "NEED MORE CLEAN LAPS"}
                    />
                    <Metric
                      label="PACE TREND"
                      value={selectedForecast?.trendPerLap !== null && selectedForecast?.trendPerLap !== undefined ? `${selectedForecast.trendPerLap > 0 ? "+" : ""}${selectedForecast.trendPerLap.toFixed(3)}s` : "—"}
                      note={selectedForecast?.trendPerLap === null || selectedForecast?.trendPerLap === undefined ? "NO FIT AVAILABLE" : selectedForecast.trendPerLap < 0 ? "TRENDING FASTER / LAP" : selectedForecast.trendPerLap > 0 ? "TRENDING SLOWER / LAP" : "PACE TREND FLAT"}
                    />
                  </section>

                  <section className="panel forecast-chart-panel">
                    <SectionHeading
                      eyebrow="NEXT THREE LAPS"
                      title="Projected pace window"
                      detail="Recent stint trend with a robust uncertainty band · not a race result prediction"
                      action={sessionForecasts.some((row) => row.forecast.length) ? (
                        <button
                          className="export-button"
                          onClick={() => downloadForecastCsv(sessionForecasts, selectedMeeting?.meeting_name || "Grand Prix", sessions.find((item) => String(item.session_key) === String(sessionKey))?.session_name || "Session")}
                        >↓ EXPORT CSV</button>
                      ) : null}
                    />
                    <div className="forecast-legend">
                      <span><i style={{ background: teamColor(selectedDriver) }} />{selectedDriver?.name_acronym || "PRIMARY DRIVER"}</span>
                      {compareForecast?.forecast.length > 0 && <span><i style={{ background: teamColor(compareDriver) }} />{compareDriver?.name_acronym || "COMPARISON"}</span>}
                      <span className="forecast-band-key"><i /> UNCERTAINTY BAND</span>
                    </div>
                    <ForecastChart
                      forecasts={[selectedForecast, compareForecast].filter(Boolean)}
                      colors={[teamColor(selectedDriver), teamColor(compareDriver)]}
                    />
                  </section>

                  <section className="panel forecast-driver-panel">
                    <SectionHeading eyebrow="FIELD PROJECTION" title="Predicted next-lap pace" detail="Ranked by modelled lap time · not by predicted finishing position" />
                    <div className="table-wrap">
                      <table className="forecast-table">
                        <thead><tr><th>RANK</th><th>DRIVER</th><th>PROJECTED</th><th>UNCERTAINTY</th><th>TREND / LAP</th><th>TYRE</th><th>DATA</th></tr></thead>
                        <tbody>
                          {sessionForecasts.slice(0, 18).map((row, index) => (
                            <tr
                              key={row.driver.driver_number}
                              className={String(row.driver.driver_number) === String(driverNumber) ? "selected-row" : ""}
                              onClick={() => setDriverNumber(String(row.driver.driver_number))}
                            >
                              <td><span className={`rank-chip${index === 0 && row.forecast.length ? " rank-chip-best" : ""}`}>{String(index + 1).padStart(2, "0")}</span></td>
                              <td><span className="driver-cell"><i style={{ background: teamColor(row.driver) }} />{row.driver.name_acronym || driverName(row.driver)}</span></td>
                              <td className="time-cell">{formatLap(row.forecast[0]?.lapTime)}</td>
                              <td className="muted-cell">{row.uncertainty !== null ? `±${row.uncertainty.toFixed(2)}s` : "—"}</td>
                              <td className="muted-cell">{row.trendPerLap === null ? "—" : `${row.trendPerLap > 0 ? "+" : ""}${row.trendPerLap.toFixed(3)}s`}</td>
                              <td>{row.tyreCompound ? <span className="tyre-tag"><i style={{ borderColor: TYRE_COLORS[row.tyreCompound] || "#8b94a5" }} />{row.tyreCompound.slice(0, 1)}</span> : "—"}</td>
                              <td><span className={`confidence-pill confidence-${row.status.toLowerCase()}`}>{row.status === "INSUFFICIENT" ? "LOW DATA" : `${row.sampleSize} LAPS`}</span></td>
                            </tr>
                          ))}
                          {!sessionForecasts.length && <tr><td colSpan="7" className="table-empty">Driver and lap data have not loaded yet.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="panel model-validation">
                    <div className="validation-top">
                      <span className="validation-symbol">✓</span>
                      <div><span className="eyebrow">MODEL SANITY CHECK</span><h3>Rolling one-lap backtest</h3></div>
                    </div>
                    <div className="validation-score"><strong>{fieldMeanAbsoluteError === null ? "—" : `${fieldMeanAbsoluteError.toFixed(2)}s`}</strong><span>FIELD-WIDE MAE</span></div>
                    <p>Each historical test predicts one lap from up to eight earlier clean laps; it never trains on that lap. {forecastBacktest.count ? `${forecastBacktest.count} held-out lap predictions across the field.` : "More valid lap history is required to score the model."}</p>
                  </section>

                  <section className="forecast-method">
                    <span className="method-icon">i</span>
                    <div><strong>What this model does—and does not do</strong><p>Fits a bounded linear trend to the last eight valid laps from the driver’s latest tyre stint. The shaded range is based on robust median absolute residuals, with a minimum ±0.15s band. “Robust” means eight laps were available; it is not calibrated probability or guaranteed model accuracy. This is a pace-only heuristic, not a trained machine-learning model, pit-wall strategy, or forecast of race winners. It does not model traffic, fuel, weather changes, incidents, tyre degradation, or future pit stops; treat it as directional context rather than certainty.</p></div>
                  </section>
                </div>
              )}

              {activeTab === "Telemetry lab" && (
                <div className="two-column-layout">
                  <section className="panel telemetry-panel">
                    <SectionHeading eyebrow="ONBOARD DATA" title="Fastest lap telemetry" detail={`${selectedDriver ? driverName(selectedDriver) : "Driver"} · lap ${fastestLap?.lap_number || "—"} · speed, throttle, brake & RPM`} />
                    {loading.telemetry ? <div className="panel-loading">Pulling car data…</div> : telemetry.length ? (
                      <TelemetryChart rows={telemetry} />
                    ) : <div className="empty-state tall">High-frequency speed, throttle and RPM data was not recorded for this lap. Check the GPS replay below for the driver's movement around the circuit.</div>}
                  </section>
                  <section className="panel">
                    <SectionHeading eyebrow="LAP PACE" title="Lap time progression" detail="Every completed lap in this session" />
                    <LapSparkline laps={driverLaps} color={teamColor(selectedDriver)} />
                    <div className="lap-summary"><div><span>FASTEST</span><strong>{formatLap(fastestLap?.lap_duration)}</strong></div><div><span>LAP</span><strong>{fastestLap?.lap_number || "—"}</strong></div><div><span>TOP SPEED</span><strong>{fastestLap?.st_speed ? `${fastestLap.st_speed} <small>km/h</small>` : "—"}</strong></div></div>
                    <div className="lap-list">
                      {driverLaps.filter(isValidLap).slice(-8).reverse().map((lap) => (
                        <div key={`${lap.lap_number}-${lap.date_start}`}><span> LAP {lap.lap_number}</span><strong>{formatLap(lap.lap_duration)}</strong><span>{lap.st_speed ? `${lap.st_speed} km/h` : ""}</span></div>
                      ))}
                    </div>
                  </section>
                  <section className="panel map-wide">
                    <SectionHeading eyebrow="GPS POSITION REPLAY" title="Driver movement" detail={`${selectedDriver ? driverName(selectedDriver) : "Selected driver"} · lap ${fastestLap?.lap_number || "—"} · play or scrub through recorded track positions`} />
                    <DriverReplay points={location} color={teamColor(selectedDriver)} circuitName={selectedMeeting?.circuit_short_name || selectedMeeting?.meeting_name || ""} circuitImage={selectedMeeting?.circuit_image} />
                  </section>
                </div>
              )}

              {activeTab === "Tyre strategy" && (
                <div className="strategy-layout">
                  <section className="panel">
                    <SectionHeading eyebrow="STINT STRATEGY" title="Tyre life & pit windows" detail={`${selectedDriver ? driverName(selectedDriver) : "Driver"} · compound sequence by lap`} />
                    {selectedStints.length ? (
                      <>
                        <div className="stint-track">
                          {selectedStints.map((stint) => {
                            const start = Number(stint.lap_start || 1);
                            const end = Number(stint.lap_end || start + 1);
                            const total = Math.max(1, ...selectedStints.map((item) => Number(item.lap_end || 1)));
                            return (
                              <div className="stint-row" key={stint.stint_number}>
                                <span className="stint-number">STINT {stint.stint_number}</span>
                                <div className="stint-bar-track">
                                  <div className="stint-bar" style={{ left: `${((start - 1) / total) * 100}%`, width: `${Math.max(2, ((end - start + 1) / total) * 100)}%`, background: TYRE_COLORS[stint.compound] || "#858d9b" }}>
                                    <span>{stint.compound}</span>
                                  </div>
                                </div>
                                <span className="stint-laps">{start} — {end}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="stint-axis"><span>LAP 1</span><span>LAP {Math.max(...selectedStints.map((item) => Number(item.lap_end || 1)))}</span></div>
                        <div className="tyre-legend">{Object.entries(TYRE_COLORS).map(([compound, color]) => <span key={compound}><i style={{ background: color }} />{compound}</span>)}</div>
                      </>
                    ) : <div className="empty-state tall">No tyre stints have been recorded for this driver.</div>}
                  </section>
                  <section className="panel">
                    <SectionHeading eyebrow="STINT DETAILS" title="Compound history" detail="Tyre age at start and completed laps" />
                    {selectedStints.length ? <div className="stint-cards">
                      {selectedStints.map((stint) => (
                        <div className="stint-card" key={stint.stint_number} style={{ "--compound": TYRE_COLORS[stint.compound] || "#858d9b" }}>
                          <div className="compound-mark">{String(stint.compound || "?").slice(0, 1)}</div>
                          <div><span>STINT {stint.stint_number}</span><strong>{stint.compound || "UNKNOWN"}</strong></div>
                          <div className="stint-age"><strong>{stint.tyre_age_at_start ?? "—"}</strong><span>LAPS OLD</span></div>
                          <div className="stint-age"><strong>{Math.max(0, Number(stint.lap_end || 0) - Number(stint.lap_start || 0) + 1)}</strong><span>LAPS RUN</span></div>
                        </div>
                      ))}
                    </div> : <div className="empty-state">Stint information will appear when data is available.</div>}
                  </section>
                </div>
              )}

              {activeTab === "Track conditions" && (
                <div className="conditions-layout">
                  <section className="panel">
                    <SectionHeading eyebrow="ENVIRONMENT MONITOR" title="Track conditions" detail="Air and asphalt temperatures captured through the session" action={<span className="live-pill"><i /> WEATHER FEED</span>} />
                    <div className="weather-legend"><span><i className="air-dot" /> AIR TEMPERATURE</span><span><i className="track-dot" /> TRACK TEMPERATURE</span></div>
                    <WeatherChart rows={weather} />
                  </section>
                  <section className="conditions-metrics">
                    <Metric label="AIR TEMPERATURE" value={weather.length ? `${weather.at(-1)?.air_temperature ?? "—"}°C` : "—"} note="LATEST SAMPLE" />
                    <Metric label="TRACK TEMPERATURE" value={weather.length ? `${weather.at(-1)?.track_temperature ?? "—"}°C` : "—"} note="LATEST SAMPLE" accent />
                    <Metric label="RELATIVE HUMIDITY" value={weather.length ? `${weather.at(-1)?.humidity ?? "—"}%` : "—"} note="LATEST SAMPLE" />
                    <Metric label="WIND SPEED" value={weather.length ? `${weather.at(-1)?.wind_speed ?? "—"} m/s` : "—"} note="LATEST SAMPLE" />
                  </section>
                  <section className="panel conditions-note">
                    <span className="note-icon">i</span>
                    <div><strong>Strategy note</strong><p>Track temperature affects tyre warm-up and degradation. Compare weather samples with stint timing to understand how conditions evolved during the session.</p></div>
                  </section>
                </div>
              )}
            </>
          )}

          <footer className="page-footer"><span>APEX <b>RACE INTELLIGENCE</b></span><span>UNOFFICIAL FAN ANALYTICS · DATA VIA OPENF1</span><span>BUILT FOR THE LOVE OF RACING <b>↗</b></span></footer>
        </div>
      </main>
    </div>
  );
}

function TelemetryChart({ rows }) {
  const series = [
    { key: "speed", label: "SPEED", color: "#43c8ff", suffix: " km/h", scale: 400 },
    { key: "throttle", label: "THROTTLE", color: "#50dc9b", suffix: " %", scale: 100 },
    { key: "brake", label: "BRAKE", color: "#fa3555", suffix: " %", scale: 100 },
    { key: "rpm", label: "RPM", color: "#ffd64a", suffix: " rpm", scale: 15000 },
  ];
  const sample = rows.filter((_, index) => index % Math.max(1, Math.floor(rows.length / 240)) === 0);
  return (
    <div className="telemetry-chart">
      {series.map(({ key, label, color, suffix, scale }) => {
        const values = sample.map((row) => safeNumber(row[key]));
        const available = values.some((value) => value !== null);
        const points = values.map((value, index) => value === null ? null : `${(index / Math.max(1, values.length - 1)) * 1000},${86 - (Math.max(0, Math.min(scale, value)) / scale) * 68}`)
          .filter(Boolean).join(" ");
        const current = values.filter((value) => value !== null).at(-1);
        return (
          <div className="telemetry-series" key={key}>
            <div className="series-head"><span><i style={{ background: color }} />{label}</span><strong>{current === undefined ? "—" : `${Math.round(current)}${suffix}`}</strong></div>
            {available ? <svg viewBox="0 0 1000 100" preserveAspectRatio="none"><line x1="0" y1="86" x2="1000" y2="86" /><polyline points={points} style={{ stroke: color }} /></svg> : <div className="series-missing">Signal not recorded</div>}
          </div>
        );
      })}
      <div className="chart-axis"><span>START OF LAP</span><span>TIME →</span><span>END OF LAP</span></div>
    </div>
  );
}

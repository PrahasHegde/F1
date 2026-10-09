const MAX_TREND_SECONDS_PER_LAP = 0.18;
const MIN_LAPS_FOR_FORECAST = 5;
const MODEL_WINDOW = 8;
const BACKTEST_WINDOW = 20;

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function validTimedLaps(laps) {
  return laps
    .filter((lap) => Number.isFinite(Number(lap.lap_number))
      && Number.isFinite(Number(lap.lap_duration))
      && Number(lap.lap_duration) > 0
      && !lap.is_pit_out_lap)
    .sort((left, right) => Number(left.lap_number) - Number(right.lap_number));
}

function linearFit(rows) {
  if (rows.length < 2) return null;
  const points = rows.map((lap) => ({
    x: Number(lap.lap_number),
    y: Number(lap.lap_duration),
  }));
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const varianceX = points.reduce((sum, point) => sum + ((point.x - meanX) ** 2), 0);
  if (!varianceX) return null;
  const slope = points.reduce((sum, point) => sum + ((point.x - meanX) * (point.y - meanY)), 0) / varianceX;
  const boundedSlope = Math.max(-MAX_TREND_SECONDS_PER_LAP, Math.min(MAX_TREND_SECONDS_PER_LAP, slope));
  return {
    slope: boundedSlope,
    predict: (lapNumber) => meanY + boundedSlope * (lapNumber - meanX),
    residuals: points.map((point) => point.y - (meanY + boundedSlope * (point.x - meanX))),
  };
}

function selectLatestStintLaps(laps, stints, driverNumber) {
  const driverStints = stints
    .filter((stint) => String(stint.driver_number) === String(driverNumber))
    .sort((left, right) => Number(left.stint_number) - Number(right.stint_number));
  const latestStint = driverStints.at(-1);
  if (!latestStint) {
    return { laps: laps.slice(-MODEL_WINDOW), stint: null };
  }

  const lapStart = Number(latestStint.lap_start);
  const lapEnd = Number(latestStint.lap_end);
  if (!Number.isFinite(lapStart)) {
    return { laps: laps.slice(-MODEL_WINDOW), stint: latestStint };
  }
  const stintLaps = laps.filter((lap) => Number(lap.lap_number) >= lapStart
    && (!Number.isFinite(lapEnd) || Number(lap.lap_number) <= lapEnd));
  return { laps: stintLaps.slice(-MODEL_WINDOW), stint: latestStint };
}

function projectRows(rows) {
  if (rows.length < MIN_LAPS_FOR_FORECAST) return null;
  const fit = linearFit(rows);
  if (!fit) return null;
  const lastLapNumber = Number(rows.at(-1).lap_number);
  const lastLapTime = Number(rows.at(-1).lap_duration);
  const residualCenter = median(fit.residuals) ?? 0;
  const residualSpread = median(fit.residuals.map((value) => Math.abs(value - residualCenter))) ?? 0;
  const uncertainty = Math.max(0.15, residualSpread * 1.4826);
  return {
    slope: fit.slope,
    uncertainty,
    next: Math.max(1, fit.predict(lastLapNumber + 1)),
    lastLapNumber,
    lastLapTime,
  };
}

function rollingBacktest(laps) {
  const testRows = laps.slice(-BACKTEST_WINDOW);
  const errors = [];
  for (let index = 4; index < testRows.length; index += 1) {
    const history = testRows.slice(Math.max(0, index - MODEL_WINDOW), index);
    const fit = linearFit(history);
    if (!fit) continue;
    const actual = Number(testRows[index].lap_duration);
    const predicted = fit.predict(Number(testRows[index].lap_number));
    errors.push({ error: actual - predicted, absoluteError: Math.abs(actual - predicted) });
  }
  if (!errors.length) return { count: 0, mae: null, bias: null };
  return {
    count: errors.length,
    mae: errors.reduce((sum, row) => sum + row.absoluteError, 0) / errors.length,
    bias: errors.reduce((sum, row) => sum + row.error, 0) / errors.length,
  };
}

export function predictDriverPace(driver, allLaps, allStints) {
  const driverNumber = driver?.driver_number;
  const driverLaps = validTimedLaps(allLaps.filter((lap) => String(lap.driver_number) === String(driverNumber)));
  const { laps: modelLaps, stint } = selectLatestStintLaps(driverLaps, allStints, driverNumber);
  const projected = projectRows(modelLaps);
  const lastLap = driverLaps.at(-1) ?? null;
  const tyreAgeAtStart = Number(stint?.tyre_age_at_start);
  const stintLapStart = Number(stint?.lap_start);
  const currentTyreAge = stint
    && Number.isFinite(tyreAgeAtStart)
    && Number.isFinite(stintLapStart)
    && lastLap
    ? tyreAgeAtStart + Math.max(0, Number(lastLap.lap_number) - stintLapStart)
    : null;

  return {
    driver,
    lastLap,
    sampleSize: modelLaps.length,
    status: projected ? (modelLaps.length >= MODEL_WINDOW ? "ROBUST" : "LIMITED") : "INSUFFICIENT",
    forecast: projected
      ? Array.from({ length: 3 }, (_, index) => ({
        lapNumber: projected.lastLapNumber + index + 1,
        lapTime: Math.max(1, projected.next + projected.slope * index),
        lower: Math.max(1, projected.next + projected.slope * index - projected.uncertainty),
        upper: projected.next + projected.slope * index + projected.uncertainty,
      }))
      : [],
    trendPerLap: projected?.slope ?? null,
    uncertainty: projected?.uncertainty ?? null,
    tyreCompound: stint?.compound ?? null,
    tyreAge: currentTyreAge,
    backtest: rollingBacktest(driverLaps),
  };
}

export function predictSessionPace(drivers, laps, stints) {
  return drivers
    .map((driver) => predictDriverPace(driver, laps, stints))
    .sort((left, right) => {
      const leftPace = left.forecast[0]?.lapTime;
      const rightPace = right.forecast[0]?.lapTime;
      if (leftPace === undefined) return 1;
      if (rightPace === undefined) return -1;
      return leftPace - rightPace;
    });
}

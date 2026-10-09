const BASE_URL = "https://api.openf1.org/v1";
const cache = new Map();
const MIN_REQUEST_INTERVAL_MS = 450;
let requestQueue = Promise.resolve();
let lastRequestAt = 0;

function scheduleRequest(url) {
  const request = requestQueue.then(async () => {
    const wait = Math.max(0, lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now());
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    return fetch(url);
  });
  requestQueue = request.then(() => undefined, () => undefined);
  return request;
}

export async function fetchOpenF1(endpoint, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  ).toString();
  const url = `${BASE_URL}/${endpoint}${query ? `?${query}` : ""}`;

  if (cache.has(url)) return cache.get(url);

  const request = scheduleRequest(url).then(async (initialResponse) => {
    let response = initialResponse;
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1500;
      await new Promise((resolve) => setTimeout(resolve, delay));
      response = await scheduleRequest(url);
    }
    if (!response.ok) {
      const error = new Error(`OpenF1 returned ${response.status} for ${endpoint}.`);
      error.status = response.status;
      throw error;
    }
    const payload = await response.json();
    if (!Array.isArray(payload)) {
      throw new Error(`Unexpected response from OpenF1 ${endpoint} endpoint.`);
    }
    return payload;
  });

  cache.set(url, request);
  try {
    return await request;
  } catch (error) {
    cache.delete(url);
    throw error;
  }
}

export function clearApiCache() {
  cache.clear();
}

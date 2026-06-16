const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Sites + dashboard
  dashboard:   () => request("GET", "/api/sites/dashboard"),
  sites:       () => request("GET", "/api/sites"),
  site:        (id) => request("GET", `/api/sites/${id}`),

  // Visits
  visits:      () => request("GET", "/api/visits"),

  // Lab results
  labResults:    () => request("GET", "/api/lab-results"),
  labResult:     (id) => request("GET", `/api/lab-results/${id}`),
  reviewLab:     (payload) => request("POST", "/api/lab-results", payload),
  rereviewLab:   (id) => request("POST", `/api/lab-results/${id}/rereview`),

  // Tasks
  taskBoard:        () => request("GET", "/api/tasks/board"),
  transitionTask:   (id, payload) => request("PATCH", `/api/tasks/${id}/transition`, payload),
  technicians:      () => request("GET", "/api/visits/technicians"),

  // Inventory + reconciliation
  shipments:        () => request("GET", "/api/inventory/shipments"),
  reconciliation:   (id) => request("GET", `/api/inventory/shipments/${id}/reconciliation`),

  // Workshop
  workshopBoard:    () => request("GET", "/api/workshop/board"),
  updateStation:    (id, payload) => request("PATCH", `/api/workshop/stations/${id}`, payload),

  // Quotes
  quotes:           () => request("GET", "/api/quotes"),
  quote:            (id) => request("GET", `/api/quotes/${id}`),
  transitionQuote:  (id, payload) => request("PATCH", `/api/quotes/${id}/transition`, payload),
};

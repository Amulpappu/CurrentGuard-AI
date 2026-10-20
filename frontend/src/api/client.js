// CurrentGuard AI Stage 2 API Client

const API_BASE = '/api';

async function fetchJson(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    if (!res.ok) {
      const errText = await res.text();
      let errMsg = `API Error ${res.status}: ${res.statusText}`;
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.detail || errMsg;
      } catch (e) {
        errMsg = errText || errMsg;
      }
      throw new Error(errMsg);
    }
    return await res.json();
  } catch (error) {
    console.error(`Fetch error at ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // Telemetry & Overview
  getSummary: () => fetchJson('/telemetry/summary'),
  getLiveTelemetry: () => fetchJson('/telemetry/live'),
  getRolling: () => fetchJson('/telemetry/rolling'),
  getTrend: () => fetchJson('/telemetry/trend'),
  getAnalytics: () => fetchJson('/telemetry/analytics'),

  // Rooms
  getRooms: () => fetchJson('/rooms'),
  getRoomDetails: (id) => fetchJson(`/rooms/${id}`),
  toggleRoomOccupancy: (id) => fetchJson(`/rooms/${id}/toggle-occupancy`, { method: 'POST' }),

  // Alerts & Verification
  getAlerts: (status, severity) => {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (severity && severity !== 'all') params.append('severity', severity);
    return fetchJson(`/alerts?${params.toString()}`);
  },
  getAlertDetail: (id) => fetchJson(`/alerts/${id}`),
  verifyAlert: (id, payload) => fetchJson(`/alerts/${id}/verify`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getVerificationHistory: (limit = 50) => fetchJson(`/verification/history?limit=${limit}`),
  getPendingVerifications: () => fetchJson('/verification/pending'),

  // Simulation Controls
  getSimulatorStatus: () => fetchJson('/simulator/status'),
  setScenario: (scenario) => fetchJson('/simulator/scenario', {
    method: 'POST',
    body: JSON.stringify({ scenario })
  }),
  toggleAppliance: (appliance_key) => fetchJson('/simulator/toggle-appliance', {
    method: 'POST',
    body: JSON.stringify({ appliance_key })
  }),

  // Settings & Tariffs
  getTariffs: () => fetchJson('/settings/tariffs'),
  selectTariff: (location_id) => fetchJson('/settings/tariffs/select', {
    method: 'POST',
    body: JSON.stringify({ location_id })
  }),
  updateTariffRate: (id, rate_per_kwh) => fetchJson(`/settings/tariffs/${id}/rate`, {
    method: 'PUT',
    body: JSON.stringify({ rate_per_kwh })
  }),
  getUsers: () => fetchJson('/settings/users'),

  // Google Sheets Dual-Mode Database
  getGoogleSheetsStatus: () => fetchJson('/settings/google-sheets'),
  saveGoogleSheetsConfig: (webhook_url, auto_sync = true) => fetchJson('/settings/google-sheets', {
    method: 'POST',
    body: JSON.stringify({ webhook_url, auto_sync })
  }),
  syncAllToGoogleSheets: () => fetchJson('/settings/google-sheets/sync-all', { method: 'POST' }),
  getAppsScriptCode: () => fetchJson('/settings/google-sheets/script-code'),

  // Laptop Sensor (psutil-based real power readings)
  getLaptopReading: () => fetchJson('/laptop-sensor/reading'),
  getLaptopHistory: () => fetchJson('/laptop-sensor/history'),
  getLaptopSensorStatus: () => fetchJson('/laptop-sensor/status')
};

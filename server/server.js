const express = require('express');
const cors = require('cors');
const path = require('path');

const {
  getSummaryKPIs,
  getHourlyTrend,
  getLossAnalysisData,
  areas,
  devices,
  setScenario,
  ingestHardwareTelemetry,
  getActiveScenario,
  locationTariffs,
  getActiveLocation,
  setTariffLocation,
  updateTariffRate,
  getRollingTelemetry,
  toggleInteractiveLoad,
  overrideAreaCurrent,
  interactiveLoads
} = require('./simulator');

const {
  analyzeTelemetry,
  getAlerts,
  updateAlertStatus,
  addAlert
} = require('./ai_engine');

const {
  authorizedDevices,
  auditLogs,
  addSecurityLog,
  verifyDeviceToken,
  verifyChainIntegrity,
  getSecurityStats
} = require('./security');

const {
  getLaptopPowerMetrics,
  startBenchmark,
  stopBenchmark,
  hardwareSpecs
} = require('./laptop_monitor');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Request audit logger for security
app.use((req, res, next) => {
  if (req.path.startsWith('/api') && req.method !== 'GET') {
    addSecurityLog(`${req.method} Request`, `Action triggered at ${req.path}`, 'Success');
  }
  next();
});

// 1. Overall System Status & KPIs (Panel 02)
app.get('/api/status', (req, res) => {
  const kpis = getSummaryKPIs();
  res.json({
    success: true,
    activeScenario: getActiveScenario(),
    systemStatus: 'Online',
    timestamp: new Date().toISOString(),
    kpis
  });
});

// 2. Real-time Telemetry & Trend (Panel 02 & Panel 04)
app.get('/api/telemetry/live', (req, res) => {
  const consumerSum = areas.reduce((sum, a) => sum + a.currentUsage, 0);
  const supplyMeter = Math.round(consumerSum * 1.008 * 10) / 10;
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    areas,
    consumerSum,
    supplyMeter
  });
});

app.get('/api/telemetry/trend', (req, res) => {
  res.json({
    success: true,
    trend: getHourlyTrend()
  });
});

// Real-time Rolling Waveform Stream (Panel 02 & Panel 04)
app.get('/api/telemetry/rolling', (req, res) => {
  res.json({
    success: true,
    points: getRollingTelemetry(),
    interactiveLoads
  });
});

// Interactive Appliance Load Toggle
app.post('/api/telemetry/toggle-load', (req, res) => {
  const { loadKey, state } = req.body;
  const result = toggleInteractiveLoad(loadKey, state);
  if (!result) {
    return res.status(404).json({ success: false, message: 'Load key not found' });
  }
  res.json({ success: true, result });
});

// Manual Current Override (Simulates physical CT sensor / turn knob)
app.post('/api/telemetry/override-current', (req, res) => {
  const { areaId, currentAmps } = req.body;
  const result = overrideAreaCurrent(areaId, currentAmps);
  if (!result) {
    return res.status(404).json({ success: false, message: 'Area not found' });
  }
  res.json({ success: true, area: result });
});

// 3. Alerts Management (Panel 03)
app.get('/api/alerts', (req, res) => {
  const filter = req.query.status || 'All';
  const alertsList = getAlerts(filter);
  res.json({
    success: true,
    total: alertsList.length,
    alerts: alertsList
  });
});

app.patch('/api/alerts/:id', (req, res) => {
  const { id } = req.params;
  const { status, assignedTo } = req.body;
  const updated = updateAlertStatus(id, status, assignedTo);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Alert not found' });
  }
  addSecurityLog('Alert Triage', `Alert ${id} updated to status: ${status || 'unchanged'} (Assigned: ${assignedTo || 'unchanged'})`, 'Success');
  res.json({ success: true, alert: updated });
});

// 4. AI Anomaly Detection (Panel 05)
app.get('/api/ai/anomalies', (req, res) => {
  const consumerSum = areas.reduce((sum, a) => sum + a.currentUsage, 0);
  const supplyMeter = Math.round(consumerSum * 1.008 * 10) / 10;
  const aiResults = analyzeTelemetry({ areas, consumerSum, supplyMeter });
  res.json({
    success: true,
    results: aiResults
  });
});

app.post('/api/ai/run-demo', (req, res) => {
  const consumerSum = areas.reduce((sum, a) => sum + a.currentUsage, 0);
  const supplyMeter = Math.round(consumerSum * 1.008 * 10) / 10;
  const aiResults = analyzeTelemetry({ areas, consumerSum, supplyMeter });
  addSecurityLog('AI Engine Scan', `Demo AI scan executed on ${areas.length} zones. ${aiResults.anomaliesCount} anomalies detected.`, 'Success');
  res.json({
    success: true,
    message: 'AI Scan complete',
    results: aiResults
  });
});

// 5. Energy Loss Analysis (Panel 06)
app.get('/api/loss-analysis', (req, res) => {
  const lossData = getLossAnalysisData();
  res.json({
    success: true,
    data: lossData
  });
});

// 6. Energy Waste Management (Panel 07)
app.get('/api/waste-management', (req, res) => {
  const wastageAreas = areas.filter(a => a.status === 'Wastage');
  const potentialSavingsKwh = wastageAreas.reduce((sum, a) => sum + Math.max(0, a.currentUsage - a.expectedUsage), 0);
  
  res.json({
    success: true,
    monitoredAreas: areas.length,
    possibleWastage: wastageAreas.length,
    estimatedMonthlyWaste: 1240,
    potentialSavingsKwh: potentialSavingsKwh || 128,
    areas
  });
});

// 7. Device Management (Panel 08)
app.get('/api/devices', (req, res) => {
  res.json({
    success: true,
    totalDevices: devices.length,
    online: devices.filter(d => d.status === 'Online').length,
    offline: devices.filter(d => d.status === 'Offline').length,
    maintenance: devices.filter(d => d.status === 'Maintenance').length,
    devices
  });
});

app.post('/api/devices', (req, res) => {
  const { name, location, type } = req.body;
  if (!name || !location) {
    return res.status(400).json({ success: false, message: 'Name and location required' });
  }
  const id = `CG-ESP32-0${devices.length + 1}`;
  const newDev = {
    id,
    name,
    location,
    status: 'Online',
    lastSeen: 'Just now',
    type: type || 'ESP32 Controller',
    firmware: 'v2.1.4',
    rssi: '-55 dBm'
  };
  devices.push(newDev);
  addSecurityLog('Device Added', `New IoT node registered: ${id} (${name})`, 'Success');
  res.json({ success: true, device: newDev });
});

// 8. Cybersecurity & Audit (Panel 09)
app.get('/api/security', (req, res) => {
  const stats = getSecurityStats();
  res.json({
    success: true,
    stats
  });
});

// 9. Simulation Scenario Control
app.post('/api/simulator/scenario', (req, res) => {
  const { scenario } = req.body;
  if (!['NORMAL', 'WASTAGE', 'METER_MISMATCH', 'DEVICE_OFFLINE'].includes(scenario)) {
    return res.status(400).json({ success: false, message: 'Invalid scenario name' });
  }
  const result = setScenario(scenario);
  res.json({ success: true, message: `Scenario switched to ${scenario}`, ...result });
});

// 10. Hardware / Ingest API with Security Token Verification
app.post('/api/telemetry/ingest', (req, res) => {
  const deviceId = req.headers['x-device-id'] || req.body.deviceId;
  const token = req.headers['x-device-token'] || req.body.token;

  if (!deviceId || !token) {
    addSecurityLog('Unauthorized Ingest', 'Ingest rejected: Missing device headers', 'Warning');
    return res.status(401).json({ success: false, message: 'Missing device credentials' });
  }

  const authCheck = verifyDeviceToken(deviceId, token);
  if (!authCheck.authorized) {
    return res.status(403).json({ success: false, message: authCheck.reason });
  }

  const result = ingestHardwareTelemetry(deviceId, req.body);
  res.json({ success: true, message: 'Telemetry recorded securely', result });
});

// 11. Location & Daily Electricity Rate Management
app.get('/api/tariffs', (req, res) => {
  res.json({
    success: true,
    activeLocation: getActiveLocation(),
    locations: locationTariffs
  });
});

app.post('/api/tariffs/location', (req, res) => {
  const { locationId } = req.body;
  const updated = setTariffLocation(locationId);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Location not found' });
  }
  res.json({ success: true, activeLocation: updated, message: `Active location set to ${updated.name}` });
});

app.put('/api/tariffs/rate', (req, res) => {
  const { locationId, ratePerKwh } = req.body;
  if (!ratePerKwh || isNaN(ratePerKwh)) {
    return res.status(400).json({ success: false, message: 'Valid rate per kWh required' });
  }
  const updated = updateTariffRate(locationId, ratePerKwh);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Location not found' });
  }
  res.json({ success: true, activeLocation: updated, message: `Daily rate updated for ${updated.name}` });
});

// 12. Host Laptop Real Power & 100% Performance Engine
app.get('/api/laptop/metrics', (req, res) => {
  const metrics = getLaptopPowerMetrics();
  res.json({
    success: true,
    metrics
  });
});

app.post('/api/laptop/benchmark/start', (req, res) => {
  const duration = req.body.durationSeconds || 5;
  const result = startBenchmark(duration);
  addSecurityLog('100% Performance Test', `Hardware CPU benchmark triggered for ${duration}s (Max Power PL2 test)`, 'Warning');
  res.json(result);
});

app.post('/api/laptop/benchmark/stop', (req, res) => {
  const result = stopBenchmark();
  res.json(result);
});

// Fallback route to serve index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`CurrentGuard AI Server running on http://localhost:${PORT}`);
});

module.exports = app;

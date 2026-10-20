// Real-Time Building Electrical Telemetry & Physics-based Load Engine
const { analyzeTelemetry, addAlert } = require('./ai_engine');
const { addSecurityLog } = require('./security');

let activeScenario = 'NORMAL'; // NORMAL | WASTAGE | METER_MISMATCH | DEVICE_OFFLINE

// Live Grid Parameters
let gridVoltage = 230.2; // Phase Voltage (V)
let gridFrequency = 50.01; // Grid Frequency (Hz)
let accumulatedCampusKwh = 1248.15; // Continuous accumulating energy counter

// Interactive Appliance Load States (Amps & kW additions)
let interactiveLoads = {
  labPcs: { name: 'Computer Lab 30x PCs', areaId: 'area-3', amps: 32.6, kw: 7.5, active: false },
  centralAc: { name: 'Central AC Chiller Unit', areaId: 'area-1', amps: 52.1, kw: 12.0, active: false },
  classroomLights: { name: 'Classroom 1 High-Bay Lighting', areaId: 'area-1', amps: 9.5, kw: 2.2, active: true },
  serverRackAux: { name: 'Server Rack Aux Feeder', areaId: 'area-4', amps: 20.8, kw: 4.8, active: true },
  corridorLighting: { name: 'Corridor Night Circuit', areaId: 'area-6', amps: 4.8, kw: 1.1, active: true }
};

// IoT Devices Registry
let devices = [
  { id: 'CG-LAPTOP-001', name: 'Host Laptop (Physical Workstation)', location: 'Workstation 1', status: 'Online', lastSeen: 'Live Hardware', type: 'Physical Laptop Node', firmware: 'Win11 Native', rssi: 'Direct AC Mains' },
  { id: 'CG-ESP32-001', name: 'Main Meter Node', location: 'Block A', status: 'Online', lastSeen: 'Just now', type: 'ESP32 Controller', firmware: 'v2.1.4', rssi: '-58 dBm' },
  { id: 'CG-ESP32-002', name: 'Lab Sensor Node', location: 'Lab 2', status: 'Online', lastSeen: '1 min ago', type: 'Current Sensor', firmware: 'v2.1.4', rssi: '-62 dBm' },
  { id: 'CG-METER-003', name: 'Classroom 1 Sub-meter', location: 'Block A', status: 'Online', lastSeen: '3 mins ago', type: 'Virtual Meter', firmware: 'v1.8.0', rssi: '-65 dBm' },
  { id: 'CG-ESP32-004', name: 'Server Room Monitor', location: 'Back Office', status: 'Offline', lastSeen: '45 mins ago', type: 'ESP32 IoT Node', firmware: 'v2.1.2', rssi: 'No Signal' },
  { id: 'CG-ESP32-005', name: 'Office Meter', location: 'Admin Bld', status: 'Online', lastSeen: '2 mins ago', type: 'Smart Sub-meter', firmware: 'v2.1.4', rssi: '-54 dBm' },
  { id: 'CG-ESP32-006', name: 'Corridor Lighting Node', location: 'Ground Fl', status: 'Online', lastSeen: 'Just now', type: 'ESP32 Relay', firmware: 'v2.1.4', rssi: '-60 dBm' },
  { id: 'CG-ESP32-007', name: 'Library AC Feeder', location: 'Block B', status: 'Online', lastSeen: '4 mins ago', type: 'Power Meter', firmware: 'v2.1.4', rssi: '-70 dBm' },
  { id: 'CG-ESP32-008', name: 'Auditorium Main', location: 'Block C', status: 'Maintenance', lastSeen: '2 hours ago', type: 'Smart Meter', firmware: 'v2.0.1', rssi: 'Testing' },
  { id: 'CG-ESP32-009', name: 'Cafeteria Kitchen', location: 'Dining Wing', status: 'Online', lastSeen: '1 min ago', type: 'High Load CT', firmware: 'v2.1.4', rssi: '-56 dBm' },
  { id: 'CG-ESP32-010', name: 'Solar Inverter Ingest', location: 'Rooftop', status: 'Online', lastSeen: 'Just now', type: 'Solar Gateway', firmware: 'v3.0.0', rssi: '-51 dBm' },
  { id: 'CG-ESP32-011', name: 'Hostel Block A Feeder', location: 'Hostel 1', status: 'Online', lastSeen: '2 mins ago', type: 'ESP32 Node', firmware: 'v2.1.4', rssi: '-68 dBm' },
  { id: 'CG-ESP32-012', name: 'EV Charging Point 1', location: 'Parking Bay', status: 'Online', lastSeen: 'Just now', type: 'Load Switch', firmware: 'v2.1.4', rssi: '-59 dBm' }
];

// Areas with true electrical parameters
let areas = [
  {
    id: 'area-1',
    name: 'Classroom 1',
    status: 'Normal',
    voltage: 230.1,
    currentAmps: 5.4, // Base idle amps
    powerFactor: 0.94,
    activePowerKw: 1.17,
    currentUsage: 42.10, // Accumulated kWh today
    expectedUsage: 12.0,
    occupied: false,
    deviceId: 'CG-ESP32-001',
    location: 'Block A'
  },
  {
    id: 'area-2',
    name: 'Classroom 2',
    status: 'Normal',
    voltage: 229.8,
    currentAmps: 16.5,
    powerFactor: 0.93,
    activePowerKw: 3.53,
    currentUsage: 38.40,
    expectedUsage: 35.0,
    occupied: true,
    deviceId: 'CG-ESP32-002',
    location: 'Lab 2'
  },
  {
    id: 'area-3',
    name: 'Computer Lab',
    status: 'Wastage',
    voltage: 230.5,
    currentAmps: 26.8,
    powerFactor: 0.95,
    activePowerKw: 5.86,
    currentUsage: 128.60,
    expectedUsage: 60.0,
    occupied: false,
    deviceId: 'CG-ESP32-003',
    location: 'Block A'
  },
  {
    id: 'area-4',
    name: 'Server Room',
    status: 'Normal',
    voltage: 230.2,
    currentAmps: 37.4,
    powerFactor: 0.98,
    activePowerKw: 8.44,
    currentUsage: 86.20,
    expectedUsage: 80.0,
    occupied: true,
    deviceId: 'CG-ESP32-004',
    location: 'Back Office'
  },
  {
    id: 'area-5',
    name: 'Office',
    status: 'Normal',
    voltage: 230.0,
    currentAmps: 23.5,
    powerFactor: 0.92,
    activePowerKw: 4.96,
    currentUsage: 54.30,
    expectedUsage: 50.0,
    occupied: true,
    deviceId: 'CG-ESP32-005',
    location: 'Admin Bld'
  },
  {
    id: 'area-6',
    name: 'Corridor',
    status: 'Normal',
    voltage: 230.3,
    currentAmps: 4.8,
    powerFactor: 0.91,
    activePowerKw: 1.00,
    currentUsage: 18.15,
    expectedUsage: 5.0,
    occupied: false,
    deviceId: 'CG-ESP32-006',
    location: 'Ground Fl'
  }
];

// Rolling Second-by-Second Real-Time Telemetry Buffer (Last 30 seconds)
let rollingTelemetry = [];
const MAX_ROLLING_POINTS = 30;

// Initialize rolling buffer with realistic past 30 seconds
const nowMs = Date.now();
for (let i = MAX_ROLLING_POINTS; i >= 0; i--) {
  const t = new Date(nowMs - i * 1000);
  rollingTelemetry.push({
    timestamp: t.toISOString(),
    timeLabel: t.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    totalCurrentAmps: parseFloat((114.4 + (Math.random() - 0.5) * 3).toFixed(2)),
    totalPowerKw: parseFloat((24.96 + (Math.random() - 0.5) * 0.8).toFixed(2)),
    gridVoltage: parseFloat((230.2 + (Math.random() - 0.5) * 1.2).toFixed(1)),
    gridFrequency: parseFloat((50.01 + (Math.random() - 0.5) * 0.04).toFixed(2)),
    totalKwh: parseFloat((accumulatedCampusKwh - (i * 0.007)).toFixed(2))
  });
}

// Regional & Campus Electricity Tariffs
let locationTariffs = [
  {
    id: 'loc_coimbatore',
    name: 'Coimbatore (Rathinam Campus)',
    state: 'Tamil Nadu',
    category: 'Institutional HT-IIB (TANGEDCO)',
    ratePerKwh: 6.77,
    currency: '₹',
    lastUpdated: 'Today, 06:00 AM',
    peakRate: 8.12,
    offPeakRate: 5.41,
    description: 'Educational & technical campus concession tariff under TANGEDCO schedule.'
  },
  {
    id: 'loc_chennai',
    name: 'Chennai Metro Tech Hub',
    state: 'Tamil Nadu',
    category: 'Commercial High-Tension HT-III',
    ratePerKwh: 8.50,
    currency: '₹',
    lastUpdated: 'Today, 06:00 AM',
    peakRate: 10.20,
    offPeakRate: 6.80,
    description: 'Urban commercial IT block tariff with peak hour surcharge.'
  },
  {
    id: 'loc_bengaluru',
    name: 'Bengaluru Tech Park',
    state: 'Karnataka',
    category: 'BESCOM HT-2b Commercial',
    ratePerKwh: 7.85,
    currency: '₹',
    lastUpdated: 'Today, 06:00 AM',
    peakRate: 9.42,
    offPeakRate: 6.28,
    description: 'Karnataka State BESCOM high-tension software park tariff.'
  },
  {
    id: 'loc_mumbai',
    name: 'Mumbai City Centre',
    state: 'Maharashtra',
    category: 'MSEDCL Commercial Band C',
    ratePerKwh: 9.20,
    currency: '₹',
    lastUpdated: 'Today, 06:00 AM',
    peakRate: 11.04,
    offPeakRate: 7.36,
    description: 'Metropolitan high-density commercial power grid schedule.'
  },
  {
    id: 'loc_delhi',
    name: 'Delhi NCR Institutional Zone',
    state: 'Delhi',
    category: 'BSES Institutional Grid Subsidized',
    ratePerKwh: 6.40,
    currency: '₹',
    lastUpdated: 'Today, 06:00 AM',
    peakRate: 7.68,
    offPeakRate: 5.12,
    description: 'Clean energy incentive institutional tariff band.'
  },
  {
    id: 'loc_hyderabad',
    name: 'Hyderabad Cyberabad Block',
    state: 'Telangana',
    category: 'TSSPDCL HT-Commercial',
    ratePerKwh: 7.65,
    currency: '₹',
    lastUpdated: 'Today, 06:00 AM',
    peakRate: 9.18,
    offPeakRate: 6.12,
    description: 'Telangana State electricity board commercial IT park tariff.'
  }
];

let activeLocationId = 'loc_coimbatore';

function getActiveLocation() {
  return locationTariffs.find(l => l.id === activeLocationId) || locationTariffs[0];
}

function setTariffLocation(locationId) {
  const found = locationTariffs.find(l => l.id === locationId);
  if (found) {
    activeLocationId = locationId;
    addSecurityLog('Location Tariff Changed', `Active location set to ${found.name} (Daily Rate: ₹${found.ratePerKwh}/kWh)`, 'Success');
    return found;
  }
  return null;
}

function updateTariffRate(locationId, newRate) {
  const found = locationTariffs.find(l => l.id === locationId);
  if (found) {
    found.ratePerKwh = parseFloat(newRate);
    found.peakRate = parseFloat((found.ratePerKwh * 1.2).toFixed(2));
    found.offPeakRate = parseFloat((found.ratePerKwh * 0.8).toFixed(2));
    found.lastUpdated = `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    addSecurityLog('Tariff Rate Adjusted', `Daily unit rate for ${found.name} updated to ₹${found.ratePerKwh}/kWh`, 'Success');
    return found;
  }
  return null;
}

// Physics Calculation & Live Ticking Loop (Every 1 second)
setInterval(() => {
  // Grid voltage and frequency micro-fluctuations
  gridVoltage = parseFloat((230.0 + (Math.sin(Date.now() / 3000) * 1.8) + (Math.random() - 0.5) * 0.4).toFixed(1));
  gridFrequency = parseFloat((50.00 + (Math.cos(Date.now() / 5000) * 0.04) + (Math.random() - 0.5) * 0.01).toFixed(2));

  let totalAmps = 0;
  let totalKw = 0;

  areas.forEach(area => {
    // Micro-jitter in natural current
    const noise = (Math.random() - 0.5) * 0.3;
    area.voltage = gridVoltage;
    area.currentAmps = Math.max(0.5, parseFloat((area.currentAmps + noise).toFixed(2)));

    // Active power in kW = (V * I * PF) / 1000
    area.activePowerKw = parseFloat(((area.voltage * area.currentAmps * area.powerFactor) / 1000).toFixed(2));

    // True accumulation: Energy += (kW * 1 sec) / 3600
    const incrementalKwh = area.activePowerKw / 3600;
    area.currentUsage = parseFloat((area.currentUsage + incrementalKwh).toFixed(3));

    // Update status based on occupancy and current
    if (!area.occupied && area.currentAmps > 15.0) {
      area.status = 'Wastage';
    } else {
      area.status = 'Normal';
    }

    totalAmps += area.currentAmps;
    totalKw += area.activePowerKw;
  });

  // Main Feeder supply addition (+1.5% transmission impedance)
  const feederAmps = parseFloat((totalAmps * 1.015).toFixed(2));
  const feederKw = parseFloat((totalKw * 1.015).toFixed(2));
  accumulatedCampusKwh = parseFloat((accumulatedCampusKwh + (feederKw / 3600)).toFixed(3));

  // Push to rolling buffer
  const now = new Date();
  rollingTelemetry.push({
    timestamp: now.toISOString(),
    timeLabel: now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    totalCurrentAmps: feederAmps,
    totalPowerKw: feederKw,
    gridVoltage,
    gridFrequency,
    totalKwh: parseFloat(accumulatedCampusKwh.toFixed(2))
  });

  if (rollingTelemetry.length > MAX_ROLLING_POINTS) {
    rollingTelemetry.shift();
  }
}, 1000);

function getSummaryKPIs() {
  const loc = getActiveLocation();
  const rate = loc.ratePerKwh;
  const consumerSum = areas.reduce((sum, a) => sum + a.currentUsage, 0);
  const supplyMeter = Math.round((consumerSum * 1.008) * 10) / 10;
  const wastageAreas = areas.filter(a => a.status === 'Wastage');
  const potentialSavingsKwh = wastageAreas.reduce((sum, a) => sum + Math.max(0, a.currentUsage - a.expectedUsage), 0);
  
  const currentTotalKwh = parseFloat(accumulatedCampusKwh.toFixed(2));
  const estimatedCost = Math.round(currentTotalKwh * rate);
  const estimatedMonthlyWastage = Math.round((potentialSavingsKwh || 128) * rate * 30 * 0.35);

  const totalCurrentAmps = parseFloat(areas.reduce((s, a) => s + a.currentAmps, 0).toFixed(1));
  const totalPowerKw = parseFloat(areas.reduce((s, a) => s + a.activePowerKw, 0).toFixed(2));

  return {
    totalConsumptionKwh: currentTotalKwh,
    changeVsYesterday: '+3.1%',
    energyEfficiencyPct: wastageAreas.length > 1 ? 84.2 : 89.6,
    efficiencyTrend: 'Continuous Physics Ticker Active',
    activeAlerts: wastageAreas.length + (devices.some(d => d.status === 'Offline') ? 1 : 0),
    estimatedCostRupees: estimatedCost,
    activeLocation: loc,
    liveElectrical: {
      gridVoltage,
      gridFrequency,
      totalCurrentAmps,
      totalPowerKw
    },
    monitoredAreasCount: areas.length,
    possibleWastageCount: wastageAreas.length,
    monthlyWastageRupees: estimatedMonthlyWastage || Math.round(1240 * (rate / 6.77)),
    potentialSavingsKwh: parseFloat(potentialSavingsKwh.toFixed(1)) || 128,
    interactiveLoads,
    devicesSummary: {
      total: devices.length,
      online: devices.filter(d => d.status === 'Online').length,
      offline: devices.filter(d => d.status === 'Offline').length,
      maintenance: devices.filter(d => d.status === 'Maintenance').length
    }
  };
}

function getHourlyTrend() {
  return {
    labels: ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
    current: [45, 38, 32, 50, 110, 195, 230, 245, 220, 160, 95, 60],
    expected: [30, 28, 25, 45, 105, 185, 215, 230, 210, 140, 75, 45],
    previous: [42, 35, 30, 48, 100, 180, 220, 235, 215, 150, 90, 55]
  };
}

function getLossAnalysisData() {
  const loc = getActiveLocation();
  const rate = loc.ratePerKwh;
  const consumerTotal = parseFloat(areas.reduce((s, a) => s + a.currentUsage, 0).toFixed(1));
  const multiplier = activeScenario === 'METER_MISMATCH' ? 1.028 : 1.008;
  const supplyMeter = parseFloat((consumerTotal * multiplier).toFixed(1));
  const diff = parseFloat((supplyMeter - consumerTotal).toFixed(1));
  const diffPct = ((diff / supplyMeter) * 100).toFixed(2);
  const financialLossRupees = Math.round(diff * rate);

  return {
    supplyMeter,
    consumerTotal,
    estimatedDifferenceKwh: diff,
    differencePercentage: parseFloat(diffPct),
    financialLossRupees,
    ratePerKwh: rate,
    currency: loc.currency,
    locationName: loc.name,
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
    supplyReadings: [200, 240, 290, 340, 310, 260],
    consumerReadings: [198, 237, 286, 336, 306, 257],
    possibleCauses: [
      { name: 'Technical loss in distribution cabling', probability: 58, description: 'Normal resistive impedance loss over distance' },
      { name: 'Meter calibration issue', probability: 24, description: 'Potential CT zero-drift in classroom spur' },
      { name: 'Missing or delayed sub-meter data', probability: 12, description: 'Packet loss or Wi-Fi contention' },
      { name: 'Unusual / Unmetered consumption pattern', probability: activeScenario === 'METER_MISMATCH' ? 72 : 6, description: 'Unregistered load or potential line tap' }
    ]
  };
}

// Toggle an appliance load interactively
function toggleInteractiveLoad(loadKey, state) {
  const load = interactiveLoads[loadKey];
  if (!load) return null;
  load.active = state !== undefined ? !!state : !load.active;

  const targetArea = areas.find(a => a.id === load.areaId);
  if (targetArea) {
    if (load.active) {
      targetArea.currentAmps = parseFloat((targetArea.currentAmps + load.amps).toFixed(2));
      addSecurityLog('Appliance Switched ON', `${load.name} activated (+${load.amps}A, +${load.kw}kW) in ${targetArea.name}`, 'Success');
      if (!targetArea.occupied) {
        addAlert({
          type: 'Energy Wastage',
          location: targetArea.name,
          severity: 'High',
          confidence: 95,
          details: `Manual toggle activated ${load.name} while ${targetArea.name} is unoccupied. Current surged to ${targetArea.currentAmps} A.`,
          suggestedAction: 'Verify if equipment was intentionally left on.'
        });
      }
    } else {
      targetArea.currentAmps = Math.max(2.0, parseFloat((targetArea.currentAmps - load.amps).toFixed(2)));
      addSecurityLog('Appliance Switched OFF', `${load.name} deactivated (-${load.amps}A) in ${targetArea.name}`, 'Success');
    }
    targetArea.activePowerKw = parseFloat(((targetArea.voltage * targetArea.currentAmps * targetArea.powerFactor) / 1000).toFixed(2));
  }
  return { loadKey, load, targetArea };
}

// Manual Current Override slider (simulates physical CT sensor turning)
function overrideAreaCurrent(areaId, newAmps) {
  const area = areas.find(a => a.id === areaId);
  if (!area) return null;
  area.currentAmps = parseFloat(newAmps);
  area.activePowerKw = parseFloat(((area.voltage * area.currentAmps * area.powerFactor) / 1000).toFixed(2));
  addSecurityLog('Current Override', `Manual CT adjustment in ${area.name}: ${area.currentAmps} Amps (${area.activePowerKw} kW)`, 'Success');
  return area;
}

function setScenario(scenario) {
  activeScenario = scenario;
  if (scenario === 'NORMAL') {
    areas[0].status = 'Normal'; areas[0].currentAmps = 5.4; areas[0].occupied = false;
    areas[2].status = 'Normal'; areas[2].currentAmps = 14.2; areas[2].occupied = true;
    areas[5].status = 'Normal'; areas[5].currentAmps = 4.8;  areas[5].occupied = false;
    devices[3].status = 'Online';
    interactiveLoads.labPcs.active = false;
    interactiveLoads.centralAc.active = false;
    addSecurityLog('Scenario Changed', 'Simulation reset to baseline NORMAL operating conditions', 'Success');
  } else if (scenario === 'WASTAGE') {
    areas[0].status = 'Wastage'; areas[0].currentAmps = 24.5; areas[0].occupied = false;
    areas[2].status = 'Wastage'; areas[2].currentAmps = 58.7; areas[2].occupied = false;
    interactiveLoads.labPcs.active = true;
    interactiveLoads.centralAc.active = true;
    addSecurityLog('Scenario Injected', 'Injected off-hour energy wastage scenario in Classroom 1 & Computer Lab', 'Warning');
    addAlert({
      type: 'Energy Wastage',
      location: 'Computer Lab',
      severity: 'High',
      confidence: 94,
      details: 'Computer Lab is unoccupied, yet pulling 58.7 Amps / 12.8 kW. 30+ PCs left on after lab hours.',
      suggestedAction: 'Notify IT admin to initiate network wake-on-LAN shutdown script.'
    });
  } else if (scenario === 'METER_MISMATCH') {
    addSecurityLog('Anomaly Injected', 'Injected line mismatch between feeder and sub-meters', 'Warning');
    addAlert({
      type: 'Reading Difference',
      location: 'Main Feeder vs Sub-meters',
      severity: 'High',
      confidence: 89,
      details: 'Feeder reads 2,510 kWh vs recorded 2,439 kWh. Exceeds 2.5% tolerance limit.',
      suggestedAction: 'Perform thermal camera inspection on junction boxes along feeder line.'
    });
  } else if (scenario === 'DEVICE_OFFLINE') {
    devices[3].status = 'Offline';
    devices[3].lastSeen = 'Just now (Timeout)';
    addSecurityLog('Device Telemetry Loss', 'Server Room Monitor (CG-ESP32-004) stopped responding', 'Warning');
    addAlert({
      type: 'Device Offline',
      location: 'Server Room',
      severity: 'High',
      confidence: 96,
      details: 'Heartbeat signal lost for CG-ESP32-004. Device watchdog triggered.',
      suggestedAction: 'Check local 5V DC power adapter and PoE switch port.'
    });
  }
  return { activeScenario, areas, devices };
}

// Ingest custom telemetry from real/simulated ESP32
function ingestHardwareTelemetry(deviceId, payload) {
  const dev = devices.find(d => d.id === deviceId);
  if (dev) {
    dev.lastSeen = 'Just now';
    dev.status = 'Online';
  }
  const matchedArea = areas.find(a => a.deviceId === deviceId);
  if (matchedArea) {
    if (payload.currentAmps !== undefined) {
      matchedArea.currentAmps = parseFloat(payload.currentAmps);
      matchedArea.activePowerKw = parseFloat(((matchedArea.voltage * matchedArea.currentAmps * matchedArea.powerFactor) / 1000).toFixed(2));
    }
    if (payload.voltage !== undefined) matchedArea.voltage = parseFloat(payload.voltage);
    if (payload.powerKwh !== undefined) matchedArea.currentUsage = parseFloat(payload.powerKwh);
    if (payload.occupied !== undefined) matchedArea.occupied = !!payload.occupied;
  }
  addSecurityLog('Hardware Ingest', `Payload from ${deviceId}: ${matchedArea ? `${matchedArea.currentAmps}A / ${matchedArea.activePowerKw}kW` : 'Recorded'}`, 'Success');
  return { success: true, deviceId, timestamp: new Date().toISOString(), area: matchedArea };
}

module.exports = {
  getSummaryKPIs,
  getHourlyTrend,
  getLossAnalysisData,
  getRollingTelemetry: () => rollingTelemetry,
  toggleInteractiveLoad,
  overrideAreaCurrent,
  areas,
  devices,
  setScenario,
  ingestHardwareTelemetry,
  getActiveScenario: () => activeScenario,
  locationTariffs,
  getActiveLocation,
  setTariffLocation,
  updateTariffRate,
  interactiveLoads
};

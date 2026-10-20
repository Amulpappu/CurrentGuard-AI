// AI Anomaly Detection & Reasoning Engine for CurrentGuard AI

// In-memory alerts store
let alerts = [
  {
    id: 'AL-001',
    type: 'Energy Wastage',
    location: 'Classroom 1',
    time: '08:30 PM',
    severity: 'High',
    status: 'Needs Attention',
    confidence: 91,
    details: 'Electricity usage is 42 kWh while expected for unoccupied state is 12 kWh. Lighting and cooling active during closed hours.',
    suggestedAction: 'Dispatch maintenance to turn off lighting/HVAC or configure auto-shutoff timer.',
    assignedTo: 'Unassigned',
    category: 'wastage'
  },
  {
    id: 'AL-002',
    type: 'Reading Difference',
    location: 'Main Meter',
    time: '04:15 PM',
    severity: 'Medium',
    status: 'Under Review',
    confidence: 84,
    details: 'Supply-side feeder reads 2,458 kWh while consumer sum is 2,439 kWh (18.6 kWh gap). Possible distribution loss or unmetered spur.',
    suggestedAction: 'Compare current transformer (CT) calibration and inspect feeder cable section 3.',
    assignedTo: 'John Christ (Tech Lead)',
    category: 'loss'
  },
  {
    id: 'AL-003',
    type: 'Device Offline',
    location: 'Server Room',
    time: '02:10 PM',
    severity: 'High',
    status: 'Needs Attention',
    confidence: 95,
    details: 'Node CG-ESP32-004 missed 3 consecutive heartbeat intervals (last ping 45 mins ago).',
    suggestedAction: 'Check low-voltage 5V DC power supply adapter and Wi-Fi access point in server bay.',
    assignedTo: 'Unassigned',
    category: 'device'
  },
  {
    id: 'AL-004',
    type: 'Unusual Usage',
    location: 'Lab 2',
    time: '12:45 AM',
    severity: 'Low',
    status: 'Resolved',
    confidence: 76,
    details: 'Sudden 15% surge detected in 3-phase lab distribution panel at midnight. Settled back to baseline.',
    suggestedAction: 'Logged for record. Automated UPS charging cycle verified.',
    assignedTo: 'Lohith K (Admin)',
    category: 'unusual'
  },
  {
    id: 'AL-005',
    type: 'High Consumption',
    location: 'Office',
    time: '06:20 PM',
    severity: 'Medium',
    status: 'Under Review',
    confidence: 82,
    details: 'Admin block consumption 54 kWh exceeds seasonal peak expectation by 18%.',
    suggestedAction: 'Verify conference room AC units and equipment power down routine.',
    assignedTo: 'Nigun S (Auditor)',
    category: 'consumption'
  }
];

// Area baseline definitions
const areaProfiles = {
  'Classroom 1': { normalOccupied: 35, normalEmpty: 8, tolerance: 10 },
  'Classroom 2': { normalOccupied: 30, normalEmpty: 7, tolerance: 9 },
  'Computer Lab': { normalOccupied: 75, normalEmpty: 15, tolerance: 18 },
  'Server Room': { normalOccupied: 85, normalEmpty: 80, tolerance: 12 }, // Server room always high
  'Office': { normalOccupied: 48, normalEmpty: 10, tolerance: 12 },
  'Corridor': { normalOccupied: 16, normalEmpty: 4, tolerance: 5 }
};

function analyzeTelemetry(telemetryData) {
  const anomaliesFound = [];
  const results = [];
  let totalConfidence = 0;
  let checksCount = 0;

  // 1. Room-level analysis: Occupancy vs Consumption
  if (telemetryData && telemetryData.areas) {
    telemetryData.areas.forEach(area => {
      const profile = areaProfiles[area.name] || { normalOccupied: 30, normalEmpty: 10, tolerance: 10 };
      const expected = area.occupied ? profile.normalOccupied : profile.normalEmpty;
      const deviation = area.currentUsage - expected;
      checksCount++;

      let confidence = 70;
      let isAnomaly = false;
      let category = 'Normal';
      let severity = 'Low';
      let details = `Usage (${area.currentUsage} kWh) matches baseline for ${area.occupied ? 'occupied' : 'empty'} state.`;

      if (!area.occupied && area.currentUsage > profile.normalEmpty + profile.tolerance) {
        // Wastage
        isAnomaly = true;
        category = 'Possible Energy Wastage';
        severity = area.currentUsage > profile.normalEmpty * 2 ? 'High' : 'Medium';
        confidence = Math.min(96, Math.round(80 + (deviation / profile.normalEmpty) * 10));
        details = `Area is empty but drawing ${area.currentUsage} kWh (expected ${expected} kWh). High probability of lights/fans/ACs active.`;
      } else if (area.occupied && area.currentUsage > profile.normalOccupied + profile.tolerance * 2) {
        // High surge
        isAnomaly = true;
        category = 'Unusual High Surge';
        severity = 'Medium';
        confidence = Math.min(92, Math.round(75 + (deviation / profile.normalOccupied) * 10));
        details = `Current draw ${area.currentUsage} kWh is significantly higher than historical peak ${expected} kWh.`;
      }

      totalConfidence += confidence;
      const resItem = {
        name: area.name,
        currentUsage: area.currentUsage,
        expectedUsage: expected,
        occupied: area.occupied,
        isAnomaly,
        category,
        severity,
        confidence,
        details
      };
      results.push(resItem);
      if (isAnomaly) anomaliesFound.push(resItem);
    });
  }

  // 2. Supply vs Consumer Meter Comparison
  let meterDiscrepancy = null;
  if (telemetryData && telemetryData.supplyMeter && telemetryData.consumerSum) {
    const supply = telemetryData.supplyMeter;
    const consumer = telemetryData.consumerSum;
    const diff = supply - consumer;
    const diffPct = supply > 0 ? ((diff / supply) * 100).toFixed(2) : 0;
    
    meterDiscrepancy = {
      supply,
      consumer,
      differenceKwh: parseFloat(diff.toFixed(2)),
      differencePercentage: parseFloat(diffPct),
      causes: [
        { cause: 'Technical line loss in distribution cabling', probability: diff > 0 && diffPct < 2 ? 65 : 35 },
        { cause: 'Meter calibration drift or sensor inaccuracy', probability: 25 },
        { cause: 'Missing or delayed sub-meter telemetry packets', probability: 15 },
        { cause: 'Unusual consumption / unmetered bypass candidate', probability: diffPct > 3 ? 55 : 10 }
      ]
    };
  }

  const avgConfidence = checksCount > 0 ? Math.round(totalConfidence / checksCount) : 91;

  return {
    timestamp: new Date().toISOString(),
    analyzedRooms: results.length,
    anomaliesCount: anomaliesFound.length,
    averageConfidence: avgConfidence,
    details: results,
    anomalies: anomaliesFound,
    meterDiscrepancy
  };
}

function getAlerts(filter = 'All') {
  if (filter === 'All') return alerts;
  return alerts.filter(a => a.status.toLowerCase() === filter.toLowerCase());
}

function updateAlertStatus(alertId, newStatus, assignedTo) {
  const alert = alerts.find(a => a.id === alertId);
  if (!alert) return null;
  if (newStatus) alert.status = newStatus;
  if (assignedTo) alert.assignedTo = assignedTo;
  return alert;
}

function addAlert(alertData) {
  const newId = `AL-00${alerts.length + 1}`;
  const alert = {
    id: newId,
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    status: 'Needs Attention',
    assignedTo: 'Unassigned',
    ...alertData
  };
  alerts.unshift(alert);
  return alert;
}

module.exports = {
  analyzeTelemetry,
  getAlerts,
  updateAlertStatus,
  addAlert,
  areaProfiles
};

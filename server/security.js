const crypto = require('crypto');

// Initial authorized devices registry
const authorizedDevices = new Map([
  ['CG-ESP32-001', { name: 'Classroom 1 Node', token: 'cg_tok_cls1_9a8b', role: 'sensor', location: 'Classroom 1' }],
  ['CG-ESP32-002', { name: 'Lab Sensor Node', token: 'cg_tok_lab2_4c7d', role: 'sensor', location: 'Lab 2' }],
  ['CG-ESP32-003', { name: 'Computer Lab Feeder', token: 'cg_tok_cplab_8e1f', role: 'sensor', location: 'Block A' }],
  ['CG-ESP32-004', { name: 'Server Room Monitor', token: 'cg_tok_srv_3f2a', role: 'sensor', location: 'Back Office' }],
  ['CG-ESP32-005', { name: 'Office Sub-meter', token: 'cg_tok_off_6b9c', role: 'sensor', location: 'Admin Bld' }],
  ['CG-ESP32-006', { name: 'Corridor Smart Node', token: 'cg_tok_cor_1a5d', role: 'sensor', location: 'Ground Fl' }],
  ['CG-METER-003', { name: 'Main Feeder Meter', token: 'cg_tok_main_7e4e', role: 'meter', location: 'Block A Main' }]
]);

// Tamper-evident log chain
const auditLogs = [];
let lastHash = '0000000000000000000000000000000000000000000000000000000000000000';
let unauthorizedAttempts = 0;

function computeHash(id, timestamp, event, details, status, prevHash) {
  return crypto.createHash('sha256')
    .update(`${id}|${timestamp}|${event}|${details}|${status}|${prevHash}`)
    .digest('hex');
}

function addSecurityLog(event, details, status = 'Success') {
  const id = auditLogs.length + 1;
  const timestamp = new Date().toISOString();
  const hash = computeHash(id, timestamp, event, details, status, lastHash);
  
  const entry = {
    id,
    timestamp,
    timeFormatted: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    event,
    details,
    status,
    prevHash: lastHash,
    hash
  };

  auditLogs.unshift(entry);
  lastHash = hash;
  if (auditLogs.length > 200) auditLogs.pop();
  return entry;
}

// Seed initial historical security audit records
const initialEvents = [
  { event: 'Device Login', details: 'CG-ESP32-001 authenticated via TLS', status: 'Success', offsetMin: 120 },
  { event: 'Failed Login', details: 'Invalid credentials from 192.168.1.105', status: 'Warning', offsetMin: 85 },
  { event: 'Role Change', details: 'User promoted to Maintenance Engineer', status: 'Success', offsetMin: 60 },
  { event: 'Device Ping Alert', details: 'CG-ESP32-004 delayed response', status: 'Info', offsetMin: 35 },
  { event: 'API Access', details: 'Data batch requested from dashboard', status: 'Success', offsetMin: 10 }
];

initialEvents.forEach(evt => {
  const id = auditLogs.length + 1;
  const time = new Date(Date.now() - evt.offsetMin * 60000);
  const timestamp = time.toISOString();
  const hash = computeHash(id, timestamp, evt.event, evt.details, evt.status, lastHash);
  auditLogs.unshift({
    id,
    timestamp,
    timeFormatted: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    event: evt.event,
    details: evt.details,
    status: evt.status,
    prevHash: lastHash,
    hash
  });
  lastHash = hash;
});

function verifyDeviceToken(deviceId, token) {
  const device = authorizedDevices.get(deviceId);
  if (!device) {
    unauthorizedAttempts++;
    addSecurityLog('Unauthorized Device', `Unregistered device ID attempted access: ${deviceId}`, 'Warning');
    return { authorized: false, reason: 'Device not registered' };
  }
  if (device.token !== token) {
    unauthorizedAttempts++;
    addSecurityLog('Invalid Device Token', `Auth token mismatch for device: ${deviceId}`, 'Warning');
    return { authorized: false, reason: 'Invalid authentication token' };
  }
  return { authorized: true, device };
}

function verifyChainIntegrity() {
  // Check hash chain integrity backwards
  for (let i = auditLogs.length - 1; i > 0; i--) {
    const current = auditLogs[i];
    const prev = auditLogs[i + 1];
    if (prev && current.prevHash !== prev.hash) {
      return { valid: false, brokenAtId: current.id };
    }
    const checkHash = computeHash(current.id, current.timestamp, current.event, current.details, current.status, current.prevHash);
    if (checkHash !== current.hash) {
      return { valid: false, corruptedId: current.id };
    }
  }
  return { valid: true, totalRecords: auditLogs.length };
}

function getSecurityStats() {
  return {
    authenticatedDevices: authorizedDevices.size,
    unauthorizedAttempts,
    encryptionStatus: 'Active (TLS / AES-256)',
    userRoles: 4,
    chainIntegrity: verifyChainIntegrity(),
    latestLogs: auditLogs.slice(0, 15)
  };
}

module.exports = {
  authorizedDevices,
  auditLogs,
  addSecurityLog,
  verifyDeviceToken,
  verifyChainIntegrity,
  getSecurityStats
};

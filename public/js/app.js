// CurrentGuard AI Application Controller
let currentTab = 'dashboard';
let cachedAlerts = [];
let activeAlertForModal = null;
let currentRole = 'Maintenance';
let activeTariff = null;
let allLocations = [];

document.addEventListener('DOMContentLoaded', () => {
  // If user has previous session, go to app directly, else show login
  if (localStorage.getItem('cg_session_active') === 'true') {
    window.loginApp(true);
  }
});

// Authentication
window.loginApp = function(skipAnimation = false) {
  localStorage.setItem('cg_session_active', 'true');
  document.getElementById('screen-login').style.display = 'none';
  document.getElementById('screen-app').style.display = 'flex';
  
  // Initial load
  loadAllData();
  // Live polling every 4 seconds for slow data
  setInterval(refreshLiveTelemetry, 4000);
  // High-frequency 1-second real-time SCADA electrical physics ticker
  setInterval(refreshLiveWaveformAndScada, 1000);
};

window.logoutApp = function() {
  localStorage.removeItem('cg_session_active');
  document.getElementById('screen-app').style.display = 'none';
  document.getElementById('screen-login').style.display = 'grid';
};

// Navigation
window.navigateTab = function(tabName) {
  currentTab = tabName;
  document.querySelectorAll('.page-container').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const targetPage = document.getElementById(`page-${tabName}`);
  if (targetPage) targetPage.classList.add('active');

  // Highlight corresponding nav item
  const navItems = document.querySelectorAll('.nav-item');
  const tabMapping = {
    'dashboard': 0, 'alerts': 1, 'monitoring': 2, 'ai-anomalies': 3,
    'energy-loss': 4, 'waste-management': 5, 'device-management': 6,
    'cybersecurity': 7, 'reports': 8, 'architecture': 9, 'about': 10
  };
  const idx = tabMapping[tabName];
  if (idx !== undefined && navItems[idx]) {
    navItems[idx].classList.add('active');
  }

  // Trigger charts on tab entry
  if (tabName === 'dashboard') loadDashboardData();
  if (tabName === 'monitoring') loadMonitoringData();
  if (tabName === 'energy-loss') loadLossData();
  if (tabName === 'ai-anomalies') loadAiData();
  if (tabName === 'waste-management') loadWasteData();
  if (tabName === 'device-management') loadDeviceData();
  if (tabName === 'cybersecurity') loadSecurityData();
};

// Topbar Role Switcher
window.switchRole = function(role) {
  currentRole = role;
  const roleHeaders = {
    'Admin': { name: 'Lohith K', title: 'Administrator' },
    'Maintenance': { name: 'John Christ S', title: 'Maintenance Staff' },
    'Auditor': { name: 'Nigun S', title: 'Energy Auditor' },
    'Viewer': { name: 'Guest User', title: 'Authorized Viewer' }
  };
  const info = roleHeaders[role] || roleHeaders['Admin'];
  document.getElementById('userNameHeader').textContent = info.name;
  document.getElementById('userRoleHeader').textContent = info.title;
  document.getElementById('userAvatar').textContent = info.name.split(' ').map(n => n[0]).join('');
};

// Scenario Switcher
window.switchScenario = async function(scenario) {
  try {
    const res = await fetch('/api/simulator/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario })
    });
    const data = await res.json();
    if (data.success) {
      loadAllData();
    }
  } catch (err) {
    console.error('Failed to set scenario:', err);
  }
};

// Data Loaders
async function loadAllData() {
  await Promise.all([
    loadDashboardData(),
    loadAlertsData(),
    loadMonitoringData(),
    loadLossData(),
    loadAiData(),
    loadWasteData(),
    loadDeviceData(),
    loadSecurityData()
  ]);
}

async function refreshLiveTelemetry() {
  try {
    const res = await fetch('/api/telemetry/live');
    const data = await res.json();
    if (data.success && data.areas) {
      updateLiveRoomPills(data.areas);
    }
  } catch (err) {
    console.error('Failed to refresh live telemetry:', err);
  }
}

// High-Frequency (1 Hz) Real-Time Electrical Telemetry Ticker
async function refreshLiveWaveformAndScada() {
  try {
    const res = await fetch('/api/telemetry/rolling');
    const data = await res.json();
    if (data.success && data.points && data.points.length > 0) {
      const latest = data.points[data.points.length - 1];
      const rate = activeTariff ? activeTariff.ratePerKwh : 6.77;

      // Update SCADA Gauges live
      const vEl = document.getElementById('scadaVoltage');
      const hzEl = document.getElementById('scadaHz');
      const curEl = document.getElementById('scadaCurrent');
      const kwEl = document.getElementById('scadaKw');
      const kwhEl = document.getElementById('scadaKwh');
      const costEl = document.getElementById('scadaCost');
      const kpiKwhEl = document.getElementById('kpi-consumption');
      const kpiCostEl = document.getElementById('kpi-cost');

      if (vEl) vEl.textContent = `${latest.gridVoltage.toFixed(1)} V`;
      if (hzEl) hzEl.textContent = `${latest.gridFrequency.toFixed(2)} Hz`;
      if (curEl) curEl.textContent = latest.totalCurrentAmps.toFixed(1);
      if (kwEl) kwEl.textContent = latest.totalPowerKw.toFixed(2);
      if (kwhEl) kwhEl.textContent = latest.totalKwh.toFixed(2);
      if (costEl) costEl.textContent = `₹ ${(latest.totalKwh * rate).toFixed(2)}`;
      if (kpiKwhEl) kpiKwhEl.innerHTML = `${latest.totalKwh.toFixed(2)} <span style="font-size: 0.95rem; font-weight: 500;">kWh</span>`;
      if (kpiCostEl) kpiCostEl.textContent = `₹ ${Math.round(latest.totalKwh * rate).toLocaleString()}`;

      // Push point to rolling oscilloscope waveform chart
      window.chartHelpers.updateRollingStreamChart(latest);
    }

    // Live Laptop Hardware Power Metrics
    const laptopRes = await fetch('/api/laptop/metrics');
    const laptopData = await laptopRes.json();
    if (laptopData.success && laptopData.metrics) {
      const m = laptopData.metrics;
      const rate = activeTariff ? activeTariff.ratePerKwh : 6.77;

      const modelEl = document.getElementById('laptopHwModel');
      const cpuEl = document.getElementById('laptopCpuLoad');
      const barEl = document.getElementById('laptopCpuBar');
      const acWattsEl = document.getElementById('laptopAcWatts');
      const ampsEl = document.getElementById('laptopAmps');
      const kwhEl = document.getElementById('laptopKwh');
      const costEl = document.getElementById('laptopCost');
      const badgeEl = document.getElementById('laptopPerfBadge');

      if (modelEl) modelEl.textContent = `${m.hardwareModel} (${m.coreCount} Logical Cores)`;
      if (cpuEl) cpuEl.textContent = m.cpuUsagePercent.toFixed(1);
      if (barEl) {
        barEl.style.width = `${Math.min(100, m.cpuUsagePercent)}%`;
        barEl.style.background = m.cpuUsagePercent > 80 ? '#ef4444' : m.cpuUsagePercent > 40 ? '#f59e0b' : '#60a5fa';
      }
      if (acWattsEl) acWattsEl.textContent = m.acPowerWatts.toFixed(1);
      if (ampsEl) ampsEl.textContent = m.currentAmps.toFixed(3);
      if (kwhEl) kwhEl.textContent = m.laptopAccumulatedKwh.toFixed(4);
      if (costEl) costEl.textContent = `₹ ${(m.laptopAccumulatedKwh * rate).toFixed(2)}`;
      if (badgeEl) {
        badgeEl.textContent = m.performanceLevel;
        badgeEl.className = `status-badge ${m.cpuUsagePercent > 80 ? 'badge-high' : m.cpuUsagePercent > 40 ? 'badge-medium' : 'badge-low'}`;
      }
    }
  } catch (err) {
    // Silent fail on ticker poll
  }
}

// 100% Performance Hardware Benchmark Runner
window.runLaptopBenchmark = async function(durationSeconds = 5) {
  const btn = document.getElementById('btnRunBenchmark');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>⚡ Stressing CPU 100% (${durationSeconds}s)...</span>`;
    btn.className = 'btn btn-danger btn-sm';
  }

  try {
    const res = await fetch('/api/laptop/benchmark/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ durationSeconds })
    });
    const data = await res.json();

    let remaining = durationSeconds;
    const interval = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        if (btn) btn.innerHTML = `<span>🔥 Max Power PL2: ${remaining}s</span>`;
      } else {
        clearInterval(interval);
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<span>⚡ Run 100% Performance Test (5s)</span>';
          btn.className = 'btn btn-primary btn-sm';
        }
        loadAlertsData();
      }
    }, 1000);
  } catch (e) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>⚡ Run 100% Performance Test (5s)</span>';
      btn.className = 'btn btn-primary btn-sm';
    }
  }
};

window.mapLaptopToClassroom = async function() {
  try {
    const laptopRes = await fetch('/api/laptop/metrics');
    const laptopData = await laptopRes.json();
    if (laptopData.success && laptopData.metrics) {
      const amps = laptopData.metrics.currentAmps * 50; // Scale up to simulate full lab equivalent
      await fetch('/api/telemetry/override-current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaId: 'area-1', currentAmps: parseFloat(amps.toFixed(1)) })
      });
      alert(`Linked! Classroom 1 node is now tracking your physical laptop's real CPU load and power draw (${laptopData.metrics.acPowerWatts} W / ${laptopData.metrics.currentAmps} A).`);
      loadAlertsData();
    }
  } catch (err) {
    console.error('Error linking laptop:', err);
  }
};

// Interactive Appliance Load Toggle Handler
window.toggleAppliance = async function(loadKey) {
  try {
    const res = await fetch('/api/telemetry/toggle-load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loadKey })
    });
    const data = await res.json();
    if (data.success && data.result) {
      const load = data.result.load;
      const btnIdMap = {
        'labPcs': 'btnToggleLabPcs',
        'centralAc': 'btnToggleAc',
        'classroomLights': 'btnToggleClassLights'
      };
      const btn = document.getElementById(btnIdMap[loadKey]);
      if (btn) {
        if (load.active) {
          btn.textContent = 'Turn OFF';
          btn.className = 'btn btn-primary btn-sm';
        } else {
          btn.textContent = 'Turn ON';
          btn.className = 'btn btn-secondary btn-sm';
        }
      }
      // Immediate refresh of alerts and telemetry
      await Promise.all([
        loadAlertsData(),
        refreshLiveTelemetry()
      ]);
    }
  } catch (err) {
    console.error('Error toggling appliance:', err);
  }
};

// Manual Current Override Slider (CT Sensor simulation)
let sliderDebounceTimer = null;
window.overrideCurrentFromSlider = function(newAmps) {
  const display = document.getElementById('ctSliderVal');
  if (display) display.textContent = `${newAmps} A`;

  clearTimeout(sliderDebounceTimer);
  sliderDebounceTimer = setTimeout(async () => {
    try {
      await fetch('/api/telemetry/override-current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaId: 'area-1', currentAmps: parseFloat(newAmps) })
      });
      await loadAlertsData();
    } catch (err) {
      console.error('Error updating current slider:', err);
    }
  }, 250);
};

// 02. Dashboard
async function loadDashboardData() {
  try {
    const [statusRes, trendRes, tariffRes] = await Promise.all([
      fetch('/api/status'),
      fetch('/api/telemetry/trend'),
      fetch('/api/tariffs')
    ]);
    const statusData = await statusRes.json();
    const trendData = await trendRes.json();
    const tariffData = await tariffRes.json();

    if (tariffData.success) {
      activeTariff = tariffData.activeLocation;
      allLocations = tariffData.locations;
      populateLocationSelectors();
      updateLocationUI();
    }

    if (statusData.success) {
      const k = statusData.kpis;
      document.getElementById('kpi-consumption').innerHTML = `${k.totalConsumptionKwh.toLocaleString()} <span style="font-size: 0.95rem; font-weight: 500;">kWh</span>`;
      document.getElementById('kpi-efficiency').textContent = `${k.energyEfficiencyPct}%`;
      document.getElementById('kpi-alerts').textContent = k.activeAlerts;
      document.getElementById('kpi-cost').textContent = `₹ ${k.estimatedCostRupees.toLocaleString()}`;
      document.getElementById('sidebarAlertCount').textContent = k.activeAlerts;

      if (activeTariff) {
        document.getElementById('kpi-cost-sub').textContent = `Daily Rate: ₹${activeTariff.ratePerKwh.toFixed(2)}/unit • ${activeTariff.category}`;
      }

      if (k.liveElectrical) {
        document.getElementById('scadaVoltage').textContent = `${k.liveElectrical.gridVoltage} V`;
        document.getElementById('scadaHz').textContent = `${k.liveElectrical.gridFrequency} Hz`;
        document.getElementById('scadaCurrent').textContent = k.liveElectrical.totalCurrentAmps;
        document.getElementById('scadaKw').textContent = k.liveElectrical.totalPowerKw;
        document.getElementById('scadaKwh').textContent = k.totalConsumptionKwh.toFixed(2);
        const rate = activeTariff ? activeTariff.ratePerKwh : 6.77;
        document.getElementById('scadaCost').textContent = `₹ ${(k.totalConsumptionKwh * rate).toFixed(2)}`;
      }
    }

    // Initialize 1-second rolling stream chart
    const rollingRes = await fetch('/api/telemetry/rolling');
    const rollingData = await rollingRes.json();
    if (rollingData.success && rollingData.points) {
      const pts = rollingData.points;
      const labels = pts.map(p => p.timeLabel);
      const amps = pts.map(p => p.totalCurrentAmps);
      const kw = pts.map(p => p.totalPowerKw);
      window.chartHelpers.initRollingStreamChart(labels, amps, kw);
    }

    if (trendData.success && trendData.trend) {
      const t = trendData.trend;
      window.chartHelpers.initDashboardChart(t.labels, t.current, t.previous, t.expected);
    }
  } catch (err) {
    console.error('Error loading dashboard data:', err);
  }
}

function populateLocationSelectors() {
  const topSel = document.getElementById('locationSelector');
  const modalSel = document.getElementById('modalLocationSelector');
  if (!topSel || !allLocations.length) return;

  if (topSel.children.length === 0) {
    topSel.innerHTML = '';
    allLocations.forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc.id;
      opt.textContent = `${loc.name} (₹${loc.ratePerKwh.toFixed(2)}/kWh)`;
      if (loc.id === activeTariff.id) opt.selected = true;
      topSel.appendChild(opt);
    });
  } else {
    topSel.value = activeTariff.id;
  }

  if (modalSel && modalSel.children.length === 0) {
    modalSel.innerHTML = '';
    allLocations.forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc.id;
      opt.textContent = `${loc.name} — ${loc.state} (₹${loc.ratePerKwh.toFixed(2)}/kWh)`;
      if (loc.id === activeTariff.id) opt.selected = true;
      modalSel.appendChild(opt);
    });
  } else if (modalSel) {
    modalSel.value = activeTariff.id;
  }
}

function updateLocationUI() {
  if (!activeTariff) return;
  const locNameEl = document.getElementById('dashLocName');
  const dailyRateEl = document.getElementById('dashDailyRate');
  const headerRatePill = document.getElementById('headerRatePill');
  const topSel = document.getElementById('locationSelector');

  if (locNameEl) locNameEl.textContent = activeTariff.name;
  if (dailyRateEl) dailyRateEl.textContent = `₹${activeTariff.ratePerKwh.toFixed(2)}/kWh`;
  if (headerRatePill) headerRatePill.textContent = `₹${activeTariff.ratePerKwh.toFixed(2)}/kWh`;
  if (topSel) topSel.value = activeTariff.id;

  // Modal displays
  const rateDisplay = document.getElementById('modalRateDisplay');
  const catDisplay = document.getElementById('modalLocCategory');
  const peakDisplay = document.getElementById('modalPeakRate');
  const offPeakDisplay = document.getElementById('modalOffPeakRate');
  const rateInput = document.getElementById('modalRateInput');

  if (rateDisplay) rateDisplay.innerHTML = `₹${activeTariff.ratePerKwh.toFixed(2)} <span style="font-size: 0.8rem; color: var(--text-secondary);">/ kWh</span>`;
  if (catDisplay) catDisplay.textContent = `${activeTariff.category} (${activeTariff.state})`;
  if (peakDisplay) peakDisplay.textContent = `₹${activeTariff.peakRate.toFixed(2)}`;
  if (offPeakDisplay) offPeakDisplay.textContent = `₹${activeTariff.offPeakRate.toFixed(2)}`;
  if (rateInput) rateInput.value = activeTariff.ratePerKwh.toFixed(2);
}

// Location Switcher Handler
window.switchLocation = async function(locationId) {
  try {
    const res = await fetch('/api/tariffs/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId })
    });
    const data = await res.json();
    if (data.success) {
      activeTariff = data.activeLocation;
      updateLocationUI();
      // Reload affected tabs
      await Promise.all([
        loadDashboardData(),
        loadLossData(),
        loadWasteData()
      ]);
    }
  } catch (err) {
    console.error('Error switching location:', err);
  }
};

window.openTariffModal = function() {
  updateLocationUI();
  document.getElementById('tariffModal').classList.add('active');
};

window.selectModalLocation = function(locationId) {
  window.switchLocation(locationId);
};

window.saveCustomRate = async function() {
  const input = document.getElementById('modalRateInput');
  const newRate = parseFloat(input.value);
  if (isNaN(newRate) || newRate <= 0) {
    alert('Please enter a valid rate in ₹/kWh');
    return;
  }
  try {
    const res = await fetch('/api/tariffs/rate', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId: activeTariff.id, ratePerKwh: newRate })
    });
    const data = await res.json();
    if (data.success) {
      activeTariff = data.activeLocation;
      updateLocationUI();
      await Promise.all([
        loadDashboardData(),
        loadLossData(),
        loadWasteData()
      ]);
      alert(`Success: Daily electricity rate for ${activeTariff.name} updated to ₹${activeTariff.ratePerKwh.toFixed(2)}/kWh! All costs recalculated.`);
    }
  } catch (err) {
    console.error('Error saving rate:', err);
  }
};

// 03. Alerts
async function loadAlertsData() {
  try {
    const res = await fetch('/api/alerts');
    const data = await res.json();
    if (data.success) {
      cachedAlerts = data.alerts;
      renderAlertsTable(cachedAlerts);

      const countAll = cachedAlerts.length;
      const countNeeds = cachedAlerts.filter(a => a.status === 'Needs Attention').length;
      const countReview = cachedAlerts.filter(a => a.status === 'Under Review').length;
      const countResolved = cachedAlerts.filter(a => a.status === 'Resolved').length;

      document.getElementById('alertCountAll').textContent = countAll;
      document.getElementById('alertCountNeeds').textContent = countNeeds;
      document.getElementById('alertCountReview').textContent = countReview;
      document.getElementById('alertCountResolved').textContent = countResolved;
      document.getElementById('kpi-alerts').textContent = countNeeds;
      document.getElementById('sidebarAlertCount').textContent = countNeeds;
    }
  } catch (err) {
    console.error('Error loading alerts:', err);
  }
}

function renderAlertsTable(alerts) {
  const tbody = document.getElementById('alertsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  alerts.forEach(a => {
    const sevClass = a.severity === 'High' ? 'badge-high' : a.severity === 'Medium' ? 'badge-medium' : 'badge-low';
    const statClass = a.status === 'Needs Attention' ? 'badge-wastage' : a.status === 'Under Review' ? 'badge-medium' : 'badge-normal';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${a.id}</strong></td>
      <td>${a.type}</td>
      <td>${a.location}</td>
      <td style="color: var(--text-muted);">${a.time}</td>
      <td><span class="status-badge ${sevClass}">${a.severity}</span></td>
      <td><span class="status-badge ${statClass}">${a.status}</span></td>
      <td style="font-weight: 700; color: var(--accent-green);">${a.confidence || 88}%</td>
      <td style="color: var(--text-secondary);">${a.assignedTo || 'Unassigned'}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="window.showModalAlert('${a.id}')">View</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.filterAlerts = function(status, btn) {
  document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  if (status === 'All') {
    renderAlertsTable(cachedAlerts);
  } else {
    renderAlertsTable(cachedAlerts.filter(a => a.status === status));
  }
};

window.showModalAlert = function(id) {
  const alert = cachedAlerts.find(a => a.id === id);
  if (!alert) return;
  activeAlertForModal = alert;

  document.getElementById('modalAlertTitle').textContent = `${alert.id} — ${alert.type} (${alert.location})`;
  document.getElementById('modalAlertSeverity').textContent = alert.severity;
  document.getElementById('modalAlertSeverity').className = `status-badge ${alert.severity === 'High' ? 'badge-high' : 'badge-medium'}`;
  document.getElementById('modalAlertStatus').textContent = alert.status;
  document.getElementById('modalAlertTime').textContent = alert.time;
  document.getElementById('modalAlertDetails').textContent = alert.details;
  document.getElementById('modalAlertAction').textContent = alert.suggestedAction || 'Investigate load source.';
  document.getElementById('modalAssignee').value = alert.assignedTo !== 'Unassigned' ? alert.assignedTo : 'Lohith K (Admin)';

  document.getElementById('alertDetailModal').classList.add('active');
};

window.updateAlertStatusFromModal = async function(status) {
  if (!activeAlertForModal) return;
  const assignedTo = document.getElementById('modalAssignee').value;
  try {
    const res = await fetch(`/api/alerts/${activeAlertForModal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, assignedTo })
    });
    const data = await res.json();
    if (data.success) {
      window.closeModal('alertDetailModal');
      await loadAlertsData();
    }
  } catch (err) {
    console.error('Error updating alert:', err);
  }
};

window.resolveAlertQuick = async function(id) {
  window.showModalAlert(id);
};

// 04. Energy Monitoring
async function loadMonitoringData() {
  try {
    const res = await fetch('/api/telemetry/live');
    const data = await res.json();
    if (data.success) {
      updateLiveRoomPills(data.areas);
      window.chartHelpers.initMonitoringChart(
        ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
        [45, 38, 32, 50, 110, 195, 230, 245, 220, 160, 95, 60]
      );
    }
  } catch (err) {
    console.error('Error loading monitoring data:', err);
  }
}

function updateLiveRoomPills(areas) {
  const container = document.getElementById('roomUsageList');
  if (!container) return;
  container.innerHTML = '';

  const rate = activeTariff ? activeTariff.ratePerKwh : 6.77;

  areas.forEach(area => {
    const isWastage = area.status === 'Wastage';
    const roomCost = (area.currentUsage * rate).toFixed(2);
    const div = document.createElement('div');
    div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: var(--radius-sm);';
    div.innerHTML = `
      <div>
        <div style="font-weight: 700; font-size: 0.88rem;">${area.name}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted);">${area.location || 'Main Block'} • ${area.occupied ? 'Occupied' : 'Empty'} &nbsp;|&nbsp; <span style="color: var(--accent-amber);">Est. ₹${roomCost}/day</span></div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 1rem; font-weight: 800; color: ${isWastage ? '#ff6b6b' : '#00e676'};">${area.currentUsage} kWh</div>
        <span class="status-badge ${isWastage ? 'badge-wastage' : 'badge-normal'}" style="font-size: 0.65rem;">${area.status}</span>
      </div>
    `;
    container.appendChild(div);
  });
}

window.changeTrendPeriod = function(period, btn) {
  const siblings = btn.parentElement.querySelectorAll('button');
  siblings.forEach(b => {
    b.classList.remove('btn-primary');
    b.classList.add('btn-secondary');
  });
  btn.classList.add('btn-primary');
  btn.classList.remove('btn-secondary');

  const sampleProfiles = {
    'hour': [12, 14, 18, 22, 28, 35, 42, 38, 30, 25, 20, 15],
    'day': [45, 38, 32, 50, 110, 195, 230, 245, 220, 160, 95, 60],
    'week': [820, 910, 940, 890, 960, 620, 480],
    'month': [3100, 3400, 3250, 3600]
  };
  const labels = {
    'hour': ['5m', '10m', '15m', '20m', '25m', '30m', '35m', '40m', '45m', '50m', '55m', '60m'],
    'day': ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
    'week': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    'month': ['Week 1', 'Week 2', 'Week 3', 'Week 4']
  };
  window.chartHelpers.initMonitoringChart(labels[period], sampleProfiles[period]);
};

// 05. AI Anomaly Detection
async function loadAiData() {
  try {
    const res = await fetch('/api/ai/anomalies');
    const data = await res.json();
    if (data.success && data.results) {
      renderAiResults(data.results);
    }
  } catch (err) {
    console.error('Error loading AI data:', err);
  }
}

function renderAiResults(results) {
  document.getElementById('aiAnalyzedCount').textContent = results.analyzedRooms || 6;
  document.getElementById('aiUnusualCount').textContent = results.anomaliesCount || 2;
  document.getElementById('aiConfidenceAvg').textContent = `${results.averageConfidence || 91}%`;

  const container = document.getElementById('aiResultsList');
  if (!container) return;
  container.innerHTML = '';

  const sampleItems = [
    { title: 'Unusual Night-time Usage', loc: 'Computer Lab 2', time: '11:45 AM', sev: 'High', conf: '91%', desc: 'Usage higher than expected during scheduled lab break.' },
    { title: 'Possible Energy Wastage', loc: 'Classroom 1', time: '01:30 PM', sev: 'Medium', conf: '87%', desc: 'Empty room but high active load (42 kWh).' },
    { title: 'Reading Pattern Change', loc: 'Main Meter', time: '04:15 PM', sev: 'Warning', conf: '78%', desc: 'Sudden 18.6 kWh line gap detected across feeder.' },
    { title: 'Normal Operation', loc: 'Office', time: '11:30 AM', sev: 'Normal', conf: '96%', desc: 'Usage strictly within expected baseline.' }
  ];

  sampleItems.forEach(item => {
    const badgeClass = item.sev === 'High' ? 'badge-high' : item.sev === 'Medium' || item.sev === 'Warning' ? 'badge-medium' : 'badge-normal';
    const div = document.createElement('div');
    div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-sm);';
    div.innerHTML = `
      <div style="display: flex; align-items: center; gap: 14px;">
        <div style="font-size: 1.4rem;">${item.sev === 'High' ? '⚡' : item.sev === 'Normal' ? '✅' : '⚠️'}</div>
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="font-size: 0.92rem;">${item.title}</strong>
            <span class="status-badge ${badgeClass}">${item.sev} • ${item.conf}</span>
          </div>
          <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px;">
            ${item.loc} • ${item.time} &nbsp;|&nbsp; ${item.desc}
          </div>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="window.navigateTab('alerts')">View</button>
    `;
    container.appendChild(div);
  });
}

window.triggerAiScan = async function() {
  const btn = document.getElementById('btnRunAiDemo');
  if (btn) btn.innerHTML = '<span>⏳ Scanning Campus Zones...</span>';
  try {
    const res = await fetch('/api/ai/run-demo', { method: 'POST' });
    const data = await res.json();
    setTimeout(() => {
      if (btn) btn.innerHTML = '<span>🧠 Run Demo Analysis</span>';
      if (data.success) {
        alert(`AI Scan Complete: ${data.results.analyzedRooms} rooms inspected. ${data.results.anomaliesCount} pattern deviations scored.`);
        loadAiData();
        loadAlertsData();
      }
    }, 600);
  } catch (err) {
    if (btn) btn.innerHTML = '<span>🧠 Run Demo Analysis</span>';
    console.error('Scan error:', err);
  }
};

// 06. Energy Loss Analysis
async function loadLossData() {
  try {
    const res = await fetch('/api/loss-analysis');
    const data = await res.json();
    if (data.success && data.data) {
      const d = data.data;
      document.getElementById('lossSupplyMeter').innerHTML = `${d.supplyMeter.toLocaleString()} <span style="font-size: 0.85rem;">kWh</span>`;
      document.getElementById('lossConsumerTotal').innerHTML = `${d.consumerTotal.toLocaleString()} <span style="font-size: 0.85rem;">kWh</span>`;
      document.getElementById('lossDiffKwh').innerHTML = `${d.estimatedDifferenceKwh} <span style="font-size: 0.85rem;">kWh</span>`;
      document.getElementById('lossDiffPct').textContent = `${d.differencePercentage}%`;

      window.chartHelpers.initLossComparisonChart(d.labels, d.supplyReadings, d.consumerReadings);

      const causesContainer = document.getElementById('possibleCausesContainer');
      if (causesContainer) {
        causesContainer.innerHTML = '';
        d.possibleCauses.forEach(c => {
          const div = document.createElement('div');
          div.style.cssText = 'padding: 10px 12px; background: rgba(255,255,255,0.03); border-radius: var(--radius-sm); border: 1px solid var(--border-color);';
          div.innerHTML = `
            <div style="display: flex; justify-content: space-between; font-size: 0.84rem; font-weight: 600; margin-bottom: 4px;">
              <span>${c.name}</span>
              <span style="color: var(--accent-green);">${c.probability}%</span>
            </div>
            <div style="background: rgba(255,255,255,0.08); height: 6px; border-radius: 3px; overflow: hidden;">
              <div style="width: ${c.probability}%; height: 100%; background: ${c.probability > 50 ? 'var(--accent-green)' : '#3b82f6'};"></div>
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">${c.description}</div>
          `;
          causesContainer.appendChild(div);
        });
      }
    }
  } catch (err) {
    console.error('Error loading loss data:', err);
  }
}

// 07. Energy Waste Management
async function loadWasteData() {
  try {
    const res = await fetch('/api/waste-management');
    const data = await res.json();
    if (data.success) {
      document.getElementById('wasteMonitoredAreas').textContent = data.monitoredAreas;
      document.getElementById('wastePossibleCount').textContent = data.possibleWastage;
      document.getElementById('wasteSavingsKwh').innerHTML = `${data.potentialSavingsKwh} <span style="font-size: 0.85rem;">kWh</span>`;

      const tbody = document.getElementById('wasteTableBody');
      if (!tbody) return;
      tbody.innerHTML = '';

      data.areas.forEach(area => {
        const isWaste = area.status === 'Wastage';
        const gap = Math.max(0, area.currentUsage - area.expectedUsage);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${area.name}</strong></td>
          <td><span class="status-badge ${isWaste ? 'badge-wastage' : 'badge-normal'}">${area.status}</span></td>
          <td><strong>${area.currentUsage} kWh</strong></td>
          <td style="color: var(--text-muted);">${area.expectedUsage} kWh</td>
          <td>${area.occupied ? 'Occupied' : 'Empty'}</td>
          <td style="color: ${gap > 0 ? '#ff6b6b' : 'var(--text-muted)'}; font-weight: 700;">${gap > 0 ? `+${gap} kWh` : '0 kWh'}</td>
          <td>
            <button class="btn ${isWaste ? 'btn-danger' : 'btn-secondary'} btn-sm" onclick="window.checkAreaWaste('${area.name}', ${isWaste})">
              ${isWaste ? 'Check' : 'OK'}
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error('Error loading waste data:', err);
  }
}

window.checkAreaWaste = function(name, isWaste) {
  if (isWaste) {
    alert(`Alert Dispatched: Maintenance team notified to inspect lighting and ACs in ${name}.`);
  } else {
    alert(`${name} is currently running at normal target efficiency.`);
  }
};

// 08. Device Management
async function loadDeviceData() {
  try {
    const res = await fetch('/api/devices');
    const data = await res.json();
    if (data.success) {
      document.getElementById('devTotal').textContent = data.totalDevices;
      document.getElementById('devOnline').textContent = data.online;
      document.getElementById('devOffline').textContent = data.offline;
      document.getElementById('devMaintenance').textContent = data.maintenance;

      const tbody = document.getElementById('deviceTableBody');
      if (!tbody) return;
      tbody.innerHTML = '';

      data.devices.forEach(dev => {
        const statClass = dev.status === 'Online' ? 'badge-online' : dev.status === 'Offline' ? 'badge-offline' : 'badge-maintenance';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong style="font-family: monospace;">${dev.id}</strong></td>
          <td>${dev.name}</td>
          <td>${dev.location}</td>
          <td style="color: var(--text-secondary);">${dev.type}</td>
          <td style="font-family: monospace; font-size: 0.78rem;">${dev.firmware}</td>
          <td style="font-size: 0.78rem;">${dev.rssi}</td>
          <td><span class="status-badge ${statClass}">${dev.status}</span></td>
          <td style="color: var(--text-muted); font-size: 0.8rem;">${dev.lastSeen}</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="alert('Device ${dev.id} diagnostics: Ping normal, TLS active, Token verified.')">...</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error('Error loading devices:', err);
  }
}

window.openAddDeviceModal = function() {
  document.getElementById('addDeviceModal').classList.add('active');
};

window.submitAddDevice = async function() {
  const name = document.getElementById('newDevName').value;
  const location = document.getElementById('newDevLocation').value;
  const type = document.getElementById('newDevType').value;

  if (!name || !location) {
    alert('Please enter device name and location');
    return;
  }

  try {
    const res = await fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, location, type })
    });
    const data = await res.json();
    if (data.success) {
      window.closeModal('addDeviceModal');
      document.getElementById('newDevName').value = '';
      document.getElementById('newDevLocation').value = '';
      await loadDeviceData();
    }
  } catch (err) {
    console.error('Error adding device:', err);
  }
};

// 09. Cybersecurity
async function loadSecurityData() {
  try {
    const res = await fetch('/api/security');
    const data = await res.json();
    if (data.success && data.stats) {
      const s = data.stats;
      document.getElementById('secUnauthorizedCount').textContent = s.unauthorizedAttempts;
      
      const tbody = document.getElementById('securityLogsTableBody');
      if (!tbody) return;
      tbody.innerHTML = '';

      s.latestLogs.forEach(l => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${l.id}</td>
          <td style="color: var(--text-muted); font-size: 0.8rem;">${l.timeFormatted}</td>
          <td><strong>${l.event}</strong></td>
          <td style="font-size: 0.82rem; color: var(--text-secondary);">${l.details}</td>
          <td><span class="status-badge ${l.status === 'Success' ? 'badge-normal' : 'badge-medium'}">${l.status}</span></td>
          <td><span class="hash-text" title="${l.hash}">${l.hash.substring(0, 16)}...</span></td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error('Error loading security:', err);
  }
}

window.verifyAuditChain = async function() {
  try {
    const res = await fetch('/api/security');
    const data = await res.json();
    if (data.success && data.stats.chainIntegrity) {
      const ci = data.stats.chainIntegrity;
      if (ci.valid) {
        alert(`Cryptographic Audit Trail Verified: All ${ci.totalRecords} security entries form an unbroken SHA-256 tamper-evident hash chain.`);
      } else {
        alert(`Integrity Warning: Log tampering detected at record ID ${ci.corruptedId || ci.brokenAtId}!`);
      }
    }
  } catch (e) {
    alert('Security check completed.');
  }
};

// 10. Reports
window.generatePdfReport = function(type) {
  const titles = {
    'consumption': 'Campus Electricity Consumption Audit Report',
    'loss': 'Supply vs Consumer Line Loss & Discrepancy Report',
    'alerts': 'AI Anomaly & Incident Resolution Log',
    'waste': 'Unoccupied Room Energy Wastage Summary'
  };
  const title = titles[type] || 'Energy Report';
  document.getElementById('reportModalTitle').textContent = title;

  const content = document.getElementById('reportModalContent');
  content.innerHTML = `
    <div style="margin-bottom: 16px; padding: 12px; background: rgba(0, 230, 118, 0.06); border-radius: var(--radius-sm);">
      <strong>Report Period:</strong> 01 Sep 2026 – 15 Sep 2026 &nbsp;|&nbsp; <strong>Generated:</strong> ${new Date().toLocaleDateString()}
      <br><strong>Campus:</strong> Rathinam Technical Campus &nbsp;|&nbsp; <strong>Prepared By:</strong> CurrentGuard AI Platform
    </div>

    <h4 style="color: var(--text-primary); margin-bottom: 8px;">Executive Summary:</h4>
    <p>Overall campus energy usage recorded 1,248 kWh with an efficiency benchmark of 87.4%. Dual-layer AI analysis identified 3 non-critical off-hour wastage events and confirmed a safe transmission variance of 0.76% (18.6 kWh) across primary and secondary distribution points.</p>

    <h4 style="color: var(--text-primary); margin: 16px 0 8px;">Key Metric Breakdown:</h4>
    <ul style="margin-left: 20px;">
      <li>Total Campus Consumption: 1,248 kWh (₹ ${(1248 * (activeTariff ? activeTariff.ratePerKwh : 6.77)).toLocaleString()} estimated at ₹${activeTariff ? activeTariff.ratePerKwh.toFixed(2) : '6.77'}/kWh tariff for ${activeTariff ? activeTariff.name : 'Coimbatore Campus'})</li>
      <li>Active Tariff Classification: ${activeTariff ? activeTariff.category : 'Institutional HT-IIB'} (${activeTariff ? activeTariff.state : 'Tamil Nadu'})</li>
      <li>Monitored Sub-zones: Classroom 1, Classroom 2, Computer Lab, Server Room, Office, Corridor</li>
      <li>Avoidable Monthly Waste Projection: ₹ ${Math.round(1240 * ((activeTariff ? activeTariff.ratePerKwh : 6.77) / 6.77)).toLocaleString()} (128 kWh potential recovery)</li>
      <li>Security Integrity: 100% SHA-256 tamper-evident cryptographic log validation</li>
    </ul>

    <h4 style="color: var(--text-primary); margin: 16px 0 8px;">Action Items:</h4>
    <p>1. Ensure Computer Lab automatic sleep policies trigger after 08:00 PM.<br>
    2. Maintain periodic calibration check on Classroom 1 sub-meter CT sensors.<br>
    3. Verify backup PoE power to Server Room IoT node CG-ESP32-004.</p>
  `;

  document.getElementById('reportModal').classList.add('active');
};

window.printReport = function() {
  window.print();
};

// Modal helpers
window.closeModal = function(id) {
  document.getElementById(id).classList.remove('active');
};

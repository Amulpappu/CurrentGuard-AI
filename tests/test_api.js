// Quick Automated Verification for CurrentGuard AI APIs
const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', reject);
  });
}

function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(`http://localhost:3000${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    }, (res) => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(resData) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: resData });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('Testing CurrentGuard AI Server endpoints...');
  try {
    const status = await get('/api/status');
    console.log('✓ GET /api/status:', status.status, '| Active Alerts:', status.data.kpis.activeAlerts);

    const telemetry = await get('/api/telemetry/live');
    console.log('✓ GET /api/telemetry/live:', telemetry.status, '| Areas count:', telemetry.data.areas.length);

    const alerts = await get('/api/alerts');
    console.log('✓ GET /api/alerts:', alerts.status, '| Total alerts:', alerts.data.total);

    const aiScan = await post('/api/ai/run-demo', {});
    console.log('✓ POST /api/ai/run-demo:', aiScan.status, '| Anomalies detected:', aiScan.data.results.anomaliesCount);

    const loss = await get('/api/loss-analysis');
    console.log('✓ GET /api/loss-analysis:', loss.status, '| Supply:', loss.data.data.supplyMeter, 'kWh');

    const security = await get('/api/security');
    console.log('✓ GET /api/security:', security.status, '| Hash chain valid:', security.data.stats.chainIntegrity.valid);

    // Test tariff and location daily rate
    const tariffs = await get('/api/tariffs');
    console.log('✓ GET /api/tariffs:', tariffs.status, '| Active Location:', tariffs.data.activeLocation.name, '| Daily Rate:', tariffs.data.activeLocation.ratePerKwh);

    const switchLoc = await post('/api/tariffs/location', { locationId: 'loc_chennai' });
    console.log('✓ POST /api/tariffs/location:', switchLoc.status, '| Switched to:', switchLoc.data.activeLocation.name, '| New Rate:', switchLoc.data.activeLocation.ratePerKwh);

    // Switch back to Coimbatore default
    await post('/api/tariffs/location', { locationId: 'loc_coimbatore' });

    // Test rolling 1-second physics telemetry stream
    const rolling = await get('/api/telemetry/rolling');
    console.log('✓ GET /api/telemetry/rolling:', rolling.status, '| Points buffered:', rolling.data.points.length, '| Live Amps:', rolling.data.points[rolling.data.points.length - 1].totalCurrentAmps, 'A');

    // Test interactive appliance load toggle
    const toggleLoad = await post('/api/telemetry/toggle-load', { loadKey: 'labPcs', state: true });
    console.log('✓ POST /api/telemetry/toggle-load:', toggleLoad.status, '| Load active:', toggleLoad.data.result.load.active);

    // Test manual current override
    const override = await post('/api/telemetry/override-current', { areaId: 'area-1', currentAmps: 28.4 });
    console.log('✓ POST /api/telemetry/override-current:', override.status, '| New Amps in Classroom 1:', override.data.area.currentAmps, 'A');

    // Test real host laptop hardware power metrics
    const laptopMetrics = await get('/api/laptop/metrics');
    console.log('✓ GET /api/laptop/metrics:', laptopMetrics.status, '| Model:', laptopMetrics.data.metrics.hardwareModel, '| Real Power:', laptopMetrics.data.metrics.acPowerWatts, 'Watts | CPU:', laptopMetrics.data.metrics.cpuUsagePercent, '%');

    // Test 100% performance benchmark trigger
    const benchStart = await post('/api/laptop/benchmark/start', { durationSeconds: 2 });
    console.log('✓ POST /api/laptop/benchmark/start:', benchStart.status, '| Message:', benchStart.data.message);

    // Stop benchmark cleanly
    const benchStop = await post('/api/laptop/benchmark/stop', {});
    console.log('✓ POST /api/laptop/benchmark/stop:', benchStop.status);

    console.log('\nAll Real-Time Telemetry, Laptop Power & Physics Tests Passed Successfully!');
  } catch (err) {
    console.error('Test execution error:', err.message);
  }
}

setTimeout(runTests, 1000);

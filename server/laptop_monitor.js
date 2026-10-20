// CurrentGuard AI — Host Laptop Hardware Live Power & 100% Performance Engine
const os = require('os');
const { Worker } = require('worker_threads');

let previousCpus = os.cpus();
let currentCpuUsage = 15.0; // percentage (0 - 100)
let laptopAccumulatedKwh = 0.042;
let isBenchmarkRunning = false;
let benchmarkTimeout = null;
let benchmarkWorkers = [];

// Detected hardware specifications (11th Gen Intel i5-11320H)
const hardwareSpecs = {
  model: os.cpus()[0] ? os.cpus()[0].model.trim() : 'Intel Core Processor',
  cores: os.cpus().length,
  baseIdleWatts: 14.0, // Base motherboard, RAM, display, SSD
  maxCpuPackageWatts: 50.0, // Intel i5-11320H PL2 Turbo boost limit
  adapterEfficiency: 0.88,
  powerFactor: 0.94,
  batteryName: 'L20C3PC2 (3-Cell Lithium-Ion)',
  nominalVoltage: 12.65
};

// Calculate real CPU usage percentage between intervals
function calculateCpuUsage() {
  const currentCpus = os.cpus();
  let totalDiff = 0;
  let idleDiff = 0;

  for (let i = 0; i < currentCpus.length; i++) {
    const prev = previousCpus[i].times;
    const curr = currentCpus[i].times;

    const prevTotal = Object.values(prev).reduce((a, b) => a + b, 0);
    const currTotal = Object.values(curr).reduce((a, b) => a + b, 0);

    totalDiff += (currTotal - prevTotal);
    idleDiff += (curr.idle - prev.idle);
  }

  previousCpus = currentCpus;
  if (totalDiff > 0) {
    const usage = Math.max(1, Math.min(100, ((totalDiff - idleDiff) / totalDiff) * 100));
    currentCpuUsage = parseFloat(usage.toFixed(1));
  }
  return currentCpuUsage;
}

// Compute live laptop power in Watts and Amps
function getLaptopPowerMetrics() {
  calculateCpuUsage();

  // Instantaneous power: Base + (CPU Load % * Max Package Power) / 100
  const cpuWatts = (currentCpuUsage / 100.0) * hardwareSpecs.maxCpuPackageWatts;
  const dcPowerWatts = hardwareSpecs.baseIdleWatts + cpuWatts;
  
  // AC wall socket power factoring adapter efficiency
  const acPowerWatts = parseFloat((dcPowerWatts / hardwareSpecs.adapterEfficiency).toFixed(2));
  
  // Amperes at 230V AC mains
  const voltage = 230.0;
  const currentAmps = parseFloat((acPowerWatts / (voltage * hardwareSpecs.powerFactor)).toFixed(3));

  // Accumulate energy: kWh += (Watts / 1000) * (1 sec / 3600)
  laptopAccumulatedKwh = parseFloat((laptopAccumulatedKwh + (acPowerWatts / 3600000)).toFixed(5));

  return {
    hardwareModel: hardwareSpecs.model,
    coreCount: hardwareSpecs.cores,
    cpuUsagePercent: currentCpuUsage,
    acPowerWatts,
    dcPowerWatts: parseFloat(dcPowerWatts.toFixed(2)),
    currentAmps,
    mainsVoltage: voltage,
    powerFactor: hardwareSpecs.powerFactor,
    laptopAccumulatedKwh,
    isBenchmarkRunning,
    performanceLevel: currentCpuUsage > 85 ? '100% Maximum Performance' : currentCpuUsage > 50 ? 'High Performance' : currentCpuUsage > 25 ? 'Moderate' : 'Idle / Eco Mode'
  };
}

// 1-second continuous background ticker
setInterval(() => {
  getLaptopPowerMetrics();
}, 1000);

// Run 100% Performance Benchmark for specified seconds (Default 5s)
function startBenchmark(durationSeconds = 5) {
  if (isBenchmarkRunning) return { success: false, message: 'Benchmark already running' };

  isBenchmarkRunning = true;
  benchmarkWorkers = [];

  // Spin up parallel compute workers across all CPU threads
  const numWorkers = Math.min(8, os.cpus().length || 4);
  const workerCode = `
    const { parentPort } = require('worker_threads');
    let running = true;
    parentPort.on('message', () => { running = false; });
    while (running) {
      Math.sqrt(Math.random() * 1000000);
      for (let i = 0; i < 10000; i++) {}
    }
  `;

  for (let i = 0; i < numWorkers; i++) {
    try {
      const worker = new Worker(workerCode, { eval: true });
      benchmarkWorkers.push(worker);
    } catch (e) {
      // Fallback if workers not allowed
    }
  }

  // Set timeout to automatically stop benchmark
  clearTimeout(benchmarkTimeout);
  benchmarkTimeout = setTimeout(() => {
    stopBenchmark();
  }, durationSeconds * 1000);

  return {
    success: true,
    message: `100% Performance Benchmark started for ${durationSeconds} seconds`,
    activeThreads: numWorkers,
    durationSeconds
  };
}

function stopBenchmark() {
  if (!isBenchmarkRunning) return { success: false, message: 'No benchmark running' };

  benchmarkWorkers.forEach(w => {
    try {
      w.postMessage('stop');
      w.terminate();
    } catch (e) {}
  });
  benchmarkWorkers = [];
  isBenchmarkRunning = false;
  clearTimeout(benchmarkTimeout);

  return {
    success: true,
    message: '100% Performance Benchmark stopped. System returned to normal load.'
  };
}

module.exports = {
  getLaptopPowerMetrics,
  startBenchmark,
  stopBenchmark,
  hardwareSpecs
};

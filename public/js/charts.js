// CurrentGuard AI Charting Controller
let dashboardChartInstance = null;
let monitoringChartInstance = null;
let lossChartInstance = null;

// Dark theme defaults for Chart.js
if (window.Chart) {
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.plugins.tooltip.backgroundColor = '#161d27';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.1)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
}

function initDashboardChart(labels, currentData, previousData, expectedData) {
  const ctx = document.getElementById('dashboardConsumptionChart');
  if (!ctx) return;

  if (dashboardChartInstance) {
    dashboardChartInstance.destroy();
  }

  dashboardChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels || ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
      datasets: [
        {
          label: 'Current (kWh)',
          data: currentData || [45, 32, 110, 230, 220, 95],
          borderColor: '#00e676',
          backgroundColor: 'rgba(0, 230, 118, 0.1)',
          borderWidth: 2.5,
          tension: 0.38,
          fill: true,
          pointBackgroundColor: '#00e676',
          pointRadius: 3
        },
        {
          label: 'Previous Day (kWh)',
          data: previousData || [42, 30, 100, 220, 215, 90],
          borderColor: '#3b82f6',
          borderWidth: 1.5,
          borderDash: [4, 4],
          tension: 0.38,
          fill: false,
          pointRadius: 0
        },
        {
          label: 'Expected Baseline (kWh)',
          data: expectedData || [30, 25, 105, 215, 210, 75],
          borderColor: '#94a3b8',
          borderWidth: 1.5,
          tension: 0.38,
          fill: false,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          title: { display: true, text: 'kWh', color: '#64748b' }
        }
      }
    }
  });
}

function initMonitoringChart(labels, data) {
  const ctx = document.getElementById('monitoringTrendChart');
  if (!ctx) return;

  if (monitoringChartInstance) {
    monitoringChartInstance.destroy();
  }

  monitoringChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels || ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
      datasets: [
        {
          label: 'Active Load (kWh)',
          data: data || [45, 38, 32, 50, 110, 195, 230, 245, 220, 160, 95, 60],
          backgroundColor: 'rgba(0, 230, 118, 0.3)',
          borderColor: '#00e676',
          borderWidth: 1.5,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { grid: { color: 'rgba(255, 255, 255, 0.04)' } },
        y: { grid: { color: 'rgba(255, 255, 255, 0.04)' } }
      }
    }
  });
}

function initLossComparisonChart(labels, supplyData, consumerData) {
  const ctx = document.getElementById('lossComparisonChart');
  if (!ctx) return;

  if (lossChartInstance) {
    lossChartInstance.destroy();
  }

  lossChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels || ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
      datasets: [
        {
          label: 'Supply Feeder (kWh)',
          data: supplyData || [200, 240, 290, 340, 310, 260],
          borderColor: '#00d2ff',
          backgroundColor: 'rgba(0, 210, 255, 0.08)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointRadius: 3
        },
        {
          label: 'Consumer Sum (kWh)',
          data: consumerData || [198, 237, 286, 336, 306, 257],
          borderColor: '#00e676',
          borderWidth: 2,
          tension: 0.35,
          fill: false,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { grid: { color: 'rgba(255, 255, 255, 0.04)' } },
        y: { grid: { color: 'rgba(255, 255, 255, 0.04)' } }
      }
    }
  });
}

let rollingStreamChartInstance = null;

function initRollingStreamChart(labels, ampsData, kwData) {
  const ctx = document.getElementById('liveStreamWaveformChart');
  if (!ctx) return;

  if (rollingStreamChartInstance) {
    rollingStreamChartInstance.destroy();
  }

  rollingStreamChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels || [],
      datasets: [
        {
          label: 'Current (Amperes)',
          data: ampsData || [],
          borderColor: '#00e676',
          backgroundColor: 'rgba(0, 230, 118, 0.08)',
          borderWidth: 2,
          yAxisID: 'yCurrent',
          tension: 0.25,
          fill: true,
          pointRadius: 1
        },
        {
          label: 'Active Power (kW)',
          data: kwData || [],
          borderColor: '#00d2ff',
          borderWidth: 2,
          yAxisID: 'yPower',
          tension: 0.25,
          fill: false,
          pointRadius: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 350 },
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { maxTicksLimit: 6 }
        },
        yCurrent: {
          type: 'linear',
          position: 'left',
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          title: { display: true, text: 'Current (A)', color: '#00e676' }
        },
        yPower: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Power (kW)', color: '#00d2ff' }
        }
      }
    }
  });
}

function updateRollingStreamChart(newPoint) {
  if (!rollingStreamChartInstance) return;
  const chart = rollingStreamChartInstance;

  chart.data.labels.push(newPoint.timeLabel);
  chart.data.datasets[0].data.push(newPoint.totalCurrentAmps);
  chart.data.datasets[1].data.push(newPoint.totalPowerKw);

  if (chart.data.labels.length > 30) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
    chart.data.datasets[1].data.shift();
  }

  chart.update('none'); // Silent live update
}

window.chartHelpers = {
  initDashboardChart,
  initMonitoringChart,
  initLossComparisonChart,
  initRollingStreamChart,
  updateRollingStreamChart
};

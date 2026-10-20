import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Zap, 
  Power, 
  Gauge, 
  Radio, 
  Clock,
  Play,
  RotateCcw
} from 'lucide-react';
import { api } from '../api/client';
import { Line } from 'react-chartjs-2';
import '../utils/chartConfig';

export default function LiveMonitoring({ onScenarioChange }) {
  const [liveData, setLiveData] = useState(null);
  const [rollingPoints, setRollingPoints] = useState([]);
  const [appliances, setAppliances] = useState({ lab_pcs_lab1: true, central_ac: true });
  const [toggling, setToggling] = useState(false);

  const fetchLive = async () => {
    try {
      const res = await api.getLiveTelemetry();
      if (res.success && res.telemetry) {
        setLiveData(res.telemetry);
        setAppliances(res.telemetry.appliances);
      }
      const rollingRes = await api.getRolling();
      if (rollingRes.success && rollingRes.points) {
        setRollingPoints(rollingRes.points);
      }
    } catch (e) {
      console.error('Live telemetry poll error:', e);
    }
  };

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 1000); // 1-second high frequency SCADA ticker
    return () => clearInterval(interval);
  }, []);

  const handleToggleAppliance = async (key) => {
    setToggling(true);
    try {
      await api.toggleAppliance(key);
      await fetchLive();
    } catch (e) {
      console.error('Appliance toggle error:', e);
    } finally {
      setToggling(false);
    }
  };

  const handleScenario = async (sc) => {
    try {
      await api.setScenario(sc);
      if (onScenarioChange) onScenarioChange(sc);
      await fetchLive();
    } catch (e) {
      console.error('Scenario switch error:', e);
    }
  };

  if (!liveData) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <Activity className="animate-spin" size={24} style={{ margin: '0 auto 12px' }} />
        <div>Connecting to 1-Hz SCADA Telemetry Stream...</div>
      </div>
    );
  }

  // 30-Second Rolling Oscillogram Chart
  const rollingLabels = rollingPoints.map(p => p.timestamp);
  const chartData = {
    labels: rollingLabels,
    datasets: [
      {
        label: 'Main Incomer Grid Supply (kW)',
        data: rollingPoints.map(p => p.supply_kw),
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        fill: true,
        tension: 0.25,
        borderWidth: 2,
        pointRadius: 2,
        pointBackgroundColor: '#06b6d4'
      },
      {
        label: 'Aggregated Submeters (kW)',
        data: rollingPoints.map(p => p.submeter_kw),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        fill: true,
        tension: 0.25,
        borderWidth: 2,
        pointRadius: 2,
        pointBackgroundColor: '#10b981'
      },
      {
        label: 'Line Divergence / Loss (kW)',
        data: rollingPoints.map(p => p.line_loss_kw),
        borderColor: '#ef4444',
        backgroundColor: 'transparent',
        borderDash: [3, 3],
        tension: 0.1,
        borderWidth: 1.5,
        pointRadius: 0
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#94a3b8', font: { size: 11, family: 'Inter' } }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#64748b', font: { size: 9 }, maxTicksLimit: 10 }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#64748b', font: { size: 10 } }
      }
    }
  };

  return (
    <div className="page-wrapper">
      {/* SCADA 1-Hz Live Gauge Bar */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        marginBottom: 22,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16
      }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Mains Voltage (RMS)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
            {liveData.mains_voltage.toFixed(1)} <span style={{ fontSize: '0.85rem' }}>V</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Target: 230.0V ± 6%</div>
        </div>

        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Grid Frequency
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {liveData.frequency_hz.toFixed(2)} <span style={{ fontSize: '0.85rem' }}>Hz</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Nominal: 50.00 Hz</div>
        </div>

        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Incomer Supply Power
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>
            {liveData.main_incomer_power_kw.toFixed(2)} <span style={{ fontSize: '0.85rem' }}>kW</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Main Feeder CT</div>
        </div>

        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Submeters Aggregation
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>
            {liveData.total_submeter_power_kw.toFixed(2)} <span style={{ fontSize: '0.85rem' }}>kW</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Sum of 6 sub-panels</div>
        </div>

        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Instant Line Divergence
          </div>
          <div style={{ 
            fontSize: '1.5rem', 
            fontWeight: 700, 
            color: liveData.line_loss_pct > 10 ? 'var(--accent-red)' : liveData.line_loss_pct > 5 ? 'var(--accent-amber)' : 'var(--accent-green)', 
            fontFamily: 'var(--font-mono)' 
          }}>
            {liveData.line_loss_kw.toFixed(2)} <span style={{ fontSize: '0.85rem' }}>kW ({liveData.line_loss_pct.toFixed(1)}%)</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {liveData.line_loss_pct > 10 ? 'Critical Mismatch!' : 'Normal technical loss'}
          </div>
        </div>
      </div>

      {/* Oscillogram Stream */}
      <div className="card" style={{ marginBottom: 22 }}>
        <div className="card-header">
          <div className="card-title">
            <Radio size={16} color="var(--accent-cyan)" />
            Real-Time SCADA Waveform (Rolling 30-Second Oscillogram)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--accent-green)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }} />
            1 Hz Live Sampling Active
          </div>
        </div>
        <div style={{ height: 300 }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Appliance Load Toggles & Quick Demonstration Presets */}
      <div className="grid-2">
        {/* Interactive Load Injection */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Power size={16} color="var(--accent-amber)" />
              Interactive Campus Load Controls
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Simulates physical breaker contactors
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-sm)'
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Computer Lab 1 (30x High-Spec PCs)</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estimated active draw: ~5.5 kW</div>
              </div>
              <button
                className={`btn ${appliances.lab_pcs_lab1 ? 'btn-red' : 'btn-primary'} btn-sm`}
                disabled={toggling}
                onClick={() => handleToggleAppliance('lab_pcs_lab1')}
              >
                {appliances.lab_pcs_lab1 ? 'Turn OFF' : 'Turn ON'}
              </button>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-sm)'
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Central AC Chiller Compressor</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Baseline thermal load: ~18.0 kW</div>
              </div>
              <button
                className={`btn ${appliances.central_ac ? 'btn-red' : 'btn-primary'} btn-sm`}
                disabled={toggling}
                onClick={() => handleToggleAppliance('central_ac')}
              >
                {appliances.central_ac ? 'Turn OFF' : 'Turn ON'}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Scenario Injector */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Play size={16} color="var(--accent-green)" />
              Inject Demonstration Scenarios
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Triggers instant explainable detection rules
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button 
              className={`btn ${liveData.active_scenario === 'NORMAL' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => handleScenario('NORMAL')}
            >
              1. Normal Balanced
            </button>
            <button 
              className={`btn ${liveData.active_scenario === 'EMPTY_ROOM_WASTAGE' ? 'btn-amber' : 'btn-secondary'} btn-sm`}
              onClick={() => handleScenario('EMPTY_ROOM_WASTAGE')}
            >
              2. Empty Room Wastage
            </button>
            <button 
              className={`btn ${liveData.active_scenario === 'UNUSUAL_POWER_SPIKE' ? 'btn-red' : 'btn-secondary'} btn-sm`}
              onClick={() => handleScenario('UNUSUAL_POWER_SPIKE')}
            >
              3. Unusual Power Spike
            </button>
            <button 
              className={`btn ${liveData.active_scenario === 'METER_MISMATCH' ? 'btn-red' : 'btn-secondary'} btn-sm`}
              onClick={() => handleScenario('METER_MISMATCH')}
            >
              4. Meter Mismatch
            </button>
            <button 
              className={`btn ${liveData.active_scenario === 'MISSING_SENSOR_DATA' ? 'btn-amber' : 'btn-secondary'} btn-sm`}
              onClick={() => handleScenario('MISSING_SENSOR_DATA')}
            >
              5. Missing Sensor Data
            </button>
            <button 
              className={`btn ${liveData.active_scenario === 'INVALID_READINGS' ? 'btn-red' : 'btn-secondary'} btn-sm`}
              onClick={() => handleScenario('INVALID_READINGS')}
            >
              6. Invalid Sensor Noise
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

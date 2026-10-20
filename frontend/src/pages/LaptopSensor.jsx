import React, { useState, useEffect, useRef } from 'react';
import { Laptop, Zap, Cpu, Battery, MemoryStick, TrendingUp, RefreshCw, Activity } from 'lucide-react';
import { api } from '../api/client';
import { Line } from 'react-chartjs-2';
import '../utils/chartConfig';

export default function LaptopSensor() {
  const [reading, setReading] = useState(null);
  const [history, setHistory] = useState({ points: [] });
  const [sensorStatus, setSensorStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const fetchData = async () => {
    try {
      const [r, h] = await Promise.all([
        api.getLaptopReading(),
        api.getLaptopHistory()
      ]);
      setReading(r);
      setHistory(h);
      setLoading(false);
    } catch (err) {
      console.error('Laptop sensor error:', err);
    }
  };

  const fetchStatus = async () => {
    try {
      const s = await api.getLaptopSensorStatus();
      setSensorStatus(s);
    } catch (err) { /* ignore */ }
  };

  useEffect(() => {
    fetchData();
    fetchStatus();
    intervalRef.current = setInterval(fetchData, 2000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const cpuGaugeColor = (pct) => {
    if (pct > 80) return 'var(--accent-red)';
    if (pct > 50) return 'var(--accent-amber)';
    return 'var(--accent-green)';
  };

  const chartData = {
    labels: history.points.map(p => p.timestamp),
    datasets: [
      {
        label: 'AC Power Draw (W)',
        data: history.points.map(p => p.watts),
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6,182,212,0.08)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0
      },
      {
        label: 'CPU Load (%)',
        data: history.points.map(p => p.cpu_pct),
        borderColor: '#10b981',
        backgroundColor: 'transparent',
        tension: 0.4,
        borderWidth: 1.5,
        borderDash: [4, 3],
        pointRadius: 0,
        yAxisID: 'y1'
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
        labels: { color: '#94a3b8', font: { size: 11, family: 'Inter' }, boxWidth: 12 }
      },
      tooltip: {
        backgroundColor: '#151d2c', titleColor: '#f1f5f9',
        bodyColor: '#94a3b8', borderColor: '#222f46', borderWidth: 1
      }
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b', font: { size: 9 }, maxTicksLimit: 10 } },
      y: {
        grid: { color: 'rgba(255,255,255,0.03)' },
        ticks: { color: '#64748b', font: { size: 10 } },
        title: { display: true, text: 'Watts (W)', color: '#64748b', font: { size: 10 } }
      },
      y1: {
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { color: '#64748b', font: { size: 10 } },
        title: { display: true, text: 'CPU %', color: '#64748b', font: { size: 10 } },
        min: 0, max: 100
      }
    }
  };

  if (loading || !reading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 12px' }} />
        <div>Initializing Laptop Sensor Node...</div>
      </div>
    );
  }

  const batteryColor = reading.battery.plugged ? 'var(--accent-green)' :
    reading.battery.percent < 20 ? 'var(--accent-red)' : 'var(--accent-amber)';

  return (
    <div className="page-wrapper">
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(6,182,212,0.1) 0%, rgba(16,185,129,0.08) 100%)',
        border: '1px solid rgba(6,182,212,0.2)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 14
      }}>
        <Laptop size={22} color="var(--accent-cyan)" />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            Laptop Power Sensor Node — Real Device Monitoring
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
            This laptop is acting as an IoT sensor device. CPU load is converted to estimated AC power draw in real-time.
            {reading.data_quality === 'real'
              ? ' ✅ Reading real CPU metrics via psutil.'
              : ' ⚠️ psutil simulation mode active.'}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Live Update</div>
          <div style={{
            width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-green)',
            marginLeft: 'auto', marginTop: 4,
            boxShadow: '0 0 8px var(--accent-green)',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {/* Power Draw */}
        <div className="card stat-card">
          <div className="stat-header">
            <span className="stat-label">AC Power Draw</span>
            <div style={{ padding: '6px', background: 'rgba(6,182,212,0.12)', borderRadius: 8 }}>
              <Zap size={18} color="var(--accent-cyan)" />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
            {reading.ac_power_watts.toFixed(1)}
            <span className="stat-unit">W</span>
          </div>
          <div className="stat-footer">
            {(reading.power_kw * 1000).toFixed(1)} W = {reading.power_kw.toFixed(4)} kW
          </div>
        </div>

        {/* CPU Load */}
        <div className="card stat-card">
          <div className="stat-header">
            <span className="stat-label">CPU Load</span>
            <div style={{ padding: '6px', background: `rgba(16,185,129,0.12)`, borderRadius: 8 }}>
              <Cpu size={18} color={cpuGaugeColor(reading.cpu_percent)} />
            </div>
          </div>
          <div className="stat-value" style={{ color: cpuGaugeColor(reading.cpu_percent) }}>
            {reading.cpu_percent.toFixed(1)}
            <span className="stat-unit">%</span>
          </div>
          <div className="stat-footer">
            Status: <span style={{ color: cpuGaugeColor(reading.cpu_percent) }}>
              {reading.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Hourly Cost */}
        <div className="card stat-card">
          <div className="stat-header">
            <span className="stat-label">Hourly Cost</span>
            <div style={{ padding: '6px', background: 'rgba(245,158,11,0.12)', borderRadius: 8 }}>
              <TrendingUp size={18} color="var(--accent-amber)" />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--accent-amber)' }}>
            ₹{reading.hourly_cost_rs.toFixed(3)}
            <span className="stat-unit">/hr</span>
          </div>
          <div className="stat-footer">
            Daily (8h): ₹{reading.daily_cost_rs.toFixed(2)}
          </div>
        </div>

        {/* Battery */}
        <div className="card stat-card">
          <div className="stat-header">
            <span className="stat-label">Battery Status</span>
            <div style={{ padding: '6px', background: `rgba(16,185,129,0.12)`, borderRadius: 8 }}>
              <Battery size={18} color={batteryColor} />
            </div>
          </div>
          <div className="stat-value" style={{ color: batteryColor }}>
            {reading.battery.percent.toFixed(0)}
            <span className="stat-unit">%</span>
          </div>
          <div className="stat-footer">
            {reading.battery.status}
            {reading.battery.minutes_left ? ` • ${reading.battery.minutes_left} min left` : ''}
          </div>
        </div>
      </div>

      {/* Chart + Details Row */}
      <div className="grid-2">
        {/* Rolling Wattage Chart */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Activity size={16} color="var(--accent-cyan)" />
              Real-Time Power &amp; CPU History (60s)
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {history.points.length} samples
            </span>
          </div>
          <div style={{ height: 240 }}>
            {history.points.length > 1 ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Collecting data... ({history.points.length}/10 samples)
              </div>
            )}
          </div>
        </div>

        {/* Electrical Readings Detail */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Zap size={16} color="var(--accent-green)" />
              Sensor Electrical Readings
            </div>
            <span className="badge badge-green">LIVE</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Mains Voltage', value: `${reading.voltage_v.toFixed(1)} V`, color: 'var(--text-primary)' },
              { label: 'Current Draw', value: `${reading.current_amps.toFixed(3)} A`, color: 'var(--accent-cyan)' },
              { label: 'Power Factor (PF)', value: reading.power_factor.toFixed(3), color: reading.power_factor > 0.85 ? 'var(--accent-green)' : 'var(--accent-amber)' },
              { label: 'Grid Frequency', value: `${reading.frequency_hz.toFixed(2)} Hz`, color: 'var(--text-primary)' },
              { label: 'Active Power', value: `${reading.ac_power_watts.toFixed(2)} W`, color: 'var(--accent-cyan)' },
              { label: 'RAM Usage', value: `${reading.memory.percent}% (${reading.memory.used_gb} / ${reading.memory.total_gb} GB)`, color: reading.memory.percent > 85 ? 'var(--accent-red)' : 'var(--text-secondary)' },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 12px', background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)'
              }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{row.label}</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: row.color }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* Memory Bar */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RAM Utilisation</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{reading.memory.percent}%</span>
            </div>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 999, height: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${reading.memory.percent}%`,
                background: reading.memory.percent > 85 ? 'var(--accent-red)' : reading.memory.percent > 65 ? 'var(--accent-amber)' : 'var(--accent-green)',
                borderRadius: 999,
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>

          {/* CPU Bar */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CPU Utilisation</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{reading.cpu_percent.toFixed(1)}%</span>
            </div>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 999, height: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${reading.cpu_percent}%`,
                background: cpuGaugeColor(reading.cpu_percent),
                borderRadius: 999,
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Sensor Info */}
      {sensorStatus && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <div className="card-title">
              <MemoryStick size={16} color="var(--accent-blue)" />
              Sensor Node Information
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { label: 'Sensor Type', value: sensorStatus.available ? 'psutil (real)' : 'Simulated' },
              { label: 'Laptop TDP', value: `${sensorStatus.laptop_tdp_w} W` },
              { label: 'Idle Baseline', value: `${sensorStatus.idle_baseline_w} W` },
              { label: 'Charger Efficiency', value: `${(sensorStatus.charger_efficiency * 100).toFixed(0)}%` },
              { label: 'CPU Cores', value: sensorStatus.system_info?.cpu_count ?? '—' },
              { label: 'CPU Frequency', value: sensorStatus.system_info?.cpu_freq_mhz ? `${sensorStatus.system_info.cpu_freq_mhz} MHz` : '—' },
              { label: 'Uptime', value: sensorStatus.system_info?.uptime_hours ? `${sensorStatus.system_info.uptime_hours} hrs` : '—' },
            ].map(item => (
              <div key={item.label} style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  BatteryCharging, 
  AlertTriangle, 
  IndianRupee, 
  ShieldCheck, 
  TrendingDown, 
  Flame, 
  Layers,
  ArrowRight,
  RefreshCw,
  Database,
  Clock,
  Sparkles,
  Activity
} from 'lucide-react';
import StatCard from '../components/StatCard';
import QualityBadge from '../components/QualityBadge';
import { api } from '../api/client';
import { Line } from 'react-chartjs-2';
import '../utils/chartConfig';

export default function Dashboard({ setCurrentPage }) {
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [sumRes, trendRes, alertsRes, roomsRes, analyticsRes] = await Promise.all([
        api.getSummary(),
        api.getTrend(),
        api.getAlerts('all'),
        api.getRooms(),
        api.getAnalytics().catch(() => null)
      ]);
      setSummary(sumRes);
      setTrend(trendRes);
      setRecentAlerts(alertsRes.slice(0, 4));
      setRooms(roomsRes);
      setAnalytics(analyticsRes);
      setLoading(false);
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !summary) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 12px' }} />
        <div>Connecting to CurrentGuard AI Stage 2 Engine...</div>
      </div>
    );
  }

  // Trend Chart Config
  const chartData = {
    labels: trend ? trend.hours : [],
    datasets: [
      {
        label: 'Incomer Grid Supply (kW)',
        data: trend ? trend.supply_trend : [],
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.08)',
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 0
      },
      {
        label: 'Submeter Consumer Sum (kW)',
        data: trend ? trend.submeter_trend : [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 0
      },
      {
        label: 'Line Loss Divergence (kW)',
        data: trend ? trend.loss_trend : [],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderDash: [4, 4],
        tension: 0.2,
        borderWidth: 1.5,
        pointRadius: 0
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#94a3b8', font: { size: 11, family: 'Inter' }, boxWidth: 12 }
      },
      tooltip: {
        backgroundColor: '#151d2c',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: '#222f46',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#64748b', font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#64748b', font: { size: 10 } }
      }
    }
  };

  return (
    <div className="page-wrapper">
      {/* Student Prototype Safety Mandate Banner */}
      <div className="safety-banner">
        <ShieldCheck size={18} color="var(--accent-green)" />
        <div>
          <strong>Vishwakarma Unique Application — Prototype Environment:</strong> Live telemetry is powered by high-fidelity mathematical physics models and low-voltage IoT sensors. <em>Strictly zero direct 230V mains connection.</em>
        </div>
      </div>

      {/* Top 4 Primary KPIs */}
      <div className="grid-4">
        <StatCard
          label="Total Real-Time Power"
          value={summary.total_power_kw.toFixed(1)}
          unit="kW"
          icon={Zap}
          color="cyan"
          subtext={`Grid Supply: ${summary.supply_power_kw.toFixed(1)} kW`}
        />
        <StatCard
          label="Daily Campus Consumption"
          value={summary.daily_consumption_kwh.toFixed(1)}
          unit="kWh"
          icon={BatteryCharging}
          color="green"
          subtext={`Est. Today: ₹${summary.estimated_cost_rupees.toLocaleString()}`}
        />
        <StatCard
          label="Active Discrepancies"
          value={summary.active_alerts_count}
          icon={AlertTriangle}
          color={summary.active_alerts_count > 0 ? "red" : "green"}
          subtext="Requires human inspection"
        />
        <StatCard
          label="Overall Energy Efficiency"
          value={`${summary.energy_efficiency_pct.toFixed(1)}%`}
          icon={ShieldCheck}
          color="blue"
          subtext={`Line Loss: ${summary.line_loss_pct.toFixed(1)}% (${summary.line_loss_kw.toFixed(1)} kW)`}
        />
      </div>

      {/* Secondary Quick Metrics Row */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Avoidable Unoccupied Waste
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
            {summary.avoidable_waste_kw.toFixed(2)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>kW</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Loss Rate: ₹{summary.avoidable_cost_rupees.toFixed(2)} / hour
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Supply vs Submeters Line Gap
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: summary.line_loss_pct > 6 ? 'var(--accent-red)' : 'var(--accent-green)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
            {summary.line_loss_kw.toFixed(2)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>kW ({summary.line_loss_pct.toFixed(1)}%)</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Submeters sum: {summary.submeter_sum_kw.toFixed(1)} kW
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Sensor Data Quality Status
          </div>
          <div style={{ marginTop: 6 }}>
            <QualityBadge status={summary.overall_data_quality} />
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 6 }}>
            6 room sensors active & online
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Location Tariff Unit Rate
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
            ₹{summary.active_tariff.rate_per_kwh.toFixed(2)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ kWh</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--accent-green)', marginTop: 2 }}>
            {summary.active_tariff.name}
          </div>
        </div>
      </div>

      {/* Database Telemetry & Peak Intelligence Bar */}
      {analytics && analytics.power_kw && (
        <div className="card" style={{ 
          marginBottom: 20, 
          padding: '14px 20px', 
          background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.07) 0%, rgba(16, 185, 129, 0.07) 100%)',
          borderColor: 'rgba(6, 182, 212, 0.25)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              width: 36, 
              height: 36, 
              borderRadius: 8, 
              background: 'rgba(6, 182, 212, 0.15)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--accent-cyan)'
            }}>
              <Database size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                SQLite Telemetry Archive
                <span className="badge badge-green" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                  ● Stored & Active ({trend?.snapshot_count || 0} Snapshots)
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Persistent continuous monitoring • Background AI evaluation active
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Today's Peak Load</div>
              <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>
                {analytics.power_kw.peak_today} kW <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>@{analytics.power_kw.peak_at}</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Base Night Load</div>
              <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                {analytics.power_kw.lowest_today} kW <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>@{analytics.power_kw.lowest_at}</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg Campus Draw</div>
              <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {analytics.power_kw.average_today} kW
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Waste Savings Potential</div>
              <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>
                ₹{analytics.waste?.waste_cost_rs?.toFixed(0) || '0'} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({analytics.waste?.total_waste_kwh?.toFixed(1) || '0'} kWh)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Charts & Overview Row */}
      <div className="grid-2">
        {/* Diurnal Load Curve */}
        <div className="card" style={{ minHeight: 340 }}>
          <div className="card-header">
            <div className="card-title">
              <TrendingDown size={16} color="var(--accent-cyan)" />
              24-Hour Diurnal Load Profile & Meter Divergence
            </div>
            <span style={{ fontSize: '0.75rem', color: trend?.data_source === 'real_db' ? 'var(--accent-green)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {trend?.data_source === 'real_db' ? (
                <>
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)' }}></span>
                  Database Historical ({trend.snapshot_count} points)
                </>
              ) : '1-Hour Intervals'}
            </span>
          </div>
          <div style={{ height: 260 }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Room Energy Status Summary */}
        <div className="card" style={{ minHeight: 340 }}>
          <div className="card-header">
            <div className="card-title">
              <Layers size={16} color="var(--accent-green)" />
              Monitored Campus Locations
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setCurrentPage('rooms')}>
              View All <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rooms.slice(0, 5).map((r) => {
              const pctOfBaseline = r.baseline_power_kw > 0 ? (r.current_power_kw / r.baseline_power_kw) * 100 : 0;
              const roomStat = analytics?.room_breakdown?.find(b => b.room_id === r.id);
              return (
                <div key={r.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Floor {r.floor} • {r.is_occupied ? 'Occupied' : 'Unoccupied'} • PF {r.power_factor.toFixed(2)}
                      {roomStat ? ` • Stored: ${roomStat.total_kwh} kWh (₹${roomStat.estimated_cost_rs})` : ''}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {r.current_power_kw.toFixed(2)} kW
                    </div>
                    <div style={{ fontSize: '0.72rem', color: pctOfBaseline > 120 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                      {pctOfBaseline.toFixed(0)}% of baseline
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Alerts Queue */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div className="card-title">
            <AlertTriangle size={16} color="var(--accent-red)" />
            Recent Unverified AI Anomaly Detections
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setCurrentPage('alerts')}>
            Inspect All Alerts <ArrowRight size={14} />
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Alert ID</th>
                <th>Category</th>
                <th>Location</th>
                <th>Measured Value</th>
                <th>Confidence</th>
                <th>Verification State</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentAlerts.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {a.id}
                  </td>
                  <td>
                    <span className={`badge ${a.severity === 'critical' ? 'badge-red' : a.severity === 'high' ? 'badge-amber' : 'badge-blue'}`}>
                      {a.alert_type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{a.room_id}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{a.measured_value}</td>
                  <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                    {a.confidence_pct.toFixed(1)}%
                  </td>
                  <td>
                    <span className={`badge ${a.status === 'new' ? 'badge-red' : a.status === 'under_review' ? 'badge-amber' : 'badge-green'}`}>
                      {a.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => setCurrentPage('verification')}
                    >
                      Verify
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

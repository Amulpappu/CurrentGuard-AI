import React from 'react';
import { Zap, MapPin, User, LogOut, Laptop } from 'lucide-react';

export default function Navbar({ 
  currentPage, 
  activeScenario, 
  activeTariff, 
  currentUser, 
  setCurrentUser,
  users = [],
  onLogout
}) {
  const pageTitles = {
    dashboard: 'Campus Overview Dashboard',
    monitoring: 'Live Real-Time Monitoring & SCADA',
    'laptop-sensor': 'Laptop Power Sensor Node',
    rooms: 'Room-Wise Energy & Occupancy Monitor',
    alerts: 'AI-Assisted Anomaly Detection & Alerts',
    verification: 'Authorized Human Verification Workflow',
    history: 'Verification Event History & Audit Log',
    settings: 'System Configuration & Regional Tariffs'
  };

  const scenarioColors = {
    NORMAL: 'badge-green',
    EMPTY_ROOM_WASTAGE: 'badge-amber',
    UNUSUAL_POWER_SPIKE: 'badge-red',
    METER_MISMATCH: 'badge-red',
    MISSING_SENSOR_DATA: 'badge-amber',
    INVALID_READINGS: 'badge-red'
  };

  const roleColors = {
    'Administrator': 'var(--accent-cyan)',
    'Maintenance Staff': 'var(--accent-amber)',
    'Energy Auditor': 'var(--accent-green)',
    'Authorized Viewer': 'var(--text-secondary)'
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {pageTitles[currentPage] || 'CurrentGuard AI'}
        </h1>
        {currentPage !== 'laptop-sensor' && (
          <span className={`badge ${scenarioColors[activeScenario] || 'badge-blue'}`}>
            <Zap size={12} />
            {activeScenario.replace(/_/g, ' ')}
          </span>
        )}
        {currentPage === 'laptop-sensor' && (
          <span className="badge badge-blue">
            <Laptop size={12} />
            Real CPU Metrics
          </span>
        )}
      </div>

      <div className="topbar-right">
        {/* Tariff Pill */}
        {activeTariff && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--bg-card)', padding: '6px 12px',
            borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)',
            fontSize: '0.78rem', color: 'var(--text-secondary)'
          }}>
            <MapPin size={13} color="var(--accent-green)" />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{activeTariff.name}</span>
            <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>
              {activeTariff.currency}{activeTariff.rate_per_kwh.toFixed(2)}/kWh
            </span>
          </div>
        )}

        {/* Current User Badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-card)', padding: '6px 12px',
          borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)',
          fontSize: '0.82rem'
        }}>
          <User size={14} color={roleColors[currentUser?.role] || 'var(--accent-blue)'} />
          <div>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {currentUser?.full_name || currentUser?.username}
            </span>
            <span style={{ color: roleColors[currentUser?.role] || 'var(--text-muted)', fontSize: '0.72rem', marginLeft: 6 }}>
              {currentUser?.role}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)', padding: '6px 10px',
            color: 'var(--text-muted)', cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: 6, fontSize: '0.78rem',
            transition: 'all 0.15s ease', fontFamily: 'var(--font-sans)'
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent-red)'; e.currentTarget.style.color = 'var(--accent-red)'; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          title="Sign Out"
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </header>
  );
}

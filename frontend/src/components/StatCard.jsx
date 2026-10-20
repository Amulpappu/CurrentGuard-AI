import React from 'react';

export default function StatCard({ label, value, unit, icon: Icon, color = 'blue', subtext }) {
  const colorMap = {
    green: { bg: 'var(--accent-green-bg)', color: 'var(--accent-green)' },
    blue: { bg: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' },
    cyan: { bg: 'var(--accent-cyan-bg)', color: 'var(--accent-cyan)' },
    amber: { bg: 'var(--accent-amber-bg)', color: 'var(--accent-amber)' },
    red: { bg: 'var(--accent-red-bg)', color: 'var(--accent-red)' },
  };

  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="card stat-card">
      <div className="stat-header">
        <span className="stat-label">{label}</span>
        {Icon && (
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 'var(--radius-sm)',
            background: c.bg,
            color: c.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon size={18} />
          </div>
        )}
      </div>

      <div className="stat-value">
        {value}
        {unit && <span className="stat-unit">{unit}</span>}
      </div>

      {subtext && <div className="stat-footer">{subtext}</div>}
    </div>
  );
}

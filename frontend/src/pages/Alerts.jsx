import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Filter, 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  ShieldAlert,
  ArrowRight,
  Info
} from 'lucide-react';
import { api } from '../api/client';

export default function Alerts({ setCurrentPage, setSelectedAlertForVerification }) {
  const [alerts, setAlerts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const res = await api.getAlerts(statusFilter, severityFilter);
      setAlerts(res);
      setLoading(false);
    } catch (e) {
      console.error('Fetch alerts error:', e);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 3000);
    return () => clearInterval(interval);
  }, [statusFilter, severityFilter]);

  const handleVerifyClick = (alert) => {
    if (setSelectedAlertForVerification) {
      setSelectedAlertForVerification(alert);
    }
    setCurrentPage('verification');
  };

  return (
    <div className="page-wrapper">
      {/* Title & Filter Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>AI Anomaly Detections & Queue</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Explainable anomaly rules with uncertainty ratings. All alerts require authorized physical verification.
          </p>
        </div>

        {/* Filter Badges */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: 3, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            {['all', 'new', 'under_review', 'verified', 'resolved'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  background: statusFilter === st ? 'var(--accent-green-bg)' : 'transparent',
                  color: statusFilter === st ? 'var(--accent-green)' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: 4,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="form-control"
            style={{ width: 'auto', fontSize: '0.8rem', padding: '6px 12px' }}
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Safety Notice */}
      <div style={{
        background: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 14px',
        fontSize: '0.78rem',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20
      }}>
        <Info size={16} color="var(--accent-blue)" />
        <div>
          <strong>Human-in-the-Loop Protocol:</strong> System rules detect deviations and energy waste, but never automatically accuse theft. Physical investigation must confirm causes before resolution.
        </div>
      </div>

      {/* Alert Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {alerts.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={32} color="var(--accent-green)" style={{ margin: '0 auto 12px' }} />
            <div>No alerts matching the selected filter criteria. System is operating nominally.</div>
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.88rem', color: 'var(--accent-cyan)' }}>
                      {alert.id}
                    </span>
                    <span className={`badge ${alert.severity === 'critical' ? 'badge-red' : alert.severity === 'high' ? 'badge-amber' : 'badge-blue'}`}>
                      {alert.severity}
                    </span>
                    <span className={`badge ${alert.status === 'new' ? 'badge-red' : alert.status === 'under_review' ? 'badge-amber' : 'badge-green'}`}>
                      {alert.status.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {new Date(alert.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.02rem', fontWeight: 700, marginBottom: 6 }}>
                    {alert.title}
                  </h3>

                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                    {alert.description}
                  </p>

                  {/* Quantitative Metrics Bar */}
                  <div style={{
                    display: 'flex',
                    gap: 16,
                    flexWrap: 'wrap',
                    background: 'var(--bg-secondary)',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem'
                  }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Suspected: </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{alert.suspected_category}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Measured: </span>
                      <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)' }}>{alert.measured_value}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Threshold: </span>
                      <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{alert.threshold_value}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Rule Confidence: </span>
                      <strong style={{ color: 'var(--accent-green)' }}>{alert.confidence_pct.toFixed(1)}%</strong>
                    </div>
                  </div>

                  {/* Suggested Next Action */}
                  <div style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--accent-blue)' }}>Suggested Action: </strong>
                    {alert.suggested_action}
                  </div>
                </div>

                {/* Right Action Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleVerifyClick(alert)}
                  >
                    Authorize Verification <ArrowRight size={14} />
                  </button>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6 }}>
                    Requires operator sign-off
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

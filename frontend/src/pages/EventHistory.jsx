import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, UserCheck, Calendar, ArrowRight } from 'lucide-react';
import { api } from '../api/client';

export default function EventHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await api.getVerificationHistory(100);
      setHistory(res);
      setLoading(false);
    } catch (e) {
      console.error('Fetch history error:', e);
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Verification Event History & Audit Log</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          Tamper-evident chronological log of all operator verification decisions, notes, and corrective actions.
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <History size={16} color="var(--accent-cyan)" />
            Recorded Human-in-the-Loop Verifications ({history.length})
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Immutable Event Audit Chain
          </span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Timestamp</th>
                <th>Alert Reference</th>
                <th>Authorized Operator</th>
                <th>State Transition</th>
                <th>Verification Notes</th>
                <th>Action Taken</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                    No verification events logged yet.
                  </td>
                </tr>
              ) : (
                history.map((ev) => (
                  <tr key={ev.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      EVT-{ev.id.toString().padStart(4, '0')}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {new Date(ev.timestamp).toLocaleString()}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      {ev.alert_id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ev.user_name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ev.user_role}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                        <span className="badge badge-amber">{ev.previous_status}</span>
                        <ArrowRight size={12} color="var(--text-muted)" />
                        <span className="badge badge-green">{ev.new_status}</span>
                      </div>
                    </td>
                    <td style={{ maxWidth: 300, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      "{ev.verification_notes}"
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                      {ev.action_taken}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

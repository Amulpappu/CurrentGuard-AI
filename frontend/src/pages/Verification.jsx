import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  FileText, 
  AlertTriangle,
  UserCheck,
  Send,
  History
} from 'lucide-react';
import { api } from '../api/client';

export default function Verification({ 
  currentUser, 
  selectedAlertForVerification, 
  setSelectedAlertForVerification,
  setCurrentPage 
}) {
  const [pendingAlerts, setPendingAlerts] = useState([]);
  const [activeAlert, setActiveAlert] = useState(selectedAlertForVerification || null);
  const [newStatus, setNewStatus] = useState('under_review');
  const [notes, setNotes] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [auditTimeline, setAuditTimeline] = useState([]);

  const loadPending = async () => {
    try {
      const res = await api.getPendingVerifications();
      setPendingAlerts(res);
      if (!activeAlert && res.length > 0) {
        setActiveAlert(res[0]);
      }
    } catch (e) {
      console.error('Error fetching pending alerts:', e);
    }
  };

  const loadAlertDetails = async (alertId) => {
    try {
      const res = await api.getAlertDetail(alertId);
      setActiveAlert(res.alert);
      setAuditTimeline(res.timeline);
    } catch (e) {
      console.error('Error fetching alert detail:', e);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  useEffect(() => {
    if (activeAlert) {
      loadAlertDetails(activeAlert.id);
      // Pre-select reasonable next status
      if (activeAlert.status === 'new') setNewStatus('under_review');
      else if (activeAlert.status === 'under_review') setNewStatus('verified');
      else setNewStatus('resolved');
    }
  }, [activeAlert?.id]);

  const handleSubmitVerification = async (e) => {
    e.preventDefault();
    if (!activeAlert || !notes.trim()) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      await api.verifyAlert(activeAlert.id, {
        new_status: newStatus,
        verification_notes: notes.trim(),
        user_name: currentUser.full_name || 'Lohith K',
        user_role: currentUser.role || 'Administrator',
        action_taken: actionTaken.trim() || 'Physical inspection recorded'
      });

      setFeedback({ type: 'success', message: `Alert ${activeAlert.id} successfully updated to '${newStatus}'. Verification event recorded into audit log.` });
      setNotes('');
      setActionTaken('');
      await loadPending();
      await loadAlertDetails(activeAlert.id);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Verification submission failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Authorized Verification Portal</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          Authorized human operators inspect detected anomalies, log on-site verification notes, and transition incident lifecycle states.
        </p>
      </div>

      {feedback && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 18,
          fontSize: '0.84rem',
          background: feedback.type === 'success' ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)',
          color: feedback.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
          border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
          {feedback.message}
        </div>
      )}

      <div className="grid-2">
        {/* Left: Verification Execution Form */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <ShieldCheck size={18} color="var(--accent-green)" />
              Record Verification Inspection
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Operator: <strong style={{ color: 'var(--text-primary)' }}>{currentUser.full_name} ({currentUser.role})</strong>
            </span>
          </div>

          {activeAlert ? (
            <form onSubmit={handleSubmitVerification}>
              {/* Target Alert Summary Card */}
              <div style={{
                background: 'var(--bg-secondary)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 16,
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {activeAlert.id}
                  </span>
                  <span className={`badge ${activeAlert.status === 'new' ? 'badge-red' : activeAlert.status === 'under_review' ? 'badge-amber' : 'badge-green'}`}>
                    Current: {activeAlert.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{activeAlert.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Location: {activeAlert.room_id} • Measured: {activeAlert.measured_value} • Threshold: {activeAlert.threshold_value}
                </div>
              </div>

              {/* State Transition Selector */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Select Next Incident State:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[
                    { id: 'under_review', label: 'Under Review', color: 'var(--accent-amber)' },
                    { id: 'verified', label: 'Verified Issue', color: 'var(--accent-green)' },
                    { id: 'resolved', label: 'Resolved / Fixed', color: 'var(--accent-blue)' },
                    { id: 'dismissed', label: 'Dismiss (False Pos)', color: 'var(--text-muted)' }
                  ].map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setNewStatus(s.id)}
                      style={{
                        padding: '8px 10px',
                        background: newStatus === s.id ? 'var(--bg-card-hover)' : 'var(--bg-secondary)',
                        color: newStatus === s.id ? s.color : 'var(--text-secondary)',
                        border: `1px solid ${newStatus === s.id ? s.color : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Verification Notes */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Physical Inspection Notes (Mandatory):
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  required
                  placeholder="Detail physical site findings, meter observations, or corrective action..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Corrective Action Taken */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Action Taken / Recommendation:
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Switched off laboratory circuit breaker, recalibrated submeter CT"
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !notes.trim()}
                  style={{ flex: 1 }}
                >
                  <Send size={15} />
                  {submitting ? 'Submitting...' : 'Sign & Commit Verification'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCurrentPage('history')}
                >
                  <History size={15} /> View Audit Log
                </button>
              </div>
            </form>
          ) : (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
              Select an alert from the pending queue to begin verification.
            </div>
          )}
        </div>

        {/* Right: Pending Queue & Audit Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Pending Alerts Queue */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <AlertTriangle size={16} color="var(--accent-amber)" />
                Pending Verification Queue ({pendingAlerts.length})
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
              {pendingAlerts.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: 12, textAlign: 'center' }}>
                  No pending alerts in queue.
                </div>
              ) : (
                pendingAlerts.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => setActiveAlert(a)}
                    style={{
                      padding: '10px 14px',
                      background: activeAlert?.id === a.id ? 'var(--bg-card-hover)' : 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${activeAlert?.id === a.id ? 'var(--accent-green)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>{a.title}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {a.id} • {a.room_id} • Conf: {a.confidence_pct.toFixed(0)}%
                      </div>
                    </div>
                    <span className={`badge ${a.severity === 'critical' ? 'badge-red' : 'badge-amber'}`}>
                      {a.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Audit Timeline for Active Alert */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <FileText size={16} color="var(--accent-blue)" />
                Audit Trail for {activeAlert ? activeAlert.id : 'Selected Incident'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto' }}>
              {auditTimeline.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: 12, textAlign: 'center' }}>
                  No previous human verification events recorded for this alert yet.
                </div>
              ) : (
                auditTimeline.map((ev) => (
                  <div key={ev.id} style={{
                    padding: '8px 12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '3px solid var(--accent-green)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      <span>{ev.user_name} ({ev.user_role})</span>
                      <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: 4 }}>
                      State: <strong>{ev.previous_status}</strong> → <strong style={{ color: 'var(--accent-green)' }}>{ev.new_status}</strong>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      "{ev.verification_notes}"
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

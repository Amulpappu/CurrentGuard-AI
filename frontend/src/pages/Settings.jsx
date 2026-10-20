import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  MapPin, 
  IndianRupee, 
  Zap, 
  ShieldCheck, 
  Save, 
  CheckCircle2,
  AlertCircle,
  Database,
  Cloud,
  FileSpreadsheet,
  Copy,
  ExternalLink,
  RefreshCw,
  Send
} from 'lucide-react';
import { api } from '../api/client';

export default function Settings({ activeScenario, setActiveScenario, activeTariff, setActiveTariff }) {
  const [tariffs, setTariffs] = useState([]);
  const [customRate, setCustomRate] = useState(activeTariff ? activeTariff.rate_per_kwh : 6.77);
  const [rateFeedback, setRateFeedback] = useState(null);
  const [scenarioFeedback, setScenarioFeedback] = useState(null);

  // Google Sheets state
  const [sheetsConfig, setSheetsConfig] = useState({
    configured: false,
    webhook_url: '',
    auto_sync_enabled: true,
    last_sync_time: null,
    last_sync_status: 'idle',
    synced_counts: { readings: 0, alerts: 0, verifications: 0 }
  });
  const [webhookInput, setWebhookInput] = useState('');
  const [sheetsFeedback, setSheetsFeedback] = useState(null);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [appsScriptCode, setAppsScriptCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);

  const fetchTariffs = async () => {
    try {
      const res = await api.getTariffs();
      setTariffs(res);
      const active = res.find(t => t.is_active);
      if (active) {
        setActiveTariff(active);
        setCustomRate(active.rate_per_kwh);
      }
    } catch (e) {
      console.error('Fetch tariffs error:', e);
    }
  };

  const fetchSheetsStatus = async () => {
    try {
      const res = await api.getGoogleSheetsStatus();
      setSheetsConfig(res);
      if (res.webhook_url && !webhookInput) {
        setWebhookInput(res.webhook_url);
      }
    } catch (e) {
      console.error('Fetch sheets status error:', e);
    }
  };

  useEffect(() => {
    fetchTariffs();
    fetchSheetsStatus();
  }, []);

  const handleSelectTariff = async (tariffId) => {
    try {
      const res = await api.selectTariff(tariffId);
      setActiveTariff(res);
      setCustomRate(res.rate_per_kwh);
      await fetchTariffs();
      setRateFeedback({ type: 'success', message: `Active location switched to ${res.name} (${res.currency}${res.rate_per_kwh.toFixed(2)}/kWh).` });
    } catch (e) {
      setRateFeedback({ type: 'error', message: 'Failed to switch location' });
    }
  };

  const handleUpdateCustomRate = async (e) => {
    e.preventDefault();
    if (!activeTariff || customRate <= 0) return;
    try {
      const res = await api.updateTariffRate(activeTariff.id, parseFloat(customRate));
      setActiveTariff(res);
      await fetchTariffs();
      setRateFeedback({ type: 'success', message: `Unit rate for ${res.name} updated to ₹${res.rate_per_kwh.toFixed(2)}/kWh. Immediate campus recalculation applied.` });
    } catch (e) {
      setRateFeedback({ type: 'error', message: 'Failed to update rate' });
    }
  };

  const handleSwitchScenario = async (sc) => {
    try {
      const res = await api.setScenario(sc);
      setActiveScenario(res.active_scenario);
      setScenarioFeedback({ type: 'success', message: `Simulation scenario set to: ${sc.replace(/_/g, ' ')}. ${res.description}` });
    } catch (e) {
      setScenarioFeedback({ type: 'error', message: 'Failed to set scenario' });
    }
  };

  const handleSaveGoogleSheets = async (e) => {
    e.preventDefault();
    setSheetsFeedback(null);
    try {
      const res = await api.saveGoogleSheetsConfig(webhookInput.trim(), true);
      setSheetsFeedback({
        type: res.test_connection_successful ? 'success' : 'warning',
        message: res.message
      });
      await fetchSheetsStatus();
    } catch (err) {
      setSheetsFeedback({ type: 'error', message: err.message || 'Failed to save webhook URL' });
    }
  };

  const handleSyncAllNow = async () => {
    setSyncingAll(true);
    setSheetsFeedback(null);
    try {
      const res = await api.syncAllToGoogleSheets();
      setSheetsFeedback({ type: 'success', message: res.message });
      await fetchSheetsStatus();
    } catch (err) {
      setSheetsFeedback({ type: 'error', message: err.message || 'Sync failed. Verify your Web App URL.' });
    } finally {
      setSyncingAll(false);
    }
  };

  const handleOpenScriptModal = async () => {
    try {
      const res = await api.getAppsScriptCode();
      setAppsScriptCode(res.code);
      setShowScriptModal(true);
    } catch (e) {
      console.error('Error fetching script code:', e);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>System Configuration & Database Settings</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          Configure dual-mode database (SQLite + Google Sheets), regional electricity tariffs, and simulation scenarios.
        </p>
      </div>

      {/* NEW: Google Sheets Dual-Mode Database Card */}
      <div className="card" style={{ marginBottom: 22, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
        <div className="card-header">
          <div className="card-title">
            <FileSpreadsheet size={18} color="var(--accent-green)" />
            Google Sheets Cloud Database Sync (Dual Mode)
          </div>
          <span className={`badge ${sheetsConfig.configured ? 'badge-green' : 'badge-amber'}`}>
            <Database size={12} />
            {sheetsConfig.configured ? 'Cloud Sync Active' : 'Local SQLite Only'}
          </span>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
          <strong>Zero-Verification Architecture:</strong> Operates seamlessly with local <strong>SQLite</strong> for instant speed, while automatically mirroring readings, alerts, and verification logs to a live <strong>Google Sheet</strong>. No credit card, API key, or Google Cloud verification required.
        </p>

        {sheetsFeedback && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 16,
            fontSize: '0.8rem',
            background: sheetsFeedback.type === 'success' ? 'var(--accent-green-bg)' : sheetsFeedback.type === 'warning' ? 'var(--accent-amber-bg)' : 'var(--accent-red-bg)',
            color: sheetsFeedback.type === 'success' ? 'var(--accent-green)' : sheetsFeedback.type === 'warning' ? 'var(--accent-amber)' : 'var(--accent-red)',
            border: `1px solid ${sheetsFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
          }}>
            {sheetsFeedback.message}
          </div>
        )}

        {/* Webhook Configuration Form */}
        <form onSubmit={handleSaveGoogleSheets} style={{ marginBottom: 16 }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Google Apps Script Web App URL:
          </label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="url"
              className="form-control"
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              value={webhookInput}
              onChange={(e) => setWebhookInput(e.target.value)}
              style={{ flex: 1, minWidth: 320, fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
            />
            <button type="submit" className="btn btn-primary btn-sm">
              <Save size={14} /> Connect Webhook
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={syncingAll || !sheetsConfig.configured}
              onClick={handleSyncAllNow}
            >
              <RefreshCw size={14} className={syncingAll ? 'animate-spin' : ''} />
              {syncingAll ? 'Syncing...' : 'Sync All Data Now'}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleOpenScriptModal}
            >
              <FileSpreadsheet size={14} /> Get Apps Script Code
            </button>
          </div>
        </form>

        {/* Live Sync Counters & Status */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          background: 'var(--bg-secondary)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.78rem'
        }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Database Mode: </span>
            <strong style={{ color: 'var(--accent-green)' }}>Dual (SQLite + Sheets)</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Telemetry Synced: </span>
            <strong style={{ fontFamily: 'var(--font-mono)' }}>{sheetsConfig.synced_counts.readings} rows</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Alerts Synced: </span>
            <strong style={{ fontFamily: 'var(--font-mono)' }}>{sheetsConfig.synced_counts.alerts} rows</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Verifications Synced: </span>
            <strong style={{ fontFamily: 'var(--font-mono)' }}>{sheetsConfig.synced_counts.verifications} rows</strong>
          </div>
        </div>

        {/* 4-Step Setup Guide */}
        <div style={{ marginTop: 14, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-secondary)' }}>How to setup your free Google Sheet in 1 minute (Zero Verification):</strong>
          <ol style={{ paddingLeft: 18, marginTop: 4 }}>
            <li>Open a new sheet at <a href="https://sheets.new" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-green)' }}>sheets.new <ExternalLink size={10} style={{ display: 'inline' }} /></a>.</li>
            <li>In the menu, click <strong>Extensions &gt; Apps Script</strong>.</li>
            <li>Click <strong>"Get Apps Script Code"</strong> above, copy the 30-line script, and paste it into the editor.</li>
            <li>Click <strong>Deploy &gt; New deployment &gt; Select "Web app"</strong>, set <em>Who has access</em> to <strong>"Anyone"</strong>, click Deploy, and paste the resulting URL here!</li>
          </ol>
        </div>
      </div>

      <div className="grid-2">
        {/* Regional Location & Tariff Selector */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <MapPin size={16} color="var(--accent-green)" />
              Regional Location & Daily Electricity Tariff
            </div>
          </div>

          {rateFeedback && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 14,
              fontSize: '0.78rem',
              background: rateFeedback.type === 'success' ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)',
              color: rateFeedback.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'
            }}>
              {rateFeedback.message}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
            {tariffs.map((t) => (
              <div
                key={t.id}
                onClick={() => handleSelectTariff(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: t.is_active ? 'var(--bg-card-hover)' : 'var(--bg-secondary)',
                  border: `1px solid ${t.is_active ? 'var(--accent-green)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{t.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {t.state} • {t.category}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                    {t.currency}{t.rate_per_kwh.toFixed(2)}
                  </div>
                  {t.is_active && (
                    <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>Active Location</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Rate Override */}
          <form onSubmit={handleUpdateCustomRate} style={{
            background: 'var(--bg-secondary)',
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)'
          }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Adjust Daily Unit Rate for Selected Location (₹/kWh):
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={customRate}
                onChange={(e) => setCustomRate(e.target.value)}
                style={{ maxWidth: 160, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem' }}
              />
              <button type="submit" className="btn btn-primary btn-sm">
                <Save size={14} /> Update Rate
              </button>
            </div>
          </form>
        </div>

        {/* Demonstration Scenario Injector */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Zap size={16} color="var(--accent-amber)" />
              Simulation Scenario Presets
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Deterministic Evaluation Engine
            </span>
          </div>

          {scenarioFeedback && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 14,
              fontSize: '0.78rem',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--accent-amber)'
            }}>
              {scenarioFeedback.message}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { id: 'NORMAL', label: '1. Normal Balanced Operation', desc: 'Standard operating load curves across all rooms. Line loss is ~2.8%.' },
              { id: 'EMPTY_ROOM_WASTAGE', label: '2. Empty-Room Energy Wastage', desc: 'Computer Lab 1 is unoccupied, but 30 high-spec PCs remain active (7.8 kW).' },
              { id: 'UNUSUAL_POWER_SPIKE', label: '3. Unusual Power Spike Surge', desc: 'Central AC chiller compressor suffers uncharacteristic surge to 32 kW.' },
              { id: 'METER_MISMATCH', label: '4. Supply-vs-Meter Discrepancy', desc: 'Main Incomer shows 54 kW while submeters sum is 42 kW (22% loss).' },
              { id: 'MISSING_SENSOR_DATA', label: '5. Missing Sensor Data (Offline)', desc: 'Classroom 101 smart sensor node drops offline (Missing Telemetry).' },
              { id: 'INVALID_READINGS', label: '6. Invalid Sensor Noise / Distortion', desc: 'Admin office voltage swings to 295V with negative current spikes.' }
            ].map((sc) => (
              <div
                key={sc.id}
                onClick={() => handleSwitchScenario(sc.id)}
                style={{
                  padding: '12px 14px',
                  background: activeScenario === sc.id ? 'var(--bg-card-hover)' : 'var(--bg-secondary)',
                  border: `1px solid ${activeScenario === sc.id ? 'var(--accent-green)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>{sc.label}</div>
                  {activeScenario === sc.id && (
                    <span className="badge badge-green">Active Preset</span>
                  )}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {sc.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Apps Script Code Modal */}
      {showScriptModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            width: '100%',
            maxWidth: 720,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileSpreadsheet size={18} color="var(--accent-green)" />
                Google Apps Script Code (Copy & Paste)
              </div>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setShowScriptModal(false)}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                Paste this script into Google Sheets (<strong>Extensions &gt; Apps Script</strong>), deploy as a <strong>Web App (Access: Anyone)</strong>, and copy the Web App URL back into Settings!
              </p>

              <div style={{ position: 'relative' }}>
                <button
                  onClick={handleCopyCode}
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    background: copiedCode ? 'var(--accent-green)' : 'var(--bg-secondary)',
                    color: copiedCode ? '#000' : 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Copy size={12} />
                  {copiedCode ? 'Copied!' : 'Copy Script Code'}
                </button>

                <pre style={{
                  background: '#090d14',
                  padding: 16,
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.74rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#94a3b8',
                  overflowX: 'auto',
                  maxHeight: 380,
                  lineHeight: 1.5,
                  border: '1px solid var(--border-subtle)'
                }}>
                  {appsScriptCode}
                </pre>
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-primary btn-sm" onClick={handleCopyCode}>
                <Copy size={14} /> {copiedCode ? 'Copied to Clipboard!' : 'Copy Entire Code'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowScriptModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attribution Card */}
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <ShieldCheck size={20} color="var(--accent-green)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>CurrentGuard AI — Academic & Prototype Governance</h3>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Developed by <strong>Lohith K, John Christ S, Nigun S</strong> (B.E. Computer Science and Engineering – Cyber Security, Rathinam Technical Campus, Coimbatore). Aligned with <strong>UN SDG 7 (Affordable and Clean Energy)</strong> and <strong>SDG 13 (Climate Action)</strong>. All sensor readings in this stage are simulated and safely isolated from high-voltage electrical mains.
        </p>
      </div>
    </div>
  );
}

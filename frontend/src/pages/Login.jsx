import React, { useState } from 'react';
import { Zap, ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';

const USERS = [
  { username: 'admin',       password: 'admin123',    full_name: 'Lohith K',     role: 'Administrator' },
  { username: 'maintenance', password: 'maint123',    full_name: 'John Christ S', role: 'Maintenance Staff' },
  { username: 'auditor',     password: 'audit123',    full_name: 'Nigun S',       role: 'Energy Auditor' },
  { username: 'viewer',      password: 'view123',     full_name: 'Guest Viewer',  role: 'Authorized Viewer' },
];

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    await new Promise(r => setTimeout(r, 600)); // Simulated auth delay

    const user = USERS.find(
      u => u.username === username.trim().toLowerCase() &&
           u.password === password
    );

    if (user) {
      onLogin(user);
    } else {
      setError('Invalid username or password. Please try again.');
    }
    setLoading(false);
  };

  const handleQuickLogin = (user) => {
    setUsername(user.username);
    setPassword(user.password);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'var(--font-sans)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(16,185,129,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(6,182,212,0.05) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 1 }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 40px rgba(16,185,129,0.3)'
          }}>
            <Zap size={30} color="#0a0d14" fill="#0a0d14" />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: 0 }}>
            CurrentGuard AI
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>
            Intelligent Electricity Loss Management
          </p>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 8 }}>
            Vishwakarma Unique Application — Stage 2 Prototype
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px 36px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)'
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            Authorized Access Portal
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 24 }}>
            Sign in with your authorized credentials to access the energy monitoring dashboard.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Username
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. admin"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
                style={{ fontSize: '0.9rem', padding: '10px 14px' }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{ fontSize: '0.9rem', padding: '10px 40px 10px 14px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                background: 'var(--accent-red-bg)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: '0.82rem', color: 'var(--accent-red)'
              }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '11px', fontSize: '0.9rem', justifyContent: 'center', marginBottom: 8 }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 14, height: 14, border: '2px solid #0b1118', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  Authenticating…
                </span>
              ) : (
                <>
                  <ShieldCheck size={16} /> Sign In Securely
                </>
              )}
            </button>
          </form>

          {/* Quick Login Demo Panel */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Demo Quick-Login (Prototype)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {USERS.map(u => (
                <button
                  key={u.username}
                  type="button"
                  onClick={() => handleQuickLogin(u)}
                  style={{
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)', padding: '8px 10px', cursor: 'pointer',
                    textAlign: 'left', transition: 'all 0.15s ease',
                    fontFamily: 'var(--font-sans)'
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent-green)'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{u.full_name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-green)', marginTop: 1 }}>{u.role}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>@{u.username}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Safety Notice */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            🔒 Student prototype — simulated readings only. No live 230V hardware connected.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

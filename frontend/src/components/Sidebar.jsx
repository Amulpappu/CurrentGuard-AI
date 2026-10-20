import React from 'react';
import { 
  LayoutDashboard, 
  Activity, 
  Laptop,
  DoorOpen, 
  AlertTriangle, 
  CheckCircle2, 
  History, 
  Settings,
  ShieldCheck
} from 'lucide-react';

export default function Sidebar({ currentPage, setCurrentPage, alertCount = 0 }) {
  const navItems = [
    { id: 'dashboard',     label: 'Dashboard',       icon: LayoutDashboard },
    { id: 'monitoring',    label: 'Live Monitoring',  icon: Activity },
    { id: 'laptop-sensor', label: 'Laptop Sensor',   icon: Laptop },
    { id: 'rooms',         label: 'Rooms',            icon: DoorOpen },
    { id: 'alerts',        label: 'Alerts',           icon: AlertTriangle, badge: alertCount },
    { id: 'verification',  label: 'Verification',     icon: CheckCircle2 },
    { id: 'history',       label: 'Event History',    icon: History },
    { id: 'settings',      label: 'Settings',         icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div style={{
          width: 38, height: 38,
          background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#0a0d14" />
          </svg>
        </div>
        <div>
          <div className="sidebar-brand-title">CURRENTGUARD AI</div>
          <div className="sidebar-brand-sub">Stage 2 Prototype</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <div
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.74rem', color: 'var(--accent-green)' }}>
          <ShieldCheck size={16} />
          <span>Low-Voltage Hardware Safe</span>
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
          No 230V mains connection. Prototype simulation &amp; DC sensor bridge.
        </div>
      </div>
    </aside>
  );
}

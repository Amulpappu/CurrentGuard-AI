import React, { useState, useEffect } from 'react';
import { 
  DoorOpen, 
  UserCheck, 
  UserX, 
  Zap, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { api } from '../api/client';
import QualityBadge from '../components/QualityBadge';

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingRoom, setTogglingRoom] = useState(null);

  const fetchRooms = async () => {
    try {
      const res = await api.getRooms();
      setRooms(res);
      setLoading(false);
    } catch (e) {
      console.error('Fetch rooms error:', e);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleOccupancy = async (roomId) => {
    setTogglingRoom(roomId);
    try {
      await api.toggleRoomOccupancy(roomId);
      await fetchRooms();
    } catch (e) {
      console.error('Toggle occupancy error:', e);
    } finally {
      setTogglingRoom(null);
    }
  };

  if (loading && rooms.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 12px' }} />
        <div>Loading monitored rooms...</div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Monitored Campus Facilities</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Real-time multi-circuit submetering with automated occupancy-correlated energy waste detection.
          </p>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Total Facilities Monitored: <strong style={{ color: 'var(--text-primary)' }}>{rooms.length}</strong>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 20
      }}>
        {rooms.map((room) => {
          const pctOfBaseline = room.baseline_power_kw > 0 
            ? (room.current_power_kw / room.baseline_power_kw) * 100 
            : 0;

          const isOverloaded = pctOfBaseline > 130;
          const isWasting = !room.is_occupied && room.current_power_kw > 1.2;

          return (
            <div key={room.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Card Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {room.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {room.room_type} • Floor {room.floor} • Base: {room.baseline_power_kw} kW
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span className={`badge ${room.status === 'critical' ? 'badge-red' : room.status === 'warning' ? 'badge-amber' : 'badge-green'}`}>
                    {room.status}
                  </span>
                  <QualityBadge status={room.data_quality} />
                </div>
              </div>

              {/* Main Electrical Metrics Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                background: 'var(--bg-secondary)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 16
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Power</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: isOverloaded ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                    {room.current_power_kw.toFixed(2)} <span style={{ fontSize: '0.75rem' }}>kW</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                    {room.current_amps.toFixed(1)} <span style={{ fontSize: '0.75rem' }}>A</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Voltage / PF</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                    {room.voltage.toFixed(1)}V • {room.power_factor.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Baseline Load Bar */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Load vs Baseline Capacity</span>
                  <span style={{ fontWeight: 600, color: isOverloaded ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                    {pctOfBaseline.toFixed(0)}%
                  </span>
                </div>
                <div style={{ width: '100%', height: 6, background: 'var(--border-subtle)', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, pctOfBaseline)}%`,
                    height: '100%',
                    background: isOverloaded ? 'var(--accent-red)' : pctOfBaseline > 85 ? 'var(--accent-amber)' : 'var(--accent-green)',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </div>

              {/* Occupancy and Waste Status Footer */}
              <div style={{
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 14,
                borderTop: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {room.is_occupied ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--accent-green)' }}>
                      <UserCheck size={16} /> Occupied
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: isWasting ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                      <UserX size={16} /> Unoccupied {isWasting && '— Wastage!'}
                    </span>
                  )}
                </div>

                <button
                  className={`btn ${room.is_occupied ? 'btn-secondary' : 'btn-amber'} btn-sm`}
                  disabled={togglingRoom === room.id}
                  onClick={() => handleToggleOccupancy(room.id)}
                >
                  {room.is_occupied ? 'Set Unoccupied' : 'Set Occupied'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

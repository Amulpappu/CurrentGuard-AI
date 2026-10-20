import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import LiveMonitoring from './pages/LiveMonitoring';
import Rooms from './pages/Rooms';
import Alerts from './pages/Alerts';
import Verification from './pages/Verification';
import EventHistory from './pages/EventHistory';
import Settings from './pages/Settings';
import Login from './pages/Login';
import LaptopSensor from './pages/LaptopSensor';
import { api } from './api/client';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null); // null = not logged in
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [alertCount, setAlertCount] = useState(0);
  const [activeScenario, setActiveScenario] = useState('NORMAL');
  const [activeTariff, setActiveTariff] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedAlertForVerification, setSelectedAlertForVerification] = useState(null);

  // Poll system status & active counts — only when logged in
  const fetchGlobalState = async () => {
    try {
      const [sum, sim, tariffs, usersRes] = await Promise.all([
        api.getSummary(),
        api.getSimulatorStatus(),
        api.getTariffs(),
        api.getUsers()
      ]);

      if (sum) {
        setAlertCount(sum.active_alerts_count);
        setActiveTariff(sum.active_tariff);
      }
      if (sim) {
        setActiveScenario(sim.active_scenario);
      }
      if (usersRes) {
        setUsers(usersRes);
      }
    } catch (err) {
      console.error('Global state poll error:', err);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    fetchGlobalState();
    const interval = setInterval(fetchGlobalState, 3000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // --- LOGIN GATE ---
  if (!currentUser) {
    return <Login onLogin={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="app-container">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        alertCount={alertCount}
      />

      <div className="main-content">
        <Navbar
          currentPage={currentPage}
          activeScenario={activeScenario}
          activeTariff={activeTariff}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          users={users}
          onLogout={() => setCurrentUser(null)}
        />

        <main>
          {currentPage === 'dashboard' && (
            <Dashboard setCurrentPage={setCurrentPage} />
          )}
          {currentPage === 'monitoring' && (
            <LiveMonitoring onScenarioChange={(sc) => setActiveScenario(sc)} />
          )}
          {currentPage === 'laptop-sensor' && (
            <LaptopSensor />
          )}
          {currentPage === 'rooms' && (
            <Rooms />
          )}
          {currentPage === 'alerts' && (
            <Alerts
              setCurrentPage={setCurrentPage}
              setSelectedAlertForVerification={setSelectedAlertForVerification}
            />
          )}
          {currentPage === 'verification' && (
            <Verification
              currentUser={currentUser}
              selectedAlertForVerification={selectedAlertForVerification}
              setSelectedAlertForVerification={setSelectedAlertForVerification}
              setCurrentPage={setCurrentPage}
            />
          )}
          {currentPage === 'history' && (
            <EventHistory />
          )}
          {currentPage === 'settings' && (
            <Settings
              activeScenario={activeScenario}
              setActiveScenario={setActiveScenario}
              activeTariff={activeTariff}
              setActiveTariff={setActiveTariff}
            />
          )}
        </main>
      </div>
    </div>
  );
}

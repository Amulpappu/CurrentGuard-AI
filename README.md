# CurrentGuard AI ⚡
> **Intelligent Electricity Loss and Energy Waste Management System**  
> *Vishwakarma Unique Application — Prototype Web Dashboard & Telemetry Platform*

---

## 🌟 Overview

**CurrentGuard AI** is a real-time smart energy management and anomaly detection platform designed to identify unusual electricity consumption, unauthorized energy wastage, and supply-versus-submeter distribution losses across multi-zone facilities (campuses, hospitals, commercial complexes).

### Core Features
- 📊 **Executive Overview Dashboard**: Real-time campus KPIs, 24-hour diurnal load curves, peak demand detection, and loss indicators.
- 📡 **High-Frequency Live Monitoring (SCADA)**: 1-second live telemetry streaming with oscilloscope-style waveform charts and interactive appliance controls.
- 🏫 **Multi-Zone Room Energy Monitoring**: Individual telemetry tracking for computer labs, classrooms, server rooms, and AC chiller plants.
- 🚨 **AI Anomaly Detection Engine**: Automated detection of unoccupied room power wastage, meter tampering, feeder divergence, and sensor signal degradation.
- 🛡️ **Authorized Human Verification Workflow**: Complete audit trail for maintenance staff to verify, inspect, and sign off on physical anomalies.
- 💻 **Workstation / Laptop Power Sensor Node**: Integrated real-time hardware telemetry reading CPU load, RAM, battery, and estimating AC wattage.
- 🗄️ **Dual-Mode Cloud Database**: High-speed local SQLite database with automated background synchronization to **Google Sheets** via Google Apps Script (zero API key/billing required).

---

## 🏗️ Project Architecture

```
CurrentGuard AI/
├── backend/                  # FastAPI Python Backend
│   ├── app/
│   │   ├── main.py           # Application entrypoint & background collector loop
│   │   ├── models.py         # SQLAlchemy ORM models (Rooms, Telemetry, Alerts, Snapshots)
│   │   ├── schemas.py        # Pydantic schemas & validation
│   │   ├── database.py       # SQLite engine & session management
│   │   ├── detection.py      # AI rule-based anomaly detection algorithms
│   │   ├── simulator.py      # Physics-based campus energy simulation engine
│   │   ├── seed.py           # Initial database seeding (users, rooms, tariffs, history)
│   │   ├── google_sheets.py  # Google Sheets cloud database sync adapter
│   │   └── routers/          # REST API endpoints (telemetry, rooms, alerts, settings, etc.)
│   ├── google_apps_script.js # Apps Script code for Google Sheets Web App
│   ├── requirements.txt      # Python dependencies
│   └── .env                  # Environment configuration
│
├── frontend/                 # React 18 + Vite Modern Web Dashboard
│   ├── src/
│   │   ├── components/       # Reusable UI components (Navbar, Sidebar, StatCards, Badges)
│   │   ├── pages/            # Views (Dashboard, LiveMonitoring, Rooms, Alerts, Verification, etc.)
│   │   ├── api/client.js     # Unified API client
│   │   └── utils/            # Chart.js configs and helpers
│   ├── package.json          # Frontend dependencies
│   └── vite.config.js        # Vite dev server configuration
│
├── run_backend.bat           # One-click backend startup script
├── run_frontend.bat          # One-click frontend startup script
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & npm

---

### 1. Backend Setup

```bash
cd backend
python -m venv .venv

# Windows activation
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API and Swagger docs will be available at:
- **API Server:** `http://127.0.0.1:8000`
- **Interactive Documentation:** `http://127.0.0.1:8000/docs`

---

### 2. Frontend Setup

In a separate terminal:
```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
The web dashboard will be available at:
- **Web Dashboard:** `http://localhost:5173`

---

## 🔑 Demo Login Credentials

| Username | Password | Role | Permissions |
|---|---|---|---|
| `admin` | `admin123` | **Administrator** | Full access to all controls & settings |
| `maintenance` | `maint123` | **Maintenance Staff** | Inspect, verify, and resolve alerts |
| `auditor` | `audit123` | **Energy Auditor** | Energy accounting, export, tariff analysis |
| `viewer` | `view123` | **Authorized Viewer** | Read-only observation |

---

## 📄 License
MIT License. Built for Vishwakarma Unique Application Stage 2 Prototype.

"""
CurrentGuard AI — Laptop Sensor Module
Uses real CPU/memory/battery data from psutil to simulate
an IoT energy sensor reading (safe, no hardware connection required).

Since the real sensor is not yet deployed, this module reads:
  - Actual CPU % → converted to estimated wattage (0–100% of TDP)
  - Actual RAM usage %
  - Battery status (if present)
  - Simulated voltage (230V AC supply side)

This represents the laptop itself as a monitored device/node.
"""

import datetime
import math
import random

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import LaptopReading as LaptopReadingModel

router = APIRouter(prefix="/laptop-sensor", tags=["laptop-sensor"])

# Laptop TDP profile — typical student laptop
LAPTOP_TDP_WATTS = 65.0      # Max TDP (full load)
LAPTOP_IDLE_WATTS = 8.0      # Idle baseline (screen + background)
CHARGER_EFFICIENCY = 0.88    # AC/DC charger efficiency

_history = []  # Rolling 60-second history


def _get_cpu_power_watts() -> float:
    """
    Estimate wattage from actual CPU load.
    Formula: idle_w + (cpu_pct/100) * (TDP - idle_w)
    """
    if not PSUTIL_AVAILABLE:
        # Fallback: sine-wave simulation if psutil missing
        t = datetime.datetime.utcnow().second
        cpu_pct = 30 + 25 * math.sin(t / 10.0) + random.uniform(-5, 5)
        cpu_pct = max(5.0, min(100.0, cpu_pct))
    else:
        cpu_pct = psutil.cpu_percent(interval=None)

    cpu_component = (cpu_pct / 100.0) * (LAPTOP_TDP_WATTS - LAPTOP_IDLE_WATTS)
    total_dc_watts = LAPTOP_IDLE_WATTS + cpu_component
    # AC wall draw (accounting for charger efficiency)
    ac_watts = total_dc_watts / CHARGER_EFFICIENCY
    return round(ac_watts, 2), round(cpu_pct, 1)


def _get_battery_info():
    if not PSUTIL_AVAILABLE:
        return {"percent": 72.0, "plugged": True, "status": "Charging", "minutes_left": None}
    try:
        batt = psutil.sensors_battery()
        if batt is None:
            return {"percent": 100.0, "plugged": True, "status": "AC Power (No Battery)", "minutes_left": None}
        status = "Charging" if batt.power_plugged else "Discharging"
        mins = round(batt.secsleft / 60, 1) if batt.secsleft not in (-1, -2) else None
        return {
            "percent": round(batt.percent, 1),
            "plugged": batt.power_plugged,
            "status": status,
            "minutes_left": mins
        }
    except Exception:
        return {"percent": 80.0, "plugged": True, "status": "Unknown", "minutes_left": None}


def _get_memory_info():
    if not PSUTIL_AVAILABLE:
        return {"percent": 62.0, "used_gb": 4.8, "total_gb": 8.0}
    try:
        mem = psutil.virtual_memory()
        return {
            "percent": round(mem.percent, 1),
            "used_gb": round(mem.used / (1024 ** 3), 2),
            "total_gb": round(mem.total / (1024 ** 3), 2)
        }
    except Exception:
        return {"percent": 60.0, "used_gb": 4.0, "total_gb": 8.0}


@router.get("/reading")
def get_laptop_reading(db: Session = Depends(get_db)):
    """
    Returns real-time power reading of this laptop as an IoT sensor node.
    CPU load → AC wattage → kW → cost estimation.
    Persists every reading to laptop_readings table.
    """
    now = datetime.datetime.utcnow()
    ac_watts, cpu_pct = _get_cpu_power_watts()
    battery = _get_battery_info()
    memory = _get_memory_info()

    voltage_v = 230.0 + random.uniform(-1.5, 1.5)
    power_kw = ac_watts / 1000.0
    current_amps = round((ac_watts) / (voltage_v * 0.92), 3)
    power_factor = 0.90 + random.uniform(-0.03, 0.03)
    frequency_hz = 50.0 + random.uniform(-0.05, 0.05)

    hourly_cost_rs = round(power_kw * 6.77, 4)
    daily_cost_rs = round(power_kw * 6.77 * 8, 2)

    if cpu_pct > 85:
        status = "high_load"
    elif cpu_pct > 50:
        status = "moderate_load"
    else:
        status = "normal"

    reading = {
        "timestamp": now.isoformat(),
        "device": "Laptop / Developer Workstation",
        "sensor_type": "psutil_cpu_power",
        "simulated": not PSUTIL_AVAILABLE,
        "cpu_percent": cpu_pct,
        "ac_power_watts": ac_watts,
        "power_kw": round(power_kw, 4),
        "voltage_v": round(voltage_v, 1),
        "current_amps": current_amps,
        "power_factor": round(power_factor, 3),
        "frequency_hz": round(frequency_hz, 2),
        "hourly_cost_rs": hourly_cost_rs,
        "daily_cost_rs": daily_cost_rs,
        "battery": battery,
        "memory": memory,
        "status": status,
        "data_quality": "real" if PSUTIL_AVAILABLE else "simulated"
    }

    # ─── PERSIST to laptop_readings table ─────────────────────────────────
    try:
        db_reading = LaptopReadingModel(
            timestamp=now,
            cpu_percent=cpu_pct,
            ac_power_watts=ac_watts,
            power_kw=round(power_kw, 4),
            voltage_v=round(voltage_v, 1),
            current_amps=current_amps,
            power_factor=round(power_factor, 3),
            battery_percent=battery["percent"],
            battery_plugged=battery["plugged"],
            memory_percent=memory["percent"],
            hourly_cost_rs=hourly_cost_rs,
            data_quality="real" if PSUTIL_AVAILABLE else "simulated",
            status=status
        )
        db.add(db_reading)

        # Keep only last 2880 laptop readings (≈1 day if reading every 30s)
        total = db.query(LaptopReadingModel).count()
        if total > 2880:
            oldest = db.query(LaptopReadingModel).order_by(LaptopReadingModel.timestamp.asc()).first()
            if oldest:
                db.delete(oldest)
        db.commit()
    except Exception:
        pass

    # Append to rolling in-memory history
    _history.append({
        "timestamp": now.strftime("%H:%M:%S"),
        "watts": ac_watts,
        "cpu_pct": cpu_pct
    })
    if len(_history) > 60:
        _history.pop(0)

    return reading


@router.get("/history")
def get_laptop_history():
    """Returns rolling 60-second wattage history for the laptop sensor."""
    return {
        "points": _history,
        "count": len(_history)
    }


@router.get("/status")
def get_sensor_status():
    """Returns sensor availability and system info."""
    sys_info = {}
    if PSUTIL_AVAILABLE:
        try:
            sys_info["cpu_count"] = psutil.cpu_count()
            sys_info["cpu_freq_mhz"] = round(psutil.cpu_freq().current, 0) if psutil.cpu_freq() else None
            boot = datetime.datetime.fromtimestamp(psutil.boot_time())
            sys_info["uptime_hours"] = round((datetime.datetime.now() - boot).total_seconds() / 3600, 1)
        except Exception:
            pass

    return {
        "available": PSUTIL_AVAILABLE,
        "laptop_tdp_w": LAPTOP_TDP_WATTS,
        "idle_baseline_w": LAPTOP_IDLE_WATTS,
        "charger_efficiency": CHARGER_EFFICIENCY,
        "system_info": sys_info,
        "message": "Reading real CPU metrics" if PSUTIL_AVAILABLE else "psutil not installed — using simulation"
    }

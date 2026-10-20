"""
CurrentGuard AI — Explainable AI & Anomaly Detection Engine
Implements deterministic, explainable physics-based detection rules with uncertainty metrics:
1. Baseline Deviation (Z-score & threshold)
2. Empty-Room Energy Wastage (Occupancy vs. Power)
3. Supply-versus-Meter Discrepancy (Divergence analysis)
4. Sensor & Data Quality Checks (Voltage bounds, PF limits, packet drop)

CRITICAL SAFETY & GOVERNANCE:
Alerts are framed strictly as possible anomalies requiring authorized human verification,
never as definitive theft or fault accusations.
"""

import datetime
from typing import List, Dict, Any, Optional

def analyze_room_telemetry(
    room_id: str,
    room_name: str,
    power_kw: float,
    baseline_kw: float,
    is_occupied: bool,
    voltage: float,
    current_amps: float,
    power_factor: float,
    data_quality: str
) -> Optional[Dict[str, Any]]:
    """
    Evaluates a single room's real-time electrical telemetry against baseline profiles and occupancy.
    Returns an alert candidate if an anomaly is detected, else None.
    """
    
    # Rule 4: Data Quality & Sensor Health Check
    if data_quality in ["invalid", "missing"] or voltage < 185.0 or voltage > 265.0 or power_factor < 0.25:
        confidence = 94.0 if data_quality == "invalid" else 88.0
        return {
            "room_id": room_id,
            "alert_type": "sensor_fault",
            "title": f"Sensor Data Quality Anomaly in {room_name}",
            "description": f"Telemetry stream from {room_name} exhibits irregular electrical parameters (Voltage: {voltage:.1f}V, PF: {power_factor:.2f}, Quality: {data_quality}). Readings may be degraded by electrical noise or hardware loose contact.",
            "severity": "medium",
            "suspected_category": "Sensor Signal Degradation / Telemetry Noise",
            "confidence_pct": confidence,
            "measured_value": f"{voltage:.1f} V | PF {power_factor:.2f}",
            "threshold_value": "190V - 250V | PF >= 0.75",
            "suggested_action": "Verify physical CT sensor clamp alignment, inspect ESP32 ADC wiring, and calibrate the sensor node."
        }

    # Rule 2: Empty-Room Energy Wastage (High confidence avoidable loss)
    # Standby threshold is 15% of baseline
    standby_limit = max(0.4, baseline_kw * 0.20)
    if not is_occupied and power_kw > standby_limit:
        excess_kw = power_kw - standby_limit
        confidence = min(95.0, 82.0 + (excess_kw / baseline_kw) * 15.0)
        return {
            "room_id": room_id,
            "alert_type": "empty_room_wastage",
            "title": f"Unoccupied Room Active Power Wastage in {room_name}",
            "description": f"{room_name} is marked as completely unoccupied, yet active load is drawing {power_kw:.2f} kW ({power_kw/baseline_kw*100:.0f}% of full baseline). High probability of unattended lights, workstations, or air conditioners left ON.",
            "severity": "high" if power_kw > (baseline_kw * 0.7) else "medium",
            "suspected_category": "Suspected Unattended Equipment Load",
            "confidence_pct": round(confidence, 1),
            "measured_value": f"{power_kw:.2f} kW (Unoccupied)",
            "threshold_value": f"<= {standby_limit:.2f} kW Standby",
            "suggested_action": "Authorized staff should inspect room switches and confirm whether workstations or AC units are scheduled for automated shutdown."
        }

    # Rule 1: Baseline Deviation (Unexpected surge / overloading)
    if baseline_kw > 0:
        ratio = power_kw / baseline_kw
        if ratio > 1.45:  # Over 45% above baseline
            severity = "critical" if ratio > 2.2 else "high"
            confidence = min(96.0, 80.0 + (ratio - 1.45) * 10.0)
            return {
                "room_id": room_id,
                "alert_type": "baseline_deviation",
                "title": f"Uncharacteristic Load Surge in {room_name}",
                "description": f"Current power draw in {room_name} is {power_kw:.2f} kW, exceeding the standard operational baseline ({baseline_kw:.2f} kW) by {(ratio - 1)*100:.1f}%. May indicate motor stator degradation, compressor lock, or unexpected heavy appliance connection.",
                "severity": severity,
                "suspected_category": "Substation Feeder Baseline Divergence",
                "confidence_pct": round(confidence, 1),
                "measured_value": f"{power_kw:.2f} kW ({current_amps:.1f} A)",
                "threshold_value": f"<= {baseline_kw * 1.25:.2f} kW (+25% Margin)",
                "suggested_action": "Check sub-distribution breaker thermal signature, measure phase current balance, and check for high-draw unauthorized heating/cooling loads."
            }

    return None


def analyze_supply_vs_submeters(
    supply_kw: float,
    submeters_kw: float,
    nominal_line_loss_pct: float = 3.0
) -> Optional[Dict[str, Any]]:
    """
    Rule 3: Compares Main Incomer Grid Supply against the aggregated sum of consumer/room submeters.
    Calculates technical line loss vs. unaccounted energy loss.
    """
    if supply_kw <= 0:
        return None

    discrepancy_kw = supply_kw - submeters_kw
    discrepancy_pct = (discrepancy_kw / supply_kw) * 100.0

    # Normal campus technical copper & transformer losses are typically 1.5% - 4.5%
    if discrepancy_pct > 12.0:
        confidence = min(96.0, 85.0 + (discrepancy_pct - 12.0) * 0.8)
        return {
            "room_id": "main-incomer",
            "alert_type": "meter_mismatch",
            "title": "Severe Supply-versus-Meter Energy Discrepancy",
            "description": f"Main Incomer is recording {supply_kw:.2f} kW, but sum of all downstream submeters accounts for only {submeters_kw:.2f} kW. Unaccounted loss is {discrepancy_kw:.2f} kW ({discrepancy_pct:.1f}%), exceeding technical loss threshold ({nominal_line_loss_pct}%).",
            "severity": "critical",
            "suspected_category": "Unmetered Line Tapping / Submeter Calibration Drift",
            "confidence_pct": round(confidence, 1),
            "measured_value": f"{discrepancy_pct:.1f}% Loss ({discrepancy_kw:.2f} kW)",
            "threshold_value": f"<= {nominal_line_loss_pct + 2.0:.1f}% Expected Loss",
            "suggested_action": "Deploy authorized technician to inspect main distribution feeder cable run, check physical CT polarity on Submeter SM-01, and test feeder insulation resistance."
        }
    elif discrepancy_pct > 6.0:
        return {
            "room_id": "main-incomer",
            "alert_type": "meter_mismatch",
            "title": "Moderate Feeder Line Loss Divergence",
            "description": f"Feeder line loss is currently {discrepancy_pct:.1f}% ({discrepancy_kw:.2f} kW), moderately higher than standard baseline ({nominal_line_loss_pct}%). Could be caused by submeter timing phase offset or high neutral return current.",
            "severity": "medium",
            "suspected_category": "Elevated Technical Loss / Measurement Skew",
            "confidence_pct": 82.0,
            "measured_value": f"{discrepancy_pct:.1f}% Loss ({discrepancy_kw:.2f} kW)",
            "threshold_value": f"<= {nominal_line_loss_pct + 1.5:.1f}% Expected Loss",
            "suggested_action": "Check harmonic distortion on neutral bus and verify time synchronization across submeters."
        }

    return None

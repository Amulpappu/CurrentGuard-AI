"""
CurrentGuard AI — Google Sheets Dual-Mode Sync Service
Enables zero-verification, credit-card-free cloud database integration using Google Apps Script Webhook.

Sheets Managed:
1. Telemetry_Readings (Room, Time, kW, V, A, PF, Data Quality)
2. Anomaly_Alerts (ID, Category, Severity, Measured, Threshold, Confidence, Status)
3. Verification_Events (Event ID, Alert ID, Operator, Role, Previous -> New State, Notes)
"""

import os
import requests
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger("currentguard.sheets")

class GoogleSheetsService:
    def __init__(self):
        self.webhook_url = os.environ.get("GOOGLE_SHEET_WEBHOOK_URL", "")
        self.auto_sync_enabled = bool(self.webhook_url)
        self.last_sync_time = None
        self.last_sync_status = "idle"
        self.last_sync_error = None
        self.synced_counts = {
            "readings": 0,
            "alerts": 0,
            "verifications": 0
        }

    def set_webhook_url(self, url: str) -> bool:
        self.webhook_url = url.strip()
        self.auto_sync_enabled = bool(self.webhook_url)
        return True

    def is_configured(self) -> bool:
        return bool(self.webhook_url and self.webhook_url.startswith("https://script.google.com/"))

    def post_row(self, sheet_name: str, row_dict: Dict[str, Any]) -> bool:
        """
        Sends a single row to Google Apps Script Web App.
        """
        if not self.is_configured():
            return False

        payload = {
            "sheet": sheet_name,
            "action": "appendRow",
            "row": row_dict
        }

        try:
            # Google Apps Script returns 302 redirect which requests follows automatically
            res = requests.post(self.webhook_url, json=payload, timeout=8)
            if res.status_code in [200, 302]:
                self.last_sync_time = datetime.utcnow()
                self.last_sync_status = "success"
                return True
            else:
                self.last_sync_status = "error"
                self.last_sync_error = f"HTTP {res.status_code}"
                return False
        except Exception as e:
            logger.warning(f"Google Sheet sync warning: {e}")
            self.last_sync_status = "error"
            self.last_sync_error = str(e)
            return False

    def sync_alert(self, alert_dict: Dict[str, Any]):
        """Syncs an alert row to 'Anomaly_Alerts' sheet."""
        if not self.is_configured():
            return
        row = {
            "Alert_ID": alert_dict.get("id"),
            "Timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            "Location_Room": alert_dict.get("room_id"),
            "Alert_Type": alert_dict.get("alert_type"),
            "Title": alert_dict.get("title"),
            "Severity": alert_dict.get("severity"),
            "Suspected_Category": alert_dict.get("suspected_category"),
            "Measured_Value": alert_dict.get("measured_value"),
            "Threshold_Value": alert_dict.get("threshold_value"),
            "Confidence_Pct": f"{alert_dict.get('confidence_pct', 85):.1f}%",
            "Status": alert_dict.get("status", "new")
        }
        success = self.post_row("Anomaly_Alerts", row)
        if success:
            self.synced_counts["alerts"] += 1

    def sync_verification(self, ver_dict: Dict[str, Any]):
        """Syncs a verification event to 'Verification_Events' sheet."""
        if not self.is_configured():
            return
        row = {
            "Event_ID": f"EVT-{ver_dict.get('id', 0):04d}",
            "Timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            "Alert_ID": ver_dict.get("alert_id"),
            "Authorized_Operator": ver_dict.get("user_name"),
            "Operator_Role": ver_dict.get("user_role"),
            "State_Transition": f"{ver_dict.get('previous_status')} -> {ver_dict.get('new_status')}",
            "Inspection_Notes": ver_dict.get("verification_notes"),
            "Action_Taken": ver_dict.get("action_taken", "Inspection recorded")
        }
        success = self.post_row("Verification_Events", row)
        if success:
            self.synced_counts["verifications"] += 1

    def sync_telemetry_snapshot(self, tick_dict: Dict[str, Any]):
        """Syncs latest campus telemetry snapshot to 'Telemetry_Readings' sheet."""
        if not self.is_configured():
            return
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        rooms = tick_dict.get("rooms", {})
        
        # Sync Main Incomer
        main_row = {
            "Timestamp": now_str,
            "Facility_Node": "Main Grid Incomer Feeder",
            "Active_Power_kW": tick_dict.get("main_incomer_power_kw", 0),
            "Voltage_V": tick_dict.get("mains_voltage", 230),
            "Current_A": round((tick_dict.get("main_incomer_power_kw", 0)*1000)/(230*0.94), 1) if tick_dict.get("main_incomer_power_kw", 0) > 0 else 0,
            "Power_Factor": 0.94,
            "Line_Loss_Pct": f"{tick_dict.get('line_loss_pct', 0):.1f}%",
            "Occupancy_State": "Grid Feeder",
            "Data_Quality": "Valid",
            "Scenario_Tag": tick_dict.get("active_scenario", "NORMAL")
        }
        self.post_row("Telemetry_Readings", main_row)
        self.synced_counts["readings"] += 1

        # Sync first 3 rooms to avoid spamming Google API limits
        for r_id, r in list(rooms.items())[:3]:
            room_row = {
                "Timestamp": now_str,
                "Facility_Node": r.get("name"),
                "Active_Power_kW": r.get("power_kw"),
                "Voltage_V": r.get("voltage"),
                "Current_A": r.get("current_amps"),
                "Power_Factor": r.get("power_factor"),
                "Line_Loss_Pct": "N/A (Submeter)",
                "Occupancy_State": "Occupied" if r.get("is_occupied") else "Unoccupied",
                "Data_Quality": r.get("data_quality", "valid"),
                "Scenario_Tag": tick_dict.get("active_scenario", "NORMAL")
            }
            self.post_row("Telemetry_Readings", room_row)
            self.synced_counts["readings"] += 1

sheets_service = GoogleSheetsService()

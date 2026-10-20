import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_db
from app.models import LocationTariff, User, Alert, VerificationEvent
from app.schemas import LocationTariffResponse, SetLocationRequest, UserResponse
from app.google_sheets import sheets_service
from app.simulator import simulator

router = APIRouter(prefix="/settings", tags=["settings"])

class UpdateRateRequest(BaseModel):
    rate_per_kwh: float

class GoogleSheetsConfigRequest(BaseModel):
    webhook_url: str
    auto_sync: Optional[bool] = True

@router.get("/tariffs", response_model=List[LocationTariffResponse])
def get_location_tariffs(db: Session = Depends(get_db)):
    """
    Returns list of all regional electricity tariffs with active status.
    """
    return db.query(LocationTariff).all()


@router.post("/tariffs/select", response_model=LocationTariffResponse)
def select_active_tariff(payload: SetLocationRequest, db: Session = Depends(get_db)):
    """
    Sets the active regional location and tariff schedule.
    """
    target = db.query(LocationTariff).filter_by(id=payload.location_id).first()
    if not target:
        raise HTTPException(status_code=404, detail=f"Location tariff '{payload.location_id}' not found")
    
    # Deactivate others
    db.query(LocationTariff).update({LocationTariff.is_active: False})
    target.is_active = True
    db.commit()
    db.refresh(target)
    
    return target


@router.put("/tariffs/{tariff_id}/rate", response_model=LocationTariffResponse)
def update_tariff_rate(tariff_id: str, payload: UpdateRateRequest, db: Session = Depends(get_db)):
    """
    Updates the unit rate per kWh for a specific tariff location.
    """
    if payload.rate_per_kwh <= 0:
        raise HTTPException(status_code=400, detail="Rate per kWh must be greater than zero")
        
    tariff = db.query(LocationTariff).filter_by(id=tariff_id).first()
    if not tariff:
        raise HTTPException(status_code=404, detail=f"Location tariff '{tariff_id}' not found")
        
    tariff.rate_per_kwh = payload.rate_per_kwh
    db.commit()
    db.refresh(tariff)
    return tariff


@router.get("/users", response_model=List[UserResponse])
def get_system_users(db: Session = Depends(get_db)):
    """
    Returns available user roles for the role switcher.
    """
    return db.query(User).all()


# --- Google Sheets Dual-Mode Database Endpoints ---

@router.get("/google-sheets")
def get_google_sheets_status():
    """
    Returns the current Google Sheets cloud database sync status.
    """
    return {
        "configured": sheets_service.is_configured(),
        "webhook_url": sheets_service.webhook_url,
        "auto_sync_enabled": sheets_service.auto_sync_enabled,
        "last_sync_time": sheets_service.last_sync_time,
        "last_sync_status": sheets_service.last_sync_status,
        "last_sync_error": sheets_service.last_sync_error,
        "synced_counts": sheets_service.synced_counts
    }


@router.post("/google-sheets")
def configure_google_sheets(payload: GoogleSheetsConfigRequest):
    """
    Configures the Google Apps Script Web App URL for zero-verification cloud syncing.
    """
    url = payload.webhook_url.strip()
    sheets_service.set_webhook_url(url)
    sheets_service.auto_sync_enabled = payload.auto_sync if payload.auto_sync is not None else bool(url)

    # Test connection if URL provided
    test_result = False
    if sheets_service.is_configured():
        test_result = sheets_service.post_row("Telemetry_Readings", {
            "Timestamp": "Test Connection",
            "Facility_Node": "CurrentGuard AI Cloud Ping",
            "Active_Power_kW": 0.0,
            "Voltage_V": 230.0,
            "Current_A": 0.0,
            "Power_Factor": 1.0,
            "Line_Loss_Pct": "0.0%",
            "Occupancy_State": "Testing",
            "Data_Quality": "Valid",
            "Scenario_Tag": "CONNECTION_CHECK"
        })

    return {
        "success": True,
        "configured": sheets_service.is_configured(),
        "test_connection_successful": test_result,
        "message": "Google Sheets Web App connected successfully!" if test_result else "Webhook URL saved. Connection could not be confirmed — check permissions."
    }


@router.post("/google-sheets/sync-all")
def sync_all_to_google_sheets(db: Session = Depends(get_db)):
    """
    Triggers immediate batch synchronization of current telemetry, all alerts, and verification history.
    """
    if not sheets_service.is_configured():
        raise HTTPException(
            status_code=400,
            detail="Google Sheets webhook is not configured yet. Paste your Web App URL in Settings."
        )

    # 1. Sync live telemetry
    tick = simulator.generate_tick()
    sheets_service.sync_telemetry_snapshot(tick)

    # 2. Sync all alerts
    alerts = db.query(Alert).all()
    for a in alerts:
        sheets_service.sync_alert({
            "id": a.id,
            "room_id": a.room_id,
            "alert_type": a.alert_type,
            "title": a.title,
            "severity": a.severity,
            "suspected_category": a.suspected_category,
            "measured_value": a.measured_value,
            "threshold_value": a.threshold_value,
            "confidence_pct": a.confidence_pct,
            "status": a.status
        })

    # 3. Sync verification history
    ver_events = db.query(VerificationEvent).all()
    for v in ver_events:
        sheets_service.sync_verification({
            "id": v.id,
            "alert_id": v.alert_id,
            "user_name": v.user_name,
            "user_role": v.user_role,
            "previous_status": v.previous_status,
            "new_status": v.new_status,
            "verification_notes": v.verification_notes,
            "action_taken": v.action_taken
        })

    return {
        "success": True,
        "message": f"Synchronized snapshot to Google Sheets: {len(alerts)} alerts, {len(ver_events)} verification logs, and telemetry.",
        "counts": sheets_service.synced_counts
    }


@router.get("/google-sheets/script-code")
def get_apps_script_code():
    """
    Returns the ready-to-copy Google Apps Script code for display in the frontend modal.
    """
    script_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "google_apps_script.js")
    if os.path.exists(script_path):
        with open(script_path, "r", encoding="utf-8") as f:
            code = f.read()
        return {"code": code}
    return {"code": "// Apps script template available in backend/google_apps_script.js"}

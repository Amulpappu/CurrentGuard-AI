from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any
from app.simulator import simulator
from app.schemas import ScenarioSetRequest, ScenarioResponse

router = APIRouter(prefix="/simulator", tags=["simulator"])

class ApplianceToggleRequest(BaseModel):
    appliance_key: str

@router.get("/status")
def get_simulator_status():
    """
    Returns the current simulation engine status and active scenario.
    """
    return {
        "active_scenario": simulator.active_scenario,
        "tick_counter": simulator.tick_counter,
        "accumulated_kwh": round(simulator.accumulated_kwh, 3),
        "appliances": simulator.appliances,
        "scenario_started_at": simulator.scenario_start_time
    }


@router.post("/scenario", response_model=ScenarioResponse)
def set_scenario(payload: ScenarioSetRequest):
    """
    Switches simulation scenario preset to demonstrate specific anomalies:
    - NORMAL
    - EMPTY_ROOM_WASTAGE
    - UNUSUAL_POWER_SPIKE
    - METER_MISMATCH
    - MISSING_SENSOR_DATA
    - INVALID_READINGS
    """
    try:
        res = simulator.set_scenario(payload.scenario)
        return ScenarioResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/toggle-appliance")
def toggle_appliance(payload: ApplianceToggleRequest):
    """
    Toggles a specific appliance load (e.g. 'lab_pcs_lab1', 'central_ac').
    """
    if payload.appliance_key not in simulator.appliances:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown appliance key. Available: {list(simulator.appliances.keys())}"
        )
    
    new_state = simulator.toggle_appliance(payload.appliance_key)
    return {
        "success": True,
        "appliance_key": payload.appliance_key,
        "is_active": new_state,
        "message": f"Appliance '{payload.appliance_key}' turned {'ON' if new_state else 'OFF'}"
    }

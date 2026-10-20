from pydantic import BaseModel, Field
from typing import List, Optional
import datetime

# User Schemas
class UserBase(BaseModel):
    username: str
    email: str
    full_name: str
    role: str

class UserResponse(UserBase):
    id: int
    created_at: datetime.datetime
    class Config:
        from_attributes = True


# Room Schemas
class RoomBase(BaseModel):
    id: str
    name: str
    room_type: str
    floor: int
    baseline_power_kw: float
    is_occupied: bool
    current_power_kw: float
    current_amps: float
    voltage: float
    power_factor: float
    status: str
    data_quality: str

class RoomResponse(RoomBase):
    last_heartbeat: datetime.datetime
    class Config:
        from_attributes = True


# Energy Reading Schemas
class EnergyReadingBase(BaseModel):
    room_id: str
    voltage: float
    current_amps: float
    active_power_kw: float
    apparent_power_kva: float
    power_factor: float
    frequency_hz: float
    energy_kwh: float
    data_quality: str
    scenario_tag: str

class EnergyReadingResponse(EnergyReadingBase):
    id: int
    timestamp: datetime.datetime
    class Config:
        from_attributes = True


# Verification Event Schemas
class VerificationCreate(BaseModel):
    new_status: str = Field(..., description="under_review, verified, dismissed, resolved")
    verification_notes: str = Field(..., min_length=3)
    user_name: str = "Lohith K"
    user_role: str = "Administrator"
    action_taken: Optional[str] = "Physical inspection conducted"

class VerificationResponse(BaseModel):
    id: int
    alert_id: str
    user_name: str
    user_role: str
    previous_status: str
    new_status: str
    verification_notes: str
    action_taken: str
    timestamp: datetime.datetime
    class Config:
        from_attributes = True


# Alert Schemas
class AlertResponse(BaseModel):
    id: str
    room_id: str
    alert_type: str
    title: str
    description: str
    severity: str
    suspected_category: str
    confidence_pct: float
    measured_value: str
    threshold_value: str
    suggested_action: str
    status: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    class Config:
        from_attributes = True


# Scenario Control Schemas
class ScenarioSetRequest(BaseModel):
    scenario: str = Field(..., description="NORMAL, EMPTY_ROOM_WASTAGE, UNUSUAL_POWER_SPIKE, METER_MISMATCH, MISSING_SENSOR_DATA, INVALID_READINGS")

class ScenarioResponse(BaseModel):
    success: bool
    active_scenario: str
    description: str
    triggered_at: datetime.datetime


# Location & Tariff Schemas
class LocationTariffResponse(BaseModel):
    id: str
    name: str
    state: str
    rate_per_kwh: float
    currency: str
    category: str
    is_active: bool
    class Config:
        from_attributes = True

class SetLocationRequest(BaseModel):
    location_id: str


# Dashboard Overview KPIs
class DashboardOverview(BaseModel):
    total_power_kw: float
    daily_consumption_kwh: float
    active_alerts_count: int
    estimated_cost_rupees: float
    energy_efficiency_pct: float
    supply_power_kw: float
    submeter_sum_kw: float
    line_loss_kw: float
    line_loss_pct: float
    avoidable_waste_kw: float
    avoidable_cost_rupees: float
    overall_data_quality: str
    active_scenario: str
    active_tariff: LocationTariffResponse
    timestamp: datetime.datetime

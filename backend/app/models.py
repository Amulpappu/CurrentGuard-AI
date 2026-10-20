import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(30), default="Maintenance Staff")  # Administrator, Maintenance Staff, Energy Auditor, Authorized Viewer
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    verifications = relationship("VerificationEvent", back_populates="user")


class Building(Base):
    __tablename__ = "buildings"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    location = Column(String(100), nullable=False)
    total_floors = Column(Integer, default=4)
    total_capacity_kw = Column(Float, default=120.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    rooms = relationship("Room", back_populates="building")


class Room(Base):
    __tablename__ = "rooms"

    id = Column(String(50), primary_key=True, index=True)  # e.g. "room-lab-1"
    building_id = Column(Integer, ForeignKey("buildings.id"), nullable=False)
    name = Column(String(100), nullable=False)
    room_type = Column(String(50), nullable=False)  # Computer Lab, Classroom, Server Room, AC Plant, Admin
    floor = Column(Integer, default=1)
    
    # Electrical specs
    baseline_power_kw = Column(Float, default=5.0)
    rated_voltage = Column(Float, default=230.0)
    
    # Dynamic live status cached in DB
    is_occupied = Column(Boolean, default=False)
    current_power_kw = Column(Float, default=0.0)
    current_amps = Column(Float, default=0.0)
    voltage = Column(Float, default=230.0)
    power_factor = Column(Float, default=0.92)
    status = Column(String(20), default="normal")  # normal, warning, critical, offline
    data_quality = Column(String(20), default="valid")  # valid, degraded, missing, invalid
    last_heartbeat = Column(DateTime, default=datetime.datetime.utcnow)

    building = relationship("Building", back_populates="rooms")
    readings = relationship("EnergyReading", back_populates="room")
    alerts = relationship("Alert", back_populates="room")


class EnergyReading(Base):
    __tablename__ = "energy_readings"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String(50), ForeignKey("rooms.id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    
    voltage = Column(Float, nullable=False)
    current_amps = Column(Float, nullable=False)
    active_power_kw = Column(Float, nullable=False)
    apparent_power_kva = Column(Float, default=0.0)
    power_factor = Column(Float, nullable=False)
    frequency_hz = Column(Float, default=50.0)
    energy_kwh = Column(Float, default=0.0)
    
    data_quality = Column(String(20), default="valid")  # valid, degraded, missing, invalid
    scenario_tag = Column(String(50), default="NORMAL")

    room = relationship("Room", back_populates="readings")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(50), primary_key=True, index=True)  # e.g. "ALT-2026-001"
    room_id = Column(String(50), ForeignKey("rooms.id"), index=True, nullable=False)
    alert_type = Column(String(50), nullable=False)  # baseline_deviation, empty_room_wastage, meter_mismatch, sensor_fault
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(20), default="medium")  # low, medium, high, critical
    
    # Anomaly details & Uncertainty metrics
    suspected_category = Column(String(100), nullable=False)
    confidence_pct = Column(Float, default=85.0)
    measured_value = Column(String(50), nullable=False)
    threshold_value = Column(String(50), nullable=False)
    suggested_action = Column(Text, nullable=False)
    
    # Human-in-the-loop verification workflow states
    status = Column(String(30), default="new")  # new, under_review, verified, dismissed, resolved
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

    room = relationship("Room", back_populates="alerts")
    verifications = relationship("VerificationEvent", back_populates="alert")


class VerificationEvent(Base):
    __tablename__ = "verification_events"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(50), ForeignKey("alerts.id"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_name = Column(String(100), nullable=False)
    user_role = Column(String(50), nullable=False)
    
    previous_status = Column(String(30), nullable=False)
    new_status = Column(String(30), nullable=False)
    verification_notes = Column(Text, nullable=False)
    action_taken = Column(String(200), default="Inspection recorded")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    alert = relationship("Alert", back_populates="verifications")
    user = relationship("User", back_populates="verifications")


class LocationTariff(Base):
    __tablename__ = "location_tariffs"

    id = Column(String(50), primary_key=True)  # e.g. "coimbatore-rathinam"
    name = Column(String(100), nullable=False)
    state = Column(String(50), default="Tamil Nadu")
    rate_per_kwh = Column(Float, nullable=False)
    currency = Column(String(10), default="₹")
    category = Column(String(50), default="LT Commercial Educational")
    is_active = Column(Boolean, default=False)


class LaptopReading(Base):
    """Stores real laptop power readings from psutil sensor node."""
    __tablename__ = "laptop_readings"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    cpu_percent = Column(Float, nullable=False)
    ac_power_watts = Column(Float, nullable=False)
    power_kw = Column(Float, nullable=False)
    voltage_v = Column(Float, default=230.0)
    current_amps = Column(Float, default=0.0)
    power_factor = Column(Float, default=0.92)
    battery_percent = Column(Float, default=100.0)
    battery_plugged = Column(Boolean, default=True)
    memory_percent = Column(Float, default=50.0)
    hourly_cost_rs = Column(Float, default=0.0)
    data_quality = Column(String(20), default="real")  # real / simulated
    status = Column(String(30), default="normal")


class CampusSnapshot(Base):
    """
    Stores a periodic snapshot of the entire campus power state.
    Used for: real trend curves, peak detection, savings analytics.
    Saved every 30 seconds from the telemetry endpoint.
    """
    __tablename__ = "campus_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    scenario_tag = Column(String(50), default="NORMAL")

    # Incomer + totals
    main_incomer_kw = Column(Float, nullable=False)
    total_submeter_kw = Column(Float, nullable=False)
    line_loss_kw = Column(Float, default=0.0)
    line_loss_pct = Column(Float, default=0.0)
    accumulated_kwh = Column(Float, default=0.0)
    avoidable_waste_kw = Column(Float, default=0.0)
    mains_voltage = Column(Float, default=230.0)
    frequency_hz = Column(Float, default=50.0)

    # Cost (based on active tariff at save time)
    rate_per_kwh = Column(Float, default=6.77)
    estimated_hourly_cost_rs = Column(Float, default=0.0)


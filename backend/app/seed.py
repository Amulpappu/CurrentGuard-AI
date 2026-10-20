import datetime
from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app.models import Building, Room, User, LocationTariff, Alert, VerificationEvent, CampusSnapshot, EnergyReading

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Seed Users
        if db.query(User).count() == 0:
            users = [
                User(username="admin", email="admin@currentguard.ai", full_name="Lohith K", role="Administrator"),
                User(username="maintenance", email="maintenance@currentguard.ai", full_name="John Christ S", role="Maintenance Staff"),
                User(username="auditor", email="auditor@currentguard.ai", full_name="Nigun S", role="Energy Auditor"),
                User(username="viewer", email="guest@currentguard.ai", full_name="Guest Viewer", role="Authorized Viewer")
            ]
            db.add_all(users)
            db.commit()

        # 2. Seed Location Tariffs
        if db.query(LocationTariff).count() == 0:
            tariffs = [
                LocationTariff(
                    id="coimbatore-rathinam",
                    name="Coimbatore (Rathinam Campus)",
                    state="Tamil Nadu",
                    rate_per_kwh=6.77,
                    currency="₹",
                    category="LT Commercial Educational",
                    is_active=True
                ),
                LocationTariff(
                    id="chennai-tech-park",
                    name="Chennai Metro Tech Hub",
                    state="Tamil Nadu",
                    rate_per_kwh=8.50,
                    currency="₹",
                    category="HT Commercial Industrial",
                    is_active=False
                ),
                LocationTariff(
                    id="bengaluru-campus",
                    name="Bengaluru Electronic City",
                    state="Karnataka",
                    rate_per_kwh=7.40,
                    currency="₹",
                    category="Commercial Educational",
                    is_active=False
                ),
                LocationTariff(
                    id="delhi-ncr-zone",
                    name="Delhi NCR Educational Zone",
                    state="Delhi",
                    rate_per_kwh=9.10,
                    currency="₹",
                    category="Commercial General",
                    is_active=False
                )
            ]
            db.add_all(tariffs)
            db.commit()

        # 3. Seed Building
        bldg = db.query(Building).filter_by(code="RTC-MAIN").first()
        if not bldg:
            bldg = Building(
                name="Rathinam Technical Campus — Main Academic Block",
                code="RTC-MAIN",
                location="Eachanari, Coimbatore, Tamil Nadu",
                total_floors=4,
                total_capacity_kw=150.0
            )
            db.add(bldg)
            db.commit()
            db.refresh(bldg)

        # 4. Seed Rooms
        existing_rooms = db.query(Room).count()
        if existing_rooms == 0:
            rooms = [
                Room(
                    id="room-lab-1",
                    building_id=bldg.id,
                    name="Computer Lab 1 (IoT & Cyber Sec)",
                    room_type="Computer Lab",
                    floor=2,
                    baseline_power_kw=8.5,
                    is_occupied=True,
                    current_power_kw=7.9,
                    current_amps=36.5,
                    voltage=230.2,
                    power_factor=0.94,
                    status="normal",
                    data_quality="valid"
                ),
                Room(
                    id="room-lab-2",
                    building_id=bldg.id,
                    name="Computer Lab 2 (AI/Data Lab)",
                    room_type="Computer Lab",
                    floor=2,
                    baseline_power_kw=9.2,
                    is_occupied=True,
                    current_power_kw=8.4,
                    current_amps=39.1,
                    voltage=230.0,
                    power_factor=0.93,
                    status="normal",
                    data_quality="valid"
                ),
                Room(
                    id="room-class-1",
                    building_id=bldg.id,
                    name="Classroom 101 (Smart Lecture Hall)",
                    room_type="Classroom",
                    floor=1,
                    baseline_power_kw=2.4,
                    is_occupied=True,
                    current_power_kw=2.1,
                    current_amps=10.2,
                    voltage=229.8,
                    power_factor=0.89,
                    status="normal",
                    data_quality="valid"
                ),
                Room(
                    id="room-ac-plant",
                    building_id=bldg.id,
                    name="Central AC Chiller Plant",
                    room_type="AC Plant",
                    floor=0,
                    baseline_power_kw=18.0,
                    is_occupied=True,
                    current_power_kw=16.8,
                    current_amps=84.9,
                    voltage=230.4,
                    power_factor=0.86,
                    status="normal",
                    data_quality="valid"
                ),
                Room(
                    id="room-server",
                    building_id=bldg.id,
                    name="Campus Server & UPS Room",
                    room_type="Server Room",
                    floor=1,
                    baseline_power_kw=6.8,
                    is_occupied=True,
                    current_power_kw=6.6,
                    current_amps=29.8,
                    voltage=230.5,
                    power_factor=0.96,
                    status="normal",
                    data_quality="valid"
                ),
                Room(
                    id="room-admin",
                    building_id=bldg.id,
                    name="Administrative & Dean Office",
                    room_type="Admin",
                    floor=1,
                    baseline_power_kw=3.2,
                    is_occupied=True,
                    current_power_kw=2.9,
                    current_amps=13.8,
                    voltage=230.1,
                    power_factor=0.91,
                    status="normal",
                    data_quality="valid"
                )
            ]
            db.add_all(rooms)
            db.commit()

        # 5. Seed Initial Demonstration Alerts & Verification History
        if db.query(Alert).count() == 0:
            now = datetime.datetime.utcnow()
            seed_alerts = [
                Alert(
                    id="ALT-2026-001",
                    room_id="room-lab-1",
                    alert_type="empty_room_wastage",
                    title="Unoccupied Room Active Power Wastage in Computer Lab 1",
                    description="Computer Lab 1 is marked as completely unoccupied, yet active load is drawing 7.82 kW (92% of full baseline). High probability of unattended lights, workstations, or air conditioners left ON.",
                    severity="high",
                    suspected_category="Suspected Unattended Equipment Load",
                    confidence_pct=91.4,
                    measured_value="7.82 kW (Unoccupied)",
                    threshold_value="<= 1.70 kW Standby",
                    suggested_action="Authorized staff should inspect room switches and confirm whether workstations or AC units are scheduled for automated shutdown.",
                    status="under_review",
                    created_at=now - datetime.timedelta(minutes=45),
                    updated_at=now - datetime.timedelta(minutes=10)
                ),
                Alert(
                    id="ALT-2026-002",
                    room_id="room-ac-plant",
                    alert_type="baseline_deviation",
                    title="Uncharacteristic Load Surge in Central AC Chiller Plant",
                    description="Current power draw is 28.5 kW, exceeding the standard operational baseline (18.0 kW) by 58.3%. May indicate motor stator degradation, compressor lock, or unexpected heavy appliance connection.",
                    severity="critical",
                    suspected_category="Substation Feeder Baseline Divergence",
                    confidence_pct=94.2,
                    measured_value="28.50 kW (144.2 A)",
                    threshold_value="<= 22.50 kW (+25% Margin)",
                    suggested_action="Check sub-distribution breaker thermal signature, measure phase current balance, and check for high-draw unauthorized heating/cooling loads.",
                    status="new",
                    created_at=now - datetime.timedelta(minutes=20),
                    updated_at=now - datetime.timedelta(minutes=20)
                ),
                Alert(
                    id="ALT-2026-003",
                    room_id="room-class-1",
                    alert_type="sensor_fault",
                    title="Sensor Signal Degradation in Classroom 101",
                    description="Telemetry stream exhibits low power factor (PF: 0.22) and high total harmonic distortion. Readings may be degraded by electrical noise or hardware loose contact.",
                    severity="medium",
                    suspected_category="Sensor Signal Degradation / Telemetry Noise",
                    confidence_pct=88.0,
                    measured_value="229.4 V | PF 0.22",
                    threshold_value="190V - 250V | PF >= 0.75",
                    suggested_action="Verify physical CT sensor clamp alignment, inspect ESP32 ADC wiring, and calibrate the sensor node.",
                    status="verified",
                    created_at=now - datetime.timedelta(hours=2),
                    updated_at=now - datetime.timedelta(minutes=35)
                )
            ]
            db.add_all(seed_alerts)
            db.commit()

            # Note: Verification events are strictly NOT seeded.
            # They are only recorded when an authorized human operator performs an action in the UI.

        # 6. Seed Historical Campus Snapshots and Energy Readings if empty
        if db.query(CampusSnapshot).count() == 0:
            now = datetime.datetime.utcnow()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            base_curve = [
                12.5, 11.8, 11.2, 10.9, 11.4, 13.8,
                18.5, 26.4, 38.2, 44.5, 48.0, 49.2,
                45.0, 48.6, 51.4, 47.8, 42.1, 35.0,
                28.4, 22.1, 18.0, 15.6, 14.2, 13.0
            ]
            rooms_list = db.query(Room).all()
            room_weights = {
                "room-ac-plant": 0.38,
                "room-lab-1": 0.18,
                "room-lab-2": 0.20,
                "room-server": 0.14,
                "room-admin": 0.06,
                "room-class-1": 0.04
            }
            cum_kwh = 120.0
            snapshots_to_seed = []
            readings_to_seed = []

            for h in range(24):
                snap_time = today_start + datetime.timedelta(hours=h)
                sub_kw = base_curve[h]
                loss_kw = round(sub_kw * 0.034, 2)
                supply_kw = round(sub_kw + loss_kw, 2)
                loss_pct = round((loss_kw / supply_kw) * 100, 2)
                waste_kw = round(sub_kw * (0.11 if 9 <= h <= 18 else 0.04), 2)
                cum_kwh += round(supply_kw, 2)

                snapshots_to_seed.append(
                    CampusSnapshot(
                        timestamp=snap_time,
                        scenario_tag="NORMAL",
                        main_incomer_kw=supply_kw,
                        total_submeter_kw=sub_kw,
                        line_loss_kw=loss_kw,
                        line_loss_pct=loss_pct,
                        accumulated_kwh=round(cum_kwh, 2),
                        avoidable_waste_kw=waste_kw,
                        mains_voltage=230.1,
                        frequency_hz=50.0,
                        rate_per_kwh=6.77,
                        estimated_hourly_cost_rs=round(supply_kw * 6.77, 2)
                    )
                )

                for r in rooms_list:
                    weight = room_weights.get(r.id, 0.1)
                    r_kw = round(sub_kw * weight, 2)
                    readings_to_seed.append(
                        EnergyReading(
                            room_id=r.id,
                            timestamp=snap_time,
                            voltage=230.0,
                            current_amps=round((r_kw * 1000) / (230 * 0.92), 2),
                            active_power_kw=r_kw,
                            apparent_power_kva=round(r_kw / 0.92, 2),
                            power_factor=0.92,
                            frequency_hz=50.0,
                            energy_kwh=round(r_kw, 3),
                            data_quality="valid",
                            scenario_tag="NORMAL"
                        )
                    )

            db.add_all(snapshots_to_seed)
            db.add_all(readings_to_seed)
            db.commit()

    finally:
        db.close()

if __name__ == "__main__":
    init_db()
    print("CurrentGuard AI Stage 2 Database seeded successfully.")

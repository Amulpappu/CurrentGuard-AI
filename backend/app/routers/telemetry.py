import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.database import get_db
from app.models import Room, Alert, LocationTariff, EnergyReading, CampusSnapshot
from app.schemas import DashboardOverview, LocationTariffResponse
from app.simulator import simulator
from app.detection import analyze_room_telemetry, analyze_supply_vs_submeters

router = APIRouter(prefix="/telemetry", tags=["telemetry"])

# Rolling 30-second buffer for SCADA oscilloscope
rolling_buffer = []

# Persistence throttle counters
_read_counter = 0          # counts telemetry ticks
READING_SAVE_EVERY = 10   # save EnergyReading every 10 ticks (≈10s)
SNAPSHOT_SAVE_EVERY = 30  # save CampusSnapshot every 30 ticks (≈30s)


@router.get("/live")
def get_live_telemetry(db: Session = Depends(get_db)):
    """
    Returns high-frequency 1-second live telemetry for all rooms,
    evaluates detection rules and updates room status.
    Persists EnergyReadings every 10s and CampusSnapshots every 30s.
    """
    global _read_counter
    _read_counter += 1

    tick = simulator.generate_tick()
    rooms_data = tick["rooms"]
    now = datetime.datetime.utcnow()

    # Get active tariff rate
    active_tariff = db.query(LocationTariff).filter_by(is_active=True).first()
    rate = active_tariff.rate_per_kwh if active_tariff else 6.77

    # Evaluate detection rules across all rooms
    for r_id, r_info in rooms_data.items():
        db_room = db.query(Room).filter_by(id=r_id).first()
        if db_room:
            db_room.current_power_kw = r_info["power_kw"]
            db_room.current_amps = r_info["current_amps"]
            db_room.voltage = r_info["voltage"]
            db_room.power_factor = r_info["power_factor"]
            db_room.is_occupied = r_info["is_occupied"]
            db_room.status = r_info["status"]
            db_room.data_quality = r_info["data_quality"]
            db_room.last_heartbeat = now

        # Run AI detection rule on this room
        anomaly = analyze_room_telemetry(
            room_id=r_id,
            room_name=r_info["name"],
            power_kw=r_info["power_kw"],
            baseline_kw=r_info["baseline_power_kw"],
            is_occupied=r_info["is_occupied"],
            voltage=r_info["voltage"],
            current_amps=r_info["current_amps"],
            power_factor=r_info["power_factor"],
            data_quality=r_info["data_quality"]
        )

        if anomaly:
            existing = db.query(Alert).filter(
                Alert.room_id == r_id,
                Alert.alert_type == anomaly["alert_type"],
                Alert.status.in_(["new", "under_review"])
            ).first()

            if not existing:
                new_alert_id = f"ALT-{int(now.timestamp()) % 100000:05d}"
                new_alert = Alert(
                    id=new_alert_id,
                    room_id=r_id,
                    alert_type=anomaly["alert_type"],
                    title=anomaly["title"],
                    description=anomaly["description"],
                    severity=anomaly["severity"],
                    suspected_category=anomaly["suspected_category"],
                    confidence_pct=anomaly["confidence_pct"],
                    measured_value=anomaly["measured_value"],
                    threshold_value=anomaly["threshold_value"],
                    suggested_action=anomaly["suggested_action"],
                    status="new",
                    created_at=now,
                    updated_at=now
                )
                db.add(new_alert)

    # Rule 3: Check Supply vs Submeters
    loss_anomaly = analyze_supply_vs_submeters(
        supply_kw=tick["main_incomer_power_kw"],
        submeters_kw=tick["total_submeter_power_kw"]
    )
    if loss_anomaly:
        existing_loss = db.query(Alert).filter(
            Alert.alert_type == "meter_mismatch",
            Alert.status.in_(["new", "under_review"])
        ).first()
        if not existing_loss:
            new_alert_id = f"ALT-{int(now.timestamp()) % 100000:05d}"
            new_alert = Alert(
                id=new_alert_id,
                room_id=loss_anomaly["room_id"],
                alert_type=loss_anomaly["alert_type"],
                title=loss_anomaly["title"],
                description=loss_anomaly["description"],
                severity=loss_anomaly["severity"],
                suspected_category=loss_anomaly["suspected_category"],
                confidence_pct=loss_anomaly["confidence_pct"],
                measured_value=loss_anomaly["measured_value"],
                threshold_value=loss_anomaly["threshold_value"],
                suggested_action=loss_anomaly["suggested_action"],
                status="new",
                created_at=now,
                updated_at=now
            )
            db.add(new_alert)

    # ─── PERSIST: EnergyReadings every 10 ticks ───────────────────────────
    if _read_counter % READING_SAVE_EVERY == 0:
        for r_id, r_info in rooms_data.items():
            if r_info["data_quality"] not in ["missing"]:
                reading = EnergyReading(
                    room_id=r_id,
                    timestamp=now,
                    voltage=r_info["voltage"],
                    current_amps=r_info["current_amps"],
                    active_power_kw=max(0.0, r_info["power_kw"]),
                    apparent_power_kva=r_info.get("apparent_power_kva", 0.0),
                    power_factor=r_info["power_factor"],
                    frequency_hz=r_info.get("frequency_hz", 50.0),
                    energy_kwh=round(max(0.0, r_info["power_kw"]) / 360.0, 6),  # 10s → kWh increment
                    data_quality=r_info["data_quality"],
                    scenario_tag=simulator.active_scenario
                )
                db.add(reading)

    # ─── PERSIST: CampusSnapshot every 30 ticks ───────────────────────────
    if _read_counter % SNAPSHOT_SAVE_EVERY == 0:
        snap = CampusSnapshot(
            timestamp=now,
            scenario_tag=simulator.active_scenario,
            main_incomer_kw=tick["main_incomer_power_kw"],
            total_submeter_kw=tick["total_submeter_power_kw"],
            line_loss_kw=tick["line_loss_kw"],
            line_loss_pct=tick["line_loss_pct"],
            accumulated_kwh=tick["accumulated_kwh"],
            avoidable_waste_kw=tick["avoidable_waste_kw"],
            mains_voltage=tick["mains_voltage"],
            frequency_hz=tick["frequency_hz"],
            rate_per_kwh=rate,
            estimated_hourly_cost_rs=round(tick["main_incomer_power_kw"] * rate, 2)
        )
        db.add(snap)

        # Prune old snapshots: keep last 2880 (≈1 day at 30s intervals)
        total_snaps = db.query(CampusSnapshot).count()
        if total_snaps > 2880:
            oldest = db.query(CampusSnapshot).order_by(CampusSnapshot.timestamp.asc()).first()
            if oldest:
                db.delete(oldest)

        # Prune old energy readings: keep last 50000
        total_readings = db.query(EnergyReading).count()
        if total_readings > 50000:
            oldest_r = db.query(EnergyReading).order_by(EnergyReading.timestamp.asc()).first()
            if oldest_r:
                db.delete(oldest_r)

    db.commit()

    # Google Sheets Sync (every 30 ticks, background only — NOT audit)
    if _read_counter % SNAPSHOT_SAVE_EVERY == 0:
        try:
            from app.google_sheets import sheets_service
            sheets_service.sync_telemetry_snapshot(tick)
        except Exception:
            pass

    # Append to rolling SCADA buffer
    rolling_point = {
        "timestamp": now.strftime("%H:%M:%S"),
        "voltage": tick["mains_voltage"],
        "supply_kw": tick["main_incomer_power_kw"],
        "submeter_kw": tick["total_submeter_power_kw"],
        "line_loss_kw": tick["line_loss_kw"],
        "frequency_hz": tick["frequency_hz"]
    }
    rolling_buffer.append(rolling_point)
    if len(rolling_buffer) > 30:
        rolling_buffer.pop(0)

    return {
        "success": True,
        "telemetry": tick,
        "estimated_daily_cost": round(tick["accumulated_kwh"] * rate, 2),
        "avoidable_hourly_cost": round(tick["avoidable_waste_kw"] * rate, 2)
    }


@router.get("/summary", response_model=DashboardOverview)
def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Returns aggregated campus KPIs for the overview dashboard.
    Uses stored DB snapshots for accurate accumulated values.
    """
    tick = simulator.generate_tick()
    active_alerts_count = db.query(Alert).filter(Alert.status.in_(["new", "under_review"])).count()
    active_tariff = db.query(LocationTariff).filter_by(is_active=True).first()

    if not active_tariff:
        active_tariff = LocationTariff(
            id="coimbatore-rathinam",
            name="Coimbatore (Rathinam Campus)",
            state="Tamil Nadu",
            rate_per_kwh=6.77,
            currency="₹",
            category="LT Commercial Educational",
            is_active=True
        )

    rate = active_tariff.rate_per_kwh

    # Use accumulated kWh from DB snapshots (today's real stored total)
    today_start = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_kwh_row = db.query(
        func.max(CampusSnapshot.accumulated_kwh) - func.min(CampusSnapshot.accumulated_kwh)
    ).filter(CampusSnapshot.timestamp >= today_start).first()
    today_kwh = round(float(today_kwh_row[0] or 0.0), 3)
    if today_kwh <= 0:
        today_kwh = round(tick["accumulated_kwh"], 3)

    total_power = tick["main_incomer_power_kw"]
    cost = round(today_kwh * rate, 2)
    avoidable_cost = round(tick["avoidable_waste_kw"] * rate, 2)

    # Efficiency from live tick
    efficiency = max(70.0, min(99.0, 100.0 - tick["line_loss_pct"] - (tick["avoidable_waste_kw"] / total_power * 10.0 if total_power > 0 else 0.0)))

    # Overall sensor data quality
    invalid_count = sum(1 for r in tick["rooms"].values() if r["data_quality"] in ["invalid", "missing"])
    overall_quality = "critical" if invalid_count >= 2 else "degraded" if invalid_count == 1 else "healthy"

    return DashboardOverview(
        total_power_kw=total_power,
        daily_consumption_kwh=today_kwh,
        active_alerts_count=active_alerts_count,
        estimated_cost_rupees=cost,
        energy_efficiency_pct=round(efficiency, 1),
        supply_power_kw=tick["main_incomer_power_kw"],
        submeter_sum_kw=tick["total_submeter_power_kw"],
        line_loss_kw=tick["line_loss_kw"],
        line_loss_pct=tick["line_loss_pct"],
        avoidable_waste_kw=tick["avoidable_waste_kw"],
        avoidable_cost_rupees=avoidable_cost,
        overall_data_quality=overall_quality,
        active_scenario=simulator.active_scenario,
        active_tariff=LocationTariffResponse.from_orm(active_tariff),
        timestamp=datetime.datetime.utcnow()
    )


@router.get("/rolling")
def get_rolling_buffer():
    """Returns rolling 30-second telemetry array for SCADA chart."""
    return {
        "success": True,
        "buffer_size": len(rolling_buffer),
        "points": rolling_buffer
    }


@router.get("/trend")
def get_telemetry_trend(db: Session = Depends(get_db)):
    """
    Returns 24-hour hourly load curve.
    Prefers REAL stored CampusSnapshot data when available,
    falls back to physics model curve when DB is still empty.
    """
    hours = [f"{h:02d}:00" for h in range(24)]
    now = datetime.datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Try to build real trend from stored snapshots
    snapshots = db.query(CampusSnapshot).filter(
        CampusSnapshot.timestamp >= today_start
    ).order_by(CampusSnapshot.timestamp.asc()).all()

    if len(snapshots) >= 4:
        # Group by hour: take average for each hour
        hourly_supply = {}
        hourly_sub = {}
        for snap in snapshots:
            h = snap.timestamp.hour
            hourly_supply.setdefault(h, []).append(snap.main_incomer_kw)
            hourly_sub.setdefault(h, []).append(snap.total_submeter_kw)

        supply_trend = []
        submeter_trend = []
        for h in range(24):
            if h in hourly_supply:
                supply_trend.append(round(sum(hourly_supply[h]) / len(hourly_supply[h]), 2))
                submeter_trend.append(round(sum(hourly_sub[h]) / len(hourly_sub[h]), 2))
            else:
                # Fill forward/backward from last known
                supply_trend.append(supply_trend[-1] if supply_trend else 0.0)
                submeter_trend.append(submeter_trend[-1] if submeter_trend else 0.0)
        loss_trend = [round(s - m, 2) for s, m in zip(supply_trend, submeter_trend)]
        data_source = "real_db"
    else:
        # Physics-model fallback curve (campus diurnal profile)
        base_curve = [
            12.5, 11.8, 11.2, 10.9, 11.4, 13.8,
            18.5, 26.4, 38.2, 44.5, 48.0, 49.2,
            45.0, 48.6, 51.4, 47.8, 42.1, 35.0,
            28.4, 22.1, 18.0, 15.6, 14.2, 13.0
        ]
        supply_trend = [round(v * 1.032, 1) for v in base_curve]
        submeter_trend = [round(v, 1) for v in base_curve]
        loss_trend = [round(s - m, 1) for s, m in zip(supply_trend, submeter_trend)]
        data_source = "simulated_model"

    return {
        "hours": hours,
        "supply_trend": supply_trend,
        "submeter_trend": submeter_trend,
        "loss_trend": loss_trend,
        "data_source": data_source,
        "snapshot_count": len(snapshots)
    }


@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db)):
    """
    Returns rich analytics built from stored DB readings:
    - Peak power hour today
    - Average power today
    - Total kWh stored today
    - Today's total cost
    - Worst wastage hour
    - Per-room energy breakdown (from EnergyReadings)
    """
    now = datetime.datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    active_tariff = db.query(LocationTariff).filter_by(is_active=True).first()
    rate = active_tariff.rate_per_kwh if active_tariff else 6.77

    snapshots = db.query(CampusSnapshot).filter(
        CampusSnapshot.timestamp >= today_start
    ).order_by(CampusSnapshot.timestamp.asc()).all()

    if not snapshots:
        return {
            "status": "no_data",
            "message": "No snapshots stored yet. Data will appear after 30 seconds of monitoring.",
            "snapshots_count": 0
        }

    incomer_values = [s.main_incomer_kw for s in snapshots]
    waste_values = [s.avoidable_waste_kw for s in snapshots]

    peak_snap = max(snapshots, key=lambda s: s.main_incomer_kw)
    min_snap = min(snapshots, key=lambda s: s.main_incomer_kw)
    avg_power = sum(incomer_values) / len(incomer_values)

    # Total kWh accumulated today
    kwh_start = snapshots[0].accumulated_kwh
    kwh_end = snapshots[-1].accumulated_kwh
    today_kwh = max(0.0, kwh_end - kwh_start)
    today_cost = round(today_kwh * rate, 2)

    # Total wasted energy (unoccupied rooms)
    total_waste_kwh = sum(s.avoidable_waste_kw * (30 / 3600) for s in snapshots)
    waste_cost = round(total_waste_kwh * rate, 2)

    # Per-room energy totals from EnergyReadings
    room_readings = db.query(
        EnergyReading.room_id,
        func.sum(EnergyReading.energy_kwh).label("total_kwh"),
        func.avg(EnergyReading.active_power_kw).label("avg_kw"),
        func.max(EnergyReading.active_power_kw).label("peak_kw"),
        func.count(EnergyReading.id).label("reading_count")
    ).filter(
        EnergyReading.timestamp >= today_start
    ).group_by(EnergyReading.room_id).all()

    room_breakdown = [
        {
            "room_id": r.room_id,
            "total_kwh": round(float(r.total_kwh or 0), 4),
            "avg_kw": round(float(r.avg_kw or 0), 3),
            "peak_kw": round(float(r.peak_kw or 0), 3),
            "estimated_cost_rs": round(float(r.total_kwh or 0) * rate, 2),
            "reading_count": r.reading_count
        }
        for r in room_readings
    ]
    room_breakdown.sort(key=lambda x: x["total_kwh"], reverse=True)

    return {
        "status": "ok",
        "snapshots_count": len(snapshots),
        "data_period": {
            "from": snapshots[0].timestamp.isoformat(),
            "to": snapshots[-1].timestamp.isoformat()
        },
        "power_kw": {
            "current": round(incomer_values[-1], 2),
            "average_today": round(avg_power, 2),
            "peak_today": round(peak_snap.main_incomer_kw, 2),
            "peak_at": peak_snap.timestamp.strftime("%H:%M"),
            "lowest_today": round(min_snap.main_incomer_kw, 2),
            "lowest_at": min_snap.timestamp.strftime("%H:%M")
        },
        "energy_today": {
            "total_kwh": round(today_kwh, 3),
            "total_cost_rs": today_cost,
            "rate_per_kwh": rate
        },
        "waste": {
            "total_waste_kwh": round(total_waste_kwh, 4),
            "waste_cost_rs": waste_cost,
            "avg_waste_kw": round(sum(waste_values) / len(waste_values), 3)
        },
        "room_breakdown": room_breakdown
    }

"""
CurrentGuard AI — Physics-based Simulation Engine
Generates multi-room electrical telemetry (V, I, P, Q, S, PF, Hz, kWh)
Supports 6 demonstration scenarios:
- NORMAL
- EMPTY_ROOM_WASTAGE
- UNUSUAL_POWER_SPIKE
- METER_MISMATCH
- MISSING_SENSOR_DATA
- INVALID_READINGS
"""

import math
import random
import datetime
from typing import Dict, Any, List

class SimulationEngine:
    def __init__(self):
        self.active_scenario = "NORMAL"
        self.tick_counter = 0
        self.accumulated_kwh = 384.20
        self.scenario_start_time = datetime.datetime.utcnow()
        
        # Room definitions matching Rathinam Technical Campus
        self.room_configs = {
            "room-lab-1": {
                "name": "Computer Lab 1 (IoT & Cyber Sec)",
                "room_type": "Computer Lab",
                "floor": 2,
                "baseline_power_kw": 8.5,
                "is_occupied": True,
                "pf_nominal": 0.94
            },
            "room-lab-2": {
                "name": "Computer Lab 2 (AI/Data Lab)",
                "room_type": "Computer Lab",
                "floor": 2,
                "baseline_power_kw": 9.2,
                "is_occupied": True,
                "pf_nominal": 0.93
            },
            "room-class-1": {
                "name": "Classroom 101 (Smart Lecture Hall)",
                "room_type": "Classroom",
                "floor": 1,
                "baseline_power_kw": 2.4,
                "is_occupied": True,
                "pf_nominal": 0.89
            },
            "room-ac-plant": {
                "name": "Central AC Chiller Plant",
                "room_type": "AC Plant",
                "floor": 0,
                "baseline_power_kw": 18.0,
                "is_occupied": True,
                "pf_nominal": 0.86
            },
            "room-server": {
                "name": "Campus Server & UPS Room",
                "room_type": "Server Room",
                "floor": 1,
                "baseline_power_kw": 6.8,
                "is_occupied": True,
                "pf_nominal": 0.96
            },
            "room-admin": {
                "name": "Administrative & Dean Office",
                "room_type": "Admin",
                "floor": 1,
                "baseline_power_kw": 3.2,
                "is_occupied": True,
                "pf_nominal": 0.91
            }
        }

        # Dynamic appliance switches
        self.appliances = {
            "lab_pcs_lab1": True,
            "central_ac": True,
            "smart_projector": False
        }

    def set_scenario(self, scenario_name: str) -> Dict[str, Any]:
        valid_scenarios = [
            "NORMAL",
            "EMPTY_ROOM_WASTAGE",
            "UNUSUAL_POWER_SPIKE",
            "METER_MISMATCH",
            "MISSING_SENSOR_DATA",
            "INVALID_READINGS"
        ]
        if scenario_name not in valid_scenarios:
            raise ValueError(f"Invalid scenario: {scenario_name}. Must be one of {valid_scenarios}")
        
        self.active_scenario = scenario_name
        self.scenario_start_time = datetime.datetime.utcnow()
        
        descriptions = {
            "NORMAL": "Standard balanced operation across all campus rooms. Line loss is within normal limits (~2.8%).",
            "EMPTY_ROOM_WASTAGE": "Computer Lab 1 is unoccupied, but 30 high-spec PCs and lights remain powered ON, drawing 7.8 kW.",
            "UNUSUAL_POWER_SPIKE": "Central AC chiller compressor suffers uncharacteristic overload, surging to 32 kW (177% of baseline).",
            "METER_MISMATCH": "Main Incomer records 54.0 kW, while downstream submeters register only 42.1 kW (22% unmetered divergence).",
            "MISSING_SENSOR_DATA": "Classroom 101 smart sensor node drops Wi-Fi packets, resulting in missing telemetry.",
            "INVALID_READINGS": "Admin Office voltage swings to 295V with negative current spikes due to simulated sensor ADC failure."
        }
        
        return {
            "success": True,
            "active_scenario": self.active_scenario,
            "description": descriptions.get(scenario_name, ""),
            "triggered_at": self.scenario_start_time
        }

    def toggle_appliance(self, appliance_key: str) -> bool:
        if appliance_key in self.appliances:
            self.appliances[appliance_key] = not self.appliances[appliance_key]
            return self.appliances[appliance_key]
        return False

    def generate_tick(self) -> Dict[str, Any]:
        """
        Advances the simulation clock by 1 tick (1 second),
        computing realistic electrical physics across all rooms and the main incomer.
        """
        self.tick_counter += 1
        now = datetime.datetime.utcnow()
        time_sec = self.tick_counter

        # Base mains voltage with subtle harmonic grid ripple
        base_voltage = 230.0 + 1.8 * math.sin(time_sec / 15.0) + random.uniform(-0.6, 0.6)
        frequency_hz = 50.0 + 0.08 * math.cos(time_sec / 20.0) + random.uniform(-0.02, 0.02)

        rooms_telemetry = {}
        total_submeter_power_kw = 0.0

        for r_id, cfg in self.room_configs.items():
            baseline = cfg["baseline_power_kw"]
            pf = cfg["pf_nominal"] + random.uniform(-0.015, 0.015)
            pf = max(0.65, min(0.99, pf))
            occupied = cfg["is_occupied"]
            data_quality = "valid"
            v = base_voltage + random.uniform(-0.4, 0.4)

            # Scenario specific modulations
            if self.active_scenario == "NORMAL":
                occupied = True if r_id != "room-class-1" else (time_sec % 120 < 80)
                power_mult = 0.90 + 0.15 * math.sin(time_sec / 10.0 + cfg["floor"]) + random.uniform(-0.05, 0.05)
                power_kw = baseline * power_mult

            elif self.active_scenario == "EMPTY_ROOM_WASTAGE":
                if r_id == "room-lab-1":
                    occupied = False  # Completely empty room
                    # High power running unattended
                    power_kw = 7.9 + 0.4 * math.sin(time_sec / 5.0)
                else:
                    power_kw = baseline * (0.85 + random.uniform(-0.03, 0.03))

            elif self.active_scenario == "UNUSUAL_POWER_SPIKE":
                if r_id == "room-ac-plant":
                    # Compressor surge
                    power_kw = 32.5 + 1.2 * math.sin(time_sec / 3.0) + random.uniform(-0.5, 0.5)
                else:
                    power_kw = baseline * (0.88 + random.uniform(-0.04, 0.04))

            elif self.active_scenario == "METER_MISMATCH":
                # Rooms behave normally, but Main Incomer will be artificially increased
                power_kw = baseline * (0.88 + random.uniform(-0.03, 0.03))

            elif self.active_scenario == "MISSING_SENSOR_DATA":
                if r_id == "room-class-1":
                    data_quality = "missing"
                    power_kw = 0.0
                    v = 0.0
                    pf = 0.0
                else:
                    power_kw = baseline * (0.90 + random.uniform(-0.03, 0.03))

            elif self.active_scenario == "INVALID_READINGS":
                if r_id == "room-admin":
                    data_quality = "invalid"
                    v = 295.0 + random.uniform(5.0, 15.0)
                    pf = 0.18
                    power_kw = -1.2  # Erroneous negative reverse power reading
                else:
                    power_kw = baseline * (0.90 + random.uniform(-0.03, 0.03))
            else:
                power_kw = baseline * 0.9

            # Check interactive appliance toggles
            if r_id == "room-lab-1" and not self.appliances["lab_pcs_lab1"] and self.active_scenario != "EMPTY_ROOM_WASTAGE":
                power_kw *= 0.35  # PCs shut down
            if r_id == "room-ac-plant" and not self.appliances["central_ac"] and self.active_scenario != "UNUSUAL_POWER_SPIKE":
                power_kw *= 0.20  # Chiller idle

            # Calculate current: I = P / (V * PF)
            if v > 0 and pf > 0 and power_kw > 0:
                current_amps = (power_kw * 1000.0) / (v * pf)
            else:
                current_amps = 0.0 if data_quality == "missing" else -3.5 if power_kw < 0 else 0.0

            apparent_kva = (v * current_amps) / 1000.0 if v > 0 else 0.0

            total_submeter_power_kw += max(0.0, power_kw)

            rooms_telemetry[r_id] = {
                "room_id": r_id,
                "name": cfg["name"],
                "room_type": cfg["room_type"],
                "floor": cfg["floor"],
                "baseline_power_kw": baseline,
                "is_occupied": occupied,
                "power_kw": round(power_kw, 2),
                "voltage": round(v, 1),
                "current_amps": round(current_amps, 2),
                "apparent_power_kva": round(apparent_kva, 2),
                "power_factor": round(pf, 2),
                "frequency_hz": round(frequency_hz, 2),
                "data_quality": data_quality,
                "status": "critical" if data_quality in ["invalid", "missing"] or power_kw > baseline * 1.5 else "warning" if (not occupied and power_kw > 1.5) or power_kw > baseline * 1.25 else "normal"
            }

        # Main Incomer Grid Supply calculation
        # Normal line loss is ~2.8%
        if self.active_scenario == "METER_MISMATCH":
            # Significant divergence (incomer shows 22% higher)
            main_incomer_power_kw = total_submeter_power_kw * 1.25 + random.uniform(1.0, 2.5)
        else:
            main_incomer_power_kw = total_submeter_power_kw * 1.028 + random.uniform(0.1, 0.3)

        line_loss_kw = max(0.0, main_incomer_power_kw - total_submeter_power_kw)
        line_loss_pct = (line_loss_kw / main_incomer_power_kw * 100.0) if main_incomer_power_kw > 0 else 0.0

        # Increment accumulated kWh (1 second = 1/3600 hour)
        incremental_kwh = (main_incomer_power_kw / 3600.0)
        self.accumulated_kwh += incremental_kwh

        # Avoidable waste computation: sum of power in unoccupied rooms exceeding standby threshold
        avoidable_waste_kw = 0.0
        for r in rooms_telemetry.values():
            if not r["is_occupied"] and r["power_kw"] > 0.4:
                avoidable_waste_kw += (r["power_kw"] - 0.4)

        return {
            "timestamp": now,
            "active_scenario": self.active_scenario,
            "frequency_hz": round(frequency_hz, 2),
            "mains_voltage": round(base_voltage, 1),
            "main_incomer_power_kw": round(main_incomer_power_kw, 2),
            "total_submeter_power_kw": round(total_submeter_power_kw, 2),
            "line_loss_kw": round(line_loss_kw, 2),
            "line_loss_pct": round(line_loss_pct, 1),
            "accumulated_kwh": round(self.accumulated_kwh, 3),
            "avoidable_waste_kw": round(avoidable_waste_kw, 2),
            "rooms": rooms_telemetry,
            "appliances": self.appliances
        }

simulator = SimulationEngine()

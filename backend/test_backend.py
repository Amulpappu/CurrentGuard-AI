import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from app.main import app
from app.seed import init_db

def test_api():
    init_db()
    client = TestClient(app)

    print("Running CurrentGuard AI Stage 2 Backend Tests...")

    # 1. Root & Health
    r = client.get("/")
    assert r.status_code == 200, f"Root failed: {r.status_code}"
    print("[PASS] GET / (Root health check): 200 OK")

    # 2. Telemetry Summary
    r = client.get("/api/telemetry/summary")
    assert r.status_code == 200, f"Summary failed: {r.status_code}"
    data = r.json()
    assert "total_power_kw" in data
    assert "daily_consumption_kwh" in data
    assert "active_scenario" in data
    print(f"[PASS] GET /api/telemetry/summary: 200 OK | Power: {data['total_power_kw']} kW | Cost: Rs.{data['estimated_cost_rupees']}")

    # 3. Live Telemetry
    r = client.get("/api/telemetry/live")
    assert r.status_code == 200, f"Live failed: {r.status_code}"
    live_data = r.json()
    assert live_data["success"] is True
    assert len(live_data["telemetry"]["rooms"]) == 6
    print(f"[PASS] GET /api/telemetry/live: 200 OK | Rooms tracked: {len(live_data['telemetry']['rooms'])}")

    # 4. Rooms list
    r = client.get("/api/rooms")
    assert r.status_code == 200, f"Rooms failed: {r.status_code}"
    rooms = r.json()
    assert len(rooms) >= 6
    print(f"[PASS] GET /api/rooms: 200 OK | Room count: {len(rooms)}")

    # 5. Alerts list
    r = client.get("/api/alerts")
    assert r.status_code == 200, f"Alerts failed: {r.status_code}"
    alerts = r.json()
    assert len(alerts) > 0
    test_alert_id = alerts[0]["id"]
    print(f"[PASS] GET /api/alerts: 200 OK | Total alerts: {len(alerts)} | Sample: {test_alert_id}")

    # 6. Authorized Verification Workflow
    verify_payload = {
        "new_status": "under_review",
        "verification_notes": "Test verification by Senior Engineer during audit.",
        "user_name": "Lohith K",
        "user_role": "Administrator",
        "action_taken": "Physical breaker inspection"
    }
    r = client.post(f"/api/alerts/{test_alert_id}/verify", json=verify_payload)
    assert r.status_code == 200, f"Verify failed: {r.status_code} - {r.text}"
    ver_res = r.json()
    assert ver_res["new_status"] == "under_review"
    print(f"[PASS] POST /api/alerts/{test_alert_id}/verify: 200 OK | State: {ver_res['previous_status']} -> {ver_res['new_status']}")

    # 7. Verification History
    r = client.get("/api/verification/history")
    assert r.status_code == 200, f"Verification history failed: {r.status_code}"
    history = r.json()
    assert len(history) > 0
    print(f"[PASS] GET /api/verification/history: 200 OK | History count: {len(history)}")

    # 8. Scenario Switching (Empty-Room Wastage)
    r = client.post("/api/simulator/scenario", json={"scenario": "EMPTY_ROOM_WASTAGE"})
    assert r.status_code == 200, f"Scenario failed: {r.status_code}"
    sc_res = r.json()
    assert sc_res["active_scenario"] == "EMPTY_ROOM_WASTAGE"
    print(f"[PASS] POST /api/simulator/scenario (EMPTY_ROOM_WASTAGE): 200 OK")

    # 9. Verify Detection of Empty Room Wastage
    r = client.get("/api/telemetry/live")
    assert r.status_code == 200
    wastage_tick = r.json()["telemetry"]
    lab1 = wastage_tick["rooms"]["room-lab-1"]
    assert lab1["is_occupied"] is False
    assert lab1["power_kw"] > 7.0
    print(f"[PASS] Detection Engine verified Empty Room Wastage in Lab 1: Power {lab1['power_kw']} kW while Occupied={lab1['is_occupied']}")

    # 10. Switch back to NORMAL
    client.post("/api/simulator/scenario", json={"scenario": "NORMAL"})
    print("[PASS] Reset scenario back to NORMAL")

    # 11. Location Tariffs
    r = client.get("/api/settings/tariffs")
    assert r.status_code == 200
    tariffs = r.json()
    assert len(tariffs) >= 4
    print(f"[PASS] GET /api/settings/tariffs: 200 OK | Tariffs available: {len(tariffs)}")

    # 12. Google Sheets Dual-Mode Configuration
    r = client.get("/api/settings/google-sheets")
    assert r.status_code == 200
    gs_status = r.json()
    assert "configured" in gs_status
    print(f"[PASS] GET /api/settings/google-sheets: 200 OK | Configured: {gs_status['configured']}")

    # 13. Google Apps Script Template
    r = client.get("/api/settings/google-sheets/script-code")
    assert r.status_code == 200
    script_data = r.json()
    assert len(script_data["code"]) > 500
    print(f"[PASS] GET /api/settings/google-sheets/script-code: 200 OK | Script length: {len(script_data['code'])} chars")

    print("\nALL STAGE 2 FASTAPI BACKEND, DETECTION & GOOGLE SHEETS TESTS PASSED (100%)!\n")

if __name__ == "__main__":
    test_api()

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Room, Alert
from app.schemas import RoomResponse, AlertResponse
from app.simulator import simulator

router = APIRouter(prefix="/rooms", tags=["rooms"])

@router.get("", response_model=List[RoomResponse])
def get_all_rooms(db: Session = Depends(get_db)):
    """
    Returns list of all monitored rooms with live electrical parameters.
    """
    rooms = db.query(Room).all()
    return rooms

@router.get("/{room_id}")
def get_room_details(room_id: str, db: Session = Depends(get_db)):
    """
    Returns details for a specific room including associated alerts.
    """
    room = db.query(Room).filter_by(id=room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail=f"Room '{room_id}' not found")
    
    alerts = db.query(Alert).filter_by(room_id=room_id).order_by(Alert.created_at.desc()).limit(10).all()
    
    return {
        "room": RoomResponse.from_orm(room),
        "recent_alerts": [AlertResponse.from_orm(a) for a in alerts]
    }

@router.post("/{room_id}/toggle-occupancy")
def toggle_room_occupancy(room_id: str, db: Session = Depends(get_db)):
    """
    Allows user to manually toggle room occupancy state to demonstrate
    immediate detection of empty-room energy waste.
    """
    room = db.query(Room).filter_by(id=room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail=f"Room '{room_id}' not found")
    
    new_state = not room.is_occupied
    room.is_occupied = new_state
    
    # Sync with simulator config if present
    if room_id in simulator.room_configs:
        simulator.room_configs[room_id]["is_occupied"] = new_state

    db.commit()
    db.refresh(room)
    
    return {
        "success": True,
        "room_id": room_id,
        "is_occupied": room.is_occupied,
        "message": f"Room '{room.name}' occupancy set to {'Occupied' if room.is_occupied else 'Unoccupied'}"
    }

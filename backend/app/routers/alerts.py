import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Alert, VerificationEvent, User
from app.schemas import AlertResponse, VerificationCreate, VerificationResponse

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.get("", response_model=List[AlertResponse])
def get_alerts(
    status: Optional[str] = Query(None, description="Filter by status: new, under_review, verified, dismissed, resolved"),
    severity: Optional[str] = Query(None, description="Filter by severity: low, medium, high, critical"),
    db: Session = Depends(get_db)
):
    """
    Returns list of alerts, optionally filtered by status and severity.
    Ordered by creation timestamp descending.
    """
    query = db.query(Alert)
    if status and status != "all":
        query = query.filter(Alert.status == status)
    if severity and severity != "all":
        query = query.filter(Alert.severity == severity)
    
    return query.order_by(Alert.created_at.desc()).all()


@router.get("/{alert_id}")
def get_alert_detail(alert_id: str, db: Session = Depends(get_db)):
    """
    Returns full alert details and complete verification audit timeline.
    """
    alert = db.query(Alert).filter_by(id=alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found")
    
    events = db.query(VerificationEvent).filter_by(alert_id=alert_id).order_by(VerificationEvent.timestamp.asc()).all()
    
    return {
        "alert": AlertResponse.from_orm(alert),
        "timeline": [VerificationResponse.from_orm(e) for e in events]
    }


@router.post("/{alert_id}/verify", response_model=VerificationResponse)
def verify_alert(
    alert_id: str,
    payload: VerificationCreate,
    db: Session = Depends(get_db)
):
    """
    Authorized Human-in-the-Loop Verification Endpoint.
    Transitions alert status and records an immutable verification event.
    
    Allowed transitions:
    - new -> under_review, dismissed, verified
    - under_review -> verified, dismissed, resolved
    - verified -> resolved, dismissed
    - dismissed / resolved -> under_review (re-opened)
    """
    valid_states = ["new", "under_review", "verified", "dismissed", "resolved"]
    if payload.new_status not in valid_states:
        raise HTTPException(status_code=400, detail=f"Invalid new_status '{payload.new_status}'. Must be one of {valid_states}")

    alert = db.query(Alert).filter_by(id=alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found")

    prev_status = alert.status
    now = datetime.datetime.utcnow()

    # Find user if exists
    user = db.query(User).filter_by(username=payload.user_name.lower().replace(" ", "")).first()
    user_id = user.id if user else None

    # Create verification audit event
    ver_event = VerificationEvent(
        alert_id=alert.id,
        user_id=user_id,
        user_name=payload.user_name,
        user_role=payload.user_role,
        previous_status=prev_status,
        new_status=payload.new_status,
        verification_notes=payload.verification_notes,
        action_taken=payload.action_taken or "Inspection recorded",
        timestamp=now
    )
    db.add(ver_event)

    # Update alert
    alert.status = payload.new_status
    alert.updated_at = now

    db.commit()
    db.refresh(ver_event)

    # Sync to Google Sheets if configured
    try:
        from app.google_sheets import sheets_service
        sheets_service.sync_verification({
            "id": ver_event.id,
            "alert_id": alert.id,
            "user_name": ver_event.user_name,
            "user_role": ver_event.user_role,
            "previous_status": prev_status,
            "new_status": payload.new_status,
            "verification_notes": payload.verification_notes,
            "action_taken": ver_event.action_taken
        })
    except Exception:
        pass

    return ver_event

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import VerificationEvent, Alert
from app.schemas import VerificationResponse, AlertResponse

router = APIRouter(prefix="/verification", tags=["verification"])

@router.get("/history", response_model=List[VerificationResponse])
def get_verification_history(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    Returns complete chronological audit log of human-in-the-loop verification actions.
    """
    events = db.query(VerificationEvent).order_by(VerificationEvent.timestamp.desc()).limit(limit).all()
    return events


@router.get("/pending", response_model=List[AlertResponse])
def get_pending_verification_queue(db: Session = Depends(get_db)):
    """
    Returns alerts that are in 'new' or 'under_review' status,
    forming the primary queue for authorized verification personnel.
    """
    pending = db.query(Alert).filter(Alert.status.in_(["new", "under_review"])).order_by(Alert.severity.asc(), Alert.created_at.desc()).all()
    return pending

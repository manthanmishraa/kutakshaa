from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Alert, Patient, User
from app.schemas import DashboardSummary

router = APIRouter()


@router.get("/patient", response_model=DashboardSummary)
def patient_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient_count = db.query(Patient).filter(Patient.owner_id == current_user.id).count()
    alert_count = db.query(Alert).join(Patient).filter(Patient.owner_id == current_user.id).count()
    return {
        "patient_count": patient_count,
        "alert_count": alert_count,
        "latest_risk": {"score": 24, "level": "green", "summary": "Baseline remains stable"},
        "recent_activities": [{"activity": "walking", "confidence": 0.91}, {"activity": "sitting", "confidence": 0.88}],
    }


@router.get("/caregiver", response_model=DashboardSummary)
def caregiver_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient_count = db.query(Patient).count()
    alert_count = db.query(Alert).count()
    return {
        "patient_count": patient_count,
        "alert_count": alert_count,
        "latest_risk": {"score": 37, "level": "yellow", "summary": "One patient shows mild deviation"},
        "recent_activities": [{"activity": "walking", "confidence": 0.9}, {"activity": "standing", "confidence": 0.86}],
    }


@router.get("/doctor", response_model=DashboardSummary)
def doctor_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient_count = db.query(Patient).count()
    alert_count = db.query(Alert).count()
    return {
        "patient_count": patient_count,
        "alert_count": alert_count,
        "latest_risk": {"score": 41, "level": "orange", "summary": "Persistent pattern warrants review"},
        "recent_activities": [{"activity": "sleeping", "confidence": 0.95}, {"activity": "reading", "confidence": 0.83}],
    }

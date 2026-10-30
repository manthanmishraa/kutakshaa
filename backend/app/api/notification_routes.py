from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import CareTeamAlertNotification, User
from app.schemas import (
    AlertBroadcastRequest,
    AlertBroadcastResult,
    AlertNotificationOut,
)

router = APIRouter()
CARE_TEAM_ROLES = ("caregiver", "caretaker", "doctor")


@router.post(
    "/alerts",
    response_model=AlertBroadcastResult,
    status_code=status.HTTP_201_CREATED,
)
def broadcast_alert(
    payload: AlertBroadcastRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role.lower() not in {"patient", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only a patient account can broadcast tracking alerts.",
        )

    recipients = (
        db.query(User)
        .filter(func.lower(User.role).in_(CARE_TEAM_ROLES))
        .all()
    )
    if not recipients:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No caretaker or doctor accounts are registered to receive alerts.",
        )

    title = f"{payload.severity.capitalize()} alert - {payload.label}"
    notifications = [
        CareTeamAlertNotification(
            recipient_id=recipient.id,
            patient_id=payload.patient_id,
            patient_name=payload.patient_name,
            patient_age=payload.patient_age,
            metric=payload.metric,
            title=title,
            body=payload.message,
            severity=payload.severity,
            direction=payload.direction,
            current=payload.current,
            baseline=payload.baseline,
            deviation=payload.deviation,
            unit=payload.unit,
        )
        for recipient in recipients
    ]
    db.add_all(notifications)
    db.commit()
    return {"recipient_count": len(notifications)}


@router.get("/alerts", response_model=list[AlertNotificationOut])
def list_care_team_alerts(
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role.lower() not in {*CARE_TEAM_ROLES, "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Care-team alerts are only available to caretakers and doctors.",
        )

    return (
        db.query(CareTeamAlertNotification)
        .filter(CareTeamAlertNotification.recipient_id == current_user.id)
        .order_by(CareTeamAlertNotification.created_at.desc())
        .limit(limit)
        .all()
    )

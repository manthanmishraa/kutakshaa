from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Patient, User
from app.schemas import PatientCreate, PatientOut

router = APIRouter()


@router.get("", response_model=list[PatientOut])
def list_patients(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in {"doctor", "caregiver", "admin"}:
        return db.query(Patient).filter(Patient.owner_id == current_user.id).all()
    return db.query(Patient).all()


@router.post("", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def create_patient(payload: PatientCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = Patient(owner_id=current_user.id, **payload.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient or (current_user.role not in {"doctor", "caregiver", "admin"} and patient.owner_id != current_user.id):
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.put("/{patient_id}", response_model=PatientOut)
def update_patient(patient_id: int, payload: PatientCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient or (current_user.role not in {"doctor", "caregiver", "admin"} and patient.owner_id != current_user.id):
        raise HTTPException(status_code=404, detail="Patient not found")

    for key, value in payload.model_dump().items():
        setattr(patient, key, value)
    db.commit()
    db.refresh(patient)
    return patient


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(patient_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient or (current_user.role not in {"doctor", "caregiver", "admin"} and patient.owner_id != current_user.id):
        raise HTTPException(status_code=404, detail="Patient not found")
    db.delete(patient)
    db.commit()
    return None

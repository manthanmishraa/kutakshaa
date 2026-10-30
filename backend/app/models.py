from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, Column, DateTime, Integer, String, Text, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="patient")
    full_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    patients = relationship("Patient", back_populates="owner")


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    full_name = Column(String(255), nullable=False)
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    medical_notes = Column(Text, nullable=True)
    emergency_contact = Column(String(255), nullable=True)
    consent_status = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="patients")
    behavior_history = relationship("BehaviorHistory", back_populates="patient")
    digital_twin = relationship("DigitalTwinProfile", back_populates="patient", uselist=False)
    activity_logs = relationship("ActivityLog", back_populates="patient")
    risk_history = relationship("RiskHistory", back_populates="patient")
    alerts = relationship("Alert", back_populates="patient")
    reports = relationship("Report", back_populates="patient")
    doctor_notes = relationship("DoctorNote", back_populates="patient")
    notifications = relationship("Notification", back_populates="patient")


class BehaviorHistory(Base):
    __tablename__ = "behavior_history"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    activity = Column(String(80), nullable=False)
    confidence = Column(Float, default=0.0)
    features = Column(JSON, default={})
    context_summary = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="behavior_history")


class DigitalTwinProfile(Base):
    __tablename__ = "digital_twin_profiles"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    walking_baseline = Column(Float, default=0.0)
    activity_baseline = Column(String(80), default="unknown")
    posture_baseline = Column(Float, default=0.0)
    sleep_pattern = Column(String(120), default="regular")
    daily_routine = Column(JSON, default={})
    weekly_trends = Column(JSON, default={})
    updated_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="digital_twin")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    activity = Column(String(80), nullable=False)
    confidence = Column(Float, default=0.0)
    track_id = Column(String(80), nullable=True)

    patient = relationship("Patient", back_populates="activity_logs")


class RiskHistory(Base):
    __tablename__ = "risk_history"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    health_stability_index = Column(Float, default=0.0)
    risk_score = Column(Float, default=0.0)
    severity_score = Column(Float, default=0.0)
    confidence_score = Column(Float, default=0.0)
    explanation = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="risk_history")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    level = Column(String(20), nullable=False, default="green")
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    confidence = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="alerts")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    title = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="reports")


class DoctorNote(Base):
    __tablename__ = "doctor_notes"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_name = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="doctor_notes")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    channel = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="notifications")

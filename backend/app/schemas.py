from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    role: str = "patient"
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    username: str
    role: str
    full_name: Optional[str] = None

class PatientCreate(BaseModel):
    full_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    medical_notes: Optional[str] = None
    emergency_contact: Optional[str] = None
    consent_status: bool = True


class PatientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    full_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    medical_notes: Optional[str] = None
    emergency_contact: Optional[str] = None
    consent_status: bool
    created_at: datetime

class BehaviourFeaturePayload(BaseModel):
    walking_speed: float
    activity_level: float
    sitting_duration: float
    standing_duration: float
    posture_stability: float
    balance_score: float
    tremor_index: float
    gait_rhythm: float
    movement_variability: float
    step_consistency: float


class CameraAnalysisRequest(BaseModel):
    image: Optional[str] = None
    frame_source: str = "webcam"
    activity_hint: Optional[str] = None


class CameraAnalysisResponse(BaseModel):
    human_detected: bool
    activity: str
    confidence: float
    skeleton_landmarks: List[Dict[str, Any]]
    track_id: Optional[str] = None
    features: BehaviourFeaturePayload
    context_summary: str
    risk_signal: Dict[str, Any]


class ExplainRequest(BaseModel):
    baseline: Dict[str, Any]
    current: Dict[str, Any]
    health_stability: float
    risk_score: float


class ExplainResponse(BaseModel):
    behaviour_summary: str
    reasons: List[str]
    recommendations: List[str]
    caregiver_explanation: str
    doctor_summary: str
    risk: Dict[str, Any]


class DigitalTwinResponse(BaseModel):
    baseline: Dict[str, Any]
    current: Dict[str, Any]
    timeline: List[Dict[str, Any]]
    health_stability: float
    risk_score: float


class SimulateRequest(BaseModel):
    days: int = 7
    mode: str = "decline"


class ChatTurn(BaseModel):
    user: str
    assistant: str


class BehaviorContext(BaseModel):
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    baseline: Dict[str, Any] = Field(default_factory=dict)
    latest: Dict[str, Any] = Field(default_factory=dict)
    history: List[Dict[str, Any]] = Field(default_factory=list, max_length=60)
    graph_trend: List[Dict[str, Any]] = Field(default_factory=list, max_length=60)
    hsi: Optional[float] = None
    risk_score: Optional[float] = None
    severity_score: Optional[float] = None


class ChatQueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    chat_history: List[ChatTurn] = Field(default_factory=list)
    behavior_context: Optional[BehaviorContext] = None

    @field_validator("query")
    @classmethod
    def query_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("query must not be blank")
        return stripped


class ChatQueryResponse(BaseModel):
    answer: str
    intent: str
    sources: List[str] = Field(default_factory=list)


class DashboardSummary(BaseModel):
    patient_count: int
    alert_count: int
    latest_risk: Dict[str, Any]
    recent_activities: List[Dict[str, Any]]

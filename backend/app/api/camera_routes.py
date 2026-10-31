from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.models import User
from app.schemas import CameraAnalysisRequest, CameraAnalysisResponse
from app.services.behaviour_engine import BehaviourIntelligenceEngine

router = APIRouter()
engine = BehaviourIntelligenceEngine()


@router.post("/analyse", response_model=CameraAnalysisResponse)
def analyse_camera(payload: CameraAnalysisRequest, current_user: User = Depends(get_current_user)):
    result = engine.analyse(payload.model_dump())
    return result

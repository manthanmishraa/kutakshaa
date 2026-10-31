from fastapi import APIRouter
from app.schemas import (
    CameraAnalysisRequest,
    CameraAnalysisResponse,
    ExplainRequest,
    ExplainResponse,
    DigitalTwinResponse,
    SimulateRequest,
)
from app.services.behaviour_engine import BehaviourIntelligenceEngine
from app.services.explainable_ai import ExplainableAIEngine

router = APIRouter()
explain_engine = ExplainableAIEngine()
engine = BehaviourIntelligenceEngine()

@router.post('/detect', response_model=CameraAnalysisResponse)
def detect(payload: CameraAnalysisRequest):
    return engine.analyse(payload.model_dump())


@router.post('/explain', response_model=ExplainResponse)
def explain(request: ExplainRequest):
    return explain_engine.generate_summary(
        {
            'baseline': request.baseline,
            'current': request.current,
        },
        {'health_stability': request.health_stability, 'risk_score': request.risk_score},
    )


@router.post('/simulate')
def simulate(request: SimulateRequest):
    return {
        'message': 'Simulation completed',
        'mode': request.mode,
        'days': request.days,
    }


@router.get('/digital-twin', response_model=DigitalTwinResponse)
def get_digital_twin():
    return {
        'baseline': {
            'walking_speed': 1.2,
            'activity_level': 82,
        },
        'current': {
            'walking_speed': 1.1,
            'activity_level': 78,
        },
        'timeline': [
            {'day': 'D1', 'hsi': 97, 'risk': 18},
            {'day': 'D2', 'hsi': 96, 'risk': 20},
            {'day': 'D3', 'hsi': 95, 'risk': 21},
            {'day': 'D4', 'hsi': 94, 'risk': 23},
            {'day': 'D5', 'hsi': 92, 'risk': 24},
            {'day': 'D6', 'hsi': 91, 'risk': 25},
            {'day': 'Today', 'hsi': 90, 'risk': 26},
        ],
        'health_stability': 90,
        'risk_score': 26,
    }

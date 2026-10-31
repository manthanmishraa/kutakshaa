from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from app.schemas import BehaviourFeaturePayload, CameraAnalysisResponse


class BehaviourIntelligenceEngine:
    """Simulated behaviour intelligence pipeline for the Kutaksha prototype."""

    def analyse(self, payload: Dict[str, Any]) -> CameraAnalysisResponse:
        features = BehaviourFeaturePayload(
            walking_speed=payload.get("walking_speed", 1.1),
            activity_level=payload.get("activity_level", 0.75),
            sitting_duration=payload.get("sitting_duration", 0.4),
            standing_duration=payload.get("standing_duration", 0.3),
            posture_stability=payload.get("posture_stability", 0.82),
            balance_score=payload.get("balance_score", 0.79),
            tremor_index=payload.get("tremor_index", 0.16),
            gait_rhythm=payload.get("gait_rhythm", 0.84),
            movement_variability=payload.get("movement_variability", 0.21),
            step_consistency=payload.get("step_consistency", 0.88),
        )

        activity = self._recognise_activity(features)
        confidence = self._score_confidence(activity, features)
        context_summary = self._build_context_summary(activity, features)
        risk_signal = self._build_risk_signal(activity, features, confidence)

        return CameraAnalysisResponse(
            human_detected=True,
            activity=activity,
            confidence=confidence,
            skeleton_landmarks=[
                {"name": "left_hip", "x": 0.48, "y": 0.54},
                {"name": "right_hip", "x": 0.52, "y": 0.54},
                {"name": "left_knee", "x": 0.46, "y": 0.70},
                {"name": "right_knee", "x": 0.54, "y": 0.70},
            ],
            track_id="track-001",
            features=features,
            context_summary=context_summary,
            risk_signal=risk_signal,
        )

    def _recognise_activity(self, features: BehaviourFeaturePayload) -> str:
        if features.walking_speed > 1.2 and features.activity_level > 0.7:
            return "walking"
        if features.sitting_duration > 0.55:
            return "sitting"
        if features.standing_duration > 0.4:
            return "standing"
        if features.tremor_index > 0.3:
            return "unknown"
        return "reading"

    def _score_confidence(self, activity: str, features: BehaviourFeaturePayload) -> float:
        base = 0.82
        if activity == "walking":
            base += 0.05
        if features.step_consistency > 0.85:
            base += 0.03
        return round(min(base, 0.99), 2)

    def _build_context_summary(self, activity: str, features: BehaviourFeaturePayload) -> str:
        if activity == "walking" and features.gait_rhythm > 0.8:
            return "Stable walking pattern observed with consistent rhythm."
        if activity == "sitting" and features.sitting_duration > 0.5:
            return "Extended sitting period with low movement variation."
        return "Observed activity remains within the patient's recent behavioural routine."

    def _build_risk_signal(self, activity: str, features: BehaviourFeaturePayload, confidence: float) -> Dict[str, Any]:
        deviation = 0.0
        if activity == "walking" and features.gait_rhythm < 0.6:
            deviation += 0.2
        if features.tremor_index > 0.25:
            deviation += 0.18
        if features.posture_stability < 0.6:
            deviation += 0.15

        hsi = max(60, round(100 - (deviation * 100) - (confidence * 8)))
        risk_score = round(min(100, max(0, 100 - hsi + deviation * 30)))
        severity_score = round(min(100, max(0, risk_score * 0.8)))
        confidence_score = round(min(100, confidence * 100))

        return {
            "health_stability_index": hsi,
            "risk_score": risk_score,
            "severity_score": severity_score,
            "confidence_score": confidence_score,
            "explanation": "The analysis is based on the patient's own baseline and contextual behaviour, not peer comparison.",
        }

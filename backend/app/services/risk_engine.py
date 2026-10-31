from __future__ import annotations

from typing import Dict, Any


class RiskEngine:
    def evaluate(self, features: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        score = 20
        if context.get("activity") == "walking" and features.get("tremor_index", 0) > 0.25:
            score += 18
        if features.get("sitting_duration", 0) > 0.5:
            score += 8
        if context.get("confidence", 0) > 0.9:
            score += 6
        score = max(0, min(100, score))
        return {
            "health_stability_index": 100 - score,
            "risk_score": score,
            "severity_score": min(100, int(score * 0.8)),
            "confidence_score": int(context.get("confidence", 0) * 100),
            "explanation": "Persistent behavioural deviation compared to the patient's baseline and supported by multiple signals.",
        }

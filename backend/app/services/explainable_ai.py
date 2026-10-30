from __future__ import annotations

from typing import Dict, Any


class ExplainableAIEngine:
    def generate_summary(self, context: Dict[str, Any], risk: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "behaviour_summary": "The observed behaviour remains mostly aligned with the patient's own routine.",
            "reasons": ["Stable gait rhythm", "No sustained high-risk deviation", "Context matches the daily routine"],
            "recommendations": ["Continue routine monitoring", "Encourage hydration and mobility", "Escalate only if symptoms persist"],
            "caregiver_explanation": "The system detected a mild variation but it is not yet severe enough to trigger a high-confidence alert.",
            "doctor_summary": "This is a CDSS output and should be reviewed in context with clinical observations.",
            "risk": risk,
        }

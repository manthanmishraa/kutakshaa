from __future__ import annotations

from pathlib import Path
from typing import Dict, Any

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas


class ReportEngine:
    def generate_pdf(self, patient_name: str, summary: Dict[str, Any], output_dir: str = "./reports") -> str:
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        pdf_path = Path(output_dir) / f"{patient_name.replace(' ', '_')}_report.pdf"
        c = canvas.Canvas(str(pdf_path), pagesize=letter)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, 750, "Kutaksha Clinical Decision Support Report")
        c.setFont("Helvetica", 11)
        c.drawString(50, 720, f"Patient: {patient_name}")
        c.drawString(50, 700, f"HSI: {summary.get('hsi', 'N/A')}")
        c.drawString(50, 680, f"Risk: {summary.get('risk', 'N/A')}")
        c.drawString(50, 660, "AI Summary: " + summary.get("ai_summary", "Stable observation"))
        c.save()
        return str(pdf_path)

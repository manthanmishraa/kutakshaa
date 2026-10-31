from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.database import Base, engine
from app.api.auth_routes import router as auth_router
from app.api.patient_routes import router as patient_router
from app.api.camera_routes import router as camera_router
from app.api.dashboard_routes import router as dashboard_router
from app.api.demo_routes import router as demo_router
from app.api.chat_routes import router as chat_router
from app.middleware.rate_limit import RateLimitMiddleware
from app.services.rag_service import RagUnavailable

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Kutaksha Backend", version="0.1.0", description="AI-powered preventive elder wellness platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware)

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(patient_router, prefix="/patients", tags=["patients"])
app.include_router(camera_router, prefix="/camera", tags=["camera"])
app.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
app.include_router(demo_router, prefix="/api", tags=["demo"])
app.include_router(chat_router, prefix="/chat", tags=["chat"])


@app.exception_handler(RagUnavailable)
async def rag_unavailable_handler(request: Request, exc: RagUnavailable):
    """The RAG stack is optional: report it as unavailable, not as a crash."""
    return JSONResponse(
        status_code=503,
        content={"detail": f"The RAG assistant is not available: {exc}"},
    )


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "kutaksha-backend"}

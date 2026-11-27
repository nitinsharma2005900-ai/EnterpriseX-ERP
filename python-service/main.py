from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")
import os
import secrets
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as api_router

app = FastAPI(
    title="EnterpriseX Finance & Analytics Service",
    description="Python 3 & FastAPI microservice for deterministic financial calculations, tax engine, reconciliation, and executive analytics.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Enable CORS for Next.js frontend and Express backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def authenticate_service(request: Request, call_next):
    if request.url.path.startswith("/api/"):
        expected = os.environ.get("SERVICE_TOKEN", "local-development-service-token")
        if not secrets.compare_digest(request.headers.get("x-service-token", ""), expected):
            return JSONResponse(status_code=401, content={"detail": "Service authentication required"})
    return await call_next(request)

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "HEALTHY",
        "service": "enterprisex-python-finance",
        "version": "1.0.0",
        "checks": {
            "engine": "OPERATIONAL",
            "tax_rules": "LOADED",
            "reconciliation": "READY"
        }
    }

app.include_router(api_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", "8000")), reload=False)

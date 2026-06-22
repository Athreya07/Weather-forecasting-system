"""
Pune Weather Forecasting System - FastAPI Backend
Production-ready REST API for weather predictions
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import os

from app.api import weather, forecast, analytics, metrics, predict
from app.core.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Pune Weather Forecasting API",
    description="ML-powered weather forecasting system for Pune, India",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(weather.router, prefix="/api/weather", tags=["Weather"])
app.include_router(forecast.router, prefix="/api/forecast", tags=["Forecast"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(metrics.router, prefix="/api/metrics", tags=["Metrics"])
app.include_router(predict.router, prefix="/api/predict", tags=["Predict"])


@app.get("/", tags=["Root"])
async def root():
    return {
        "service": "Pune Weather Forecasting System",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/api/docs"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": "pune-weather-api"}


@app.exception_handler(404)
async def not_found(request, exc):
    return JSONResponse(status_code=404, content={"error": "Endpoint not found"})


@app.exception_handler(500)
async def server_error(request, exc):
    logger.error(f"Internal error: {exc}")
    return JSONResponse(status_code=500, content={"error": "Internal server error"})

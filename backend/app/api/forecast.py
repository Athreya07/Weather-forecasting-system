"""Forecast endpoints."""
from fastapi import APIRouter, Query, HTTPException
from app.services.prediction_service import get_forecast, get_hourly_forecast
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/")
async def forecast(hours: int = Query(default=6, ge=1, le=48)):
    """Get weather forecast for 1h, 3h, 6h horizons."""
    try:
        data = get_forecast(hours)
        return {"status": "success", "location": "Pune", "forecasts": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hourly")
async def hourly_forecast(hours: int = Query(default=24, ge=1, le=48)):
    """Get hour-by-hour forecast."""
    try:
        data = get_hourly_forecast(hours)
        return {"status": "success", "forecasts": data, "count": len(data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

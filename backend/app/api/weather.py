"""Current weather endpoint."""
from fastapi import APIRouter, HTTPException
from app.services.prediction_service import get_current_conditions
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/current")
async def current_weather():
    """Get current weather conditions for Pune."""
    try:
        data = get_current_conditions()
        return {"status": "success", "location": "Pune, Maharashtra, India", "data": data}
    except Exception as e:
        logger.error(f"current_weather error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

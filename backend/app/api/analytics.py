"""Analytics and historical data endpoints."""
from fastapi import APIRouter, HTTPException
from app.services.prediction_service import get_historical_summary
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/historical")
async def historical():
    """Get historical weather trends and summaries."""
    try:
        data = get_historical_summary()
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

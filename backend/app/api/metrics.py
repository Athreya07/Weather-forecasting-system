"""Model metrics endpoint."""
from fastapi import APIRouter, HTTPException
from app.services.prediction_service import get_model_metrics
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/")
async def model_metrics():
    """Get ML model performance metrics."""
    try:
        data = get_model_metrics()
        return {"status": "success", "metrics": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

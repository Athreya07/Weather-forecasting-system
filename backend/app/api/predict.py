"""Custom prediction endpoint."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.prediction_service import _predict_for_horizon
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class PredictRequest(BaseModel):
    horizon_hours: int = 1
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    pressure: Optional[float] = None
    wind_speed: Optional[float] = None


@router.post("/")
async def predict(request: PredictRequest):
    """Run a custom weather prediction."""
    try:
        if request.horizon_hours not in [1, 3, 6, 12, 24]:
            raise ValueError("horizon_hours must be one of: 1, 3, 6, 12, 24")
        result = _predict_for_horizon(request.horizon_hours)
        return {"status": "success", "prediction": result}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

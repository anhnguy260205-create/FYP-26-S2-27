
from fastapi import APIRouter, Depends

from app.control.controller.ratingc import RatingController
from app.control.services.auth import get_current_user

router = APIRouter(prefix="/rating", tags=["Rating"])


@router.get("/sectors")
def get_sectors(current_user: dict = Depends(get_current_user)):
    return {"success": True, "sectors": RatingController().list_sectors()}


@router.get("/sector/{sector_key}")
def get_sector_ranking(sector_key: str, current_user: dict = Depends(get_current_user)):
    result = RatingController().rank_sector(sector_key)
    if result is None:
        return {"success": False, "message": f"Unknown sector or model unavailable: {sector_key}"}
    return {"success": True, **result}


@router.get("/{symbol}")
def get_rating(symbol: str, current_user: dict = Depends(get_current_user)):
    result = RatingController().rate(symbol.upper())
    if result is None:
        return {"success": False, "message": f"Rating unavailable for {symbol.upper()}"}
    return {"success": True, **result}

from fastapi import APIRouter, Depends

from app.control.controller.ratingc import RatingController
from app.control.services.auth import get_current_user


router = APIRouter(prefix="/rating", tags=["Rating"])


# Get the list of sectors available for rating.
@router.get("/sectors")
def get_sectors(current_user: dict = Depends(get_current_user)):
    return {
        "success": True,
        "sectors": RatingController().list_sectors()
    }


# Get the ranking of stocks within a selected sector.
@router.get("/sector/{sector_key}")
def get_sector_ranking(
    sector_key: str,
    current_user: dict = Depends(get_current_user)
):
    result = RatingController().rank_sector(sector_key)

    # Return an error when the sector is not supported or the model is unavailable.
    if result is None:
        return {
            "success": False,
            "message": f"Unknown sector or model unavailable: {sector_key}"
        }

    return {
        "success": True,
        **result
    }


# Get the rating for a specific stock.
@router.get("/{symbol}")
def get_rating(
    symbol: str,
    current_user: dict = Depends(get_current_user)
):
    result = RatingController().rate(symbol.upper())

    # Some stocks may not have enough data for a rating.
    if result is None:
        return {
            "success": False,
            "message": f"Rating unavailable for {symbol.upper()}"
        }

    return {
        "success": True,
        **result
    }

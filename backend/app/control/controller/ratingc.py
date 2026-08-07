"""
RatingController
================
Drives the Sector Quant Rating feature. Thin wrapper over
``app.control.services.sector_model`` — keeps the boundary layer free of any
ML / yfinance details.

Endpoints it backs (see ratingb.py):
  • GET /rating/{symbol}          -> full quant rating for one ticker
  • GET /rating/sector/{sector}   -> leaderboard for a sector cohort
  • GET /rating/sectors           -> list of available sectors
"""

from app.control.services import sector_model


class RatingController:

    def rate(self, symbol: str) -> dict | None:
        return sector_model.rate_symbol(symbol)

    def rank_sector(self, sector_key: str) -> dict | None:
        return sector_model.rank_sector(sector_key)

    def list_sectors(self) -> list:
        return sector_model.list_sectors()


from app.control.services import sector_model


class RatingController:

    def rate(self, symbol: str) -> dict | None:
        return sector_model.rate_symbol(symbol)

    def rank_sector(self, sector_key: str) -> dict | None:
        return sector_model.rank_sector(sector_key)

    def list_sectors(self) -> list:
        return sector_model.list_sectors()


from app.entity.models.expertportfolio import ExpertPortfolioRepository


class ExpertPortfolioController:
    def get_portfolio(self, user_id=None):
        portfolio = ExpertPortfolioRepository.get_or_seed_by_user(user_id)
        if not portfolio:
            return {"success": False, "message": "Expert portfolio not found"}
        return {"success": True, "portfolio": portfolio}

    def save_portfolio(self, user_id, payload):
        portfolio = ExpertPortfolioRepository.save_for_user(user_id, payload)
        if not portfolio:
            return {"success": False, "message": "Unable to save portfolio"}
        return {"success": True, "portfolio": portfolio, "message": "Portfolio saved successfully"}

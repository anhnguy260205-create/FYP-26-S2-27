from app.entity.models.investor import Investor
from app.entity.models.subscription import Subscription
from app.entity.models.watchlist import Watchlist


class CreateInvestorController:
    def createSubscription(self, transaction_id, plan_type, investor_id):
        subscription = Subscription.createSubscription(
            transaction_id, plan_type, investor_id)
        return subscription


class GetInvestorController:
    def getInvestorByUserId(self, user_id):
        return Investor.getInvestorByUserId(user_id)


class AddStockToWatchlist:
    def addStockToWatchlist(self, user_id, stock_symbol):
        return Watchlist.add_stock(user_id, stock_symbol)


class RemoveStockFromWatchlist:
    def removeStockFromWatchlist(self, user_id, stock_symbol):
        return Watchlist.remove_stock(user_id, stock_symbol)


class GetWatchlist:
    def getWatchlist(self, user_id):
        return Watchlist.get_watchlist(user_id)


class UpdateInvestorInterestsController:
    def update(self, user_id, interests):
        return Investor.updateInterests(user_id, interests)


class UpdateInvestorRiskToleranceController:
    def update(self, user_id, risk_tolerance):
        return Investor.updateRiskTolerance(user_id, risk_tolerance)

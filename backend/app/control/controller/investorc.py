from app.entity.models.investor import Investor
from app.entity.models.subscription import Subscription


class CreateInvestorController:
    def createSubscription(self, transaction_id, plan_type, investor_id):
        subscription = Subscription.createSubscription(
            transaction_id, plan_type, investor_id)
        return subscription


class GetInvestorController:
    def getInvestorByUserId(self, user_id):
        return Investor.getInvestorByUserId(user_id)


class UpdateStockLevel:
    def updateStockLevel(self, user_id, stock_level):
        return Investor.update_investor_stock_level(user_id, stock_level)

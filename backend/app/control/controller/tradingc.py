from app.entity.models.investor import Investor
from app.entity.models.transaction import Transaction


class BuyStockController:
    def buy(self, user_id, symbol, quantity, price):
        return Investor.buyStock(user_id, symbol, quantity, price)


class SellStockController:
    def sell(self, user_id, symbol, quantity, price):
        return Investor.sellStock(user_id, symbol, quantity, price)


class GetPortfolioController:
    def get_portfolio(self, user_id):
        return Investor.getPortfolio(user_id)


class GetTransactionHistoryController:
    def get_transactions(self, investor_id, limit=50):
        return Transaction.getTransactionsByInvestor(investor_id, limit)


class GetPortalTransactionsController:
    def get_portal_transactions(self, user_id, limit=100, symbol=None, transaction_type=None):
        return Transaction.getTransactionsByUserId(user_id, limit, symbol, transaction_type)


class GetPortalSummaryController:
    def get_summary(self, user_id):
        return Transaction.getSummaryStats(user_id)


class AddPaperMoneyController:
    def add(self, user_id, amount):
        return Investor.addPaperMoney(user_id, amount)

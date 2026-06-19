from app.entity.models.investor import Investor
from app.entity.models.transaction import Transaction


class BuyStockController:
    def buy(self, user_id, symbol, quantity, price):
        return Investor.buyStock(user_id, symbol, quantity, price)


class SellStockController:
    def sell(self, user_id, symbol, quantity, price):
        return Investor.sellStock(user_id, symbol, quantity, price)


class PortfolioController:
    def get_portfolio(self, user_id):
        return Investor.getPortfolio(user_id)


class TransactionHistoryController:
    def get_history(self, investor_id, limit=50):
        return Transaction.getTransactionsByInvestor(investor_id, limit)


class TransactionPortalController:
    def get_transactions(self, user_id, limit=100,
                          symbol=None, transaction_type=None):
        return Transaction.getTransactionsByUserId(
            user_id, limit=limit, symbol=symbol,
            transaction_type=transaction_type
        )

    def get_summary(self, user_id):
        return Transaction.getSummaryStats(user_id)

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


class SubmitOrderController:
    def submit(self, user_id, symbol, order_type, quantity, limit_price):
        from app.control.services.trading_engine import submit_order
        return submit_order(user_id, symbol, order_type, quantity, limit_price)


class GetOrdersController:
    def get(self, user_id, symbol=None, limit=20):
        from app.entity.models.order_book import OrderBook
        return OrderBook.get_orders_by_user(user_id, symbol=symbol, limit=limit)


class CancelOrderController:
    def cancel(self, order_id, user_id):
        from app.entity.models.investor import Investor
        from app.entity.models.order_book import OrderBook
        investor = Investor.getInvestorByUserId(user_id)
        if not investor:
            return {"success": False, "message": "Investor not found"}
        ok = OrderBook.cancel(order_id, investor["investor_id"])
        return {"success": ok, "message": "Order cancelled" if ok else "Order not found or already closed"}

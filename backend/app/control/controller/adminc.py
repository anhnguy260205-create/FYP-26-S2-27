from app.entity.database.session import get_session
from app.entity.models.useraccount import UserAccount
from app.entity.models.investor import Investor
from app.entity.models.expert import Expert
from app.entity.models.investmentarticle import InvestmentArticle

class AdminUserAccountController:
    def getUserAccounts(self, keyword=None, role=None, status=None):
        with get_session() as session:
            query = (
                session.query(UserAccount, Investor, Expert)
                .outerjoin(Investor, UserAccount.user_id == Investor.user_id)
                .outerjoin(Expert, UserAccount.user_id == Expert.user_id)
            )

            if keyword:
                search = f"%{keyword}%"
                query = query.filter(
                    (UserAccount.username.like(search)) |
                    (UserAccount.full_name.like(search)) |
                    (UserAccount.email_address.like(search)) |
                    (UserAccount.phone_number.like(search)) |
                    (UserAccount.user_id.like(search))
                )

            if status:
                query = query.filter(UserAccount.account_status == status)

            results = query.all()

            users = []

            for user_account, investor, expert in results:
                if expert:
                    user_role = "Expert"
                elif investor:
                    if investor.investor_subscription_status == "active":
                        user_role = "Premium"
                    else:
                        user_role = "Investor"

                else:
                    user_role = "Admin"

                if role and user_role.lower() != role.lower():
                    continue

                users.append({
                    "initials": self.makeInitials(user_account.full_name),
                    "user_id": user_account.user_id,
                    "username": user_account.username,
                    "full_name": user_account.full_name,
                    "email_address": user_account.email_address,
                    "phone_number": str(user_account.phone_number),
                    "address": user_account.address,
                    "role": user_role,
                    "account_status": user_account.account_status,
                    "join_date": user_account.join_date.strftime("%Y-%m-%d") if user_account.join_date else None,
                    "last_login": user_account.last_login.strftime("%Y-%m-%d") if user_account.last_login else None,
                    "is_active": user_account.is_active,
                })

            return users

    def makeInitials(self, full_name):
        if not full_name:
            return "NA"

        parts = full_name.split()

        if len(parts) == 1:
            return parts[0][:2].upper()

        return (parts[0][0] + parts[-1][0]).upper()
    
    def getUserAccountById(self, user_id):
        with get_session() as session:
            result = (
                session.query(UserAccount, Investor, Expert)
                .outerjoin(Investor, UserAccount.user_id == Investor.user_id)
                .outerjoin(Expert, UserAccount.user_id == Expert.user_id)
                .filter(UserAccount.user_id == user_id)
                .first()
            )

            if not result:
                return None

            user_account, investor, expert = result

            if expert:
                user_role = "Expert"
            elif investor:
                if investor.investor_subscription_status == "active":
                    user_role = "Premium"
                else:
                    user_role = "Investor"
            else:
                user_role = "Admin"

            return {
                "initials": self.makeInitials(user_account.full_name),
                "user_id": user_account.user_id,
                "username": user_account.username,
                "full_name": user_account.full_name,
                "email_address": user_account.email_address,
                "phone_number": str(user_account.phone_number),
                "address": user_account.address,
                "role": user_role,
                "account_status": user_account.account_status,
                "join_date": user_account.join_date.strftime("%Y-%m-%d") if user_account.join_date else None,
                "last_login": user_account.last_login.strftime("%Y-%m-%d") if user_account.last_login else None,
                "is_active": user_account.is_active,
            }

    def suspendUserAccount(self, user_id):
        with get_session() as session:
            user = session.query(UserAccount).filter(
                UserAccount.user_id == user_id
            ).first()

            if not user:
                return False

            user.account_status = "suspended"
            user.is_active = False

            session.commit()
            return True

    def deleteUserAccount(self, user_id):
        with get_session() as session:
            user = session.query(UserAccount).filter(
                UserAccount.user_id == user_id
            ).first()

            if not user:
                return False

            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()

            expert = session.query(Expert).filter(
                Expert.user_id == user_id
            ).first()

            if investor:
                session.delete(investor)

            if expert:
                session.delete(expert)

            session.delete(user)
            return True
        
    def activateUserAccount(self, user_id):
        with get_session() as session:
            user = session.query(UserAccount).filter(
                UserAccount.user_id == user_id
            ).first()

            if not user:
                return False

            user.account_status = "active"
            user.is_active = True

            session.commit()
            return True
        
    def getInvestmentArticles(self):
        with get_session() as session:
            articles = session.query(InvestmentArticle).order_by(
                InvestmentArticle.date_published.desc()
            ).all()

            return [
                {
                    "article_id": article.article_id,
                    "title": article.title,
                    "category": article.category,
                    "content": article.content,
                    "status": article.status,
                    "author": article.author,
                    "date_published": article.date_published.strftime("%Y-%m-%d") if article.date_published else None,
                }
                for article in articles
            ]

    def getInvestmentArticleById(self, article_id):
        with get_session() as session:
            article = session.query(InvestmentArticle).filter(
                InvestmentArticle.article_id == article_id
            ).first()

            if not article:
                return None

            return {
                "article_id": article.article_id,
                "title": article.title,
                "category": article.category,
                "content": article.content,
                "status": article.status,
                "author": article.author,
                "date_published": article.date_published.strftime("%Y-%m-%d") if article.date_published else None,
            }

    def createInvestmentArticle(self, title, category, content, status):
        with get_session() as session:
            article = InvestmentArticle(
                title=title,
                category=category,
                content=content,
                status=status,
                author="Admin",
            )

            session.add(article)
            session.flush()

            return article.article_id

    def updateInvestmentArticle(self, article_id, title, category, content, status):
        with get_session() as session:
            article = session.query(InvestmentArticle).filter(
                InvestmentArticle.article_id == article_id
            ).first()

            if not article:
                return False

            article.title = title
            article.category = category
            article.content = content
            article.status = status

            return True

    def deleteInvestmentArticle(self, article_id):
        with get_session() as session:
            article = session.query(InvestmentArticle).filter(
                InvestmentArticle.article_id == article_id
            ).first()

            if not article:
                return False

            session.delete(article)
            return True

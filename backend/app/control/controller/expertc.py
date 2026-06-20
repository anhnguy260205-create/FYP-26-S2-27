
from app.entity.models.expertportfolio import ExpertPortfolioRepository
from app.entity.models.forumquestion import ExpertQuestionRepository


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


class ExpertQuestionsController:
    def list_questions(self, user_id=None):
        return {"success": True, "questions": ExpertQuestionRepository.list_for_expert(user_id)}

    def get_question(self, question_id):
        question = ExpertQuestionRepository.get(question_id)
        if not question:
            return {"success": False, "message": "Question not found"}
        return {"success": True, "question": question}

    def reply_question(self, question_id, reply_text):
        question = ExpertQuestionRepository.reply(question_id, reply_text)
        if not question:
            return {"success": False, "message": "Question not found"}
        return {"success": True, "question": question, "message": "Reply saved successfully"}

    def delete_reply(self, question_id):
        question = ExpertQuestionRepository.delete_reply(question_id)
        if not question:
            return {"success": False, "message": "Question not found"}
        return {"success": True, "question": question, "message": "Reply deleted successfully"}

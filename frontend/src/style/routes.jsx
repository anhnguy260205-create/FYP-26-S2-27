import { createBrowserRouter } from "react-router-dom";
import RegistrationPage from "./pages/user/RegistrationPage.jsx";
import LoginPage from "./pages/user/LoginPage.jsx";
import HomePage from "./pages/user/HomePage.jsx";
import RealTimeDashBoardPage from "./pages/investor/RealTimeDashBoardPage.jsx"
import AIPredictionPage from "./pages/investor/AIPredictionPage.jsx";
import ForumPage from "./pages/shared/ForumPage.jsx";
import AStockDashBoardPage from "./pages/investor/AStockDashBoardPage.jsx";
import AdminPanelPage from "./pages/administrator/AdminPanelPage.jsx";
import UserAccountsPage from "./pages/administrator/UserAccountsPage.jsx";
import UserAccountDetailsPage from "./pages/administrator/UserAccountDetailsPage.jsx";
import UserProfilesPage from "./pages/administrator/UserProfilesPage.jsx";
import CommunityPostsPage from "./pages/administrator/CommunityPostsPage.jsx";
import CommunityPostDetailsPage from "./pages/administrator/CommunityPostDetailsPage.jsx";
import TradeManagementPage from "./pages/administrator/TradeManagementPage.jsx";
import InvestmentGuidanceArticlesPage from "./pages/administrator/InvestmentGuidanceArticlesPage.jsx";
import SubscriptionPage from "./pages/investor/SubscriptionPage.jsx";
import LoggedInHomePage from "./pages/investor/LoggedInHomePage.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import PaymentSuccess from "./pages/investor/PaymentSuccess.jsx";
import PaymentFail from "./pages/investor/PaymentFail.jsx";
import InvestorProfilePage from "./pages/investor/InvestorProfilePage.jsx";
import Watchlist from "./pages/investor/Watchlist.jsx";
import Notification from "./pages/investor/Notification.jsx";
import ExpertAdvice from "./pages/investor/ExpertAdvice.jsx";
import ExpertPortfolio from "./pages/investor/ExpertPortfolio.jsx";
import EducationContent from "./pages/investor/EducationContent.jsx";
import AIChatbot from "./pages/investor/AIChatbot.jsx";
import ExpertDetails from "./pages/investor/ExpertDetail.jsx";
import UpdateParticularPage from "./pages/investor/UpdateParticularPage.jsx";

import ExpertProfilePage from "./pages/expert/ExpertProfilePage.jsx";
import ExpertLoggedInPage from "./pages/expert/ExpertLoggedInPage.jsx";
import ExpertKnowledgeHub from "./pages/expert/ExpertKnowledgeHub.jsx";
import ExpertPortfolioPage from "./pages/expert/ExpertPortfolioPage.jsx";
import CreateExpertPortfolioPage from "./pages/expert/CreateExpertPortfolioPage.jsx";
import ExpertQuestionsPage from "./pages/expert/ExpertQuestionsPage.jsx";
import ExpertQuestionDetailPage from "./pages/expert/ExpertQuestionDetailPage.jsx";
import ForgotPasswordPage from "./pages/user/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/user/ResetPasswordPage.jsx";
import BuyStockPage from "./pages/investor/BuyStockPage.jsx";
import SellStockPage from "./pages/investor/SellStockPage.jsx";
import TransactionHistoryPage from "./pages/investor/TransactionHistoryPage.jsx";
import TransactionPortalPage from "./pages/investor/TransactionPortalPage.jsx";
import VerifyDocumnetationPage from "./pages/administrator/VerifyDocument.jsx";
import ExpertNotificationPage from "./pages/expert/ExpertNotificationPage.jsx";


export const router = createBrowserRouter([
    { path: "/", Component: HomePage },
    { path: "/register", Component: RegistrationPage },
    { path: "/login", Component: LoginPage },
    { path: "/forgot-password", Component: ForgotPasswordPage },
    { path: "/reset-password", Component: ResetPasswordPage },

    {
        path: "/buy/:symbol",
        element: <ProtectedRoute allowedRoles={["investor"]}><BuyStockPage /></ProtectedRoute>
    },
    {
        path: "/sell/:symbol",
        element: <ProtectedRoute allowedRoles={["investor"]}><SellStockPage /></ProtectedRoute>
    },
    {
        path: "/investor/transaction-history",
        element: <ProtectedRoute allowedRoles={["investor"]}><TransactionHistoryPage /></ProtectedRoute>
    },
    {
        path: "/investor/transaction-portal",
        element: <ProtectedRoute allowedRoles={["investor"]}><TransactionPortalPage /></ProtectedRoute>
    },

    {
        path: "/investor",
        element: <ProtectedRoute allowedRoles={["investor"]}><LoggedInHomePage /></ProtectedRoute>
    },
    {
        path: "/investor/realtimedashboard",
        element: <ProtectedRoute allowedRoles={["investor"]}><RealTimeDashBoardPage /></ProtectedRoute>
    },
    {
        path: "/investor/realtimedashboard/astockdashboard/:symbol",
        element: <ProtectedRoute allowedRoles={["investor"]}><AStockDashBoardPage /></ProtectedRoute>
    },
    {
        path: "/investor/aiprediction",
        element: <ProtectedRoute allowedRoles={["investor"]}><AIPredictionPage /></ProtectedRoute>
    },
    {
        path: "/forum",
        element: <ProtectedRoute allowedRoles={["investor", "expert"]}><ForumPage /></ProtectedRoute>
    },
    {
        path: "/investor/subscription",
        element: <ProtectedRoute allowedRoles={["investor"]}><SubscriptionPage /></ProtectedRoute>
    },
    {
        path: "/investor/payment-success",
        element: <ProtectedRoute allowedRoles={["investor"]}><PaymentSuccess /></ProtectedRoute>
    },
    {
        path: "/investor/payment-fail",
        element: <ProtectedRoute allowedRoles={["investor"]}><PaymentFail /></ProtectedRoute>
    },
    {
        path: "/investor/edit-profile",
        element: <ProtectedRoute allowedRoles={["investor"]}><InvestorProfilePage /></ProtectedRoute>
    },
    {
        path: "/investor/watchlist",
        element: <ProtectedRoute allowedRoles={["investor"]}><Watchlist /></ProtectedRoute>
    },
    {
        path: "/investor/notification",
        element: <ProtectedRoute allowedRoles={["investor"]}><Notification /></ProtectedRoute>
    },
    {
        path: "/investor/expertportfolio",
        element: <ProtectedRoute allowedRoles={["investor"]}><ExpertPortfolio /></ProtectedRoute>
    },
    {
        path: "/investor/expertadvice",
        element: <ProtectedRoute allowedRoles={["investor"]}><ExpertAdvice /></ProtectedRoute>
    },
    {
        path: "/investor/educationcontent",
        element: <ProtectedRoute allowedRoles={["investor"]}><EducationContent /></ProtectedRoute>
    },
    {
        path: "/investor/aichatbot",
        element: <ProtectedRoute allowedRoles={["investor"]}><AIChatbot /></ProtectedRoute>
    },
    {
        path: "/investor/expertdetails",
        element: <ProtectedRoute allowedRoles={["investor"]}><ExpertDetails /></ProtectedRoute>
    },
    {
        path: "/adminpanel",
        element: <ProtectedRoute allowedRoles={["admin"]}><AdminPanelPage /></ProtectedRoute>
    },
    {
        path: "/adminpanel/useraccounts",
        element: <ProtectedRoute allowedRoles={["admin"]}><UserAccountsPage /></ProtectedRoute>
    },

    {
        path: "/adminpanel/useraccounts/:userId",
        element: <ProtectedRoute allowedRoles={["admin"]}><UserAccountDetailsPage /></ProtectedRoute>
    },
    {
        path: "/adminpanel/profiles",
        element: <ProtectedRoute allowedRoles={["admin"]}><UserProfilesPage /></ProtectedRoute>
    },
    {
        path: "/adminpanel/posts",
        element: <ProtectedRoute allowedRoles={["admin"]}><CommunityPostsPage /></ProtectedRoute>
    },
    {
        path: "/adminpanel/posts/:postId",
        element: <ProtectedRoute allowedRoles={["admin"]}><CommunityPostDetailsPage /></ProtectedRoute>
    },
    {
        path: "/adminpanel/trade",
        element: <ProtectedRoute allowedRoles={["admin"]}><TradeManagementPage /></ProtectedRoute>
    },
    {
        path: "/adminpanel/articles",
        element: <ProtectedRoute allowedRoles={["admin"]}><InvestmentGuidanceArticlesPage /></ProtectedRoute>
    },
    {
        path: "/adminpanel/verifydocumentation",
        element: <ProtectedRoute allowedRoles={["admin"]}><VerifyDocumnetationPage /></ProtectedRoute>
    },

    {
        path: "/expert/edit-profile",
        element: <ProtectedRoute allowedRoles={["expert"]}><ExpertProfilePage /></ProtectedRoute>
    },
    {
        path: "/expert",
        element: <ProtectedRoute allowedRoles={["expert"]}><ExpertLoggedInPage /></ProtectedRoute>
    },
    {
        path: "/expert/knowledge-hub",
        element: <ProtectedRoute allowedRoles={["expert"]}><ExpertKnowledgeHub /></ProtectedRoute>
    },

    {
        path: "/expert/portfolio",
        element: <ProtectedRoute allowedRoles={["expert"]}><ExpertPortfolioPage /></ProtectedRoute>
    },
    {
        path: "/expert/create-portfolio",
        element: <ProtectedRoute allowedRoles={["expert"]}><CreateExpertPortfolioPage /></ProtectedRoute>
    },
    {
        path: "/expert/questions",
        element: <ProtectedRoute allowedRoles={["expert"]}><ExpertQuestionsPage /></ProtectedRoute>
    },
    {
        path: "/expert/question/:questionId",
        element: <ProtectedRoute allowedRoles={["expert"]}><ExpertQuestionDetailPage /></ProtectedRoute>
    },
    {
        path: "/expert/notifications",
        element: <ProtectedRoute allowedRoles={["expert"]}><ExpertNotificationPage /></ProtectedRoute>
    },
    {
        path: "/investor/update-particular",
        element: <ProtectedRoute allowedRoles={["investor"]}><UpdateParticularPage /></ProtectedRoute>
    },
]);

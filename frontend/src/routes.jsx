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

import ExpertProfilePage from "./pages/expert/ExpertProfilePage.jsx";
import ExpertLoggedInPage from "./pages/expert/ExpertLoggedInPage.jsx";
import ForgotPasswordPage from "./pages/user/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/user/ResetPasswordPage.jsx";
import BuyStockPage from "./pages/investor/BuyStockPage.jsx";
import SellStockPage from "./pages/investor/SellStockPage.jsx";


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
        path: "/investor/loggedhome",
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
        path: "/expert/edit-profile",
        element: <ProtectedRoute allowedRoles={["expert"]}><ExpertProfilePage /></ProtectedRoute>
    },
    {
        path: "/expert",
        element: <ProtectedRoute allowedRoles={["expert"]}><ExpertLoggedInPage /></ProtectedRoute>
    },

]);


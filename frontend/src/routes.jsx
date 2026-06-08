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
import ExpertProfilePage from "./pages/expert/ExpertProfilePage.jsx";

export const router = createBrowserRouter([
    { path: "/", Component: HomePage },
    { path: "/register", Component: RegistrationPage },
    { path: "/login", Component: LoginPage },

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
    }
]);


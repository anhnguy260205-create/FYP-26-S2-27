import { lazy, Suspense, useEffect, cloneElement } from "react";
import { createBrowserRouter, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { StocksProvider } from "./context/StocksContext.jsx";

const UpdateParticularPage = lazy(() => import("./pages/investor/UpdateParticularPage.jsx"));
const ProfileSetupPage = lazy(() => import("./pages/investor/ProfileSetupPage.jsx"));
const RegistrationPage = lazy(() => import("./pages/user/RegistrationPage.jsx"));
const LoginPage = lazy(() => import("./pages/user/LoginPage.jsx"));
const ForgotPasswordPage = lazy(() => import("./pages/user/ForgotPasswordPage.jsx"));
const HomePage = lazy(() => import("./pages/user/Homepage.jsx"));
const AboutUsPage = lazy(() => import("./pages/user/AboutUsPage.jsx"));
const SupportPage = lazy(() => import("./pages/user/SupportPage.jsx"));
const ResetPasswordPage = lazy(() => import("./pages/user/ResetPasswordPage.jsx"));
const RealTimeDashBoardPage = lazy(() => import("./pages/shared/RealTimeDashBoardPage.jsx"));
const QuantRatingPage = lazy(() => import("./pages/investor/QuantRatingPage.jsx"));
const ForumPage = lazy(() => import("./pages/shared/ForumPage.jsx"));
const ChangePasswordPage = lazy(() => import("./pages/shared/ChangePasswordPage.jsx"));
const AStockDashBoardPage = lazy(() => import("./pages/shared/AStockDashBoardPage.jsx"));
const AdminPanelPage = lazy(() => import("./pages/administrator/AdminPanelPage.jsx"));
const UserAccountsPage = lazy(() => import("./pages/administrator/UserAccountsPage.jsx"));
const UserAccountDetailsPage = lazy(() => import("./pages/administrator/UserAccountDetailsPage.jsx"));
const UserProfilesPage = lazy(() => import("./pages/administrator/UserProfilesPage.jsx"));
const CommunityPostsPage = lazy(() => import("./pages/administrator/CommunityPostsPage.jsx"));
const CommunityPostDetailsPage = lazy(() => import("./pages/administrator/CommunityPostDetailsPage.jsx"));
const InvestmentGuidanceArticlesPage = lazy(() => import("./pages/administrator/InvestmentGuidanceArticlesPage.jsx"));
const ExpertApplicationReviewPage = lazy(() => import("./pages/administrator/ExpertApplicationReviewPage.jsx"));
const FinanceAdminDashboardPage = lazy(() => import("./pages/financeadmin/FinanceAdminDashboardPage.jsx"));
const RevenueAnalysisPage = lazy(() => import("./pages/financeadmin/RevenueAnalysisPage.jsx"));
const PaymentTransactionsPage = lazy(() => import("./pages/financeadmin/PaymentTransactionsPage.jsx"));
const FinancialReportsPage = lazy(() => import("./pages/financeadmin/FinancialReportsPage.jsx"));
const SubscriptionPage = lazy(() => import("./pages/investor/SubscriptionPage.jsx"));
const LoggedInHomePage = lazy(() => import("./pages/investor/LoggedInHomePage.jsx"));
const PaymentSuccess = lazy(() => import("./pages/investor/PaymentSuccess.jsx"));
const PaymentFail = lazy(() => import("./pages/investor/PaymentFail.jsx"));
const InvestorProfilePage = lazy(() => import("./pages/investor/InvestorProfilePage.jsx"));
const Watchlist = lazy(() => import("./pages/shared/Watchlist.jsx"));
const ExpertPortfolio = lazy(() => import("./pages/shared/ExpertPortfolio.jsx"));
const EducationContent = lazy(() => import("./pages/shared/EducationContent.jsx"));
const AIChatbot = lazy(() => import("./pages/investor/AIChatbot.jsx"));
const ExpertDetails = lazy(() => import("./pages/shared/ExpertDetail.jsx"));
const BuyStockPage = lazy(() => import("./pages/investor/BuyStockPage.jsx"));
const SellStockPage = lazy(() => import("./pages/investor/SellStockPage.jsx"));
const TransactionHistoryPage = lazy(() => import("./pages/investor/TransactionHistoryPage.jsx"));
const PortfolioOverviewPage = lazy(() => import("./pages/investor/PortfolioOverviewPage.jsx"));
const ExpertKnowledgeHub = lazy(() => import("./pages/expert/ExpertKnowledgeHub.jsx"));
const ExpertCompensationPage = lazy(() => import("./pages/expert/ExpertCompensationPage.jsx"));
const BecomeExpertPage = lazy(() => import("./pages/investor/BecomeExpertPage.jsx"));
const SubscriptionManagementPage = lazy(() => import("./pages/financeadmin/SubscriptionManagementPage.jsx"));
const ContentManagementPage = lazy(() => import("./pages/administrator/ContentManagementPage.jsx"));
const ReviewsPage = lazy(() => import("./pages/shared/ReviewsPage.jsx"));
const ReviewManagementPage = lazy(() => import("./pages/administrator/ReviewManagementPage.jsx"));
const NotificationManagementPage = lazy(() => import("./pages/administrator/NotificationManagementPage.jsx"));
const MessagesPage = lazy(() => import("./pages/shared/MessagesPage.jsx"));
const CashPortalPage = lazy(() => import("./pages/investor/CashPortalPage.jsx"));

function S({ children }) {
    const { pathname, key } = useLocation();
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    // Keying the page on location.key forces a remount (and therefore a
    // fresh data fetch) even when navigating to the page you're already on
    // — clicking a header nav link always re-runs the page's mount effects,
    // rather than being a no-op when the pathname hasn't changed.
    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", background: "#020617" }} />}>
            {cloneElement(children, { key })}
        </Suspense>
    );
}

function wrap(Component) {
    return <S><Component /></S>;
}

function wrapWithStocks(Component) {
    return <StocksProvider><S><Component /></S></StocksProvider>;
}

function protect(roles, Component) {
    return <ProtectedRoute allowedRoles={roles}><S><Component /></S></ProtectedRoute>;
}

// Expert-only pages: investors with the is_expert flag (merged roles).
function protectExpert(Component) {
    return <ProtectedRoute allowedRoles={["investor", "expert"]} requireExpert><S><Component /></S></ProtectedRoute>;
}

function protectWithStocks(roles, Component) {
    return <ProtectedRoute allowedRoles={roles}><StocksProvider><S><Component /></S></StocksProvider></ProtectedRoute>;
}

export const router = createBrowserRouter([
    { path: "/", element: wrapWithStocks(HomePage) },
    { path: "/about-us", element: wrap(AboutUsPage) },
    { path: "/support", element: wrap(SupportPage) },
    { path: "/register", element: wrap(RegistrationPage) },
    { path: "/login", element: wrap(LoginPage) },
    { path: "/reset-password", element: wrap(ResetPasswordPage) },

    { path: "/buy/:symbol", element: protectWithStocks(["investor"], BuyStockPage) },
    { path: "/sell/:symbol", element: protectWithStocks(["investor"], SellStockPage) },
    { path: "/investor/transaction-history", element: protect(["investor"], TransactionHistoryPage) },
    { path: "/investor/cash", element: protect(["investor"], CashPortalPage) },
    { path: "/investor/portfolio-overview", element: protectWithStocks(["investor"], PortfolioOverviewPage) },
    { path: "/investor/update-particular", element: protect(["investor"], UpdateParticularPage) },
    { path: "/investor/setup", element: protect(["investor"], ProfileSetupPage) },
    { path: "/investor", element: protectWithStocks(["investor"], LoggedInHomePage) },
    { path: "/investor/quantrating", element: protectWithStocks(["investor"], QuantRatingPage) },
    { path: "/realtimedashboard", element: protectWithStocks(["investor"], RealTimeDashBoardPage) },
    { path: "/realtimedashboard/astockdashboard/:symbol", element: protectWithStocks(["investor"], AStockDashBoardPage) },
    { path: "/forum", element: protect(["investor", "expert"], ForumPage) },
    { path: "/reviews", element: protect(["investor", "expert"], ReviewsPage) },
    { path: "/forum/messages", element: protect(["investor", "expert"], MessagesPage) },
    { path: "/change-password", element: protect(["investor", "expert"], ChangePasswordPage) },
    { path: "/investor/subscription", element: protect(["investor"], SubscriptionPage) },
    { path: "/investor/payment-success", element: protect(["investor"], PaymentSuccess) },
    { path: "/investor/payment-fail", element: protect(["investor"], PaymentFail) },
    { path: "/investor/edit-profile", element: protect(["investor"], InvestorProfilePage) },
    { path: "/watchlist", element: protectWithStocks(["investor"], Watchlist) },
    { path: "/investor/expertportfolio", element: protect(["investor", "expert"], ExpertPortfolio) },
    { path: "/investor/educationcontent", element: protect(["investor", "expert"], EducationContent) },
    { path: "/investor/aichatbot", element: protect(["investor"], AIChatbot) },
    { path: "/investor/expertdetails", element: protect(["investor", "expert"], ExpertDetails) },
    { path: "/investor/become-expert", element: protect(["investor", "expert"], BecomeExpertPage) },
    // Reachable by any investor — the page itself shows a "verified experts
    // only" block for anyone who isn't a qualified verified expert yet.
    { path: "/investor/compensation", element: protect(["investor", "expert"], ExpertCompensationPage) },

    { path: "/adminpanel", element: protect(["admin"], AdminPanelPage) },
    { path: "/adminpanel/useraccounts", element: protect(["admin"], UserAccountsPage) },
    { path: "/adminpanel/useraccounts/:userId", element: protect(["admin"], UserAccountDetailsPage) },
    { path: "/adminpanel/profiles", element: protect(["admin"], UserProfilesPage) },
    { path: "/adminpanel/posts", element: protect(["admin"], CommunityPostsPage) },
    { path: "/adminpanel/posts/:postId", element: protect(["admin"], CommunityPostDetailsPage) },
    { path: "/adminpanel/articles", element: protect(["admin"], InvestmentGuidanceArticlesPage) },
    { path: "/adminpanel/expert-applications", element: protect(["admin"], ExpertApplicationReviewPage) },
    { path: "/adminpanel/contentmanagement", element: protect(["admin"], ContentManagementPage) },
    { path: "/adminpanel/reviews", element: protect(["admin"], ReviewManagementPage) },
    { path: "/adminpanel/notifications", element: protect(["admin"], NotificationManagementPage) },

    { path: "/finance-admin", element: protect(["finance admin"], FinanceAdminDashboardPage) },
    { path: "/finance-admin/revenue", element: protect(["finance admin"], RevenueAnalysisPage) },
    { path: "/finance-admin/subscriptions", element: protect(["finance admin"], SubscriptionManagementPage) },
    { path: "/finance-admin/payments", element: protect(["finance admin"], PaymentTransactionsPage) },
    { path: "/finance-admin/reports", element: protect(["finance admin"], FinancialReportsPage) },

]);

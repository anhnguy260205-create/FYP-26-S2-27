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
const TermsOfServicePage = lazy(() => import("./pages/user/TermsOfServicePage.jsx"));
const PrivacyPolicyPage = lazy(() => import("./pages/user/PrivacyPolicyPage.jsx"));
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
const MyAlertsPage = lazy(() => import("./pages/investor/MyAlertsPage.jsx"));
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
const ReviewDetailPage = lazy(() => import("./pages/shared/ReviewDetailPage.jsx"));
const ReviewManagementPage = lazy(() => import("./pages/administrator/ReviewManagementPage.jsx"));
const NotificationManagementPage = lazy(() => import("./pages/administrator/NotificationManagementPage.jsx"));
const SendNotificationPage = lazy(() => import("./pages/administrator/SendNotificationPage.jsx"));
const MessagesPage = lazy(() => import("./pages/shared/MessagesPage.jsx"));
const CashPortalPage = lazy(() => import("./pages/investor/CashPortalPage.jsx"));
// The S component is a wrapper that ensures the page scrolls to the top when the route changes. It also provides a Suspense fallback for lazy-loaded components.
function S({ children }) {
    const { pathname, hash, key } = useLocation();
    //Scroll to top when route changes, unless the URL points at an in-page anchor (e.g. /#pricing)
    useEffect(() => {
        if (hash) return;
        window.scrollTo(0, 0);
    }, [pathname, hash]);
    // Suspense fallback is a simple div with a minimum height to prevent layout shifts while the lazy-loaded component is being fetched.
    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", background: "#020617" }} />}>
            {cloneElement(children, { key })}
        </Suspense>
    );
}
// The wrap function wraps a component with the S component, ensuring that it benefits from the scroll-to-top and Suspense fallback behavior.
function wrap(Component) {
    return <S><Component /></S>;
}
// The wrapWithStocks function wraps a component with the StocksProvider context, allowing it to access stock-related data and functions.
function wrapWithStocks(Component) {
    return <StocksProvider><S><Component /></S></StocksProvider>;
}
// the page for specific roles, and the component is wrapped in a ProtectedRoute that checks if the user has the required roles to access the page.
function protect(roles, Component) {
    return <ProtectedRoute allowedRoles={roles}><S><Component /></S></ProtectedRoute>;
}

// route for verified expert only
function protectExpert(Component) {
    return <ProtectedRoute allowedRoles={["investor", "expert"]} requireExpert><S><Component /></S></ProtectedRoute>;
}
// the page for specific roles, and the component is wrapped in a ProtectedRoute that checks if the user has the required roles to access the page. Additionally, it wraps the component in a StocksProvider context.
function protectWithStocks(roles, Component) {
    return <ProtectedRoute allowedRoles={roles}><StocksProvider><S><Component /></S></StocksProvider></ProtectedRoute>;
}
// a list of all the routes in the application, with their corresponding components and protection rules.
export const router = createBrowserRouter([
    { path: "/", element: wrapWithStocks(HomePage) },
    { path: "/about-us", element: wrap(AboutUsPage) },
    { path: "/support", element: wrap(SupportPage) },
    { path: "/terms-of-service", element: wrap(TermsOfServicePage) },
    { path: "/privacy-policy", element: wrap(PrivacyPolicyPage) },
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
    { path: "/reviews/:reviewId", element: protect(["investor", "expert"], ReviewDetailPage) },
    { path: "/forum/messages", element: protect(["investor", "expert"], MessagesPage) },
    { path: "/change-password", element: protect(["investor", "expert"], ChangePasswordPage) },
    { path: "/investor/subscription", element: protect(["investor"], SubscriptionPage) },
    { path: "/investor/payment-success", element: protect(["investor"], PaymentSuccess) },
    { path: "/investor/payment-fail", element: protect(["investor"], PaymentFail) },
    { path: "/investor/edit-profile", element: protect(["investor"], InvestorProfilePage) },
    { path: "/watchlist", element: protectWithStocks(["investor"], Watchlist) },
    { path: "/investor/alerts", element: protect(["investor"], MyAlertsPage) },
    { path: "/expert/knowledge-hub", element: protectExpert(ExpertKnowledgeHub) },
    { path: "/investor/expertportfolio", element: protect(["investor", "expert"], ExpertPortfolio) },
    { path: "/investor/educationcontent", element: protect(["investor", "expert"], EducationContent) },
    { path: "/investor/aichatbot", element: protect(["investor"], AIChatbot) },
    { path: "/investor/expertdetails", element: protect(["investor", "expert"], ExpertDetails) },
    { path: "/investor/become-expert", element: protect(["investor", "expert"], BecomeExpertPage) },

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
    { path: "/adminpanel/notifications/send", element: protect(["admin"], SendNotificationPage) },

    { path: "/finance-admin", element: protect(["finance admin"], FinanceAdminDashboardPage) },
    { path: "/finance-admin/revenue", element: protect(["finance admin"], RevenueAnalysisPage) },
    { path: "/finance-admin/subscriptions", element: protect(["finance admin"], SubscriptionManagementPage) },
    { path: "/finance-admin/payments", element: protect(["finance admin"], PaymentTransactionsPage) },
    { path: "/finance-admin/reports", element: protect(["finance admin"], FinancialReportsPage) },

]);

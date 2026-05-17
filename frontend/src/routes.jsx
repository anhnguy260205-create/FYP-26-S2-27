import {createBrowserRouter} from "react-router-dom"; 
import RegistrationPage from "./pages/user/RegistrationPage.jsx";
import HomePage from "./pages/user/HomePage.jsx";
import RealTimeDashBoardPage from "./pages/investor/RealTimeDashBoardPage.jsx"
import AIPredictionPage from "./pages/investor/AIPredictionPage.jsx";
import ForumPage from "./pages/shared/ForumPage.jsx";
import AStockDashBoardPage from "./pages/investor/AStockDashBoardPage.jsx";
import AdminPanelPage from "./pages/administrator/AdminPanelPage.jsx";

export const router = createBrowserRouter([
    {path: "/",                                                   Component: HomePage},
    {path: "/register",                                           Component: RegistrationPage},
    {path: "/investor/realtimedashboard",                         Component: RealTimeDashBoardPage},
    {path: "/investor/realtimedashboard/astockdashboard/:symbol", Component: AStockDashBoardPage},
    {path: "/investor/aiprediction",                              Component: AIPredictionPage},
    {path: "/forum",                                              Component: ForumPage},

    {path:"/adminpanel",                                          Component: AdminPanelPage}
]);

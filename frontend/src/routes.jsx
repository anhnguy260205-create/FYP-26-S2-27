import {createBrowserRouter} from "react-router-dom"; 
import RegistrationPage from "./pages/user/RegistrationPage.jsx";
import HomePage from "./pages/user/HomePage.jsx";
import DashBoardPage from "./pages/investor/DashBoardPage.jsx"
import AIPredictionPage from "./pages/investor/AIPredictionPage.jsx";
import ForumPage from "./pages/shared/ForumPage.jsx";

import AdminPanelPage from "./pages/administrator/AdminPanelPage.jsx";

export const router = createBrowserRouter([
    {path: "/",                   Component: HomePage},
    {path: "/register",           Component: RegistrationPage},
    {path: "/investor/dashboard", Component: DashBoardPage},
    {path: "/investor/aiprediction", Component: AIPredictionPage},
    {path: "/forum",              Component: ForumPage},


    {path:"/adminpanel",             Component: AdminPanelPage}
]);
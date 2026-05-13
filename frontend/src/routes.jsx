import {createBrowserRouter} from "react-router-dom"; 
import RegistrationPage from "./pages/user/RegistrationPage.jsx";
import Homepage from "./pages/user/Homepage.jsx";

export const router = createBrowserRouter([
    {path: "/",         Component: Homepage},
    {path: "/register", Component: RegistrationPage}
]);
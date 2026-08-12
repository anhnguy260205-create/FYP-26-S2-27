import { RouterProvider } from "react-router-dom";
import { router } from "./routes.jsx";
// The App component serves as the root component of the application.
export default function App() {
    return <RouterProvider router={router} />;
}

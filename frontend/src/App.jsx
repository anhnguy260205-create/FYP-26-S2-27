import { RouterProvider } from "react-router-dom";
import { router } from "./routes.jsx";
// The App component serves as the root component of the application. It uses the RouterProvider to provide routing capabilities based on the defined router configuration.
export default function App() {
    return <RouterProvider router={router} />;
}

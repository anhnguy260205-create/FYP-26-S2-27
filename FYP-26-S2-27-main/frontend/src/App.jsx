import { RouterProvider } from "react-router-dom";
import { router } from "./routes.jsx";
import { StocksProvider } from "./context/StocksContext.jsx";

export default function App() {
    return (
        <StocksProvider>
            <RouterProvider router={router} />
        </StocksProvider>
    );
}

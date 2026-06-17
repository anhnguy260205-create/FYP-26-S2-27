// Thin re-export — all WebSocket logic lives in StocksContext (singleton for the whole app).
import { useStocksContext } from "../context/StocksContext.jsx";
export default useStocksContext;

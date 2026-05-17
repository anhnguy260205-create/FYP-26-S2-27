import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";
import { useParams} from "react-router-dom"
import useLiveStocks from "../../api/useLiveStocks.js";
import InteractiveChart from "../../components/InteractiveChart.jsx";
function SecondLevel(){
    const { symbol } = useParams()
    const selectedStock = symbol?.toUpperCase()
    const { stocks, marketStatus, candles, lastUpdated, error } = useLiveStocks();
    const stockCandles = candles?.[selectedStock]??[];
    return(
    <div style={{paddingTop: "20px"}}>
        <InteractiveChart data={stockCandles} />
    </div>
   );
}
function companyName(symbol) {
  const names = {
    AAPL: "Apple",     TSLA: "Tesla",     NVDA: "NVIDIA",
    MSFT: "Microsoft", GOOGL: "Alphabet", AMZN: "Amazon",
    META: "Meta",      AMD: "AMD",        NFLX: "Netflix",  INTC: "Intel",
  };
  return names[symbol] ?? "";
}

function FirstLevel(){
    const { symbol } = useParams()
    const selectedStock = symbol?.toUpperCase()
    const { stocks, marketStatus, lastUpdated, error } = useLiveStocks();

    return(
        <div>
            <div>
                <h1>{ symbol }</h1>
                {companyName (selectedStock)}
            </div>
        </div>
    );
}
function AStockDashBoardPage(){
    const { symbol } = useParams()
    const selectedStock = symbol?.toUpperCase()
    const { stocks, marketStatus, candles, lastUpdated, error } = useLiveStocks();
    const stockCandles = candles?.[selectedStock]??[];
    return(
        <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white "
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <GeneralHeader/>
            <main className="flex-1 p-7.5">
                <FirstLevel/>
                <SecondLevel/>
            </main>
            <Footer/>
        </motion.div>
    );
}
export default AStockDashBoardPage; 
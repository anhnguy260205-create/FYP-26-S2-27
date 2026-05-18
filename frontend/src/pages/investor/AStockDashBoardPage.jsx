import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";
import { useParams} from "react-router-dom"
import useLiveStocks from "../../api/useLiveStocks.js";
import InteractiveChart from "../../components/InteractiveChart.jsx";
function formatNumber(num){
    if(!num) return"0";

    const format = (value, suffix)=> parseFloat(value.toFixed(1)) + suffix;
    
    if (num >= 1_000_000_000) {
        return format(num / 1_000_000_000, "B");
    }

    if (num >= 1_000_000) {
        return format(num / 1_000_000, "M");
    }

    if (num >= 1_000) {
        return format(num / 1_000, "K");
    }

    return num.toString();
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
function SecondLevel({ stock, stockCandles }) {
    if (!stock) return null;

    const open = stock.open;
    const high = stock.high;
    const low = stock.low;
    const volume = stock.volume;
    const avgVolume =
        stockCandles.length > 0
            ? stockCandles.reduce(
                  (sum, candle) => sum + candle.volume,
                  0
              ) / stockCandles.length
            : 0;
    return (
        <div
            className="w-209 flex justify-between border-2 bg-white p-4 rounded-md text-black"
            style={{ marginTop: "20px" }}
        >
            <div className="flex flex-col items-start">
                <p>Open</p>
                <p>{open.toFixed(2)}</p>
            </div>

            <span className="text-gray-500">|</span>

            <div className="flex flex-col items-start">
                <p>High</p>
                <p>{high.toFixed(2)}</p>
            </div>

            <span className="text-gray-500">|</span>

            <div className="flex flex-col items-start">
                <p>Low</p>
                <p>{low.toFixed(2)}</p>
            </div>

            <span className="text-gray-500">|</span>

            <div className="flex flex-col items-start">
                <p>Volume</p>
                <p>{formatNumber(volume)}</p>
            </div>

            <span className="text-gray-500">|</span>

            <div className="flex flex-col items-start">
                <p>Avg Volume</p>
                <p>{formatNumber(avgVolume)}</p>
            </div>
        </div>
    );
}
function ThirdLevel(){
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
                <SecondLevel stock={stocks[selectedStock]} stockCandles={stockCandles}/>
                <ThirdLevel/>
            </main>
            <Footer/>
        </motion.div>
    );
}
export default AStockDashBoardPage; 
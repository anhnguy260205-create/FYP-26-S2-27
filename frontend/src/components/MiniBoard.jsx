import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

function MiniBoard({ stocks }) {
  const stockList = Array.isArray(stocks)
    ? stocks
    : Object.values(stocks ?? {});

  const loopStocks = [...stockList, ...stockList];

  const navigate = useNavigate();

  return (
    <div className="w-full overflow-hidden mt-3">

      {/* Moving Horizontal Row */}
      <motion.div initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0, x: ["0%", "-50%"],}}
        transition={{
          opacity: { duration: 0.5 },
          y: { duration: 0.5 },
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: 50,
            ease: "linear",
          },
        }}
        className="flex gap-3 w-max"
        style={{
          background:
            "linear-gradient(145deg, rgba(15,23,42,0.9), rgba(30,41,59,0.7))",
          border: "1px solid rgba(99,179,237,0.15)",
          borderRadius: "12px",
          padding: "20px",
          backdropFilter: "blur(12px)",
        }}
      >
        {loopStocks.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500 text-sm">
            Waiting for data...
          </div>
        ) : (
          loopStocks.map((stock, index) => {
            const pctChg =
              stock.price && stock.previousClose
                ? (
                    ((stock.price - stock.previousClose) /
                      stock.previousClose) *
                    100
                  ).toFixed(2)
                : null;

            const isUp =
              pctChg === null ? true : Number(pctChg) >= 0;

            const color = isUp
              ? "text-green-400"
              : "text-red-400";

            return (
              <div
                key={`${stock.symbol}-${index}`}
                onClick={() =>
                  navigate(
                    `/investor/realtimedashboard/astockdashboard/${stock.symbol}`
                  )
                }
                className="shrink-0 cursor-pointer flex items-center gap-4 rounded-xl
                         bg-white px-5 py-3 min-w-55 hover:scale-105 transition-transform
                "
              >
                <span className="font-semibold text-black">
                  {stock.symbol}
                </span>

                <span className="text-gray-700">
                  ${stock.price?.toFixed(2)}
                </span>

                <span
                  className={`ml-auto font-medium text-sm ${color}`}
                >
                  {pctChg !== null
                    ? (isUp ? "+" : "") + pctChg + "%"
                    : "—"}
                </span>
              </div>
            );
          })
        )}
      </motion.div>
    </div>
  );
}

export default MiniBoard;
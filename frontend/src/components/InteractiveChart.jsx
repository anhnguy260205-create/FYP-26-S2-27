import { createChart } from "lightweight-charts";
import { useEffect, useRef, useState } from "react";

function InteractiveChart({ data = [] }) {
    const [selectedRange, setSelectedRange] = useState("1D");
    const chartContainerRef = useRef();

    useEffect(() => {
        if (!chartContainerRef.current || data.length === 0) return;

        const chart = createChart(chartContainerRef.current, {
            width: 800,
            height: 400,
        });

        const candleSeries = chart.addCandlestickSeries();
        candleSeries.setData(data);

        return () => chart.remove();
    }, [data]);

    return (
       <div>
            {/* Time Button */}
            <div className="flex gap-2 mb-4">
                {["1D","1W","1M","3M","6M","1Y"].map((range) => (
                    <button
                        key={range}
                        onClick={() => setSelectedRange(range)}
                        className={`px-3 py-1 rounded-md text-sm ${
                            selectedRange === range
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                    >
                        {range}
                    </button>
                ))}
            </div>

            {/* White background only covers the chart */}
            <div className="inline-block border-2 bg-white p-4 rounded-xl">
                <div ref={chartContainerRef} />
            </div>
       </div>
    );
}

export default InteractiveChart;

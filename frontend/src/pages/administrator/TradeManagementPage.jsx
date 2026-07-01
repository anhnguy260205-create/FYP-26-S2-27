import { Eye, XCircle } from "lucide-react";
import AdminPage from "../../layout/AdminPage.jsx";

const trades = [
  {
    id: "T12345",
    user: "John Doe",
    stock: "AAPL",
    company: "Apple Inc.",
    type: "Buy",
    quantity: 10,
    price: "$195.89",
    status: "Completed",
    date: "2026-05-04",
  },
  {
    id: "T12346",
    user: "Sarah Lee",
    stock: "TSLA",
    company: "Tesla, Inc.",
    type: "Sell",
    quantity: 5,
    price: "$171.95",
    status: "Pending",
    date: "2026-05-04",
  },
  {
    id: "T12347",
    user: "Mike Johnson",
    stock: "NVDA",
    company: "NVIDIA Corp.",
    type: "Buy",
    quantity: 15,
    price: "$432.10",
    status: "Processing",
    date: "2026-05-03",
  },
  {
    id: "T12348",
    user: "Emma Davis",
    stock: "GOOGL",
    company: "Alphabet Inc.",
    type: "Sell",
    quantity: 8,
    price: "$162.48",
    status: "Completed",
    date: "2026-05-03",
  },
  {
    id: "T12349",
    user: "David Brown",
    stock: "AMD",
    company: "Advanced Micro Devices",
    type: "Buy",
    quantity: 20,
    price: "$145.90",
    status: "Pending",
    date: "2026-05-02",
  },
];

function TradeManagementPage() {
  return (
    <AdminPage title="Trade Management" subtitle="Monitor and manage all trading activities on the platform.">
      <div className="bg-white rounded-lg p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold">Recent Trade Transactions</h3>
          <button className="text-blue-600 text-sm font-semibold">View All</button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="py-3">TRADE ID</th>
              <th>USER</th>
              <th>STOCK</th>
              <th>TYPE</th>
              <th>QUANTITY</th>
              <th>PRICE</th>
              <th>STATUS</th>
              <th>DATE</th>
              <th>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id} className="border-b last:border-b-0">
                <td className="py-5 font-semibold">{trade.id}</td>
                <td>{trade.user}</td>
                <td>
                  <p className="font-bold">{trade.stock}</p>
                  <p className="text-xs text-slate-500">{trade.company}</p>
                </td>
                <td>
                  <span
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      trade.type === "Buy"
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {trade.type}
                  </span>
                </td>
                <td>{trade.quantity}</td>
                <td>{trade.price}</td>
                <td>
                  <span
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      trade.status === "Completed"
                        ? "bg-green-100 text-green-600"
                        : trade.status === "Pending"
                        ? "bg-yellow-100 text-yellow-600"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {trade.status}
                  </span>
                </td>
                <td>{trade.date}</td>
                <td>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1 border px-3 py-1 rounded text-xs">
                      <Eye size={13} /> View
                    </button>

                    {trade.status !== "Completed" && (
                      <button className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded text-xs">
                        <XCircle size={13} /> Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPage>
  );
}

export default TradeManagementPage;
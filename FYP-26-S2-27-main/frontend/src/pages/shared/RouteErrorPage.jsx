import { useRouteError, useNavigate } from "react-router-dom";

export default function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-8">
      <div className="max-w-xl w-full bg-white/5 border border-white/10 rounded-3xl p-8 text-center">
        <h1 className="text-3xl font-bold mb-3">Something went wrong</h1>
        <p className="text-gray-400 mb-6">The page hit an error, but your app is still running.</p>
        {error?.message && <pre className="text-left text-xs bg-black/30 border border-white/10 rounded-xl p-4 overflow-auto mb-6 text-red-200">{error.message}</pre>}
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate(-1)} className="px-5 py-3 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 font-semibold">Go Back</button>
          <button onClick={() => navigate("/")} className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 font-semibold">Home</button>
        </div>
      </div>
    </div>
  );
}

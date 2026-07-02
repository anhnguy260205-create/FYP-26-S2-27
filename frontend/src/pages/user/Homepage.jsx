import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";
import Header from "../../layout/Header.jsx";
import { fetchStockSnapshot } from "../../api/stockApi.js";
import {
  Bot, TrendingUp, Sparkles, Bell, Users, Globe, Zap, ShieldCheck, ArrowRight, Star,
  Wallet, BrainCircuit, MessagesSquare, GraduationCap, MessageCircleQuestion, Check, ChevronDown,
} from "lucide-react";

const TICKER_SYMBOLS = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "TSLA", "META", "JPM", "V", "DIS"];

const FAQS = [
  {
    q: "Is this real money trading?",
    a: "No. RocketTrade is a paper trading platform — you trade against live market prices using virtual funds, so you can build real skills with zero financial risk.",
  },
  {
    q: "How much does it cost to use RocketTrade?",
    a: "You can start for free with our Starter plan. Upgrade to Pro anytime for unlimited AI predictions, deeper quant ratings, and priority expert access.",
  },
  {
    q: "How accurate are the AI predictions?",
    a: "Our models combine technical indicators and news sentiment to forecast short-term price direction. They're a decision-support tool, not a guarantee, so always do your own research too.",
  },
  {
    q: "Do I need any trading experience to get started?",
    a: "Not at all. Our Educational Content library covers everything from beginner basics to advanced strategy, so you can learn as you go.",
  },
  {
    q: "Can I get help from a real person?",
    a: "Yes — chat instantly with our AI assistant, or connect with a verified market expert through consultations and Q&A.",
  },
  {
    q: "Can I cancel or change my plan anytime?",
    a: "Yes, you can upgrade, downgrade, or cancel your subscription at any time from your account settings.",
  },
];

const PLATFORM_FEATURES = [
  {
    Icon: Wallet,
    title: "Paper Trading Exchange",
    description: "Trade against live market prices using virtual paper funds — build real skills with zero real-money risk.",
  },
  {
    Icon: BrainCircuit,
    title: "AI Stock Predictions",
    description: "Multi-day price forecasts and sector quant ratings powered by machine learning, updated with live data.",
  },
  {
    Icon: MessagesSquare,
    title: "Investor Community",
    description: "Join discussion rooms on technical analysis, portfolio strategy, and market news with fellow investors.",
  },
  {
    Icon: Bot,
    title: "AI Chatbot & Expert Consultants",
    description: "Get instant answers from our AI assistant, or browse and connect with verified market experts.",
  },
  {
    Icon: GraduationCap,
    title: "Educational Content",
    description: "Learn at your own pace with a growing library of articles — from beginner basics to advanced strategy.",
  },
  {
    Icon: MessageCircleQuestion,
    title: "Ask the Experts",
    description: "Submit your investing questions directly to verified experts and get personalized answers.",
  },
];

const FEATURE_ICONS = [
  { match: "assistant", Icon: Bot },
  { match: "trend", Icon: TrendingUp },
  { match: "predict", Icon: Sparkles },
  { match: "alert", Icon: Bell },
  { match: "expert", Icon: Users },
];

function getFeatureIcon(title = "") {
  const lower = title.toLowerCase();
  const found = FEATURE_ICONS.find((f) => lower.includes(f.match));
  return found ? found.Icon : Star;
}

const STATS = [
  { Icon: Globe, label: "Global Stocks Tracked", value: "30+" },
  { Icon: Zap, label: "Real-Time Market Data", value: "Live" },
  { Icon: Bot, label: "AI-Powered Predictions", value: "24/7" },
  { Icon: ShieldCheck, label: "Expert-Verified Insights", value: "Trusted" },
];

function MarketTicker() {
  const [quotes, setQuotes] = useState([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      TICKER_SYMBOLS.map((symbol) =>
        fetchStockSnapshot(symbol)
          .then((res) => (res.success ? res.data : null))
          .catch(() => null)
      )
    ).then((results) => {
      if (cancelled) return;
      setQuotes(results.filter(Boolean));
    });
    return () => { cancelled = true; };
  }, []);

  if (quotes.length === 0) return <div style={{ height: 56 }} />;

  const track = [...quotes, ...quotes];

  return (
    <div className="ticker-wrap">
      <div className="ticker-track">
        {track.map((q, i) => {
          const change = q.previousClose ? ((q.p - q.previousClose) / q.previousClose) * 100 : 0;
          const up = change >= 0;
          return (
            <div key={`${q.s}-${i}`} className="ticker-item">
              <span className="ticker-symbol">{q.s}</span>
              <span className="ticker-price">${q.p.toFixed(2)}</span>
              <span className={up ? "ticker-up" : "ticker-down"}>
                {up ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        .ticker-wrap {
          width: 100%;
          overflow: hidden;
          border-top: 1px solid rgba(59,130,246,0.2);
          border-bottom: 1px solid rgba(59,130,246,0.2);
          background: rgba(2,6,23,0.5);
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
        }
        .ticker-track {
          display: flex;
          width: max-content;
          animation: tickerScroll 40s linear infinite;
        }
        .ticker-wrap:hover .ticker-track { animation-play-state: paused; }
        .ticker-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.85rem 1.5rem;
          white-space: nowrap;
          font-size: 0.85rem;
          border-right: 1px solid rgba(148,163,184,0.12);
        }
        .ticker-symbol { font-weight: 700; color: #e2e8f0; }
        .ticker-price { color: #94a3b8; }
        .ticker-up { color: #4ade80; font-weight: 600; }
        .ticker-down { color: #f87171; font-weight: 600; }
        @keyframes tickerScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

function Hero() {
  const navigate = useNavigate();
  const [hero, setHero] = useState({ title: "Discover the Future of Smart Investing", description: "Explore powerful tools floating around your financial universe." });

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/content/landing`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) return;
        const heroItem = data.content.find((c) => c.section === "hero");
        if (heroItem) setHero(heroItem);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="hero-section relative w-full text-white flex items-center justify-center overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(circle at 50% 30%, rgba(59,130,246,0.22) 0%, transparent 60%)" }}
      />
      {/* Grid */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.15,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-20 text-center px-6 max-w-3xl py-20 sm:py-28">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 mb-6 text-xs font-semibold tracking-wide text-cyan-300 uppercase">
          <Sparkles size={14} /> AI-Powered Investing Platform
        </div>

        <h1 className="text-[clamp(2.2rem,6vw,3.8rem)] font-extrabold leading-tight m-0">
          <span className="block bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            {hero.title}
          </span>
        </h1>

        <p className="mt-4 mb-8 text-slate-400 text-base sm:text-lg">
          {hero.description}
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={() => navigate("/register")}
            className="w-40 px-8 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-semibold text-base shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-colors flex items-center justify-center gap-1.5"
          >
            Get Started <ArrowRight size={17} />
          </button>
          <button
            onClick={() => navigate("/login")}
            className="w-40 px-8 py-3 rounded-xl bg-transparent border border-slate-500 hover:border-cyan-400 hover:text-cyan-300 text-white font-semibold text-base transition-colors"
          >
            Login
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .hero-section { min-height: 60vh; }
        }
      `}</style>
    </div>
  );
}

function StatsBar() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl mx-auto px-4 sm:px-8 py-12">
      {STATS.map(({ Icon, label, value }) => (
        <div
          key={label}
          className="flex flex-col items-center text-center gap-2 rounded-2xl border border-blue-900/30 bg-white/5 px-4 py-6"
        >
          <Icon className="text-cyan-400" size={26} />
          <span className="text-xl sm:text-2xl font-extrabold text-white">{value}</span>
          <span className="text-xs sm:text-sm text-slate-400">{label}</span>
        </div>
      ))}
    </div>
  );
}

function PlatformFeatures() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12">
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Everything You Need to Invest Smarter</h2>
        <p className="text-slate-400 mt-2 text-sm sm:text-base">One platform, six ways to sharpen your edge.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {PLATFORM_FEATURES.map(({ Icon, title, description }) => (
          <div
            key={title}
            className="rounded-2xl border border-blue-900/30 bg-linear-to-b from-white/5 to-transparent p-6"
          >
            <div className="w-11 h-11 rounded-xl bg-cyan-400/10 flex items-center justify-center mb-4">
              <Icon className="text-cyan-400" size={22} />
            </div>
            <h3 className="font-bold text-white text-base mb-1.5">{title}</h3>
            <p className="text-sm text-slate-400">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureGrid() {
  const [features, setFeatures] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/content/landing`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) return;
        setFeatures(data.content.filter((c) => c.section === "feature"));
      })
      .catch(() => {});
  }, []);

  if (features.length === 0) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12">
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Quick Highlights</h2>
        <p className="text-slate-400 mt-2 text-sm sm:text-base">A snapshot of what powers your dashboard.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {features.map((feature) => {
          const Icon = getFeatureIcon(feature.title);
          return (
            <div
              key={feature.content_id}
              className="group rounded-2xl border border-blue-900/30 bg-linear-to-b from-white/5 to-transparent p-6 hover:border-cyan-400/40 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-xl bg-cyan-400/10 flex items-center justify-center mb-4 group-hover:bg-cyan-400/20 transition-colors">
                <Icon className="text-cyan-400" size={22} />
              </div>
              <h3 className="font-bold text-white text-base mb-1.5">{feature.title}</h3>
              <p className="text-sm text-slate-400">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CTASection() {
  const navigate = useNavigate();
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 pb-16 pt-4">
      <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-linear-to-r from-blue-950 via-slate-900 to-blue-950 px-6 sm:px-12 py-12 text-center">
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(circle at 50% 0%, rgba(34,211,238,0.15) 0%, transparent 70%)" }}
        />
        <div className="relative z-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">Ready to invest smarter?</h2>
          <p className="text-slate-400 mb-7 max-w-xl mx-auto text-sm sm:text-base">
            Create your free account and get real-time data, AI predictions, and expert insights in minutes.
          </p>
          <button
            onClick={() => navigate("/register")}
            className="px-8 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-semibold text-base shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-colors inline-flex items-center gap-1.5"
          >
            Create Free Account <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

function usePlanContent() {
  const [freeFeatures, setFreeFeatures] = useState([]);
  const [premiumFeatures, setPremiumFeatures] = useState([]);
  const [freePlan, setFreePlan] = useState({ name: "Starter", price: "$0.00", priceSubtitle: "forever, no card needed" });
  const [premiumPlan, setPremiumPlan] = useState({ name: "Pro", price: "$20.99", priceSubtitle: "per month, billed annually" });

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/content/landing`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) return;
        const c = data.content;
        setFreeFeatures(c.filter((x) => x.section === "free_investor").map((x) => x.title));
        setPremiumFeatures(c.filter((x) => x.section === "premium_investor").map((x) => x.title));

        const freeName = c.find((x) => x.content_id === "free_plan_name");
        const freePrice = c.find((x) => x.content_id === "free_plan_price");
        if (freeName || freePrice) setFreePlan({
          name: freeName?.title ?? "Starter",
          price: freePrice?.title ?? "$0.00",
          priceSubtitle: freePrice?.description ?? "forever, no card needed",
        });

        const premName = c.find((x) => x.content_id === "premium_plan_name");
        const premPrice = c.find((x) => x.content_id === "premium_plan_price");
        if (premName || premPrice) setPremiumPlan({
          name: premName?.title ?? "Pro",
          price: premPrice?.title ?? "$20.99",
          priceSubtitle: premPrice?.description ?? "per month, billed annually",
        });
      })
      .catch(() => {});
  }, []);

  return { freeFeatures, premiumFeatures, freePlan, premiumPlan };
}

function PlanCard({ badge, badgeClass, plan, features, highlighted }) {
  return (
    <div
      className={`w-full max-w-sm rounded-3xl p-8 border ${
        highlighted
          ? "border-yellow-400/40 bg-linear-to-b from-yellow-400/10 via-white/5 to-transparent"
          : "border-blue-900/30 bg-linear-to-b from-white/5 to-transparent"
      }`}
    >
      <span className={`inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4 ${badgeClass}`}>
        {badge}
      </span>
      <p className="text-xl font-semibold text-white mb-1">{plan.name}</p>
      <p className={`text-4xl font-extrabold mb-1 ${highlighted ? "text-yellow-300" : "text-cyan-300"}`}>{plan.price}</p>
      <p className="text-sm text-slate-400 mb-6">{plan.priceSubtitle}</p>
      <div className="h-px bg-white/10 mb-6" />
      <div className="space-y-3">
        {features.map((f) => (
          <div key={f} className="flex items-start gap-2.5">
            <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${highlighted ? "bg-yellow-400/20 text-yellow-300" : "bg-cyan-400/20 text-cyan-300"}`}>
              <Check size={13} />
            </span>
            <span className="text-sm text-slate-300">{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingSection() {
  const { freeFeatures, premiumFeatures, freePlan, premiumPlan } = usePlanContent();
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 pb-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Simple, Transparent Pricing</h2>
        <p className="text-slate-400 mt-2 text-sm sm:text-base">Compare our Free and Pro plans — create an account to get started.</p>
      </div>
      <div className="flex flex-col md:flex-row gap-6 items-center md:items-start justify-center">
        <PlanCard badge="Free" badgeClass="bg-blue-500/20 text-blue-300" plan={freePlan} features={freeFeatures} />
        <PlanCard badge="⭐ Premium" badgeClass="bg-yellow-400/20 text-yellow-300" plan={premiumPlan} features={premiumFeatures} highlighted />
      </div>
    </div>
  );
}

function FAQItem({ q, a, open, onToggle }) {
  return (
    <div className="rounded-2xl border border-blue-900/30 bg-linear-to-b from-white/5 to-transparent overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 text-left px-6 py-5 cursor-pointer"
      >
        <span className="font-semibold text-white text-sm sm:text-base">{q}</span>
        <ChevronDown
          size={18}
          className={`text-cyan-400 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="px-6 pb-5 text-sm text-slate-400 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 pb-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Frequently Asked Questions</h2>
        <p className="text-slate-400 mt-2 text-sm sm:text-base">Everything you need to know before you get started.</p>
      </div>
      <div className="space-y-3">
        {FAQS.map((faq, index) => (
          <FAQItem
            key={faq.q}
            q={faq.q}
            a={faq.a}
            open={openIndex === index}
            onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
          />
        ))}
      </div>
    </div>
  );
}

function HomePage() {
  return (
    <motion.div
      className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Header />
      <main className="flex-1">
        <Hero />
        <MarketTicker />
        <StatsBar />
        <PlatformFeatures />
        <FeatureGrid />
        <CTASection />
        <PricingSection />
        <FAQSection />
      </main>
      <Footer />
    </motion.div>
  );
}

export default HomePage;

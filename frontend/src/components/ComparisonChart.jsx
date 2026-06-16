import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

/* ─── helpers ───────────────────────────────────────────────── */
function calcPct(price, prev) {
  if (!price || !prev) return null;
  return (((price - prev) / prev) * 100).toFixed(2);
}

/* ─── StockCard ─────────────────────────────────────────────── */
function StockCard({ stock, index, onClick }) {
  const pctChg = calcPct(stock.price, stock.previousClose);
  const isUp = pctChg === null ? true : Number(pctChg) >= 0;
  const [flash, setFlash] = useState(null);

  const prevPrice = useRef(stock.price);
  useEffect(() => {
    if (stock.price !== prevPrice.current) {
      setFlash(stock.price > prevPrice.current ? "up" : "down");
      prevPrice.current = stock.price;
      const t = setTimeout(() => setFlash(null), 700);
      return () => clearTimeout(t);
    }
  }, [stock.price]);

  const flashStyle =
    flash === "up"
      ? { boxShadow: "0 0 0 2px #4ade80" }
      : flash === "down"
        ? { boxShadow: "0 0 0 2px #f87171" }
        : {};

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      onClick={onClick}
      style={{
        ...flashStyle,
        background: "rgba(255,255,255,0.97)",
        borderRadius: 14,
        border: "1px solid rgba(203,213,225,0.6)",
        padding: "10px 8px",
        minWidth: 150,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 4,
        flexShrink: 0,
        userSelect: "none",
        transition: "box-shadow 0.25s ease, transform 0.18s ease",
        willChange: "transform",
      }}
      whileHover={{ scale: 1.045, y: -1 }}
      whileTap={{ scale: 0.97 }}
    >
      <span
        style={{
          fontFamily: "'DM Mono', 'Fira Mono', monospace",
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: "0.04em",
          color: "#0f172a",
          minWidth: 46,
        }}
      >
        {stock.symbol}
      </span>

      <span
        style={{
          fontFamily: "'DM Mono', 'Fira Mono', monospace",
          fontSize: 13,
          color: "#334155",
          flex: 1,
          textAlign: "right",
        }}
      >
        ${stock.price?.toFixed(2) ?? "—"}
      </span>

      <span style={{ width: 1, height: 18, background: "#e2e8f0", flexShrink: 0 }} />

      <span
        style={{
          fontFamily: "'DM Mono', 'Fira Mono', monospace",
          fontSize: 12,
          fontWeight: 600,
          color: isUp ? "#16a34a" : "#dc2626",
          display: "flex",
          alignItems: "center",
          gap: 3,
          minWidth: 58,
          justifyContent: "flex-end",
        }}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill={isUp ? "#16a34a" : "#dc2626"} style={{ flexShrink: 0 }}>
          {isUp ? <polygon points="4,0 8,8 0,8" /> : <polygon points="0,0 8,0 4,8" />}
        </svg>
        {pctChg !== null ? Math.abs(pctChg) + "%" : "—"}
      </span>
    </motion.div>
  );
}

export default function ComparisonChart({ stocks, onCompare, subscriptionStatus }) {
  const isPremium = subscriptionStatus === "premium";
  const stockList = Array.isArray(stocks) ? stocks : Object.values(stocks ?? {});
  const navigate = useNavigate();

  const scrollRef = useRef(null);

  // ── drag-to-scroll state ──
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  // ── momentum state ──
  const velocity = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const rafRef = useRef(null);

  function stopMomentum() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }

  function applyMomentum() {
    stopMomentum();
    function step() {
      if (Math.abs(velocity.current) < 0.5) return;
      velocity.current *= 0.92; // friction
      if (scrollRef.current) {
        scrollRef.current.scrollLeft += velocity.current;
      }
      rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
  }

  // Mouse events
  function onMouseDown(e) {
    stopMomentum();
    isDragging.current = true;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
    lastX.current = e.pageX;
    lastTime.current = Date.now();
    velocity.current = 0;
    scrollRef.current.style.cursor = "grabbing";
  }

  function onMouseMove(e) {
    if (!isDragging.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = x - startX.current;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;

    const now = Date.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      velocity.current = (lastX.current - e.pageX) / dt * 16; // per-frame at ~60fps
    }
    lastX.current = e.pageX;
    lastTime.current = now;
  }

  function onMouseUp() {
    isDragging.current = false;
    if (scrollRef.current) scrollRef.current.style.cursor = "grab";
    applyMomentum();
  }

  // Touch events
  function onTouchStart(e) {
    stopMomentum();
    const touch = e.touches[0];
    startX.current = touch.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
    lastX.current = touch.pageX;
    lastTime.current = Date.now();
    velocity.current = 0;
  }

  function onTouchMove(e) {
    const touch = e.touches[0];
    const x = touch.pageX - scrollRef.current.offsetLeft;
    const walk = x - startX.current;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;

    const now = Date.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      velocity.current = (lastX.current - touch.pageX) / dt * 16;
    }
    lastX.current = touch.pageX;
    lastTime.current = now;
  }

  function onTouchEnd() {
    applyMomentum();
  }

  useEffect(() => () => stopMomentum(), []);

  if (stockList.length === 0) {
    return (
      <div style={{ padding: "20px 24px", color: "#64748b", fontSize: 13, fontFamily: "system-ui, sans-serif" }}>
        Waiting for data…
      </div>
    );
  }

  return (
    <>
      {/* If the user is not premium, the function cannot be used */}
      {
        !isPremium && (
          <div style={{ padding: "20px 24px", color: "#64748b", fontSize: 13, fontFamily: "system-ui, sans-serif" }}>
            Please upgrade to premium to use this feature.

            <button
              onClick={() => navigate("/investor/subscription")}
            >
              Upgrade to Premium
            </button>
          </div>
        )
      }
      <div
        style={{
          width: "100%",
          position: "relative",

          borderRadius: 14,
          padding: "14px 0",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 60px, black calc(100% - 60px), transparent)",
          maskImage: "linear-gradient(to right, transparent, black 60px, black calc(100% - 60px), transparent)",
        }}
      >
        {/* Top glow line */}
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            height: 1,
            background: "linear-gradient(to right, transparent, rgba(99,179,237,0.35), transparent)",
            pointerEvents: "none",
          }}
        />

        {/* Scrollable track */}
        <div
          ref={scrollRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            display: "flex",
            gap: 10,
            padding: "0 16px",
            overflowX: "scroll",
            scrollbarWidth: "none",       // Firefox
            msOverflowStyle: "none",      // IE
            cursor: "grab",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* Hide webkit scrollbar via inline style tag trick */}
          <style>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>

          {stockList.map((stock, i) => (
            <StockCard

              key={`${stock.symbol}-${i}`}
              stock={stock}
              index={i}
              onClick={() => {
                if (!isPremium) {
                  return;
                }
                if (onCompare) {
                  onCompare(stock.symbol);
                  return;
                }
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

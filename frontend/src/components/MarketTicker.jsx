// Auto-scrolling marquee ticker strip — shared across every investor page (see
// GeneralHeader.jsx) and the AI Chatbot page, so they all look and behave identically.
//
// Seamlessness: the item list is repeated enough times that there's always more
// than a full viewport of content queued up off-screen, however few items were
// passed in — with only 2 copies (the old approach) a short list like the 5-item
// market overview would visibly run out and "snap" back to the start on wide
// screens. The loop still travels exactly one un-repeated copy's width per cycle,
// so playback speed doesn't change with the repeat count.
//
// The animation itself lives in a static stylesheet (src/style/marketTicker.css),
// not an inline <style> tag — an inline tag gets its text rewritten by React on
// every re-render (e.g. every live price tick), and some browsers restart a
// running CSS animation when its @keyframes rule is redefined, even with
// identical content. A static stylesheet is only ever parsed once.
const MIN_TRACK_ITEMS = 24;

function MarketTicker({ items }) {
    if (!items?.length) return null;

    const repeats = Math.max(4, Math.ceil(MIN_TRACK_ITEMS / items.length));
    const track = Array.from({ length: repeats }, () => items).flat();
    const shiftPct = 100 / repeats;

    return (
        <div style={{
            background: "rgba(0,0,0,0.3)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            padding: "6px 0",
            overflow: "hidden",
            position: "relative",
        }}>
            <div className="ticker-track" style={{ "--ticker-shift": `-${shiftPct}%` }}>
                {track.map((item, i) => (
                    <span key={`${item.key}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", whiteSpace: "nowrap" }}>
                        <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>{item.label}</span>
                        <span style={{ color: "#e2e8f0" }}>{item.priceText}</span>
                        {item.changeText && (
                            <span style={{ color: item.isUp ? "#34d399" : "#f87171" }}>
                                {item.isUp ? "▲" : "▼"}{item.changeText}
                            </span>
                        )}
                        <span style={{ color: "rgba(255,255,255,0.12)", margin: "0 10px" }}>•</span>
                    </span>
                ))}
            </div>
        </div>
    );
}

export default MarketTicker;

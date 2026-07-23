import { useEffect, useState } from "react";

const COLORS = {
  "Basic Investor": "#3b82f6",
  "Premium Investor": "#a855f7",
  "Expert": "#f59e0b",
};

const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = 78;
const STROKE = 26;
const STROKE_HOVER = 30;
const GAP = 3;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function UserTypesPieChart({ breakdown, total, loading, style }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    setGrown(false);
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, [breakdown]);

  const segments = (breakdown || []).filter((d) => d.count > 0);

  if (segments.length === 0) return null;

  let cumulative = 0;
  const arcs = segments.map((seg) => {
    const fraction = total > 0 ? seg.count / total : 0;
    const dash = Math.max(fraction * CIRCUMFERENCE - GAP, 0);
    const offset = -cumulative * CIRCUMFERENCE;
    cumulative += fraction;
    return { ...seg, dash, offset, fraction };
  });

  const hovered = hoverIndex !== null ? arcs[hoverIndex] : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6" style={style}>
      <div className={`relative shrink-0 ${loading ? "opacity-50 transition-opacity" : "transition-opacity"}`}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label="Breakdown of user types"
        >
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="#f0efec"
            strokeWidth={STROKE}
          />
          <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
            {arcs.map((arc, i) => {
              const isHovered = hoverIndex === i;
              return (
                <circle
                  key={arc.type}
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  fill="none"
                  stroke={COLORS[arc.type] || "#898781"}
                  strokeWidth={isHovered ? STROKE_HOVER : STROKE}
                  strokeDasharray={`${grown ? arc.dash : 0} ${CIRCUMFERENCE}`}
                  strokeDashoffset={arc.offset}
                  strokeLinecap="butt"
                  style={{
                    pointerEvents: "stroke",
                    cursor: "pointer",
                    transition: `stroke-dasharray 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 80}ms, stroke-width 0.15s ease`,
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${arc.type}: ${arc.count} user${arc.count === 1 ? "" : "s"} (${Math.round(arc.fraction * 100)}%)`}
                  onMouseEnter={(e) => {
                    setHoverIndex(i);
                    setPointer({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseMove={(e) => setPointer({ x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setHoverIndex(null)}
                  onFocus={() => setHoverIndex(i)}
                  onBlur={() => setHoverIndex(null)}
                />
              );
            })}
          </g>
          <text
            x={CENTER}
            y={CENTER - 6}
            textAnchor="middle"
            fontSize="26"
            fontWeight="700"
            fill="#0b0b0b"
          >
            {total}
          </text>
          <text
            x={CENTER}
            y={CENTER + 16}
            textAnchor="middle"
            fontSize="11"
            fill="#898781"
          >
            Total Users
          </text>
        </svg>

        {hovered && (
          <div
            className="fixed z-10 pointer-events-none bg-slate-900 text-white text-xs rounded-xl px-3.5 py-2.5 shadow-lg ring-1 ring-black/5"
            style={{ left: pointer.x + 14, top: pointer.y - 48, width: 150 }}
          >
            <div className="flex items-center gap-1.5 font-bold text-sm">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[hovered.type] }}
              />
              {hovered.count} {hovered.type}{hovered.count === 1 ? "" : "s"}
            </div>
            <div className="text-slate-300 mt-0.5">{Math.round(hovered.fraction * 100)}% of users</div>
          </div>
        )}
      </div>

      <ul className="flex-1 w-full space-y-3">
        {arcs.map((arc) => (
          <li key={arc.type} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm text-slate-700">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[arc.type] }}
              />
              {arc.type}
            </span>
            <span className="text-sm font-semibold text-slate-900">
              {arc.count} <span className="text-slate-400 font-normal">({Math.round(arc.fraction * 100)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default UserTypesPieChart;

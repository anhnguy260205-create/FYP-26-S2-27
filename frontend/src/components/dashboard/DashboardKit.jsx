// Shared design tokens + primitives for the investor and expert dashboard
// landing pages, so both stay visually consistent (card elevation, spacing,
// button styles, section headers) without duplicating the same class strings.

export const CARD = "rounded-2xl bg-white/[0.03] shadow-md shadow-black/10 ring-1 ring-white/5";
export const CARD_COMPACT = "rounded-xl bg-white/[0.03] shadow-sm shadow-black/10 ring-1 ring-white/5";
export const CARD_DOMINANT = "rounded-2xl bg-white/[0.04] shadow-lg shadow-black/20 ring-1 ring-white/5";
export const CARD_HOVER = "transition-all duration-[180ms] ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30";
export const CARD_GLOW_HOVER = "hover:shadow-[0_20px_40px_rgba(0,0,0,0.35),0_0_24px_rgba(0,211,242,0.07)]";
export const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00D3F2]";

export function Skeleton({ className, style }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className ?? ""}`} style={style} />;
}

export function SectionHeader({ title, subtitle, action, dark = true }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between mb-5">
      <div>
        <h2 className={`text-[26px] font-bold tracking-tight leading-snug ${dark ? "text-white" : "text-slate-900"}`}>{title}</h2>
        {subtitle && <p className={`text-[15px] mt-1 leading-relaxed ${dark ? "text-slate-500" : "text-slate-600"}`}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ViewAllLink({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="text-sm font-semibold text-[#00D3F2] transition-colors duration-150 hover:text-white cursor-pointer self-start sm:self-auto"
    >
      {children}
    </button>
  );
}

export function PrimaryButton({ onClick, children, icon: Icon, size = "md", className = "" }) {
  const sizes = size === "lg" ? "px-8 py-4 text-base" : "px-5 py-2.5 text-sm";
  return (
    <button
      onClick={onClick}
      className={`inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-[#00D3F2] font-bold text-slate-950 shadow-lg shadow-[#00D3F2]/20 transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer ${FOCUS_RING} ${sizes} ${className}`}
    >
      {Icon && <Icon size={size === "lg" ? 20 : 16} />}
      {children}
    </button>
  );
}

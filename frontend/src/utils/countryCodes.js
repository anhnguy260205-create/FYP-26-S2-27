// Common country dial codes for the phone-number field. Not exhaustive —
// covers the markets we expect, with Singapore first as the default.
export const COUNTRY_CODES = [
  { code: "+65", label: "Singapore", iso: "SG" },
  { code: "+60", label: "Malaysia", iso: "MY" },
  { code: "+62", label: "Indonesia", iso: "ID" },
  { code: "+63", label: "Philippines", iso: "PH" },
  { code: "+66", label: "Thailand", iso: "TH" },
  { code: "+84", label: "Vietnam", iso: "VN" },
  { code: "+91", label: "India", iso: "IN" },
  { code: "+86", label: "China", iso: "CN" },
  { code: "+852", label: "Hong Kong", iso: "HK" },
  { code: "+886", label: "Taiwan", iso: "TW" },
  { code: "+81", label: "Japan", iso: "JP" },
  { code: "+82", label: "South Korea", iso: "KR" },
  { code: "+61", label: "Australia", iso: "AU" },
  { code: "+64", label: "New Zealand", iso: "NZ" },
  { code: "+44", label: "United Kingdom", iso: "GB" },
  { code: "+1", label: "United States", iso: "US" },
  { code: "+1", label: "Canada", iso: "CA" },
  { code: "+49", label: "Germany", iso: "DE" },
  { code: "+33", label: "France", iso: "FR" },
  { code: "+39", label: "Italy", iso: "IT" },
  { code: "+34", label: "Spain", iso: "ES" },
  { code: "+31", label: "Netherlands", iso: "NL" },
  { code: "+41", label: "Switzerland", iso: "CH" },
  { code: "+971", label: "United Arab Emirates", iso: "AE" },
  { code: "+966", label: "Saudi Arabia", iso: "SA" },
  { code: "+27", label: "South Africa", iso: "ZA" },
  { code: "+55", label: "Brazil", iso: "BR" },
];

export const DEFAULT_COUNTRY_CODE = "+65";

// Country list for the "Country" dropdown on the personal-information forms.
// Derived from COUNTRY_CODES (deduped by name), Singapore first, rest A–Z.
export const COUNTRIES = (() => {
  const seen = new Set();
  const list = [];
  for (const c of COUNTRY_CODES) {
    if (!seen.has(c.label)) { seen.add(c.label); list.push({ name: c.label, iso: c.iso }); }
  }
  const sg = list.find((c) => c.name === "Singapore");
  const rest = list.filter((c) => c.name !== "Singapore").sort((a, b) => a.name.localeCompare(b.name));
  return sg ? [sg, ...rest] : rest;
})();

const COUNTRY_NAMES = COUNTRIES.map((c) => c.name);

// Personal info stores city + country combined in the single `address` column
// as "City, Country" (no schema change). These helpers split/join it so the
// forms can show a free-text City field and a Country dropdown separately.
export function splitAddress(address) {
  const raw = (address || "").trim();
  if (!raw) return { city: "", country: "" };
  // Prefer an exact known-country suffix so cities containing commas still work.
  const match = COUNTRY_NAMES.find(
    (n) => raw.toLowerCase() === n.toLowerCase() || raw.toLowerCase().endsWith(", " + n.toLowerCase())
  );
  if (match) {
    const city = raw.slice(0, raw.length - match.length).replace(/,\s*$/, "").trim();
    return { city, country: match };
  }
  // Fall back to last comma split.
  const idx = raw.lastIndexOf(",");
  if (idx === -1) return { city: raw, country: "" };
  return { city: raw.slice(0, idx).trim(), country: raw.slice(idx + 1).trim() };
}

export function joinAddress(city, country) {
  const c = (city || "").trim();
  const k = (country || "").trim();
  if (c && k) return `${c}, ${k}`;
  return c || k || "";
}

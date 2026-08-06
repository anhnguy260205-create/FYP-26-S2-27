import { useEffect, useState } from "react";

const BASE_URL = `${import.meta.env.VITE_API_URL}/content/landing`;

// Shared across every component that reads CMS content — Footer, Homepage,
// LoggedInHomePage, and SubscriptionPage all used to fire their own
// independent fetch of the same full table on every mount (up to 4 identical
// requests per landing-page visit). This caches the first request's promise
// so everyone else just waits on it instead of re-fetching.
let cache = null;

function fetchLandingContent() {
  if (!cache) {
    cache = fetch(BASE_URL)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) throw new Error("content fetch failed");
        return data.content;
      })
      .catch((err) => {
        cache = null; // don't cache a failure — let the next caller retry
        throw err;
      });
  }
  return cache;
}

/** The full CMS content list (all sections), or null while the first
 * consumer's fetch is still in flight. */
export function useLandingContent() {
  const [content, setContent] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchLandingContent()
      .then((c) => { if (!cancelled) setContent(c); })
      .catch(() => { });
    return () => { cancelled = true; };
  }, []);

  return content;
}

/** Free/Premium plan copy (name, price, features) — shared by Homepage.jsx
 * (landing page pricing section) and SubscriptionPage.jsx (upgrade page),
 * which both need the exact same free_investor/premium_investor CMS rows. */
export function usePlanContent() {
  const content = useLandingContent();
  const c = content ?? [];

  const freeFeatures = c.filter((x) => x.section === "free_investor").map((x) => x.title);
  const premiumFeatures = c.filter((x) => x.section === "premium_investor").map((x) => x.title);

  const freeName = c.find((x) => x.content_id === "free_plan_name");
  const freePrice = c.find((x) => x.content_id === "free_plan_price");
  const freeCta = c.find((x) => x.content_id === "free_plan_cta");
  const freePlan = {
    name: freeName?.title ?? "Starter",
    price: freePrice?.title ?? "$0.00",
    priceSubtitle: freePrice?.description ?? "forever, no card needed",
    cta: freeCta?.title ?? "Get Started Free",
  };

  const premName = c.find((x) => x.content_id === "premium_plan_name");
  const premPrice = c.find((x) => x.content_id === "premium_plan_price");
  const premCta = c.find((x) => x.content_id === "premium_plan_cta");
  const premiumPlan = {
    name: premName?.title ?? "Pro",
    price: premPrice?.title ?? "$20.99",
    priceSubtitle: premPrice?.description ?? "per month, billed annually",
    cta: premCta?.title ?? "Upgrade to Premium",
  };

  return { freeFeatures, premiumFeatures, freePlan, premiumPlan };
}

/** Converts a YouTube/Vimeo/Google Drive share link into its embeddable
 * player URL. Returns null for anything else (a direct file link, or an
 * unrecognized host) so the caller can fall back to a plain <video> tag.
 * Shared by the admin content preview and the real landing-page video
 * section, so both embed identically. */
export function toEmbeddableVideoUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (u.hostname === "drive.google.com") {
      // Share-link formats: /file/d/FILE_ID/view?usp=... or /open?id=FILE_ID
      const parts = u.pathname.split("/").filter(Boolean);
      const dIndex = parts.indexOf("d");
      const fileId = dIndex !== -1 ? parts[dIndex + 1] : u.searchParams.get("id");
      return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null;
    }
    return null;
  } catch {
    return null;
  }
}

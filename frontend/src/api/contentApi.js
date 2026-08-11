import { useEffect, useState } from "react";

const BASE_URL = `${import.meta.env.VITE_API_URL}/content/landing`;

// Cache the first request so other components can reuse it.
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
        cache = null; // Retry if the request fails.
        throw err;
      });
  }
  return cache;
}

// Get all landing page content.
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

// Get the free and premium plan details.
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

// Convert supported video share links into embed URLs.
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
      // Handle the common Google Drive share-link formats.
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

import { useEffect, useMemo, useState } from "react";
// Utility functions for managing content fetched from the backend, including hooks for re...
const API_BASE = import.meta.env.VITE_API_URL;

export function useContentManagement() {
  const [content, setContent] = useState([]);
  // Fetch the landing page content from the backend API when the component mounts. 
  useEffect(() => {
    if (!API_BASE) return;
    fetch(`${API_BASE}/content/landing`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.content)) setContent(data.content);
      })
      .catch(() => { });
  }, []);
  // Memoize the content management functions to avoid unnecessary recalculations on re-rend...
  return useMemo(() => {
    const byId = (id) => content.find((item) => item.content_id === id);
    // Get the text content for a specific content ID, with optional fallback title and descri...
    const text = (id, fallbackTitle = "", fallbackDescription = "") => {
      const item = byId(id);
      return {
        title: item?.title ?? fallbackTitle,
        description: item?.description ?? fallbackDescription,
        image_url: item?.image_url || "",
      };
    };
    // Get all content items for a specific section, sorted by their order index.
    const section = (sectionName) => content
      .filter((item) => item.section === sectionName)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    return { content, byId, text, section };
  }, [content]);
}
// Fill a template string with replacements, replacing placeholders in the form of {key} w...
export function fillTemplate(value = "", replacements = {}) {
  return Object.entries(replacements).reduce(
    (text, [key, replacement]) => text.replaceAll(`{${key}}`, String(replacement)),
    value
  );
}

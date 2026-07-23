import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL;

export function useContentManagement() {
  const [content, setContent] = useState([]);

  useEffect(() => {
    if (!API_BASE) return;
    fetch(`${API_BASE}/content/landing`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.content)) setContent(data.content);
      })
      .catch(() => {});
  }, []);

  return useMemo(() => {
    const byId = (id) => content.find((item) => item.content_id === id);
    const text = (id, fallbackTitle = "", fallbackDescription = "") => {
      const item = byId(id);
      return {
        title: item?.title ?? fallbackTitle,
        description: item?.description ?? fallbackDescription,
        image_url: item?.image_url || "",
      };
    };
    const section = (sectionName) => content
      .filter((item) => item.section === sectionName)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    return { content, byId, text, section };
  }, [content]);
}

export function fillTemplate(value = "", replacements = {}) {
  return Object.entries(replacements).reduce(
    (text, [key, replacement]) => text.replaceAll(`{${key}}`, String(replacement)),
    value
  );
}

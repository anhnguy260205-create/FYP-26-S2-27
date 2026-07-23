import { authFetch } from "./apiClient";

const API = import.meta.env.VITE_API_URL;

async function toJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok && data.success === undefined) {
    // FastAPI errors come back as {detail: ...} — normalise so callers can
    // always just read .success / .message.
    return { success: false, message: data.detail || `Request failed (${res.status})` };
  }
  return data;
}

/* ── Cash in / cash out ─────────────────────────────────────── */

export async function getWalletOverview() {
  return toJson(await authFetch(`${API}/wallet/overview`));
}

export async function cashIn({ amount, bankName, accountNumber }) {
  return toJson(await authFetch(`${API}/wallet/cash-in`, {
    method: "POST",
    body: JSON.stringify({
      amount: Number(amount),
      bank_name: bankName,
      account_number: accountNumber,
    }),
  }));
}

export async function cashOut({ amount, bankName, accountNumber, pin }) {
  return toJson(await authFetch(`${API}/wallet/cash-out`, {
    method: "POST",
    body: JSON.stringify({
      amount: Number(amount),
      bank_name: bankName,
      account_number: accountNumber,
      pin: pin || null,
    }),
  }));
}

/* ── Gifts ──────────────────────────────────────────────────── */

export async function sendGift({ expertUserId, amount, message }) {
  return toJson(await authFetch(`${API}/wallet/gift`, {
    method: "POST",
    body: JSON.stringify({
      expert_user_id: expertUserId,
      amount: Number(amount),
      message: message || null,
    }),
  }));
}

export async function getConversationGifts(otherUserId) {
  return toJson(await authFetch(
    `${API}/wallet/gifts/conversation/${otherUserId}`));
}

export async function getReceivedGifts() {
  return toJson(await authFetch(`${API}/wallet/gifts/received`));
}

/* ── Admin revenue ──────────────────────────────────────────
 * Revenue reporting lives on the existing admin panel
 * (Subscription Management), not a separate finance role.
 */

export async function getRevenueByMonth(months = 6) {
  return toJson(await authFetch(`${API}/admin/revenue-by-month?months=${months}`));
}

export async function getRevenueLedger({ source, limit = 100 } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (source) params.set("source", source);
  return toJson(await authFetch(`${API}/admin/revenue-ledger?${params}`));
}

const BASE = "http://127.0.0.1:8000";

export async function createAlert(data) {
    const res = await fetch(`${BASE}/alert/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function getAlerts(userId) {
    const res = await fetch(`${BASE}/alert/list/${userId}`);
    return res.json();
}

export async function deleteAlert(alertId, userId) {
    const res = await fetch(`${BASE}/alert/delete/${alertId}?user_id=${userId}`, { method: "DELETE" });
    return res.json();
}

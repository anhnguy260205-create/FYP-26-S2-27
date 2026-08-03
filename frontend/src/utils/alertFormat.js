// Shared by MyAlertsPage.jsx and AStockDashBoardPage.jsx's AlertBoard, render the same StockAlert condition fields as a human-readable label.
export function conditionLabel(alert) {
    const parts = [];
    if (alert.price_above != null) parts.push(`Above $${Number(alert.price_above).toFixed(2)}`);
    if (alert.price_below != null) parts.push(`Below $${Number(alert.price_below).toFixed(2)}`);
    if (alert.increase_percent != null) parts.push(`+${Number(alert.increase_percent).toFixed(2)}%`);
    if (alert.decrease_percent != null) parts.push(`-${Number(alert.decrease_percent).toFixed(2)}%`);
    return parts.length ? parts.join(" · ") : "No condition set";
}

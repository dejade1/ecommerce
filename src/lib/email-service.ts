export async function triggerDailySalesSummary() {
  await fetch('/api/daily-sales-summary', { method: 'POST' });
}

export async function triggerExpiryAlerts() {
  await fetch('/api/expiry-alerts', { method: 'POST' });
}

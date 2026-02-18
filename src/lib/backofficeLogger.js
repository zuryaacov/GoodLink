export async function logBackofficeEvent(event = {}) {
  try {
    const workerUrl = import.meta.env.VITE_WORKER_URL || 'https://glynk.to';
    const res = await fetch(`${workerUrl}/api/log-backoffice-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        ...event,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn('⚠️ [BackofficeLogger] Worker rejected event:', res.status, text);
    }
  } catch (error) {
    console.warn('⚠️ [BackofficeLogger] Failed to send event:', error?.message || error);
  }
}


export async function logBackofficeEvent(event = {}) {
  try {
    const workerUrl = import.meta.env.VITE_WORKER_URL || 'https://glynk.to';
    await fetch(`${workerUrl}/api/log-backoffice-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        ...event,
      }),
    });
  } catch (error) {
    console.warn('⚠️ [BackofficeLogger] Failed to send event:', error?.message || error);
  }
}


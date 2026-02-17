const AXIOM_INGEST_BASE = "https://api.axiom.co/v1/datasets";

function normalizeEvent(event = {}) {
  return {
    timestamp: event.timestamp || new Date().toISOString(),
    action: event.action || "unknown",
    short_code: event.short_code ?? null,
    original_url: event.original_url ?? null,
    visitor_ip: event.visitor_ip ?? null,
    user_agent: event.user_agent ?? null,
    country: event.country ?? null,
    is_bot: Boolean(event.is_bot),
    latency_ms: Number.isFinite(event.latency_ms) ? event.latency_ms : null,
  };
}

export async function sendAxiomEvent(env, event) {
  try {
    const dataset = env?.AXIOM_DATASET;
    const token = env?.AXIOM_TOKEN;
    if (!dataset || !token) {
      console.warn("⚠️ [Axiom] Missing AXIOM_DATASET or AXIOM_TOKEN. Skipping log.");
      return false;
    }

    const payload = normalizeEvent(event);
    const ua = String(payload.user_agent || "").toLowerCase();
    if (ua.includes("sentryuptimebot/1.0") || ua.includes("sentryuptimebot")) {
      console.log("⏭️ [Axiom] Skipping Sentry Uptime bot log");
      return false;
    }

    const ingestUrl = `${AXIOM_INGEST_BASE}/${encodeURIComponent(dataset)}/ingest`;
    console.log("📤 [Axiom] Sending event:", {
      dataset,
      ingestUrl,
      payload,
    });
    const res = await fetch(ingestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify([payload]),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn("⚠️ [Axiom] Ingest failed:", res.status, text);
      return false;
    }
    console.log("✅ [Axiom] Ingest success:", {
      status: res.status,
      action: payload.action,
      short_code: payload.short_code,
    });
    return true;
  } catch (error) {
    console.warn("⚠️ [Axiom] Ingest error:", error?.message || error);
    return false;
  }
}

export function logAxiomInBackground(ctx, env, event) {
  if (!ctx?.waitUntil) return;
  ctx.waitUntil(sendAxiomEvent(env, event));
}


const AXIOM_INGEST_BASE = "https://api.axiom.co/v1/datasets";

function normalizeResult(event = {}) {
  if (event.result) return String(event.result);
  if (typeof event.capi_success === "boolean") return event.capi_success ? "success" : "failed";
  if (event.action === "redirect") return "success";
  if (event.action === "invalid_request") return "failed";
  if (event.action === "bot_blocked") return "blocked";
  return "unknown";
}

function normalizeReason(event = {}) {
  return (
    event.reason ||
    event.redirect_reason ||
    event.invalid_reason ||
    event.verdict ||
    event.error_message ||
    null
  );
}

function normalizeEvent(event = {}) {
  const backendEvent = event.backend_event || event.action || "unknown";
  const reason = normalizeReason(event);
  const company = event.company || event.capi_company || null;
  const result = normalizeResult(event);

  return {
    ...event,
    schema_version: "v1",
    timestamp: event.timestamp || new Date().toISOString(),
    action: event.action || "unknown",
    backend_event: backendEvent,
    reason,
    company,
    result,
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
      return false;
    }

    const payload = normalizeEvent(event);
    const ua = String(payload.user_agent || "").toLowerCase();
    if (ua.includes("sentryuptimebot/1.0") || ua.includes("sentryuptimebot")) {
      return false;
    }

    const ingestUrl = `${AXIOM_INGEST_BASE}/${encodeURIComponent(dataset)}/ingest`;
    const res = await fetch(ingestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify([payload]),
    });

    if (!res.ok) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}

export function logAxiomInBackground(ctx, env, event) {
  if (!ctx?.waitUntil) return;
  ctx.waitUntil(sendAxiomEvent(env, event));
}


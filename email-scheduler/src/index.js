const DEFAULT_MAX_PER_RUN = 500;

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runScheduler(env, "cron"));
  },

  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return jsonResponse({ ok: true, now: new Date().toISOString() });
    }

    if (url.pathname === "/run" && request.method === "POST") {
      if (env.SCHEDULER_SHARED_SECRET) {
        const sentSecret = request.headers.get("X-Scheduler-Secret") || "";
        if (sentSecret !== env.SCHEDULER_SHARED_SECRET) {
          return jsonResponse({ error: "unauthorized" }, 401);
        }
      }

      const result = await runScheduler(env, "manual");
      return jsonResponse(result);
    }

    return jsonResponse({ error: "not_found" }, 404);
  },
};

async function runScheduler(env, source) {
  const startedAt = Date.now();
  const missing = [];

  if (!env.SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!env.BREVO_API_KEY) missing.push("BREVO_API_KEY");

  if (missing.length > 0) {
    console.error("email-scheduler missing env vars:", missing.join(", "));
    return { ok: false, error: "missing_env", missing };
  }

  const limit = parseInt(env.MAX_EMAILS_PER_RUN || `${DEFAULT_MAX_PER_RUN}`, 10);
  const dueRows = await fetchDueEmails(env, limit);
  const stats = { sent: 0, failed: 0, skipped: 0 };

  console.log(`[email-scheduler] source=${source} due_rows=${dueRows.length}`);

  for (const row of dueRows) {
    const templateId = resolveTemplateId(env, row.email_type);
    const recipientEmail = String(row.email || "").trim();
    const nextAttempts = Number(row.attempts || 0) + 1;

    if (!templateId) {
      await markFailed(env, row.id, nextAttempts, `no_template_for_${row.email_type}`);
      stats.skipped += 1;
      continue;
    }

    if (!recipientEmail) {
      await markFailed(env, row.id, nextAttempts, "missing_recipient_email");
      stats.skipped += 1;
      continue;
    }

    try {
      const brevoResult = await sendBrevoEmail(env, {
        to: recipientEmail,
        templateId,
        params: {
          EMAIL: recipientEmail,
          EMAIL_TYPE: row.email_type,
          USER_ID: row.user_id,
        },
      });

      await markSent(env, row.id, nextAttempts, brevoResult.messageId || null);
      stats.sent += 1;
    } catch (error) {
      await markFailed(env, row.id, nextAttempts, String(error?.message || error));
      stats.failed += 1;
    }
  }

  const elapsedMs = Date.now() - startedAt;
  const result = {
    ok: true,
    source,
    processed: dueRows.length,
    stats,
    elapsedMs,
    now: new Date().toISOString(),
  };

  console.log("[email-scheduler] result=", JSON.stringify(result));
  return result;
}

async function fetchDueEmails(env, limit) {
  const nowIso = new Date().toISOString();
  const url = new URL(`${env.SUPABASE_URL}/rest/v1/email_logs`);
  url.searchParams.set("select", "id,user_id,email,email_type,scheduled_for,attempts");
  url.searchParams.set("status", "eq.pending");
  url.searchParams.set("scheduled_for", `lte.${nowIso}`);
  url.searchParams.set("order", "scheduled_for.asc");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, { headers: supabaseHeaders(env) });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`supabase_select_failed:${res.status}:${body}`);
  }

  return res.json();
}

async function markSent(env, rowId, attempts, providerMessageId) {
  const patchUrl = `${env.SUPABASE_URL}/rest/v1/email_logs?id=eq.${rowId}`;
  const res = await fetch(patchUrl, {
    method: "PATCH",
    headers: {
      ...supabaseHeaders(env),
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      status: "sent",
      sent_at: new Date().toISOString(),
      provider_message_id: providerMessageId,
      attempts,
      last_error: null,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[email-scheduler] markSent failed row=${rowId}`, res.status, body);
  }
}

async function markFailed(env, rowId, attempts, errorMessage) {
  const patchUrl = `${env.SUPABASE_URL}/rest/v1/email_logs?id=eq.${rowId}`;
  const res = await fetch(patchUrl, {
    method: "PATCH",
    headers: {
      ...supabaseHeaders(env),
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      status: "failed",
      attempts,
      last_error: String(errorMessage || "unknown").slice(0, 2000),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[email-scheduler] markFailed failed row=${rowId}`, res.status, body);
  }
}

function supabaseHeaders(env) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  };
}

function resolveTemplateId(env, emailType) {
  const rawValue = {
    trial_23: env.BREVO_TEMPLATE_TRIAL_23,
    trial_29: env.BREVO_TEMPLATE_TRIAL_29,
    trial_30: env.BREVO_TEMPLATE_TRIAL_30,
    trial_33: env.BREVO_TEMPLATE_TRIAL_33,
  }[emailType];

  if (!rawValue) return null;
  const parsed = parseInt(String(rawValue), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function sendBrevoEmail(env, { to, templateId, params }) {
  const senderEmail = env.BREVO_SENDER_EMAIL || "noreply@goodlink.ai";
  const senderName = env.BREVO_SENDER_NAME || "Goodlink";

  const payload = {
    to: [{ email: to }],
    sender: { email: senderEmail, name: senderName },
    templateId,
    params,
  };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": env.BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`brevo_send_failed:${res.status}:${body}`);
  }

  try {
    const json = JSON.parse(body);
    return { messageId: json.messageId || null };
  } catch {
    return { messageId: null };
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

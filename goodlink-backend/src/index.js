import { Redis } from "@upstash/redis/cloudflare";
import * as Sentry from "@sentry/cloudflare";
import { logAxiomInBackground } from "./services/axiomLogger";

// --- Utility Functions ---

function getGlynk404Page() {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Link Not Found</title><style>
    :root { --bg:#0B0F1A; --pink:#FF00E5; --cyan:#00F0FF; --txt:#ffffff; --muted:#6b7280; --panel:#161C2C; }
    *{box-sizing:border-box}
    body{
      margin:0; min-height:100vh; padding:24px; overflow:hidden;
      background:var(--bg); color:var(--txt); font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
      display:flex; align-items:center; justify-content:center; position:relative; text-align:center;
    }
    .glow-a,.glow-b{
      position:absolute; width:40vw; height:40vw; border-radius:999px; filter:blur(120px); opacity:.05; pointer-events:none;
    }
    .glow-a{ top:-10%; left:-10%; background:var(--pink); }
    .glow-b{ bottom:-10%; right:-10%; background:var(--cyan); }
    .grid{
      position:absolute; inset:0; opacity:.03; pointer-events:none;
      background-image:linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px);
      background-size:40px 40px;
    }
    .vline{
      position:absolute; top:0; bottom:0; width:1px; opacity:.3;
      background:linear-gradient(to bottom, transparent, #374151, transparent);
    }
    .vline.left{ left:48px; } .vline.right{ right:48px; }
    .wrap{ position:relative; z-index:2; max-width:760px; width:100%; }
    .head{ position:relative; display:inline-block; margin-bottom:48px; }
    .code{
      margin:0; line-height:.9; font-size:clamp(120px,18vw,240px); font-weight:900; letter-spacing:-.04em;
      color:transparent; -webkit-text-stroke:1px #d8b4fe; user-select:none;
      text-shadow:0 0 5px #8c25f4, 0 0 10px #8c25f4, 0 0 20px #8c25f4, 0 0 40px #8c25f4;
    }
    h2{
      margin:0; font-size:clamp(34px,5vw,54px); font-weight:900; text-transform:uppercase;
      letter-spacing:-.02em; font-style:italic;
    }
    .pink{ color:var(--pink); }
    .bar{ height:4px; width:84px; background:var(--pink); margin:22px auto 0; border-radius:999px; }
    .desc{
      margin:18px auto 0; color:var(--muted); font-size:clamp(17px,2.2vw,22px);
      font-weight:500; line-height:1.6; max-width:420px;
    }
    .status{
      margin-top:54px; display:inline-flex; align-items:center; gap:12px; color:#6b7280;
      font-size:10px; letter-spacing:.28em; text-transform:uppercase; font-weight:700;
    }
    .dot{ width:6px; height:6px; border-radius:999px; background:#ef4444; box-shadow:0 0 8px #ef4444; }
    .foot{
      margin-top:72px; opacity:.2; color:#9ca3af; font-size:8px; letter-spacing:.5em;
      text-transform:uppercase; font-weight:900; display:flex; justify-content:center; gap:22px; flex-wrap:wrap;
    }
    @media (max-width: 640px){ .vline{display:none;} }
    </style></head><body>
    <div class="glow-a"></div><div class="glow-b"></div><div class="grid"></div>
    <div class="vline left"></div><div class="vline right"></div>
    <div class="wrap">
      <div class="head">
        <h1 class="code">404</h1>
      </div>
      <h2>Link <span class="pink">Not Found</span></h2>
      <div class="bar"></div>
      <p class="desc">The resource you are looking for has expired or the URL is incorrect.</p>
      <div class="status"><span class="dot"></span><span>Connection Terminated</span></div>
      <div class="foot"><span>Infrastructure Protected</span><span>Node: Edge_Cluster_01</span></div>
    </div>
    </body></html>`;
}

function ensureValidUrl(url) {
    if (!url) return null;
    let cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = 'https://' + cleanUrl;
    return cleanUrl;
}

/**
 * Build safe redirect URL with query params
 * Handles edge cases like missing trailing slash
 * URLSearchParams automatically encodes special characters (#!@ etc.)
 */
function buildSafeUrl(base, searchParams) {
    try {
        const urlObj = new URL(base);
        // Copy params from original request to target URL (encoded safely)
        searchParams.forEach((value, key) => urlObj.searchParams.set(key, value));
        const finalUrl = urlObj.toString();
        console.log(`🚀 Redirecting to: ${finalUrl}`);
        return finalUrl;
    } catch (e) {
        // If URL in database is broken, return as-is
        console.error("❌ Redirect Construction Error:", e.message);
        return base;
    }
}

async function getCustomDomainConfig(env, domain) {
    try {
        const sbRes = await fetch(
            `${env.SUPABASE_URL}/rest/v1/custom_domains?domain=eq.${encodeURIComponent(domain)}&status=eq.active&select=root_redirect&id=not.is.null&limit=1`,
            {
                headers: {
                    "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                    "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
                }
            }
        );
        if (!sbRes.ok) return { exists: false, rootRedirect: null };
        const data = await sbRes.json();
        const row = data?.[0];
        if (!row) return { exists: false, rootRedirect: null };
        return { exists: true, rootRedirect: row.root_redirect || null };
    } catch (e) {
        console.warn("⚠️ [CustomDomain] Failed to load root redirect:", e?.message || e);
        return { exists: false, rootRedirect: null };
    }
}

/**
 * Send click record directly to Supabase via QStash
 * All data is collected from Cloudflare (no IPINFO)
 */
async function logClickToSupabase(env, clickRecord, redis) {
    try {
        const rayDedupKey = `log:${clickRecord.ray_id}:${clickRecord.slug}`;
        const ipDedupKey = `ip_limit:${clickRecord.ip_address}:${clickRecord.slug}`;

        // 1. Protection against technical retries (exact same request)
        const isNewRay = await redis.set(rayDedupKey, "1", { nx: true, ex: 120 });
        if (isNewRay === null) {
            console.log(`⏭️ Duplicate Ray ID (${clickRecord.ray_id}) - skipping`);
            return;
        }

        // 2. Protection against duplicate clicks (same IP to same slug within 1 second)
        const isNewClick = await redis.set(ipDedupKey, "1", { nx: true, ex: 1 });
        if (isNewClick === null) {
            console.log(`⏭️ Rate limit: Same IP within 1s (${clickRecord.ip_address}) - skipping`);
            return;
        }

        // Send directly to Supabase via QStash
        const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/clicks`;
        const qstashUrl = `https://qstash.upstash.io/v2/publish/${supabaseUrl}`;

        console.log(`📤 Sending to QStash → ${supabaseUrl}`);
        console.log(`📦 Click Record:`, JSON.stringify(clickRecord));

        const response = await fetch(qstashUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${env.QSTASH_TOKEN}`,
                "Content-Type": "application/json",
                // Headers to forward to Supabase
                "Upstash-Forward-apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                "Upstash-Forward-Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                "Upstash-Forward-Content-Type": "application/json",
                "Upstash-Forward-Prefer": "return=minimal"
            },
            body: JSON.stringify(clickRecord)
        });

        const responseText = await response.text();
        console.log(`📬 QStash Response: ${response.status} - ${responseText}`);

        if (!response.ok) {
            console.error(`❌ QStash Error: ${response.status} - ${responseText}`);
        }
    } catch (e) {
        console.error("❌ Logger Error:", e.message);
    }
}

/**
 * Build complete click record with all Cloudflare data
 */
function buildClickRecord(request, rayId, ip, slug, domain, userAgent, verdict, linkData) {
    const cf = request.cf || {};
    const botMgmt = cf.botManagement || {};
    const botScore = botMgmt.score ?? 100;

    return {
        id: crypto.randomUUID(),
        ray_id: rayId,

        // Link data
        link_id: linkData?.id || null,
        user_id: linkData?.user_id || null,
        target_url: linkData?.target_url || null,
        slug: slug || "root",
        domain: domain,

        // Visitor data
        ip_address: ip,
        user_agent: userAgent,
        referer: request.headers.get("referer") || null,

        // Geography data from Cloudflare
        country: cf.country || null,
        city: cf.city || null,
        region: cf.region || null,
        timezone: cf.timezone || null,
        latitude: cf.latitude ? String(cf.latitude) : null,
        longitude: cf.longitude ? String(cf.longitude) : null,
        postal_code: cf.postalCode || null,
        continent: cf.continent || null,

        // Network data from Cloudflare
        asn: cf.asn || null,
        isp: cf.asOrganization || null,

        // Bot data - fraud_score is inverse of bot_score (100 = clean, 0 = bot)
        fraud_score: 100 - botScore,
        is_bot: botScore <= 29 || botMgmt.verifiedBot || false,
        bot_reason: botMgmt.verifiedBot ? "verified_bot" : (botScore <= 29 ? `low_score_${botScore}` : null),
        ja3_hash: botMgmt.ja3Hash || null,
        ja4: botMgmt.ja4 || null,

        // Security data
        threat_score: cf.threatScore || null,
        is_tor: cf.isEUCountry === false && cf.country === 'T1',

        // Connection data
        http_protocol: cf.httpProtocol || null,
        tls_version: cf.tlsVersion || null,
        tls_cipher: cf.tlsCipher || null,

        // Metadata
        verdict: verdict,
        query_params: new URL(request.url).search || "",
        clicked_at: new Date().toISOString()
    };
}

// --- CAPI (Conversions API) Helpers ---

/**
 * Click ID param → platform(s) that get CAPI when this param is present.
 * fbclid is resolved via Referer + utm_source to meta or instagram (or both when unknown).
 * If URL has multiple params (e.g. ttclid + fbclid), we send to all matching platforms.
 */
const CLICK_ID_TO_PLATFORMS = {
    ttclid: ["tiktok"],
    gclid: ["google"],
    wbraid: ["google"],
    gbraid: ["google"],
    scid: ["snapchat"],
    oglid: ["outbrain"],
    dicbid: ["outbrain"],
    tblci: ["taboola"],
    tglid: ["taboola"]
};

/** Get URL query param value by key, case-insensitive */
function getParamIgnoreCase(searchParams, key) {
    const lower = key.toLowerCase();
    for (const [k, v] of searchParams.entries()) {
        if (k.toLowerCase() === lower && v != null && v !== "") return v;
    }
    return undefined;
}

/** Extract all platform click IDs from URL for CAPI user_data and platform detection (keys case-insensitive) */
function getClickIdsFromUrl(searchParams) {
    const fbclid = getParamIgnoreCase(searchParams, "fbclid");
    const gclid = getParamIgnoreCase(searchParams, "gclid");
    const ttclid = getParamIgnoreCase(searchParams, "ttclid");
    const wbraid = getParamIgnoreCase(searchParams, "wbraid");
    const gbraid = getParamIgnoreCase(searchParams, "gbraid");
    const scid = getParamIgnoreCase(searchParams, "scid");
    const dicbid = getParamIgnoreCase(searchParams, "dicbid");
    const oglid = getParamIgnoreCase(searchParams, "oglid");
    const tblci = getParamIgnoreCase(searchParams, "tblci");
    const tglid = getParamIgnoreCase(searchParams, "tglid");
    return { fbclid, gclid, ttclid, wbraid, gbraid, scid, dicbid, oglid, tblci, tglid };
}

/**
 * Resolve Meta (Facebook vs Instagram) when fbclid is present: Referer first, then utm_source.
 * @param {Request} request - Worker request (for Referer header)
 * @param {URLSearchParams} searchParams - URL query params (for utm_source)
 * @returns {string[]} ['meta'] | ['instagram'] | ['meta','instagram'] when unknown
 */
function resolveMetaPlatformFromRefererAndUtm(request, searchParams) {
    const referer = (request.headers.get("Referer") || request.headers.get("referer") || "").toLowerCase();
    const utmSource = (searchParams.get("utm_source") || "").toLowerCase().trim();

    // 1. Referer first (most common): l.instagram.com, instagram.com, l.facebook.com, m.facebook.com
    if (referer.includes("instagram.com")) {
        return ["instagram"];
    }
    if (referer.includes("facebook.com")) {
        return ["meta"];
    }

    // 2. UTM (most reliable when set): utm_source=ig/instagram → Instagram, utm_source=fb/facebook → Facebook
    if (utmSource === "ig" || utmSource === "instagram") {
        return ["instagram"];
    }
    if (utmSource === "fb" || utmSource === "facebook") {
        return ["meta"];
    }

    // Unknown: send to both so we don't miss the conversion
    return ["meta", "instagram"];
}

/**
 * Return set of pixel platform values that should get CAPI: all platforms that have a click ID in the URL.
 * If URL has one param → one platform (or meta+instagram when fbclid unknown). If multiple params → send to all.
 * No priority: we send to every company we detected in the URL.
 */
function getPlatformsFromClickIds(clickIds, request, searchParams) {
    const platforms = new Set();

    for (const [param, platformList] of Object.entries(CLICK_ID_TO_PLATFORMS)) {
        if (clickIds[param]) {
            platformList.forEach((p) => platforms.add(p));
        }
    }

    if (clickIds.fbclid) {
        const metaPlatforms = resolveMetaPlatformFromRefererAndUtm(request, searchParams);
        metaPlatforms.forEach((p) => platforms.add(p));
    }

    return platforms;
}

/**
 * Publish CAPI payload to QStash; QStash will POST to relayUrl (our /api/capi-relay).
 * @param {Object} env - Worker env (QSTASH_TOKEN, etc.)
 * @param {string} relayUrl - Full URL of the relay (e.g. https://worker.workers.dev/api/capi-relay)
 * @param {Object} payload - { event_id, event_time, event_source_url, user_data, pixels }
 */
async function sendCapiToQStash(env, relayUrl, payload) {
    if (!env.QSTASH_TOKEN || !relayUrl) {
        console.warn("CAPI: missing QSTASH_TOKEN or CAPI_RELAY_URL, skipping QStash publish");
        return;
    }
    const qstashPublishUrl = `https://qstash.upstash.io/v2/publish/${relayUrl}`;
    console.log("QStash CAPI: publishing to relay:", relayUrl);
    const payloadJson = JSON.stringify(payload, null, 2);
    console.log("QStash CAPI: JSON sent:", payloadJson);
    try {
        const res = await fetch(qstashPublishUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${env.QSTASH_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        const text = await res.text();
        console.log("QStash CAPI publish:", res.status, text);
        if (!res.ok) console.error("QStash CAPI error:", res.status, text);
    } catch (e) {
        console.error("QStash CAPI error:", e.message);
    }
}

/**
 * Bridge page HTML: fires client-side pixels (Meta, TikTok, etc.) then redirects.
 * @param {Object} opts - { targetUrl, eventId, eventTime, pixels, delayMs }
 */
function getBridgePageHtml(opts) {
    const { targetUrl, eventId, eventTime, pixels, delayMs = 1500 } = opts;
    const encodedTarget = encodeURIComponent(targetUrl);
    const encodedPixels = encodeURIComponent(JSON.stringify(pixels || []));
    const encodedEventId = encodeURIComponent(eventId || "");
    const encodedEventTime = encodeURIComponent(String(eventTime || 0));
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Redirecting...</title></head><body>
<script>
(function(){
  var targetUrl = decodeURIComponent("${encodedTarget}");
  var pixels = JSON.parse(decodeURIComponent("${encodedPixels}"));
  var eventId = decodeURIComponent("${encodedEventId}");
  var eventTime = parseInt(decodeURIComponent("${encodedEventTime}"), 10) || Math.floor(Date.now()/1000);
  function fireMeta(p) {
    if (typeof fbq !== "undefined") { fbq("trackCustom", p.event_name || "PageView", {}, { eventID: eventId }); }
  }
  function fireTikTok(p) {
    if (typeof ttq !== "undefined") { ttq.track("ClickButton", {}); }
  }
  function fireGoogle(p) {
    if (typeof gtag !== "undefined") { gtag("event", p.event_name || "page_view", { send_to: p.pixel_id, event_callback: function(){} }); }
  }
  (pixels || []).forEach(function(p) {
    if (p.platform === "meta") fireMeta(p);
    else if (p.platform === "tiktok") fireTikTok(p);
    else if (p.platform === "google") fireGoogle(p);
  });
  setTimeout(function(){ window.location.href = targetUrl; }, ${delayMs});
})();
</script>
<noscript><meta http-equiv="refresh" content="1;url=${targetUrl.replace(/"/g, "&quot;")}"></noscript>
<p>Redirecting...</p>
</body></html>`;
}

export default Sentry.withSentry(
    () => ({
        dsn: "https://e771f37fced759ffa221f6b97bdce745@o4510770008293376.ingest.us.sentry.io/4510770172985344",
        sendDefaultPii: true,
    }),
    {
        async fetch(request, env, ctx) {
            const url = new URL(request.url);
            const path = url.pathname.toLowerCase();
            const domain = url.hostname.replace(/^www\./, '');
            const requestStartMs = Date.now();

            // CORS Headers for all requests
            const corsHeaders = {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            };

            // Handle CORS preflight
            if (request.method === "OPTIONS") {
                return new Response(null, { status: 204, headers: corsHeaders });
            }

            // === API Endpoint: Backoffice Event Logging to Axiom ===
            if (path === "/api/log-backoffice-event" && request.method === "POST") {
                try {
                    const body = await request.json();
                    const { action, user_id } = body || {};
                    if (!action || !user_id) {
                        return new Response(JSON.stringify({ error: "Missing required fields (action, user_id)" }), {
                            status: 400,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    const reqIp = request.headers.get("cf-connecting-ip") || null;
                    const reqUa = request.headers.get("user-agent") || null;
                    const reqCountry = request.cf?.country || null;
                    const reqStart = Date.now();

                    logAxiomInBackground(ctx, env, {
                        ...body,
                        timestamp: body.timestamp || new Date().toISOString(),
                        action,
                        backend_event: body.backend_event || `backoffice_${action}`,
                        user_id,
                        original_url: body.original_url || request.url,
                        visitor_ip: body.visitor_ip || reqIp,
                        user_agent: body.user_agent || reqUa,
                        country: body.country || reqCountry,
                        is_bot: Boolean(body.is_bot),
                        latency_ms: Number.isFinite(body.latency_ms) ? body.latency_ms : Date.now() - reqStart
                    });

                    return new Response(JSON.stringify({ ok: true }), {
                        status: 200,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                } catch (error) {
                    return new Response(JSON.stringify({ error: error.message || "Failed to log event" }), {
                        status: 500,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }
            }

            // === API Endpoint: Send signup confirmation email via Brevo (replaces Supabase default) ===
            if (path === "/api/send-confirmation-email" && request.method === "POST") {
                try {
                    const body = await request.json().catch(() => ({}));
                    const { email, redirect_to } = body || {};
                    const emailTrimmed = String(email || "").trim();
                    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
                        return new Response(JSON.stringify({ error: "Valid email is required" }), {
                            status: 400,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }
                    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
                        return new Response(JSON.stringify({ error: "Server configuration error" }), {
                            status: 500,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }
                    const genUrl = `${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/admin/generate_link`;
                    const genBody = { type: "signup", email: emailTrimmed };
                    if (redirect_to) genBody.options = { redirect_to: String(redirect_to) };
                    const genRes = await fetch(genUrl, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                            "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
                        },
                        body: JSON.stringify(genBody)
                    });
                    const genData = await genRes.json().catch(() => ({}));
                    const actionLink = genData?.properties?.action_link ?? genData?.action_link ?? genData?.data?.properties?.action_link ?? genData?.data?.action_link;
                    if (!actionLink || typeof actionLink !== "string") {
                        console.warn("generate_link response:", genData);
                        return new Response(JSON.stringify({ error: "Could not generate confirmation link" }), {
                            status: 400,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }
                    if (!env.BREVO_API_KEY) {
                        return new Response(JSON.stringify({ error: "Email service not configured" }), {
                            status: 503,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }
                    const brevoPayload = {
                        sender: {
                            name: env.BREVO_SENDER_NAME || "Goodlink",
                            email: env.BREVO_SENDER_EMAIL || "noreply@goodlink.ai"
                        },
                        to: [{ email: emailTrimmed }],
                        subject: env.BREVO_CONFIRMATION_SUBJECT || "Confirm your email - Goodlink",
                        htmlContent: env.BREVO_CONFIRMATION_HTML
                            ? env.BREVO_CONFIRMATION_HTML.replace(/\{\{CONFIRMATION_LINK\}\}/g, actionLink).replace(/\{\{EMAIL\}\}/g, emailTrimmed)
                            : `Please confirm your email by clicking: <a href="${actionLink}">Confirm email</a>. If you did not sign up, ignore this email.`,
                        params: { CONFIRMATION_LINK: actionLink, EMAIL: emailTrimmed }
                    };
                    if (env.BREVO_CONFIRMATION_TEMPLATE_ID) {
                        brevoPayload.templateId = Number(env.BREVO_CONFIRMATION_TEMPLATE_ID);
                        delete brevoPayload.htmlContent;
                    }
                    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
                        method: "POST",
                        headers: {
                            "Accept": "application/json",
                            "Content-Type": "application/json",
                            "api-key": env.BREVO_API_KEY
                        },
                        body: JSON.stringify(brevoPayload)
                    });
                    const brevoData = await brevoRes.json().catch(() => ({}));
                    if (!brevoRes.ok) {
                        console.error("Brevo send failed:", brevoRes.status, brevoData);
                        return new Response(JSON.stringify({ error: "Failed to send confirmation email" }), {
                            status: 502,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }
                    return new Response(JSON.stringify({ success: true }), {
                        status: 200,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                } catch (err) {
                    console.error("send-confirmation-email error:", err);
                    return new Response(JSON.stringify({ error: "Failed to send confirmation email" }), {
                        status: 500,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }
            }

            // === API Endpoint: Abuse Report (public form) ===
            if (path === "/api/abuse-report" && request.method === "POST") {
                try {
                    const body = await request.json().catch(() => ({}));
                    const { reported_url, category, description, reporter_email, turnstile_token } = body || {};

                    if (!reported_url || !reporter_email) {
                        return new Response(JSON.stringify({ error: "Missing required fields (reported_url, reporter_email)" }), {
                            status: 400,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(String(reporter_email).trim())) {
                        return new Response(JSON.stringify({ error: "Invalid email address." }), {
                            status: 400,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }
                    const allowedCategories = ["phishing", "spam", "adult", "copyright", "other"];
                    const cat = String(category || "other").toLowerCase();
                    if (!allowedCategories.includes(cat)) {
                        return new Response(JSON.stringify({ error: "Invalid category" }), {
                            status: 400,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    const turnstileVerified = Boolean(turnstile_token);

                    let safeBrowsingResponse = null;
                    if (env.GOOGLE_SAFE_BROWSING_API_KEY) {
                        console.log("[SafeBrowsing] Sending check for URL:", reported_url);
                        try {
                            const apiUrl = "https://safebrowsing.googleapis.com/v4/threatMatches:find";
                            const reqBody = {
                                client: { clientId: "goodlink-abuse-report", clientVersion: "1.0" },
                                threatInfo: {
                                    threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
                                    platformTypes: ["ANY_PLATFORM"],
                                    threatEntryTypes: ["URL"],
                                    threatEntries: [{ url: reported_url }]
                                }
                            };
                            const sbRes = await fetch(`${apiUrl}?key=${env.GOOGLE_SAFE_BROWSING_API_KEY}`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(reqBody)
                            });
                            const sbData = await sbRes.json().catch(() => ({}));
                            if (sbRes.ok && sbData.matches && sbData.matches.length > 0) {
                                safeBrowsingResponse = { isSafe: false, threatType: sbData.matches[0].threatType || null, raw: sbData };
                                console.log("[SafeBrowsing] Result: UNSAFE | threatType:", sbData.matches[0].threatType, "| matches:", sbData.matches.length, "| raw:", JSON.stringify(sbData));
                            } else {
                                safeBrowsingResponse = { isSafe: true, threatType: null };
                                console.log("[SafeBrowsing] Result: SAFE | HTTP status:", sbRes.status, "| response:", JSON.stringify(sbData));
                            }
                        } catch (sbErr) {
                            console.warn("[SafeBrowsing] Check failed with error:", sbErr.message || sbErr);
                            safeBrowsingResponse = { error: String(sbErr.message || "check_failed") };
                        }
                    } else {
                        console.log("[SafeBrowsing] Skipped — GOOGLE_SAFE_BROWSING_API_KEY not configured.");
                    }

                    const insertUrl = `${env.SUPABASE_URL}/rest/v1/abuse_reports`;
                    const insertRes = await fetch(insertUrl, {
                        method: "POST",
                        headers: {
                            "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                            "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                            "Content-Type": "application/json",
                            "Prefer": "return=representation"
                        },
                        body: JSON.stringify({
                            reported_url: String(reported_url).trim(),
                            category: cat,
                            description: description ? String(description).trim() : null,
                            reporter_email: String(reporter_email).trim(),
                            safe_browsing_response: safeBrowsingResponse,
                            turnstile_verified: turnstileVerified
                        })
                    });

                    if (!insertRes.ok) {
                        const errData = await insertRes.json().catch(() => ({}));
                        console.error("Abuse report insert failed:", insertRes.status, errData);
                        return new Response(JSON.stringify({ error: "Failed to save report. Please try again." }), {
                            status: 500,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    return new Response(JSON.stringify({ success: true }), {
                        status: 200,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                } catch (error) {
                    console.error("❌ [Abuse Report] Error:", error);
                    return new Response(JSON.stringify({ error: error.message || "Failed to submit report" }), {
                        status: 500,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }
            }

            // === API Endpoint: Update Redis Cache ===
            if (path === "/api/update-redis-cache" && request.method === "POST") {
                try {
                    const body = await request.json();
                    const { domain, slug, oldDomain, oldSlug, cacheData } = body;

                    if (!domain || !slug || !cacheData) {
                        return new Response(JSON.stringify({ error: "Missing required fields" }), {
                            status: 400,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    const redis = new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN });

                    // If domain or slug changed - delete the old key
                    let deletedOld = false;
                    let deletedOldKey = null;
                    if (oldDomain && oldSlug) {
                        const oldKey = `link:${oldDomain}:${oldSlug}`;
                        const newKey = `link:${domain}:${slug}`;
                        if (oldKey !== newKey) {
                            console.log(`🧹 [Redis] Deleting old key: ${oldKey}`);
                            await redis.del(oldKey);
                            deletedOld = true;
                            deletedOldKey = oldKey;
                        }
                    }

                    // Save the new data
                    const newKey = `link:${domain}:${slug}`;
                    await redis.set(newKey, JSON.stringify(cacheData));
                    console.log(`✅ [Redis] Cache updated: ${newKey}`);

                    return new Response(JSON.stringify({
                        success: true,
                        message: "Redis cache updated successfully",
                        cacheKey: newKey,
                        deletedOld,
                        deletedOldKey
                    }), {
                        status: 200,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });

                } catch (error) {
                    console.error("❌ [Redis] Error updating cache:", error);
                    return new Response(JSON.stringify({ error: error.message }), {
                        status: 500,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }
            }

            // === API Endpoint: Delete Redis Cache ===
            if (path === "/api/delete-redis-cache" && request.method === "POST") {
                try {
                    const body = await request.json();
                    const { domain, slug } = body;

                    if (!domain || !slug) {
                        return new Response(JSON.stringify({ error: "Missing required fields (domain, slug)" }), {
                            status: 400,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    const redis = new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN });

                    const cacheKey = `link:${domain}:${slug}`;
                    const deleted = await redis.del(cacheKey);
                    console.log(`🗑️ [Redis] Cache deleted: ${cacheKey}, result: ${deleted}`);

                    return new Response(JSON.stringify({
                        success: true,
                        message: "Redis cache deleted successfully",
                        cacheKey: cacheKey,
                        deleted: deleted > 0
                    }), {
                        status: 200,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });

                } catch (error) {
                    console.error("❌ [Redis] Error deleting cache:", error);
                    return new Response(JSON.stringify({ error: error.message }), {
                        status: 500,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }
            }

            // === CAPI Relay (receives from QStash, forwards to Meta/test endpoint, logs to capi_logs) ===
            if (path === "/api/capi-relay" && request.method === "POST") {
                try {
                    const body = await request.json();
                    const {
                        event_id,
                        event_time,
                        event_source_url,
                        destination_url,
                        short_code,
                        link_data,
                        verdict,
                        is_bot,
                        utm_source,
                        utm_medium,
                        utm_campaign,
                        user_data,
                        pixels
                    } = body;

                    if (!pixels || !Array.isArray(pixels) || pixels.length === 0) {
                        return new Response(JSON.stringify({ error: "Missing pixels array" }), {
                            status: 400,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    // Testing: send CAPI to webhook.site. Set CAPI_TEST_ENDPOINT to "off" for production (Meta).
                    const DEFAULT_CAPI_TEST_URL = "https://webhook.site/14ef81a2-b744-4e42-a508-b03e462fdf46";
                    const raw = env.CAPI_TEST_ENDPOINT;
                    const testEndpoint = (raw === "off" || raw === "false")
                        ? null
                        : (raw && String(raw).trim() ? String(raw).trim() : DEFAULT_CAPI_TEST_URL);
                    const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/capi_logs`;
                    const inserted = [];

                    // Each pixel: one CAPI request to platform, then one separate row write to Supabase (capi_logs)
                    for (const p of pixels) {
                        if (!p.platform) continue;
                        if (p.platform !== "taboola" && p.platform !== "outbrain" && !p.capi_token) continue;
                        const eventName = p.event_name || (p.event_type === "custom" ? (p.custom_event_name || "PageView") : (p.event_type || "PageView"));
                        const evId = event_id || crypto.randomUUID();
                        const evTime = event_time || Math.floor(Date.now() / 1000);

                        let platformUrl = null;
                        let requestBody = null;
                        let requestHeaders = { "Content-Type": "application/json" };

                        if (p.platform === "meta" || p.platform === "instagram") {
                            requestBody = {
                                data: [{
                                    event_name: eventName,
                                    event_time: evTime,
                                    action_source: "website",
                                    event_id: evId,
                                    user_data: {
                                        ...(user_data?.fbc && { fbc: user_data.fbc }),
                                        ...(user_data?.client_ip_address && { client_ip_address: user_data.client_ip_address }),
                                        ...(user_data?.client_user_agent && { client_user_agent: user_data.client_user_agent })
                                    },
                                    event_source_url: event_source_url || undefined
                                }],
                                access_token: p.capi_token
                            };
                            platformUrl = testEndpoint || `https://graph.facebook.com/v19.0/${p.pixel_id}/events`;
                        } else if (p.platform === "tiktok") {
                            requestBody = {
                                pixel_code: p.pixel_id,
                                event: eventName,
                                event_id: evId,
                                timestamp: new Date(evTime * 1000).toISOString(),
                                context: {
                                    ...(user_data?.ttclid && { ad: { callback: user_data.ttclid } }),
                                    user: {
                                        ip: user_data?.client_ip_address || "",
                                        user_agent: user_data?.client_user_agent || ""
                                    },
                                    page: { url: event_source_url || "" }
                                }
                            };
                            platformUrl = testEndpoint || "https://business-api.tiktok.com/open_api/v1.3/event/track/";
                            requestHeaders = { "Content-Type": "application/json", "Access-Token": p.capi_token };
                        } else if (p.platform === "google") {
                            // GA4 Measurement Protocol: measurement_id (pixel_id), api_secret (capi_token), client_id, events
                            const ga4ClientId = `${Math.floor(Math.random() * 1e10)}.${Math.floor(Date.now() / 1000)}`;
                            const destUrl = destination_url || event_source_url || "";
                            let merchantDomain = null;
                            try {
                                if (destUrl) merchantDomain = new URL(destUrl).hostname;
                            } catch {
                                // ignore malformed destination URL
                            }
                            const ga4Params = {
                                ...(user_data?.gclid && { gclid: user_data.gclid }),
                                ...(destUrl && { page_location: destUrl }),
                                page_title: "Affiliate Redirect Page",
                                source: utm_source || "google",
                                medium: utm_medium || "cpc",
                                campaign: utm_campaign || "affiliate_promo",
                                ...(user_data?.client_ip_address && { ip_override: user_data.client_ip_address }),
                                ...(user_data?.client_user_agent && { user_agent: user_data.client_user_agent }),
                                outbound: "true",
                                ...(merchantDomain && { merchant_domain: merchantDomain })
                            };
                            requestBody = {
                                client_id: ga4ClientId,
                                non_personalized_ads: false,
                                events: [{ name: eventName, params: ga4Params }]
                            };
                            platformUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(p.pixel_id)}&api_secret=${encodeURIComponent(p.capi_token)}`;
                        } else if (p.platform === "snapchat") {
                            // Snapchat CAPI: pixel_id, Bearer token, event_type, hashed_ip_address (SHA-256, IP clean + lowercase), click_id (scid), user_agent
                            const sha256Hex = async (str) => {
                                if (!str) return null;
                                const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
                                return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
                            };
                            const rawIp = (user_data?.client_ip_address || "").trim().toLowerCase();
                            const hashedIp = rawIp ? await sha256Hex(rawIp) : undefined;
                            // Snapchat requires timestamp as string (not number); success response: { status: "SUCCESS", reason: "Event received", events_received: 1 }
                            const snapchatEvent = {
                                pixel_id: p.pixel_id,
                                timestamp: String(Math.floor(Date.now() / 1000)),
                                event_conversion_type: "WEB",
                                event_type: eventName,
                                ...(hashedIp && { hashed_ip_address: hashedIp }),
                                ...(user_data?.scid && { click_id: user_data.scid }),
                                ...(user_data?.client_user_agent && { user_agent: user_data.client_user_agent })
                            };
                            requestBody = { data: [snapchatEvent] };
                            platformUrl = testEndpoint || "https://tr.snapchat.com/v2/conversion";
                            requestHeaders = { "Content-Type": "application/json", "Authorization": `Bearer ${p.capi_token}` };
                            console.log("Snapchat CAPI: HEADERS:", JSON.stringify(requestHeaders, null, 2));
                            console.log("Snapchat CAPI: JSON body:", JSON.stringify(requestBody, null, 2));
                        } else if (p.platform === "taboola") {
                            // Taboola CAPI: GET request, all data in query params. Send real visitor IP and UA via headers.
                            const itemId = user_data?.tblci || user_data?.tglid || "";
                            const baseUrl = "https://trc.taboola.com/actions-handler/log/3/s2s-action";
                            const tabParams = new URLSearchParams();
                            tabParams.set("account-id", p.pixel_id || "");
                            tabParams.set("name", eventName);
                            tabParams.set("item-id", itemId);
                            platformUrl = `${baseUrl}?${tabParams.toString()}`;
                            requestBody = { account_id: p.pixel_id, name: eventName, item_id: itemId };
                            requestHeaders = {};
                            if (user_data?.client_ip_address) requestHeaders["X-Forwarded-For"] = user_data.client_ip_address;
                            if (user_data?.client_user_agent) requestHeaders["User-Agent"] = user_data.client_user_agent;
                            console.log("Taboola CAPI: GET URL:", platformUrl);
                            console.log("Taboola CAPI: method: GET");
                            console.log("Taboola CAPI: HEADERS:", JSON.stringify(requestHeaders, null, 2));
                            console.log("Taboola CAPI: params sent (query string):", JSON.stringify(requestBody, null, 2));
                        } else if (p.platform === "outbrain") {
                            // Outbrain CAPI: GET request, all data in query params. Send real visitor IP and UA via headers.
                            const obClickId = user_data?.ob_click_id || user_data?.oglid || user_data?.dicbid || "";
                            const baseUrl = "https://trc.outbrain.com/network/trackpxl";
                            const obParams = new URLSearchParams();
                            obParams.set("ob_click_id", obClickId);
                            obParams.set("name", eventName);
                            obParams.set("p", p.pixel_id || "");
                            platformUrl = `${baseUrl}?${obParams.toString()}`;
                            requestBody = { ob_click_id: obClickId, name: eventName, p: p.pixel_id };
                            requestHeaders = {};
                            if (user_data?.client_ip_address) requestHeaders["X-Forwarded-For"] = user_data.client_ip_address;
                            if (user_data?.client_user_agent) requestHeaders["User-Agent"] = user_data.client_user_agent;
                            console.log("Outbrain CAPI: GET URL:", platformUrl);
                            console.log("Outbrain CAPI: method: GET");
                            console.log("Outbrain CAPI: HEADERS:", JSON.stringify(requestHeaders, null, 2));
                            console.log("Outbrain CAPI: params sent (query string):", JSON.stringify(requestBody, null, 2));
                        }

                        if (!platformUrl) continue;
                        if (p.platform !== "taboola" && p.platform !== "outbrain" && !requestBody) continue;

                        const logUrl = p.platform === "google" ? platformUrl.replace(/api_secret=[^&]+/, "api_secret=[REDACTED]") : platformUrl;
                        console.log("CAPI Relay: sending to URL:", logUrl);
                        console.log("CAPI Relay: headers:", JSON.stringify(requestHeaders, null, 2));
                        if (p.platform === "taboola" || p.platform === "outbrain") {
                            console.log("CAPI Relay: " + p.platform + " GET (params in query string only, no body). Params sent:", requestBody != null ? JSON.stringify(requestBody, null, 2) : "—");
                        } else {
                            const bodyJson = requestBody != null ? JSON.stringify(requestBody, null, 2) : "(GET – no body)";
                            console.log("CAPI Relay: JSON sent to platform:", bodyJson);
                        }

                        const start = Date.now();
                        let statusCode = 0;
                        let responseBody = "";
                        try {
                            const isGet = p.platform === "taboola" || p.platform === "outbrain";
                            const fetchOpts = isGet
                                ? { method: "GET", headers: requestHeaders }
                                : { method: "POST", headers: requestHeaders, body: JSON.stringify(requestBody) };
                            const platformRes = await fetch(platformUrl, fetchOpts);
                            statusCode = platformRes.status;
                            responseBody = await platformRes.text();
                        } catch (err) {
                            responseBody = err.message || "fetch failed";
                        }
                        const relayDurationMs = Date.now() - start;

                        // Log: body only. Meta token is in body (redacted); TikTok token is in HTTP header only, not in body.
                        const logRequestBody = p.platform === "meta"
                            ? { ...requestBody, access_token: requestBody.access_token ? "[REDACTED]" : undefined }
                            : { ...requestBody };

                        const logRow = {
                            pixel_id: p.pixel_id,
                            platform: p.platform,
                            event_id: event_id,
                            event_name: eventName,
                            status_code: statusCode,
                            response_body: responseBody?.slice(0, 2000) || null,
                            request_body: logRequestBody,
                            relay_duration_ms: relayDurationMs,
                            error_message: statusCode >= 200 && statusCode < 300 ? null : (responseBody?.slice(0, 500) || "non-2xx")
                        };

                        logAxiomInBackground(ctx, env, {
                            timestamp: new Date().toISOString(),
                            action: "capi_sent",
                            short_code: short_code || null,
                            original_url: event_source_url || request.url,
                            visitor_ip: user_data?.client_ip_address || null,
                            user_agent: user_data?.client_user_agent || null,
                            country: request.cf?.country || null,
                            is_bot: Boolean(is_bot),
                            latency_ms: relayDurationMs,
                            backend_event: "capi_platform_response",
                            verdict: verdict || null,
                            link_json: link_data || null,
                            capi_company: p.platform,
                            capi_pixel_id: p.pixel_id,
                            capi_target_url: logUrl,
                            capi_success: statusCode >= 200 && statusCode < 300,
                            capi_status_code: statusCode,
                            capi_response_body: responseBody?.slice(0, 2000) || null,
                            capi_request_body: logRequestBody
                        });

                        // One Supabase write per CAPI send (one row in capi_logs per pixel)
                        const insertRes = await fetch(supabaseUrl, {
                            method: "POST",
                            headers: {
                                "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                                "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                                "Content-Type": "application/json",
                                "Prefer": "return=representation"
                            },
                            body: JSON.stringify(logRow)
                        });
                        if (insertRes.ok) {
                            const data = await insertRes.json();
                            inserted.push(data[0]?.id || "ok");
                        } else {
                            const errText = await insertRes.text();
                            console.error("CAPI Relay: Supabase insert failed for pixel", p.pixel_id, p.platform, insertRes.status, errText);
                        }
                    }

                    console.log("CAPI Relay: done, inserted", inserted.length, "rows");
                    return new Response(JSON.stringify({ ok: true, logged: inserted.length }), {
                        status: 200,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                } catch (error) {
                    console.error("❌ CAPI Relay:", error);
                    return new Response(JSON.stringify({ error: error.message }), {
                        status: 500,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }
            }

            // === Custom Domain Helpers ===
            // Match the frontend display behavior: store Host/Name trimmed to the "www" level
            // Example: "_acme-challenge.www.example.com" -> "_acme-challenge.www"
            const getRootDomain = (userDomainInput) => {
                if (!userDomainInput) return "";
                const input = String(userDomainInput).trim().toLowerCase().replace(/\.$/, "");
                const parts = input.split(".");

                const complexTlds = [
                    // Israel
                    "co.il", "org.il", "net.il", "ac.il", "gov.il", "muni.il", "k12.il",
                    // UK
                    "co.uk", "org.uk", "me.uk", "net.uk", "ac.uk", "gov.uk",
                    // AU
                    "com.au", "net.au", "org.au", "edu.au", "gov.au",
                ];

                const isComplexTld = complexTlds.some((tld) => input.endsWith(`.${tld}`) || input === tld);
                return parts.slice(isComplexTld ? -3 : -2).join(".");
            };

            const extractDnsHost = (fullCfhName, userDomainInput) => {
                if (!fullCfhName || !userDomainInput) return "";
                const full = String(fullCfhName).trim().replace(/\.$/, "");
                const rootDomain = getRootDomain(userDomainInput);
                if (!rootDomain) return full;
                const suffixToRemove = `.${rootDomain}`;
                if (full.endsWith(suffixToRemove)) {
                    return full.slice(0, -suffixToRemove.length);
                }
                return full;
            };

            const getSubdomainLabel = (domainName) => {
                if (!domainName) return "@";
                const input = String(domainName).trim().toLowerCase().replace(/\.$/, "");
                const parts = input.split(".");
                return parts.length > 2 ? parts[0] : "@";
            };

            const mapCustomDomainStatusForDb = (cfStatus, isActive = false) => {
                if (isActive) return "active";
                const normalized = String(cfStatus || "").toLowerCase();
                if (normalized.includes("error") || normalized.includes("fail")) return "error";
                if (normalized === "deleted") return "deleted";
                return "pending";
            };

            const normalizeCustomHostnameInput = (value) => {
                if (!value) return "";
                return String(value)
                    .trim()
                    .toLowerCase()
                    .replace(/^https?:\/\//, "")
                    .split("/")[0]
                    .split("?")[0]
                    .split("#")[0]
                    .replace(/:\d+$/, "")
                    .replace(/\.$/, "");
            };

            const getHostnameVariants = (inputHostname) => {
                const normalized = normalizeCustomHostnameInput(inputHostname);
                if (!normalized) return [];
                const apex = normalized.startsWith("www.") ? normalized.slice(4) : normalized;
                const withWww = apex.startsWith("www.") ? apex : `www.${apex}`;
                return Array.from(new Set([apex, withWww]));
            };

            const buildDnsRecordsFromHostnameData = (hostnameData) => {
                if (!hostnameData?.hostname) return [];
                const records = [];
                if (hostnameData.ownership_verification) {
                    records.push({
                        type: hostnameData.ownership_verification.type || "TXT",
                        host: extractDnsHost(hostnameData.ownership_verification.name, hostnameData.hostname),
                        value: hostnameData.ownership_verification.value
                    });
                }
                if (hostnameData.ssl?.validation_records && Array.isArray(hostnameData.ssl.validation_records)) {
                    hostnameData.ssl.validation_records.forEach((record) => {
                        records.push({
                            type: "TXT",
                            host: extractDnsHost(record.txt_name, hostnameData.hostname),
                            value: record.txt_value
                        });
                    });
                }
                records.push({
                    type: "CNAME",
                    host: getSubdomainLabel(hostnameData.hostname),
                    value: "glynk.to"
                });
                return records;
            };

            const dedupeDnsRecords = (records) => {
                const seen = new Set();
                return (records || []).filter((record) => {
                    const key = `${record?.type || ""}|${record?.host || ""}|${record?.value || ""}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
            };

            const fetchCustomHostnameById = async (hostnameId) => {
                if (!hostnameId) return null;
                const cfResponse = await fetch(
                    `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames/${hostnameId}`,
                    {
                        method: "GET",
                        headers: {
                            "Authorization": `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
                            "Content-Type": "application/json"
                        }
                    }
                );
                const cfResult = await cfResponse.json().catch(() => ({}));
                if (!cfResponse.ok || !cfResult?.success) return null;
                return cfResult.result || null;
            };

            const fetchCustomHostnameByHostname = async (hostname) => {
                const target = normalizeCustomHostnameInput(hostname);
                if (!target) return null;
                const listUrl = `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames?hostname=${encodeURIComponent(target)}`;
                const cfResponse = await fetch(listUrl, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
                        "Content-Type": "application/json"
                    }
                });
                const cfResult = await cfResponse.json().catch(() => ({}));
                if (!cfResponse.ok || !cfResult?.success) return null;
                const list = Array.isArray(cfResult.result) ? cfResult.result : [];
                return (
                    list.find((item) => normalizeCustomHostnameInput(item?.hostname) === target) ||
                    list[0] ||
                    null
                );
            };

            const fetchCustomDomainById = async (domainId) => {
                if (!domainId) return null;
                const url = `${env.SUPABASE_URL}/rest/v1/custom_domains?id=eq.${encodeURIComponent(domainId)}&select=id,domain,cloudflare_hostname_id,dns_records&limit=1`;
                const response = await fetch(url, {
                    headers: {
                        "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                        "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                        "Content-Type": "application/json"
                    }
                });
                if (!response.ok) return null;
                const rows = await response.json().catch(() => []);
                return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
            };

            const fetchCustomDomainByHostnameId = async (hostnameId) => {
                if (!hostnameId) return null;
                const url = `${env.SUPABASE_URL}/rest/v1/custom_domains?cloudflare_hostname_id=eq.${encodeURIComponent(hostnameId)}&select=id,domain,cloudflare_hostname_id,dns_records&limit=1`;
                const response = await fetch(url, {
                    headers: {
                        "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                        "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                        "Content-Type": "application/json"
                    }
                });
                if (!response.ok) return null;
                const rows = await response.json().catch(() => []);
                return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
            };

            const mergeDnsRecordsPreservingExisting = (existingRecords, newRecords) => {
                const existing = Array.isArray(existingRecords) ? existingRecords : [];
                const incoming = Array.isArray(newRecords) ? newRecords : [];
                return dedupeDnsRecords([...existing, ...incoming]);
            };

            // === API Endpoint: Add Custom Domain ===
            if (path === "/api/add-custom-domain" && request.method === "POST") {
                const customDomainReqStart = Date.now();
                try {
                    const body = await request.json();
                    const { domain, user_id, root_redirect } = body;

                    if (!domain || !user_id) {
                        return new Response(JSON.stringify({ error: "Missing required fields (domain, user_id)" }), {
                            status: 400,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    if (!env.CLOUDFLARE_ZONE_ID || !env.CLOUDFLARE_API_TOKEN) {
                        return new Response(JSON.stringify({ error: "Cloudflare credentials not configured" }), {
                            status: 500,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    const normalizedInputDomain = normalizeCustomHostnameInput(domain);
                    const hostnameVariants = getHostnameVariants(normalizedInputDomain);
                    if (hostnameVariants.length < 2) {
                        return new Response(JSON.stringify({
                            success: false,
                            error: "Invalid custom domain"
                        }), {
                            status: 400,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    const createOneHostname = async (hostname) => {
                        const cfResponse = await fetch(
                            `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames`,
                            {
                                method: "POST",
                                headers: {
                                    "Authorization": `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    hostname,
                                    ssl: {
                                        method: "txt",
                                        type: "dv",
                                        settings: {
                                            min_tls_version: "1.2"
                                        }
                                    }
                                })
                            }
                        );
                        const cfResult = await cfResponse.json().catch(() => ({}));
                        if (!cfResponse.ok || !cfResult.success) {
                            const cfErrorMessage = cfResult?.errors?.[0]?.message || "Failed to create custom hostname";
                            if (/already exists/i.test(cfErrorMessage)) {
                                const existing = await fetchCustomHostnameByHostname(hostname);
                                if (existing) return existing;
                            }
                            throw new Error(`${hostname}: ${cfErrorMessage}`);
                        }
                        return cfResult.result;
                    };

                    const createdHostnames = [];
                    for (const hostname of hostnameVariants) {
                        const created = await createOneHostname(hostname);
                        createdHostnames.push(created);
                    }

                    const primaryHostnameData =
                        createdHostnames.find(
                            (item) => normalizeCustomHostnameInput(item?.hostname) === normalizedInputDomain
                        ) || createdHostnames[0];

                    let mergedDnsRecords = dedupeDnsRecords(
                        createdHostnames.flatMap((item) => buildDnsRecordsFromHostnameData(item))
                    );

                    // Wait up to 60 seconds until all 6 DNS records are available.
                    if (mergedDnsRecords.length < 6) {
                        const waitDeadline = Date.now() + 60000;
                        while (Date.now() < waitDeadline) {
                            const refreshed = [];
                            for (const item of createdHostnames) {
                                const latest = await fetchCustomHostnameById(item?.id);
                                refreshed.push(latest || item);
                            }
                            mergedDnsRecords = dedupeDnsRecords(
                                refreshed.flatMap((item) => buildDnsRecordsFromHostnameData(item))
                            );
                            if (mergedDnsRecords.length >= 6) break;
                            await new Promise((resolve) => setTimeout(resolve, 3000));
                        }
                    }

                    // Save to Supabase
                    const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/custom_domains`;
                    const supabaseResponse = await fetch(supabaseUrl, {
                        method: "POST",
                        headers: {
                            "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                            "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                            "Content-Type": "application/json",
                            "Prefer": "return=representation"
                        },
                        body: JSON.stringify({
                            user_id: user_id,
                            domain: normalizedInputDomain,
                            cloudflare_hostname_id: primaryHostnameData?.id || null,
                            dns_records: mergedDnsRecords,
                            root_redirect: root_redirect || null,
                            status: "pending"
                        })
                    });

                    const supabaseData = await supabaseResponse.json();

                    if (!supabaseResponse.ok) {
                        console.error("Supabase error:", supabaseData);
                        logAxiomInBackground(ctx, env, {
                            action: "custom_domain_create",
                            backend_event: "custom_domain_create_failed_db",
                            result: "failed",
                            reason: "supabase_insert_failed",
                            user_id,
                            company: "supabase",
                            original_url: request.url,
                            visitor_ip: request.headers.get("cf-connecting-ip") || null,
                            user_agent: request.headers.get("user-agent") || null,
                            country: request.cf?.country || null,
                            is_bot: false,
                            latency_ms: Date.now() - customDomainReqStart,
                            custom_domain_payload: { domain: normalizedInputDomain, root_redirect },
                            cloudflare_result: createdHostnames,
                            supabase_response: supabaseData
                        });
                        return new Response(JSON.stringify({
                            success: false,
                            error: "Failed to save domain to database"
                        }), {
                            status: 500,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    logAxiomInBackground(ctx, env, {
                        action: "custom_domain_create",
                        backend_event: "custom_domain_created",
                        result: "success",
                        reason: "created",
                        user_id,
                        company: "cloudflare",
                        original_url: request.url,
                        visitor_ip: request.headers.get("cf-connecting-ip") || null,
                        user_agent: request.headers.get("user-agent") || null,
                        country: request.cf?.country || null,
                        is_bot: false,
                        latency_ms: Date.now() - customDomainReqStart,
                        custom_domain_payload: { domain: normalizedInputDomain, root_redirect },
                        custom_domain_result: {
                            domain_id: supabaseData[0]?.id,
                            cloudflare_hostname_id: primaryHostnameData?.id || null,
                            dns_records: mergedDnsRecords
                        }
                    });

                    return new Response(JSON.stringify({
                        success: true,
                        domain_id: supabaseData[0]?.id,
                        cloudflare_hostname_id: primaryHostnameData?.id || null,
                        dns_records: mergedDnsRecords
                    }), {
                        status: 200,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });

                } catch (error) {
                    console.error("❌ [Custom Domain] Error:", error);
                    logAxiomInBackground(ctx, env, {
                        action: "custom_domain_create",
                        backend_event: "custom_domain_create_exception",
                        result: "failed",
                        reason: error?.message || "exception",
                        original_url: request.url,
                        visitor_ip: request.headers.get("cf-connecting-ip") || null,
                        user_agent: request.headers.get("user-agent") || null,
                        country: request.cf?.country || null,
                        is_bot: false,
                        latency_ms: Date.now() - customDomainReqStart
                    });
                    return new Response(JSON.stringify({ success: false, error: error.message }), {
                        status: 500,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }
            }

            // === API Endpoint: Verify Custom Domain ===
            if (path === "/api/verify-custom-domain" && request.method === "POST") {
                try {
                    const body = await request.json();
                    const { domain_id, cloudflare_hostname_id } = body;

                    if (!domain_id && !cloudflare_hostname_id) {
                        return new Response(JSON.stringify({ error: "Missing domain_id or cloudflare_hostname_id" }), {
                            status: 400,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    if (!env.CLOUDFLARE_ZONE_ID || !env.CLOUDFLARE_API_TOKEN) {
                        return new Response(JSON.stringify({ error: "Cloudflare credentials not configured" }), {
                            status: 500,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    let resolvedDomain = null;
                    let fallbackHostnameId = cloudflare_hostname_id || null;
                    let domainRow = null;
                    if (domain_id) {
                        domainRow = await fetchCustomDomainById(domain_id);
                        if (domainRow?.domain) resolvedDomain = domainRow.domain;
                        if (!fallbackHostnameId && domainRow?.cloudflare_hostname_id) {
                            fallbackHostnameId = domainRow.cloudflare_hostname_id;
                        }
                    }
                    if (!domainRow && fallbackHostnameId) {
                        domainRow = await fetchCustomDomainByHostnameId(fallbackHostnameId);
                    }
                    if (!resolvedDomain && fallbackHostnameId) {
                        const fallbackHostnameData = await fetchCustomHostnameById(fallbackHostnameId);
                        resolvedDomain = fallbackHostnameData?.hostname || null;
                    }

                    const hostnameVariants = getHostnameVariants(resolvedDomain);
                    if (hostnameVariants.length === 0) {
                        return new Response(JSON.stringify({
                            success: false,
                            error: "Failed to resolve domain hostnames for verification"
                        }), {
                            status: 400,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    const hostnameDatas = [];
                    for (const hostname of hostnameVariants) {
                        const data = await fetchCustomHostnameByHostname(hostname);
                        if (data) hostnameDatas.push(data);
                    }
                    if (hostnameDatas.length === 0 && fallbackHostnameId) {
                        const fallbackData = await fetchCustomHostnameById(fallbackHostnameId);
                        if (fallbackData) hostnameDatas.push(fallbackData);
                    }
                    if (hostnameDatas.length === 0) {
                        return new Response(JSON.stringify({
                            success: false,
                            error: "Failed to verify domain"
                        }), {
                            status: 400,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    const dnsRecords = dedupeDnsRecords(
                        hostnameDatas.flatMap((item) => buildDnsRecordsFromHostnameData(item))
                    );
                    const mergedDnsRecords = mergeDnsRecordsPreservingExisting(
                        domainRow?.dns_records,
                        dnsRecords
                    );
                    const allActive =
                        hostnameDatas.length === hostnameVariants.length &&
                        hostnameDatas.every((item) => String(item?.status || "").toLowerCase() === "active");
                    const anyError = hostnameDatas.some((item) =>
                        String(item?.status || "").toLowerCase().includes("error")
                    );
                    const mergedStatus = allActive ? "active" : anyError ? "error" : "pending";
                    const sslStatus = hostnameDatas
                        .map((item) => `${item.hostname}: ${item.ssl?.status || "pending"}`)
                        .join(" | ");

                    // Update Supabase
                    if (domain_id || cloudflare_hostname_id) {
                        const dbStatus = mapCustomDomainStatusForDb(mergedStatus, allActive);
                        const updateData = {
                            dns_records: mergedDnsRecords,
                            status: dbStatus,
                            // If it just became active, update status and verified_at
                            ...(allActive ? { status: "active", verified_at: new Date().toISOString() } : {})
                        };

                        const filter = domain_id
                            ? `id=eq.${encodeURIComponent(domain_id)}`
                            : `cloudflare_hostname_id=eq.${encodeURIComponent(cloudflare_hostname_id)}`;
                        const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/custom_domains?${filter}`;
                        const supabaseUpdateResponse = await fetch(supabaseUrl, {
                            method: "PATCH",
                            headers: {
                                "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                                "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                                "Content-Type": "application/json",
                                "Prefer": "return=representation"
                            },
                            body: JSON.stringify(updateData)
                        });

                        if (!supabaseUpdateResponse.ok) {
                            const updateError = await supabaseUpdateResponse.json().catch(() => null);
                            console.error("⚠️ Failed to persist dns_records on verify:", {
                                status: supabaseUpdateResponse.status,
                                data: updateError,
                                domain_id,
                                cloudflare_hostname_id
                            });
                        } else {
                            const updateResult = await supabaseUpdateResponse.json().catch(() => null);
                            const updatedRows = Array.isArray(updateResult) ? updateResult.length : 0;
                            console.log(`✅ verify-custom-domain persisted dns_records (rows: ${updatedRows})`);
                        }
                    }

                    return new Response(JSON.stringify({
                        success: true,
                        is_active: allActive,
                        ssl_status: sslStatus,
                        status: mergedStatus,
                        dns_records: mergedDnsRecords
                    }), {
                        status: 200,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });

                } catch (error) {
                    console.error("❌ [Verify Domain] Error:", error);
                    return new Response(JSON.stringify({ success: false, error: error.message }), {
                        status: 500,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }
            }

            // === API Endpoint: Get Domain Records ===
            if (path === "/api/get-domain-records" && request.method === "POST") {
                try {
                    const body = await request.json();
                    const { cloudflare_hostname_id, domain_id } = body;

                    if (!domain_id && !cloudflare_hostname_id) {
                        return new Response(JSON.stringify({ error: "Missing domain_id or cloudflare_hostname_id" }), {
                            status: 400,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    if (!env.CLOUDFLARE_ZONE_ID || !env.CLOUDFLARE_API_TOKEN) {
                        return new Response(JSON.stringify({ error: "Cloudflare credentials not configured" }), {
                            status: 500,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    let resolvedDomain = null;
                    let fallbackHostnameId = cloudflare_hostname_id || null;
                    let domainRow = null;
                    if (domain_id) {
                        domainRow = await fetchCustomDomainById(domain_id);
                        if (domainRow?.domain) resolvedDomain = domainRow.domain;
                        if (!fallbackHostnameId && domainRow?.cloudflare_hostname_id) {
                            fallbackHostnameId = domainRow.cloudflare_hostname_id;
                        }
                    }
                    if (!domainRow && fallbackHostnameId) {
                        domainRow = await fetchCustomDomainByHostnameId(fallbackHostnameId);
                    }
                    if (!resolvedDomain && fallbackHostnameId) {
                        const fallbackHostnameData = await fetchCustomHostnameById(fallbackHostnameId);
                        resolvedDomain = fallbackHostnameData?.hostname || null;
                    }

                    const hostnameVariants = getHostnameVariants(resolvedDomain);
                    if (hostnameVariants.length === 0) {
                        return new Response(JSON.stringify({
                            success: false,
                            error: "Failed to resolve domain hostnames"
                        }), {
                            status: 400,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    const hostnameDatas = [];
                    for (const hostname of hostnameVariants) {
                        const data = await fetchCustomHostnameByHostname(hostname);
                        if (data) hostnameDatas.push(data);
                    }
                    if (hostnameDatas.length === 0 && fallbackHostnameId) {
                        const fallbackData = await fetchCustomHostnameById(fallbackHostnameId);
                        if (fallbackData) hostnameDatas.push(fallbackData);
                    }
                    if (hostnameDatas.length === 0) {
                        return new Response(JSON.stringify({
                            success: false,
                            error: "Failed to get domain records"
                        }), {
                            status: 400,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    const dnsRecords = dedupeDnsRecords(
                        hostnameDatas.flatMap((item) => buildDnsRecordsFromHostnameData(item))
                    );
                    const mergedDnsRecords = mergeDnsRecordsPreservingExisting(
                        domainRow?.dns_records,
                        dnsRecords
                    );

                    // Update dns_records in Supabase (persist complete records set)
                    try {
                        const filter = domain_id
                            ? `id=eq.${encodeURIComponent(domain_id)}`
                            : `cloudflare_hostname_id=eq.${encodeURIComponent(cloudflare_hostname_id)}`;

                        const updateUrl = `${env.SUPABASE_URL}/rest/v1/custom_domains?${filter}`;

                        const supabaseUpdateResponse = await fetch(updateUrl, {
                            method: "PATCH",
                            headers: {
                                "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                                "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                                "Content-Type": "application/json",
                                "Prefer": "return=representation"
                            },
                            body: JSON.stringify({
                                dns_records: mergedDnsRecords
                            })
                        });

                        const supabaseUpdateData = await supabaseUpdateResponse.json().catch(() => null);

                        if (!supabaseUpdateResponse.ok) {
                            console.error("⚠️ Failed to update DNS records in Supabase:", {
                                status: supabaseUpdateResponse.status,
                                data: supabaseUpdateData
                            });
                        } else {
                            // Helpful debug: confirm we updated at least 1 row
                            const updatedCount = Array.isArray(supabaseUpdateData) ? supabaseUpdateData.length : 0;
                            console.log(`✅ DNS records updated in Supabase (rows: ${updatedCount})`);
                        }
                    } catch (updateError) {
                        console.error("⚠️ Failed to update DNS records in Supabase (exception):", updateError);
                        // Continue anyway - still return records to the UI
                    }

                    return new Response(JSON.stringify({
                        success: true,
                        dns_records: mergedDnsRecords
                    }), {
                        status: 200,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });

                } catch (error) {
                    console.error("❌ [Get Domain Records] Error:", error);
                    return new Response(JSON.stringify({ success: false, error: error.message }), {
                        status: 500,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }
            }

            const userAgent = request.headers.get("user-agent") || "";
            const rayId = request.headers.get("cf-ray") || crypto.randomUUID();
            const ip = request.headers.get("cf-connecting-ip");
            const country = request.cf?.country || null;
            const queueAxiomLog = (action, shortCode = null, isBot = false, extra = {}) => {
                logAxiomInBackground(ctx, env, {
                    timestamp: new Date().toISOString(),
                    action,
                    short_code: shortCode,
                    original_url: request.url,
                    visitor_ip: ip || null,
                    user_agent: userAgent || null,
                    country,
                    is_bot: Boolean(isBot),
                    latency_ms: Date.now() - requestStartMs,
                    ...extra
                });
            };

            // 1. Noise/Sensitive paths filter: silent skip without any logs or DB writes
            const blockedPathTokens = [
                "/favicon.ico",
                "/robots.txt",
                "/sitemap.xml",
                "/ads.txt",
                "/.env",
                "/.aws",
                "/.git",
                "/.vscode",
                "/.ds_store",
                "/wp-admin",
                "/wp-login.php",
                "/xmlrpc.php",
                "/phpmyadmin",
                "/admin",
                "/backend",
                "/apple-touch-icon"
            ];
            const slugCandidate = path.split("?")[0].replace(/^\/+|\/+$/g, "");
            const blockedSlugTokens = [
                ".php",
                ".xml",
                "wp-includes",
                "favicon",
                ".js",
                "feed",
                "api",
                "wp-json",
                "magento_version",
                ".css",
                ".env",
                ".aws"
            ];
            const isBlockedPath = blockedPathTokens.some((token) => path.includes(token));
            const hasBlockedSlugToken = blockedSlugTokens.some((token) => slugCandidate.includes(token));
            const hasInvalidSlugChars = slugCandidate.length > 0 && /[^a-z0-9-]/.test(slugCandidate);
            const isGlynlRootWithoutSlug = domain === "glynk.to" && (path === "/" || slugCandidate === "");
            if (isGlynlRootWithoutSlug) {
                return new Response(getGlynk404Page(), {
                    status: 404,
                    headers: { "Content-Type": "text/html;charset=UTF-8" }
                });
            }
            if (
                isBlockedPath ||
                hasBlockedSlugToken ||
                hasInvalidSlugChars ||
                /uptimerobot|pingdom/i.test(userAgent)
            ) {
                return new Response(null, { status: 204 });
            }

            queueAxiomLog("request_received", null, false, {
                backend_event: "request_received",
                request_method: request.method,
                request_path: path,
                request_domain: domain,
                ray_id: rayId,
                visitor_context: {
                    city: request.cf?.city || null,
                    region: request.cf?.region || null,
                    timezone: request.cf?.timezone || null,
                    asn: request.cf?.asn || null,
                    colo: request.cf?.colo || null
                },
                bot_context: {
                    score: request.cf?.botManagement?.score ?? null,
                    verified_bot: request.cf?.verifiedBot ?? false
                }
            });

            if (path === '/') {
                // For active custom domains, root path should either redirect to root_redirect or show branded 404.
                if (domain !== 'glynk.to') {
                    const customDomainCfg = await getCustomDomainConfig(env, domain);
                    if (customDomainCfg.exists) {
                        const rootRedirectUrl = ensureValidUrl(customDomainCfg.rootRedirect);
                        if (rootRedirectUrl) {
                            queueAxiomLog("redirect", null, false, {
                                redirect_target_url: rootRedirectUrl,
                                redirect_reason: "custom_domain_root_redirect",
                                backend_event: "custom_domain_root_redirect"
                            });
                            return Response.redirect(rootRedirectUrl, 302);
                        }
                        queueAxiomLog("invalid_request", null, false, {
                            invalid_reason: "custom_domain_missing_root_redirect",
                            backend_event: "custom_domain_root_not_configured"
                        });
                        return new Response(getGlynk404Page(), {
                            status: 404,
                            headers: { "Content-Type": "text/html;charset=UTF-8" }
                        });
                    }
                }
                queueAxiomLog("invalid_request", null, false, {
                    invalid_reason: "root_without_slug",
                    backend_event: "root_path_without_slug"
                });
                return new Response(getGlynk404Page(), {
                    status: 404,
                    headers: { "Content-Type": "text/html;charset=UTF-8" }
                });
            }

            // Clean leading and trailing slashes to prevent routing errors
            const slug = path.split('?')[0].replace(/^\/+|\/+$/g, '');

            const redis = new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN });

            const htmlResponse = (html, status = 404) => new Response(html, {
                status, headers: { "Content-Type": "text/html;charset=UTF-8" }
            });

            // Terminate with log to Supabase - redirects to fallback_url if available
            const terminateWithLog = (verdict, linkData = null) => {
                const clickRecord = buildClickRecord(request, rayId, ip, slug, domain, userAgent, verdict, linkData);
                ctx.waitUntil(logClickToSupabase(env, clickRecord, redis));
                const isBotVerdict = verdict === "blacklisted" || verdict.startsWith("bot_");
                queueAxiomLog(isBotVerdict ? "bot_blocked" : "invalid_request", slug || null, isBotVerdict, {
                    verdict,
                    backend_event: "terminate_with_log",
                    link_json: linkData || null,
                    click_record: clickRecord
                });

                // If linkData has fallback_url, redirect there instead of showing 404
                if (linkData?.fallback_url) {
                    const fallbackUrl = ensureValidUrl(linkData.fallback_url);
                    if (fallbackUrl) {
                        console.log(`🔀 Redirecting to fallback URL: ${fallbackUrl} (reason: ${verdict})`);
                        queueAxiomLog("redirect", slug || null, false, {
                            redirect_target_url: fallbackUrl,
                            redirect_reason: `fallback_for_${verdict}`,
                            verdict,
                            link_json: linkData || null
                        });
                        return Response.redirect(fallbackUrl, 302);
                    }
                }

                return htmlResponse(getGlynk404Page());
            };

            // 2. Slug Validation
            if (!slug || slug.includes('.')) return terminateWithLog(slug ? 'invalid_slug' : 'home_page_access');

            const isValidSlug = /^[a-z0-9-]+$/.test(slug);
            if (!isValidSlug) {
                console.log(`🚫 Invalid slug format: "${slug}"`);
                return terminateWithLog('invalid_slug_format');
            }

            // 3. Fetch link data from Redis/Supabase
            let linkData = await redis.get(`link:${domain}:${slug}`);
            if (!linkData) {
                const sbRes = await fetch(`${env.SUPABASE_URL}/rest/v1/links?slug=eq.${slug}&domain=eq.${domain}&select=*`, {
                    headers: { 'apikey': env.SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }
                });
                const data = await sbRes.json();
                linkData = data?.[0];
                if (linkData) ctx.waitUntil(redis.set(`link:${domain}:${slug}`, JSON.stringify(linkData), { ex: 3600 }));
            }

            if (!linkData) return terminateWithLog('link_not_found');
            if (linkData.status !== 'active') return terminateWithLog('link_inactive', linkData);

            // 4. Blacklist Check
            const isBlacklisted = await redis.get(`blacklist:${ip}`);
            if (isBlacklisted) {
                console.log(`🚫 IP Blacklisted: ${ip} → ${domain}/${slug}`);
                return terminateWithLog('blacklisted', linkData);
            }

            // 5. Bot Analysis
            const botScore = request.cf?.botManagement?.score || 100;
            const isVerifiedBot = request.cf?.verifiedBot || false;
            const isBotUA = /bot|crawler|spider|googlebot/i.test(userAgent);
            const isImpersonator = isBotUA && !isVerifiedBot;
            const isBot = botScore <= 29 || isVerifiedBot || isImpersonator;

            let targetUrl = ensureValidUrl(linkData.target_url);
            let verdict = "clean";
            let shouldBlock = false;

            // bot_action: "block" | "redirect" | "no-tracking" (default: "block")
            const botAction = linkData.bot_action || "block";

            if (isBot) {
                verdict = isImpersonator ? "bot_impersonator" : (botScore <= 10 ? "bot_certain" : "bot_likely");

                // Add to Blacklist only for certain bots or impersonators
                if (botScore <= 20 || isImpersonator) {
                    ctx.waitUntil(redis.set(`blacklist:${ip}`, "1", { ex: 86400 }));
                }

                // Handle based on bot_action
                if (botAction === "block") {
                    // Full block - 404
                    shouldBlock = true;
                } else if (botAction === "redirect") {
                    // Redirect to fallback URL if exists, otherwise to regular target
                    const fallback = ensureValidUrl(linkData.fallback_url);
                    if (fallback) targetUrl = fallback;
                    // If no fallback, continue to regular target
                }
                // If botAction === "no-tracking" - continue to regular target (already set)

                console.log(`🤖 Bot detected: ${verdict}, action: ${botAction}, target: ${targetUrl}`);
            } else if (botScore <= 59) {
                verdict = "suspicious";
            }

            // 6. Send log to Supabase
            const clickRecord = buildClickRecord(request, rayId, ip, slug, domain, userAgent, verdict, linkData);
            ctx.waitUntil(logClickToSupabase(env, clickRecord, redis));

            // If blocked, redirect to fallback_url if exists, otherwise 404
            if (shouldBlock) {
                if (linkData?.fallback_url) {
                    const fallbackUrl = ensureValidUrl(linkData.fallback_url);
                    if (fallbackUrl) {
                        console.log(`🔀 Bot blocked, redirecting to fallback URL: ${fallbackUrl}`);
                        queueAxiomLog("bot_blocked", slug || null, true, {
                            verdict,
                            bot_action: botAction,
                            redirect_target_url: fallbackUrl,
                            redirect_reason: "bot_fallback_redirect",
                            link_json: linkData || null,
                            bot_context: {
                                score: botScore,
                                verified_bot: isVerifiedBot,
                                impersonator: isImpersonator
                            }
                        });
                        return Response.redirect(fallbackUrl, 302);
                    }
                }
                queueAxiomLog("bot_blocked", slug || null, true, {
                    verdict,
                    bot_action: botAction,
                    redirect_target_url: null,
                    redirect_reason: "bot_blocked_no_fallback",
                    link_json: linkData || null,
                    bot_context: {
                        score: botScore,
                        verified_bot: isVerifiedBot,
                        impersonator: isImpersonator
                    }
                });
                return htmlResponse(getGlynk404Page());
            }

            // 7. Parse linkData (Redis may return string)
            if (typeof linkData === "string") {
                try {
                    linkData = JSON.parse(linkData);
                } catch {
                    linkData = {};
                }
            }

            const finalRedirectUrl = buildSafeUrl(targetUrl, url.searchParams);
            const planType = (linkData?.plan_type || "").toLowerCase();
            const pixels = Array.isArray(linkData?.pixels) ? linkData.pixels : [];
            const trackingMode = linkData?.tracking_mode || "pixel";

            const isPro = planType === "pro";
            const wantsCapi = trackingMode === "capi" || trackingMode === "pixel_and_capi";
            const wantsPixel = trackingMode === "pixel" || trackingMode === "pixel_and_capi";
            const capiPixels = pixels.filter((p) => p?.status === "active" && (p?.capi_token || p?.platform === "taboola" || p?.platform === "outbrain"));

            if (isPro && (pixels.length > 0 || capiPixels.length > 0)) {
                const eventId = crypto.randomUUID();
                const eventTime = Math.floor(Date.now() / 1000);
                const eventSourceUrl = request.url || `${url.origin}${url.pathname}${url.search}`;
                const clickIds = getClickIdsFromUrl(url.searchParams);
                const platformsFromUrl = getPlatformsFromClickIds(clickIds, request, url.searchParams);
                // Send CAPI only to platforms found in URL. If one param → one (or two for meta); if multiple params → send to all. Within each platform, send to every CAPI (e.g. 3 Facebook pixels).
                const capiPixelsToSend = capiPixels.filter((p) => platformsFromUrl.has(p.platform));
                if (capiPixels.length && !capiPixelsToSend.length) {
                    console.log("CAPI: no matching click ID in URL for link pixels (URL platforms:", [...platformsFromUrl].join(",") || "none", ")");
                } else if (capiPixelsToSend.length) {
                    const byPlatform = capiPixelsToSend.reduce((acc, p) => { acc[p.platform] = (acc[p.platform] || 0) + 1; return acc; }, {});
                    console.log("CAPI: sending to", capiPixelsToSend.length, "pixel(s), platforms:", JSON.stringify(byPlatform));
                }

                // fbc format: fb.1.[CreationTime in ms].[fbclid from URL]. Only when fbclid exists (do not invent).
                const userData = {
                    client_ip_address: ip,
                    client_user_agent: userAgent,
                    ...(clickIds.fbclid && { fbc: `fb.1.${Date.now()}.${clickIds.fbclid}` }),
                    ...(clickIds.ttclid && { ttclid: clickIds.ttclid }),
                    ...(clickIds.gclid && { gclid: clickIds.gclid }),
                    ...(clickIds.wbraid && { wbraid: clickIds.wbraid }),
                    ...(clickIds.gbraid && { gbraid: clickIds.gbraid }),
                    ...(clickIds.scid && { scid: clickIds.scid }),
                    ...(clickIds.dicbid && { dicbid: clickIds.dicbid }),
                    ...((clickIds.oglid || clickIds.dicbid) && { ob_click_id: clickIds.oglid || clickIds.dicbid }),
                    ...(clickIds.oglid && { oglid: clickIds.oglid }),
                    ...(clickIds.tblci && { tblci: clickIds.tblci }),
                    ...(clickIds.tglid && { tglid: clickIds.tglid })
                };

                if (wantsCapi && capiPixelsToSend.length > 0 && env.CAPI_RELAY_URL) {
                    const relayUrl = env.CAPI_RELAY_URL.startsWith("http")
                        ? env.CAPI_RELAY_URL
                        : `https://${url.host}${env.CAPI_RELAY_URL}`;
                    const capiPayload = {
                        event_id: eventId,
                        event_time: eventTime,
                        event_source_url: eventSourceUrl,
                        destination_url: finalRedirectUrl,
                        short_code: slug || null,
                        link_data: linkData || null,
                        verdict,
                        is_bot: isBot,
                        utm_source: url.searchParams.get("utm_source") || undefined,
                        utm_medium: url.searchParams.get("utm_medium") || undefined,
                        utm_campaign: url.searchParams.get("utm_campaign") || undefined,
                        user_data: userData,
                        pixels: capiPixelsToSend.map((p) => ({
                            pixel_id: p.pixel_id,
                            capi_token: p.capi_token,
                            event_name: p.event_type === "custom" ? (p.custom_event_name || "PageView") : (p.event_type || "PageView"),
                            platform: p.platform,
                            event_type: p.event_type,
                            custom_event_name: p.custom_event_name
                        }))
                    };
                    const capiPayloadJson = JSON.stringify(capiPayload, null, 2);
                    console.log("CAPI: JSON sent to QStash:", capiPayloadJson);
                    queueAxiomLog("capi_sent", slug || null, isBot, {
                        backend_event: "capi_queued_to_qstash",
                        capi_companies: [...new Set(capiPixelsToSend.map((p) => p.platform))],
                        capi_pixels_count: capiPixelsToSend.length,
                        capi_payload: capiPayload
                    });
                    ctx.waitUntil(sendCapiToQStash(env, relayUrl, capiPayload));
                }

                if (wantsPixel && pixels.length > 0) {
                    const bridgePixels = pixels.filter((p) => p?.status === "active");
                    return htmlResponse(
                        getBridgePageHtml({
                            targetUrl: finalRedirectUrl,
                            eventId,
                            eventTime,
                            pixels: bridgePixels,
                            delayMs: 1500
                        }),
                        200
                    );
                }

                if (wantsCapi && capiPixelsToSend.length > 0) {
                    queueAxiomLog("redirect", slug || null, isBot, {
                        redirect_target_url: finalRedirectUrl,
                        redirect_reason: "post_capi_redirect",
                        link_json: linkData || null,
                        verdict
                    });
                    return Response.redirect(finalRedirectUrl, 302);
                }
            }

            // 8. Default redirect
            queueAxiomLog("redirect", slug || null, isBot, {
                redirect_target_url: finalRedirectUrl,
                redirect_reason: "default_redirect",
                link_json: linkData || null,
                verdict
            });
            return Response.redirect(finalRedirectUrl, 302);
        }
    }
);

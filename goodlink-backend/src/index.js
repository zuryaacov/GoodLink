import { Redis } from "@upstash/redis/cloudflare";
import * as Sentry from "@sentry/cloudflare";
import { logAxiomInBackground } from "./services/axiomLogger";

// Silence console writes across backend requests.
["log", "info", "warn", "error", "debug", "trace"].forEach((method) => {
    if (typeof console?.[method] === "function") {
        console[method] = () => { };
    }
});

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

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function parseLocalDateTimeParts(input) {
    const raw = String(input || "").trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return null;
    return {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
        hour: Number(match[4]),
        minute: Number(match[5]),
        second: Number(match[6] || 0)
    };
}

function getTimeZoneOffsetMs(date, timeZone) {
    try {
        const dtf = new Intl.DateTimeFormat("en-US", {
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23"
        });
        const parts = dtf.formatToParts(date);
        const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
        const utcFromLocalParts = Date.UTC(
            Number(map.year),
            Number(map.month) - 1,
            Number(map.day),
            Number(map.hour),
            Number(map.minute),
            Number(map.second)
        );
        return utcFromLocalParts - date.getTime();
    } catch {
        return 0;
    }
}

function zonedDateTimeToUtcMs(localDateTime, timeZone) {
    const parts = parseLocalDateTimeParts(localDateTime);
    if (!parts) return null;
    const initialGuess = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second
    );
    const firstOffset = getTimeZoneOffsetMs(new Date(initialGuess), timeZone);
    const firstPass = initialGuess - firstOffset;
    const secondOffset = getTimeZoneOffsetMs(new Date(firstPass), timeZone);
    return initialGuess - secondOffset;
}

function resolveExpirationTimeMs(linkData) {
    const rawExpiration = String(linkData?.expiration_datetime || "").trim();
    if (!rawExpiration) return null;
    const hasOffset = /z$|[+-]\d{2}:\d{2}$/i.test(rawExpiration);
    if (hasOffset) {
        const parsed = Date.parse(rawExpiration);
        return Number.isFinite(parsed) ? parsed : null;
    }
    const timeZone = String(linkData?.expiration_timezone || "UTC").trim() || "UTC";
    return zonedDateTimeToUtcMs(rawExpiration, timeZone);
}

function getPasswordGatePageHtml(opts = {}) {
    const {
        error = false,
        errorMessage = "Incorrect password. Please try again.",
        action = "/",
        title = "Protected Link",
        subtitle = "This link is password protected. Please enter the access code to continue."
    } = opts;
    return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Secure Access | GoodLink</title>
    <style>
        :root {
            --bg-color: #f9fafb;
            --card-bg: #ffffff;
            --text-main: #1f2937;
            --text-muted: #6b7280;
            --accent: #10b981;
            --light-accent: #d7fec8;
            --border-color: #e5e7eb;
            --error-bg: #fee2e2;
            --error-txt: #b91c1c;
        }
        * { box-sizing: border-box; }
        html, body { width: 100%; }
        body {
            margin: 0;
            min-height: 100vh;
            min-height: 100dvh;
            font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            display: grid;
            place-items: center;
            padding: clamp(12px, 4vw, 24px);
        }
        .gate-card {
            width: min(100%, 420px);
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: clamp(14px, 2.5vw, 20px);
            padding: clamp(18px, 4vw, 34px);
            text-align: center;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
        }
        .icon-wrapper {
            font-size: clamp(28px, 6vw, 40px);
            color: var(--accent);
            margin: 0 auto 16px;
            background-color: var(--light-accent);
            width: clamp(62px, 14vw, 80px);
            height: clamp(62px, 14vw, 80px);
            line-height: clamp(62px, 14vw, 80px);
            border-radius: 999px;
        }
        h1 {
            margin: 0 0 10px;
            font-size: clamp(20px, 5vw, 24px);
            line-height: 1.2;
            font-weight: 700;
            word-break: break-word;
        }
        p {
            margin: 0 0 22px;
            color: var(--text-muted);
            font-size: clamp(14px, 3.5vw, 15px);
            line-height: 1.6;
        }
        .error-message {
            color: var(--error-txt);
            background-color: var(--error-bg);
            padding: 11px 12px;
            border-radius: 8px;
            margin-bottom: 16px;
            font-size: 14px;
            display: ${error ? "block" : "none"};
            text-align: start;
        }
        .form-group {
            margin-bottom: 14px;
            text-align: start;
        }
        label {
            display: block;
            color: var(--text-main);
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 500;
        }
        input[type="password"] {
            width: 100%;
            padding: 13px 14px;
            background: #fff;
            border: 2px solid var(--border-color);
            border-radius: 10px;
            font-size: 16px;
            min-height: 46px;
            transition: all .2s ease;
        }
        input[type="password"]:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 4px var(--light-accent);
        }
        button {
            width: 100%;
            margin-top: 4px;
            min-height: 46px;
            padding: 12px 14px;
            background-color: var(--accent);
            color: #fff;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.2s ease;
        }
        button:hover { background-color: #059669; }
        button:focus-visible {
            outline: 2px solid #065f46;
            outline-offset: 2px;
        }
        .footer {
            margin-top: 20px;
            font-size: 12px;
            color: var(--text-muted);
            word-break: break-word;
        }
        @media (max-width: 360px) {
            body { padding: 10px; }
            .gate-card { border-radius: 12px; padding: 14px; }
        }
    </style>
</head>
<body>
    <main class="gate-card" role="main">
        <div class="icon-wrapper" aria-hidden="true">🔒</div>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(subtitle)}</p>
        <div class="error-message" id="error-box" role="alert" aria-live="polite">
            ${escapeHtml(errorMessage)}
        </div>
        <form action="${escapeHtml(action)}" method="POST">
            <div class="form-group">
                <label for="password">Access Password</label>
                <input type="password" id="password" name="password" placeholder="Enter password..." required autofocus autocomplete="current-password">
            </div>
            <button type="submit">Unlock Link</button>
        </form>
        <div class="footer">Secured by GoodLink.ai</div>
    </main>
</body>
</html>`;
}

async function getLinkCurrentClicksFromDb(env, linkData) {
    const linkId = String(linkData?.id || "").trim();
    if (!linkId) return 0;
    try {
        const selectUrl = `${env.SUPABASE_URL}/rest/v1/links?id=eq.${encodeURIComponent(linkId)}&select=current_clicks&limit=1`;
        const res = await fetch(selectUrl, {
            method: "GET",
            headers: {
                "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
            }
        });
        if (!res.ok) return Number(linkData?.current_clicks || 0) || 0;
        const rows = await res.json().catch(() => []);
        const row = rows?.[0] || null;
        const value = Number(row?.current_clicks);
        return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch {
        return Number(linkData?.current_clicks || 0) || 0;
    }
}

async function incrementLinkCurrentClicksAtomic(env, linkData, maxAllowed) {
    const linkId = String(linkData?.id || "").trim();
    if (!linkId) return { allowed: false, reason: "missing_link_id", currentClicks: 0 };
    const numericMax = Number(maxAllowed);
    if (!Number.isFinite(numericMax) || numericMax < 1) {
        return { allowed: true, reason: "limit_not_enabled", currentClicks: Number(linkData?.current_clicks || 0) || 0 };
    }

    let expectedCurrent = Number(linkData?.current_clicks);
    if (!Number.isFinite(expectedCurrent) || expectedCurrent < 0) expectedCurrent = 0;

    for (let attempt = 0; attempt < 3; attempt += 1) {
        if (expectedCurrent >= numericMax) {
            return { allowed: false, reason: "click_limit_reached", currentClicks: expectedCurrent };
        }

        const nextValue = expectedCurrent + 1;
        const patchUrl = `${env.SUPABASE_URL}/rest/v1/links?id=eq.${encodeURIComponent(linkId)}&current_clicks=eq.${encodeURIComponent(String(expectedCurrent))}`;
        const patchRes = await fetch(patchUrl, {
            method: "PATCH",
            headers: {
                "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            },
            body: JSON.stringify({ current_clicks: nextValue })
        });

        if (patchRes.ok) {
            const rows = await patchRes.json().catch(() => []);
            if (Array.isArray(rows) && rows.length > 0) {
                return { allowed: true, reason: "incremented", currentClicks: nextValue };
            }
        }

        expectedCurrent = await getLinkCurrentClicksFromDb(env, linkData);
    }

    if (expectedCurrent >= numericMax) {
        return { allowed: false, reason: "click_limit_reached", currentClicks: expectedCurrent };
    }

    return { allowed: false, reason: "increment_failed", currentClicks: expectedCurrent };
}

function buildUniqueClickFingerprint(ip, userAgent, fullUrl) {
    const safeIp = String(ip || "unknown_ip").trim();
    const safeUserAgent = String(userAgent || "unknown_ua").trim();
    const safeFullUrl = String(fullUrl || "").trim();
    return `${safeIp}|${safeUserAgent}|${safeFullUrl}`;
}

async function sha256Hex(value) {
    const data = new TextEncoder().encode(String(value || ""));
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
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
        return finalUrl;
    } catch {
        // If URL in database is broken, return as-is
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
    } catch {
        return { exists: false, rootRedirect: null };
    }
}

async function getActiveCustomDomainOwner(env, domainCandidates) {
    if (!Array.isArray(domainCandidates) || domainCandidates.length === 0) return null;

    for (const candidate of domainCandidates) {
        try {
            // Match domain rows that are usable for routing (not soft-deleted).
            // Many domains stay `pending` until DNS is verified, but traffic still hits the hostname.
            const filter = `domain=eq.${encodeURIComponent(candidate)}&status=not.eq.deleted&select=user_id,domain,status&limit=1`;
            const res = await fetch(`${env.SUPABASE_URL}/rest/v1/custom_domains?${filter}`, {
                headers: {
                    "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                    "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
                }
            });
            if (!res.ok) continue;
            const rows = await res.json().catch(() => []);
            const row = rows?.[0] || null;
            if (row?.user_id) {
                return {
                    userId: row.user_id,
                    domain: row.domain || candidate
                };
            }
        } catch {
            // Keep trying other candidates.
        }
    }

    return null;
}

function getBearerToken(request) {
    const authHeader = request.headers.get("Authorization") || request.headers.get("authorization") || "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) return null;
    const token = authHeader.slice(7).trim();
    return token || null;
}

function parseAdminAllowlist(env) {
    const defaults = ["hello@goodlink.ai"];
    const fromEnv = String(env.ADMIN_IMPERSONATION_EMAILS || "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);
    return new Set([...defaults, ...fromEnv]);
}

async function getAuthedUserByAccessToken(env, accessToken) {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
        method: "GET",
        headers: {
            "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": `Bearer ${accessToken}`
        }
    });
    if (!res.ok) return null;
    return res.json().catch(() => null);
}

async function getProfileRoleByUserId(env, userId) {
    if (!userId) return null;
    const profileUrl = `${env.SUPABASE_URL}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=role,email&limit=1`;
    const res = await fetch(profileUrl, {
        headers: {
            "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
        }
    });
    if (!res.ok) return null;
    const rows = await res.json().catch(() => []);
    return rows?.[0] || null;
}

function buildImpersonationRedirectUrl(request, env, targetEmail) {
    const origin = request.headers.get("Origin") || request.headers.get("origin") || "";
    const configuredBase = String(env.IMPERSONATION_REDIRECT_URL || "").trim();
    const fallbackBase = origin ? `${origin}/dashboard` : "https://goodlink.ai/dashboard";
    const redirectBase = configuredBase || fallbackBase;
    const redirectUrl = new URL(redirectBase);
    redirectUrl.searchParams.set("impersonator", "true");
    redirectUrl.searchParams.set("impersonating", String(targetEmail || "").trim().toLowerCase());
    return redirectUrl.toString();
}

async function insertImpersonationAuditLog(env, payload) {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/admin_impersonation_audit`, {
        method: "POST",
        headers: {
            "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        },
        body: JSON.stringify(payload)
    });
    return res.ok;
}

/**
 * Send click record directly to Supabase via QStash
 * All data is collected from Cloudflare (no IPINFO)
 */
async function logClickToSupabase(env, clickRecord) {
    try {
        /*
        const rayDedupKey = `log:${clickRecord.ray_id}:${clickRecord.slug}`;
        const ipDedupKey = `ip_limit:${clickRecord.ip_address}:${clickRecord.slug}`;

        // 1. Protection against technical retries (exact same request)
        const isNewRay = await redis.set(rayDedupKey, "1", { nx: true, ex: 120 });
        if (isNewRay === null) {
            return;
        }

        // 2. Protection against duplicate clicks (same IP to same slug within 1 second)
        const isNewClick = await redis.set(ipDedupKey, "1", { nx: true, ex: 1 });
        if (isNewClick === null) {
            return;
        }
        */

        // Send directly to Supabase via QStash
        const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/clicks`;
        const qstashUrl = `https://qstash.upstash.io/v2/publish/${supabaseUrl}`;

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

        await response.text();
    } catch {
        /* silent */
    }
}

/**
 * Build complete click record with all Cloudflare data
 */
function buildClickRecord(request, rayId, ip, slug, domain, userAgent, verdict, linkData, isBotDecision = false, botReasons = []) {
    const cf = request.cf || {};
    const botMgmt = cf.botManagement || {};
    const botScore = botMgmt.score ?? 100;
    const requestUrl = new URL(request.url);
    const requestHeaders = Object.fromEntries(request.headers.entries());
    const normalizedBotReasons = Array.isArray(botReasons)
        ? botReasons.map((r) => String(r || "").trim()).filter(Boolean)
        : [];

    return {
        id: crypto.randomUUID(),
        ray_id: rayId,

        // Link data — prefer DB domain/slug so clicks match links.* (e.g. custom domains stored as www.* while request host strips www)
        link_id: linkData?.id || null,
        user_id: linkData?.user_id || null,
        target_url: linkData?.target_url || null,
        slug:
            linkData?.slug != null && String(linkData.slug).trim() !== ""
                ? String(linkData.slug).trim().toLowerCase()
                : slug || "root",
        domain:
            linkData?.domain != null && String(linkData.domain).trim() !== ""
                ? String(linkData.domain).trim().toLowerCase()
                : String(domain || "").toLowerCase(),

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
        is_bot:
            Boolean(isBotDecision) ||
            verdict === "blacklisted" ||
            (typeof verdict === "string" && verdict.startsWith("bot_")) ||
            false,
        bot_reason: normalizedBotReasons.length > 0 ? normalizedBotReasons.join(", ") : null,
        ja3_hash: botMgmt.ja3Hash || null,
        ja4: botMgmt.ja4 || null,
        client_trust_score: cf.clientTrustScore ?? null,

        // Security data
        threat_score: cf.threatScore || null,
        is_tor: cf.isEUCountry === false && cf.country === 'T1',

        // Connection data
        http_protocol: cf.httpProtocol || null,
        tls_version: cf.tlsVersion || null,
        tls_cipher: cf.tlsCipher || null,

        // Metadata
        verdict: verdict,
        full_url: requestUrl.toString(),
        query_params: requestUrl.search || "",
        clicked_at: new Date().toISOString(),
        request_cf: cf,
        request_headers: requestHeaders,

        // Traffic source: detected from click-ID params in URL
        traffic_source: requestUrl.searchParams.has("fbclid") || requestUrl.searchParams.has("FBCLID")
            ? "meta"
            : requestUrl.searchParams.has("ttclid") || requestUrl.searchParams.has("TTCLID")
                ? "tiktok"
                : null
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
 * Always returns exactly ONE platform — never both.
 * Default (unknown source) → "meta".
 */
function resolveMetaPlatformFromRefererAndUtm(request, searchParams) {
    const referer = (request.headers.get("Referer") || request.headers.get("referer") || "").toLowerCase();
    const utmSource = (searchParams.get("utm_source") || "").toLowerCase().trim();

    // 1. Referer first (most common): l.instagram.com, instagram.com
    if (referer.includes("instagram.com")) return "instagram";
    if (referer.includes("facebook.com")) return "meta";

    // 2. UTM source
    if (utmSource === "ig" || utmSource === "instagram") return "instagram";
    if (utmSource === "fb" || utmSource === "facebook") return "meta";

    // Default: fbclid always originates from Meta (Facebook), not Instagram
    return "meta";
}

/**
 * Return set of pixel platform values that should get CAPI.
 * Each click ID maps to exactly ONE company — no cross-platform sending.
 * fbclid → meta OR instagram (resolved from Referer/utm_source, default meta).
 */
function getPlatformsFromClickIds(clickIds, request, searchParams) {
    const platforms = new Set();

    for (const [param, platformList] of Object.entries(CLICK_ID_TO_PLATFORMS)) {
        if (clickIds[param]) {
            platformList.forEach((p) => platforms.add(p));
        }
    }

    if (clickIds.fbclid) {
        platforms.add(resolveMetaPlatformFromRefererAndUtm(request, searchParams));
    }

    return platforms;
}

/**
 * One outbound CAPI call per (platform, pixel_id). Duplicate pixel rows (e.g. two TikTok rows with the same pixel) would otherwise produce duplicate console/API calls.
 */
function dedupeCapiPixelsByPlatformAndPixelId(pixels) {
    const seen = new Set();
    const out = [];
    for (const p of pixels) {
        if (!p || !p.platform) continue;
        const pid = String(p.pixel_id ?? "").trim();
        const key = `${String(p.platform).toLowerCase()}:${pid}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(p);
    }
    return out;
}

/**
 * Publish CAPI payload to QStash; QStash will POST to relayUrl (our /api/capi-relay).
 * @param {Object} env - Worker env (QSTASH_TOKEN, etc.)
 * @param {string} relayUrl - Full URL of the relay (e.g. https://worker.workers.dev/api/capi-relay)
 * @param {Object} payload - { event_id, event_time (optional; relay uses Worker time for Meta/TikTok), event_source_url, user_data, pixels }
 */
async function sendCapiToQStash(env, relayUrl, payload) {
    if (!env.QSTASH_TOKEN || !relayUrl) {
        return;
    }
    const qstashPublishUrl = `https://qstash.upstash.io/v2/publish/${relayUrl}`;
    try {
        const res = await fetch(qstashPublishUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${env.QSTASH_TOKEN}`,
                "Content-Type": "application/json",
                // Prevent QStash from delivering the same click twice (at-least-once semantics).
                // event_id is a per-click UUID so duplicate deliveries within the dedup window are dropped.
                "Upstash-Deduplication-Id": String(payload.event_id || "")
            },
            body: JSON.stringify(payload)
        });
        await res.text();
    } catch {
        /* silent */
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

function normalizeBrevoEventType(rawType) {
    const t = String(rawType || "")
        .toLowerCase()
        .replace(/[\s_-]+/g, "");

    // Brevo can send both "opened" and "first_opening".
    if (t.includes("firstopening")) return "opened";
    if (t.includes("open")) return "opened";
    if (t.includes("click")) return "clicked";
    if (t.includes("hardbounce") || t.includes("bounce")) return "failed";
    if (t.includes("unsubscribe")) return "deleted";
    return null;
}

function extractBrevoMessageId(eventObj) {
    if (!eventObj || typeof eventObj !== "object") return null;
    const direct =
        eventObj["message-id"] ||
        eventObj["message_id"] ||
        eventObj["messageId"] ||
        eventObj["Message-Id"] ||
        eventObj["msgid"] ||
        eventObj["smtp-id"] ||
        null;

    const fromNested =
        eventObj?.message?.id ||
        eventObj?.message?.messageId ||
        eventObj?.message?.["message-id"] ||
        null;

    return String(direct || fromNested || "").trim() || null;
}

function buildCandidateMessageIds(rawMessageId) {
    const original = String(rawMessageId || "").trim();
    if (!original) return [];
    const noBrackets = original.replace(/^<|>$/g, "");
    const withBrackets = `<${noBrackets}>`;
    return [...new Set([original, noBrackets, withBrackets].filter(Boolean))];
}

async function updateEmailLogByMessageId(env, messageId, updateData) {
    const candidates = buildCandidateMessageIds(messageId);
    for (const candidate of candidates) {
        const patchUrl = `${env.SUPABASE_URL}/rest/v1/email_logs?provider_message_id=eq.${encodeURIComponent(candidate)}`;
        const res = await fetch(patchUrl, {
            method: "PATCH",
            headers: {
                "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            },
            body: JSON.stringify(updateData)
        });

        if (!res.ok) {
            await res.text().catch(() => "");
            continue;
        }

        const rows = await res.json().catch(() => []);
        if (Array.isArray(rows) && rows.length > 0) {
            return { updated: true, matchedMessageId: candidate, rowsUpdated: rows.length };
        }
    }

    return { updated: false, matchedMessageId: null, rowsUpdated: 0 };
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
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
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

            // === API Endpoint: Admin-only impersonation (Magic Link) ===
            if (path === "/api/admin/impersonate" && request.method === "POST") {
                try {
                    const accessToken = getBearerToken(request);
                    if (!accessToken) {
                        return new Response(JSON.stringify({ error: "Unauthorized" }), {
                            status: 401,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    const authedUser = await getAuthedUserByAccessToken(env, accessToken);
                    if (!authedUser?.id || !authedUser?.email) {
                        return new Response(JSON.stringify({ error: "Unauthorized" }), {
                            status: 401,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    const profile = await getProfileRoleByUserId(env, authedUser.id);
                    const allowlist = parseAdminAllowlist(env);
                    const isAdminRole = profile?.role === "admin";
                    const isAllowlistedEmail = allowlist.has(String(authedUser.email).trim().toLowerCase());
                    if (!isAdminRole && !isAllowlistedEmail) {
                        return new Response(JSON.stringify({ error: "Forbidden" }), {
                            status: 403,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    const body = await request.json().catch(() => ({}));
                    const targetEmail = String(body?.targetEmail || "").trim().toLowerCase();
                    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
                        return new Response(JSON.stringify({ error: "Valid targetEmail is required." }), {
                            status: 400,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    const redirectTo = buildImpersonationRedirectUrl(request, env, targetEmail);
                    const generateRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/generate_link`, {
                        method: "POST",
                        headers: {
                            "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                            "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            type: "magiclink",
                            email: targetEmail,
                            options: { redirectTo }
                        })
                    });

                    const generateData = await generateRes.json().catch(() => ({}));
                    if (!generateRes.ok) {
                        return new Response(JSON.stringify({
                            error: generateData?.error_description || generateData?.msg || "Failed to generate magic link."
                        }), {
                            status: 400,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    const loginUrl =
                        generateData?.properties?.action_link ||
                        generateData?.action_link ||
                        generateData?.data?.properties?.action_link ||
                        null;
                    if (!loginUrl) {
                        return new Response(JSON.stringify({ error: "Magic link was generated without login URL." }), {
                            status: 500,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    const targetUserId = generateData?.user?.id || generateData?.properties?.user_id || null;
                    await insertImpersonationAuditLog(env, {
                        admin_user_id: authedUser.id,
                        admin_email: String(authedUser.email).trim().toLowerCase(),
                        target_user_id: targetUserId,
                        target_email: targetEmail,
                        created_at: new Date().toISOString(),
                        metadata: {
                            source: "admin_panel",
                            request_ip: request.headers.get("cf-connecting-ip") || null,
                            user_agent: request.headers.get("user-agent") || null
                        }
                    });

                    return new Response(JSON.stringify({ loginUrl }), {
                        status: 200,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                } catch (error) {
                    return new Response(JSON.stringify({ error: error.message || "Impersonation request failed." }), {
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
                    if (env.GOOGLE_WEB_RISK_API_KEY) {
                        try {
                            const isTrickySubdomainsHost = (hostname) => {
                                const labels = String(hostname || "").toLowerCase().split(".").filter(Boolean);
                                if (labels.length < 3) return false;
                                const brandKeywords = [
                                    "google", "gmail", "youtube",
                                    "apple", "icloud",
                                    "microsoft", "office", "outlook",
                                    "amazon", "aws",
                                    "paypal",
                                    "facebook", "instagram", "meta", "whatsapp",
                                    "netflix",
                                    "bank", "banking",
                                ];
                                const suspiciousIntent = ["login", "signin", "verify", "secure", "account", "update", "support", "billing", "wallet"];
                                const subdomainPart = labels.slice(0, -2).join(".");
                                if (!subdomainPart) return false;
                                const hasBrand = brandKeywords.some((k) => subdomainPart.includes(k));
                                const hasIntent = suspiciousIntent.some((k) => subdomainPart.includes(k));
                                return hasBrand && (hasIntent || subdomainPart.includes("-"));
                            };

                            const isSuspiciousUrlHeuristic = (urlString) => {
                                try {
                                    const u = new URL(urlString);
                                    const host = u.hostname.toLowerCase();
                                    const path = (u.pathname + u.search).toLowerCase();
                                    const labels = host.split(".").filter(Boolean);
                                    const manySubdomains = labels.length >= 4;
                                    const credentialPath = /(login|signin|verify|secure|account|password|reset|billing|wallet)/.test(path);
                                    const oddHost = /--|\.{2,}/.test(host) || host.startsWith("xn--");
                                    return (manySubdomains && credentialPath) || oddHost;
                                } catch {
                                    return false;
                                }
                            };

                            // Heuristics
                            if (isSuspiciousUrlHeuristic(reported_url)) {
                                safeBrowsingResponse = { isSafe: false, threatType: "SUSPICIOUS", source: "heuristic" };
                            } else if (isTrickySubdomainsHost(new URL(reported_url).hostname)) {
                                safeBrowsingResponse = { isSafe: false, threatType: "TRICKY_SUBDOMAINS", source: "heuristic" };
                            } else {
                                const apiUrl = new URL("https://webrisk.googleapis.com/v1/uris:search");
                                apiUrl.searchParams.set("key", env.GOOGLE_WEB_RISK_API_KEY);
                                apiUrl.searchParams.append("threatTypes", "MALWARE");
                                apiUrl.searchParams.append("threatTypes", "SOCIAL_ENGINEERING");
                                apiUrl.searchParams.append("threatTypes", "UNWANTED_SOFTWARE");
                                apiUrl.searchParams.set("uri", reported_url);

                                const sbRes = await fetch(apiUrl.toString(), { method: "GET" });
                                const sbData = await sbRes.json().catch(() => ({}));
                                const threatTypes = (sbData && sbData.threat && sbData.threat.threatTypes) ? sbData.threat.threatTypes : [];

                                if (sbRes.ok && Array.isArray(threatTypes) && threatTypes.length > 0) {
                                    safeBrowsingResponse = { isSafe: false, threatType: threatTypes[0] || null, raw: sbData, provider: "web_risk" };
                                } else if (sbRes.ok) {
                                    safeBrowsingResponse = { isSafe: true, threatType: null, provider: "web_risk" };
                                } else {
                                    safeBrowsingResponse = { error: "web_risk_http_error", status: sbRes.status, raw: sbData, provider: "web_risk" };
                                }
                            }
                        } catch (sbErr) {
                            safeBrowsingResponse = { error: String(sbErr.message || "check_failed") };
                        }
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
                        await insertRes.json().catch(() => ({}));
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
                            await redis.del(oldKey);
                            deletedOld = true;
                            deletedOldKey = oldKey;
                        }
                    }

                    // Save the new data
                    const newKey = `link:${domain}:${slug}`;
                    await redis.set(newKey, JSON.stringify(cacheData));

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
                    return new Response(JSON.stringify({ error: error.message }), {
                        status: 500,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }
            }

            // === CAPI Relay (receives from QStash, forwards to platform APIs, logs to capi_logs) ===
            if (path === "/api/capi-relay" && request.method === "POST") {
                try {
                    const body = await request.json();
                    const {
                        event_id,
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

                    // Real Unix seconds at relay time — always use for Meta/TikTok event_time (never trust payload).
                    const currentTime = Math.floor(Date.now() / 1000);

                    // Optional debug: set CAPI_TEST_ENDPOINT to a URL to mirror Meta/TikTok/Snapchat traffic.
                    // If unset, empty, "off", or "false" → always use real endpoints (e.g. graph.facebook.com).
                    const raw = env.CAPI_TEST_ENDPOINT;
                    const testEndpoint =
                        raw === "off" || raw === "false" || !raw || !String(raw).trim()
                            ? null
                            : String(raw).trim();
                    const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/capi_logs`;
                    const inserted = [];

                    // TikTok Test Events: only sent when TIKTOK_CAPI_TEST_EVENT_CODE env var is explicitly set.
                    const tiktokTestRaw = env.TIKTOK_CAPI_TEST_EVENT_CODE;
                    const tiktokTestEventCode =
                        tiktokTestRaw && tiktokTestRaw !== "off" && tiktokTestRaw !== "false"
                            ? String(tiktokTestRaw).trim()
                            : null;

                    // Each pixel: one CAPI request to platform, then one separate row write to Supabase (capi_logs)
                    const pixelsToRelay = dedupeCapiPixelsByPlatformAndPixelId(pixels);
                    for (const p of pixelsToRelay) {
                        if (!p.platform) continue;
                        // QStash JSON may use capi_token (DB) or capiToken (camelCase from some clients)
                        const pixelCapiToken = String(p.capi_token ?? p.capiToken ?? "").trim();
                        if (p.platform !== "taboola" && p.platform !== "outbrain" && !pixelCapiToken) continue;
                        const eventName = p.event_name || (p.event_type === "custom" ? (p.custom_event_name || "PageView") : (p.event_type || "PageView"));
                        const evId = event_id || crypto.randomUUID();

                        let platformUrl = null;
                        let requestBody = null;
                        let requestHeaders = { "Content-Type": "application/json" };

                        if (p.platform === "meta" || p.platform === "instagram") {
                            // Meta expects the Conversions API token as access_token — use pixel capi_token from QStash payload.
                            // Pass it in the query string (Graph accepts this); JSON body is only `data` (no test_event_code).
                            const baseGraph = testEndpoint || `https://graph.facebook.com/v19.0/${encodeURIComponent(p.pixel_id)}/events`;
                            let graphU;
                            try {
                                graphU = new URL(baseGraph);
                            } catch {
                                graphU = new URL(baseGraph, "https://graph.facebook.com");
                            }
                            graphU.searchParams.set("access_token", pixelCapiToken);
                            platformUrl = graphU.toString();
                            requestBody = {
                                data: [{
                                    event_name: eventName,
                                    event_time: currentTime,
                                    action_source: "website",
                                    event_id: evId,
                                    user_data: {
                                        ...(user_data?.fbc && { fbc: user_data.fbc }),
                                        ...(user_data?.client_ip_address && { client_ip_address: user_data.client_ip_address }),
                                        ...(user_data?.client_user_agent && { client_user_agent: user_data.client_user_agent })
                                    },
                                    event_source_url: event_source_url || undefined
                                }]
                            };
                        } else if (p.platform === "tiktok") {
                            // TikTok Events API v1.3 (newer shape): event_source + event_source_id + data[] (like Meta).
                            const tiktokPixelId = String(p.pixel_id ?? "").trim();
                            requestBody = {
                                event_source: "web",
                                event_source_id: tiktokPixelId,
                                data: [{
                                    event: eventName,
                                    event_id: String(evId),
                                    event_time: currentTime,
                                    context: {
                                        ...(user_data?.ttclid && { ad: { callback: String(user_data.ttclid) } }),
                                        page: { url: event_source_url || "" },
                                        user: {
                                            client_ip_address: user_data?.client_ip_address
                                                ? String(user_data.client_ip_address)
                                                : "",
                                            user_agent: user_data?.client_user_agent
                                                ? String(user_data.client_user_agent)
                                                : ""
                                        }
                                    }
                                }],
                                ...(tiktokTestEventCode && { test_event_code: tiktokTestEventCode })
                            };
                            platformUrl = testEndpoint || "https://business-api.tiktok.com/open_api/v1.3/event/track/";
                            requestHeaders = { "Content-Type": "application/json", "Access-Token": pixelCapiToken };
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
                            platformUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(p.pixel_id)}&api_secret=${encodeURIComponent(pixelCapiToken)}`;
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
                            requestHeaders = { "Content-Type": "application/json", "Authorization": `Bearer ${pixelCapiToken}` };
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
                        }

                        if (!platformUrl) continue;
                        if (p.platform !== "taboola" && p.platform !== "outbrain" && !requestBody) continue;

                        let logUrl = p.platform === "google" ? platformUrl.replace(/api_secret=[^&]+/, "api_secret=[REDACTED]") : platformUrl;
                        if (p.platform === "meta" || p.platform === "instagram") {
                            logUrl = String(logUrl).replace(/([?&])access_token=[^&]*/gi, "$1access_token=[REDACTED]");
                        }
                        const isGet = p.platform === "taboola" || p.platform === "outbrain";
                        const headersForLog = { ...requestHeaders };
                        if (headersForLog.Authorization) headersForLog.Authorization = "[REDACTED]";
                        if (headersForLog["Access-Token"]) headersForLog["Access-Token"] = "[REDACTED]";
                        const bodyForLog = requestBody;
                        console.log("*** CAPI REQUEST ***", JSON.stringify({
                            platform: p.platform,
                            pixel_id: p.pixel_id,
                            method: isGet ? "GET" : "POST",
                            url: logUrl,
                            headers: headersForLog,
                            body: isGet ? requestBody : bodyForLog
                        }, null, 2));

                        const start = Date.now();
                        let statusCode = 0;
                        let responseBody = "";
                        try {
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

                        const respPreview = responseBody && responseBody.length > 8000
                            ? `${responseBody.slice(0, 8000)}...(truncated)`
                            : responseBody;
                        console.log("*** CAPI RESPONSE ***", JSON.stringify({
                            platform: p.platform,
                            pixel_id: p.pixel_id,
                            status: statusCode,
                            duration_ms: relayDurationMs,
                            body: respPreview
                        }, null, 2));

                        // Log: Meta/Instagram access_token is in URL query (redacted in capi_target_url); TikTok in header.
                        const logRequestBody = { ...requestBody };

                        const logRow = {
                            user_id: link_data?.user_id || null,
                            link_id: link_data?.id || null,
                            domain: link_data?.domain || null,
                            slug: link_data?.slug || null,
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
                            await insertRes.text();
                        }
                    }

                    return new Response(JSON.stringify({ ok: true, logged: inserted.length }), {
                        status: 200,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                } catch (error) {
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

                    // Enforce custom domain quota for ADVANCED plan (max 10 active/non-deleted domains).
                    try {
                        const profileUrl = `${env.SUPABASE_URL}/rest/v1/profiles?user_id=eq.${encodeURIComponent(user_id)}&select=plan_type&limit=1`;
                        const profileRes = await fetch(profileUrl, {
                            method: "GET",
                            headers: {
                                "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                                "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
                            }
                        });
                        const profileRows = profileRes.ok ? await profileRes.json().catch(() => []) : [];
                        const planType = String(profileRows?.[0]?.plan_type || "").toLowerCase();

                        if (planType === "advanced") {
                            const domainsCountUrl =
                                `${env.SUPABASE_URL}/rest/v1/custom_domains?user_id=eq.${encodeURIComponent(user_id)}` +
                                `&status=not.eq.deleted&select=id&limit=1`;
                            const domainsCountRes = await fetch(domainsCountUrl, {
                                method: "GET",
                                headers: {
                                    "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                                    "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                                    "Prefer": "count=exact"
                                }
                            });
                            const contentRange = domainsCountRes.headers.get("content-range") || "";
                            const totalPart = contentRange.split("/")[1];
                            const activeDomainsCount = Number(totalPart);
                            if (Number.isFinite(activeDomainsCount) && activeDomainsCount >= 10) {
                                return new Response(JSON.stringify({
                                    success: false,
                                    error: "Advanced plan is limited to 10 custom domains. Please upgrade to PRO to add more."
                                }), {
                                    status: 403,
                                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                                });
                            }
                        }
                    } catch {
                        // Fail open on quota-check errors to avoid blocking domain setup due to transient issues.
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
                            await supabaseUpdateResponse.json().catch(() => null);
                        } else {
                            await supabaseUpdateResponse.json().catch(() => null);
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

                        await supabaseUpdateResponse.json().catch(() => null);
                    } catch {
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
                    return new Response(JSON.stringify({ success: false, error: error.message }), {
                        status: 500,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }
            }

            // === API Endpoint: Brevo transactional email events webhook ===
            // Receives events like opened / first opening / clicked / hard bounce / unsubscribed
            // and updates public.email_logs by provider_message_id.
            if (path === "/api/brevo-email-events" && request.method === "POST") {
                try {
                    // Optional protection: set BREVO_WEBHOOK_TOKEN in worker env
                    // and add ?token=... in Brevo webhook URL.
                    if (env.BREVO_WEBHOOK_TOKEN) {
                        const token = String(url.searchParams.get("token") || "").trim();
                        if (!token || token !== String(env.BREVO_WEBHOOK_TOKEN).trim()) {
                            return new Response(JSON.stringify({ error: "Unauthorized webhook token" }), {
                                status: 401,
                                headers: { ...corsHeaders, "Content-Type": "application/json" }
                            });
                        }
                    }

                    const rawBody = await request.text();
                    let payload;
                    try {
                        payload = JSON.parse(rawBody || "{}");
                    } catch {
                        return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
                            status: 400,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    const events = Array.isArray(payload) ? payload : [payload];
                    const summary = {
                        received: events.length,
                        supported: 0,
                        updated: 0,
                        skipped_no_message_id: 0,
                        skipped_unknown_event: 0,
                        not_found: 0
                    };

                    for (const ev of events) {
                        const normalizedStatus = normalizeBrevoEventType(ev?.event || ev?.type || ev?.name);
                        if (!normalizedStatus) {
                            summary.skipped_unknown_event += 1;
                            continue;
                        }
                        summary.supported += 1;

                        const messageId = extractBrevoMessageId(ev);
                        if (!messageId) {
                            summary.skipped_no_message_id += 1;
                            continue;
                        }

                        const updateData = {
                            status: normalizedStatus,
                            updated_at: new Date().toISOString()
                        };

                        if (normalizedStatus === "failed") {
                            updateData.last_error = "hard_bounce_from_brevo";
                        }
                        if (normalizedStatus === "deleted") {
                            updateData.last_error = "unsubscribed_from_brevo";
                        }

                        const result = await updateEmailLogByMessageId(env, messageId, updateData);
                        if (result.updated) summary.updated += 1;
                        else summary.not_found += 1;
                    }

                    return new Response(JSON.stringify({ ok: true, summary }), {
                        status: 200,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                } catch (error) {
                    return new Response(JSON.stringify({ error: error.message || "Webhook processing failed" }), {
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
            /*
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
            */
            const slugCandidate = path.split("?")[0].replace(/^\/+|\/+$/g, "");
            const isGlynlRootWithoutSlug = domain === "glynk.to" && (path === "/" || slugCandidate === "");
            if (isGlynlRootWithoutSlug) {
                return new Response(getGlynk404Page(), {
                    status: 404,
                    headers: { "Content-Type": "text/html;charset=UTF-8" }
                });
            }
            /*
            if (
                isBlockedPath ||
                hasBlockedSlugToken ||
                hasInvalidSlugChars ||
                /uptimerobot|pingdom/i.test(userAgent)
            ) {
                return new Response(null, { status: 204 });
            }
            */

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
                    verified_bot: (request.headers.get("X-Is-Verified-Bot") || "").toLowerCase() === "true",
                    client_trust_score: request.cf?.clientTrustScore ?? null,
                    client_tcp_rtt: request.cf?.clientTcpRtt ?? null
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
            const hasBlockedSlugToken = blockedSlugTokens.some((token) => slug.includes(token));
            const matchedBlockedPathToken = blockedPathTokens.find((token) => path.includes(token)) || null;
            const matchedBlockedSlugToken = blockedSlugTokens.find((token) => slug.includes(token)) || null;
            const requestedHost = url.hostname.toLowerCase();
            const normalizedDomain = domain;
            const alternateDomain =
                requestedHost.startsWith("www.")
                    ? requestedHost.slice(4)
                    : `www.${requestedHost}`;
            const domainCandidates = [...new Set([normalizedDomain, requestedHost, alternateDomain])].filter(Boolean);

            const redis = new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN });

            const htmlResponse = (html, status = 404) => new Response(html, {
                status, headers: { "Content-Type": "text/html;charset=UTF-8" }
            });
            const redirectWithHeaders = (targetUrl, status = 302, headers = {}) => {
                const mergedHeaders = { Location: targetUrl };
                Object.entries(headers).forEach(([key, value]) => {
                    if (value !== undefined && value !== null && value !== "") {
                        mergedHeaders[key] = String(value);
                    }
                });
                return new Response(null, { status, headers: mergedHeaders });
            };

            // Terminate with log to Supabase - redirects to fallback_url if available
            const terminateWithLog = async (verdict, linkData = null, botReasons = []) => {
                const isBotVerdict = verdict === "blacklisted" || verdict.startsWith("bot_");
                let attributionLinkData = linkData;
                if (isBotVerdict && (!attributionLinkData || !attributionLinkData.user_id) && domain !== "glynk.to") {
                    const domainOwner = await getActiveCustomDomainOwner(env, domainCandidates);
                    if (domainOwner?.userId) {
                        attributionLinkData = {
                            ...(attributionLinkData && typeof attributionLinkData === "object" ? attributionLinkData : {}),
                            user_id: domainOwner.userId,
                            domain: domainOwner.domain || domain,
                            slug
                        };
                    }
                }
                const clickRecord = buildClickRecord(
                    request,
                    rayId,
                    ip,
                    slug,
                    domain,
                    userAgent,
                    verdict,
                    attributionLinkData,
                    isBotVerdict,
                    isBotVerdict ? botReasons : []
                );
                ctx.waitUntil(logClickToSupabase(env, clickRecord));
                queueAxiomLog(isBotVerdict ? "bot_blocked" : "invalid_request", slug || null, isBotVerdict, {
                    verdict,
                    backend_event: "terminate_with_log",
                    link_json: attributionLinkData || null,
                    click_record: clickRecord
                });

                // If linkData has fallback_url, redirect there instead of showing 404
                if (attributionLinkData?.fallback_url) {
                    const fallbackUrl = ensureValidUrl(attributionLinkData.fallback_url);
                    if (fallbackUrl) {
                        queueAxiomLog("redirect", slug || null, false, {
                            redirect_target_url: fallbackUrl,
                            redirect_reason: `fallback_for_${verdict}`,
                            verdict,
                            link_json: attributionLinkData || null
                        });
                        return Response.redirect(fallbackUrl, 302);
                    }
                }

                return htmlResponse(getGlynk404Page());
            };

            if (isBlockedPath || hasBlockedSlugToken) {
                return terminateWithLog("bot_blocked_token", null, [
                    matchedBlockedPathToken ? `blocked_path_token:${matchedBlockedPathToken}` : null,
                    matchedBlockedSlugToken ? `blocked_slug_token:${matchedBlockedSlugToken}` : null
                ]);
            }

            // 2. Slug Validation
            if (!slug) return terminateWithLog('home_page_access');
            if (slug.toLowerCase() === "robots.txt") return terminateWithLog("bot_robots_txt", null, ["slug_is_robots_txt"]);

            // 3. Fetch link data from Redis/Supabase (supports apex/www domain mismatch)
            // If slug contains disallowed path separators/dots, treat as bot traffic.
            if (slug.includes('/') || slug.includes('.')) {
                if (domain !== "glynk.to") {
                    const domainOwner = await getActiveCustomDomainOwner(env, domainCandidates);
                    if (domainOwner?.userId) {
                        const verdict = 'bot_invalid_slug';
                        return terminateWithLog(verdict, {
                            user_id: domainOwner.userId,
                            domain: domainOwner.domain || domain,
                            slug
                        }, [
                            slug.includes('/') ? "slug_contains_slash" : null,
                            slug.includes('.') ? "slug_contains_dot" : null
                        ]);
                    }
                }
                return terminateWithLog('bot_invalid_slug', null, [
                    slug.includes('/') ? "slug_contains_slash" : null,
                    slug.includes('.') ? "slug_contains_dot" : null
                ]);
            }

            // Remaining invalid charset validation (non-bot malformed slug).
            if (!/^[a-z0-9-]+$/.test(slug)) {
                if (domain !== "glynk.to") {
                    const domainOwner = await getActiveCustomDomainOwner(env, domainCandidates);
                    if (domainOwner?.userId) {
                        return terminateWithLog('invalid_slug_format', {
                            user_id: domainOwner.userId,
                            domain: domainOwner.domain || domain,
                            slug
                        });
                    }
                }
                return terminateWithLog('invalid_slug_format');
            }

            let linkData = null;

            for (const candidate of domainCandidates) {
                const cached = await redis.get(`link:${candidate}:${slug}`);
                if (cached) {
                    linkData = cached;
                    break;
                }
            }

            if (!linkData) {
                for (const candidate of domainCandidates) {
                    const sbRes = await fetch(
                        `${env.SUPABASE_URL}/rest/v1/links?slug=eq.${encodeURIComponent(slug)}&domain=eq.${encodeURIComponent(candidate)}&select=*`,
                        {
                            headers: {
                                'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
                                'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
                            }
                        }
                    );
                    const data = await sbRes.json().catch(() => []);
                    const row = data?.[0] || null;
                    if (row) {
                        linkData = row;
                        break;
                    }
                }

                if (linkData) {
                    const serialized = JSON.stringify(linkData);
                    for (const candidate of domainCandidates) {
                        ctx.waitUntil(redis.set(`link:${candidate}:${slug}`, serialized, { ex: 3600 }));
                    }
                }
            }

            if (!linkData) {
                if (domain !== "glynk.to") {
                    const domainOwner = await getActiveCustomDomainOwner(env, domainCandidates);
                    if (domainOwner?.userId) {
                        return terminateWithLog('link_not_found', {
                            user_id: domainOwner.userId,
                            domain: domainOwner.domain || domain,
                            slug
                        });
                    }
                }
                return terminateWithLog('link_not_found');
            }

            // Redis may return stringified JSON; normalize before any field checks
            if (typeof linkData === "string") {
                try {
                    linkData = JSON.parse(linkData);
                } catch {
                    linkData = null;
                }
            }

            if (!linkData || typeof linkData !== "object") return terminateWithLog('link_not_found');
            if (linkData.status !== 'active') return terminateWithLog('link_inactive', linkData);

            // 4. Blacklist Check
            const isBlacklisted = await redis.get(`blacklist:${ip}`);
            if (isBlacklisted) {
                return terminateWithLog('blacklisted', linkData, ['ip_blacklist_hit']);
            }

            /*
            // 5. Bot Analysis (legacy for Cloudflare Bot Management plans)
            const botScore = request.cf?.botManagement?.score || 100;
            const isVerifiedBot = request.cf?.verifiedBot || false;
            const isBotUA = /bot|crawler|spider|googlebot/i.test(userAgent);
            const isImpersonator = isBotUA && !isVerifiedBot;
            const isBot = botScore <= 29 || isVerifiedBot || isImpersonator;
            */

            // 5. Bot Analysis (Cloudflare Pro-compatible suspicion scoring)
            const cf = request.cf || {};
            const isVerifiedBot = (request.headers.get("X-Is-Verified-Bot") || "").toLowerCase() === "true";
            const botCategory = cf.verifiedBotCategory || null;
            const isAiSearchBot = botCategory === "AI Search";
            let suspicionScore = 0;
            const suspicionReasons = [];
            const clientTrustScore = cf.clientTrustScore ?? null;
            const clientTcpRtt = cf.clientTcpRtt;
            const asn = Number(cf.asn);

            // 1) Hard whitelist for friendly crawlers/previews (allow, but do not count as click).
            const friendlyBots = /bot|spider|crawler|facebookexternalhit|whatsapp|linkpreview|preview|slurp|google-read-aloud/i;

            // 2) Expanded blacklist (including AI crawlers and known scraping clients).
            const badBotRegex = /(python-requests|curl|wget|go-http-client|libwww|urllib|node-fetch|axios|guzzlehttp|java\/|ruby|HeadlessChrome|PhantomJS|Selenium|Playwright|AhrefsBot|SemrushBot|DotBot|MJ12bot|PetalBot|Barkrowler|spider|crawl|Claude|GPTBot|ChatGPT|Perplexity|Bytespider|Amazonbot|SearchBot|DataForSeoBot)/i;

            // Verified bots are trusted and bypass suspicion scoring.
            if (!isVerifiedBot) {
                if (userAgent.trim() === "") {
                    suspicionScore += 50;
                    suspicionReasons.push("missing_user_agent");
                } else if (badBotRegex.test(userAgent)) {
                    suspicionScore += 50;
                    suspicionReasons.push("user_agent_bad_bot_pattern");
                }

                // Datacenter bots often show extremely low TCP RTT.
                if (clientTcpRtt !== undefined && clientTcpRtt <= 5) {
                    suspicionScore += 50;
                    suspicionReasons.push("client_tcp_rtt_lte_5");
                }

                const knownCloudASNs = [
                    16509, 8987, 14618, 17421, 15169, 396982, 8075, 8068, 12076, 14061, 24940, 63949, 31898
                ];
                if (knownCloudASNs.includes(asn)) {
                    suspicionScore += 25;
                    suspicionReasons.push(`known_cloud_asn:${asn}`);
                }
            }

            // Verified bots (search engines etc.) are always considered clean.
            const isBot = isAiSearchBot || (!isVerifiedBot && suspicionScore >= 45);
            const isImpersonator = false;

            // Geo redirect override (if configured): match visitor country to geo_rules.country
            // and use the rule URL as target. Query params/UTMs are preserved later by buildSafeUrl.
            const visitorCountry = String(country || "").trim().toUpperCase();
            const geoRules = Array.isArray(linkData.geo_rules) ? linkData.geo_rules : [];
            const matchedGeoRule = geoRules.find((rule) => {
                const ruleCountry = String(rule?.country || "").trim().toUpperCase();
                const ruleUrl = ensureValidUrl(rule?.url);
                return Boolean(ruleCountry && ruleUrl && visitorCountry && ruleCountry === visitorCountry);
            });

            let targetUrl = ensureValidUrl(linkData.target_url);
            if (matchedGeoRule) {
                const geoTargetUrl = ensureValidUrl(matchedGeoRule.url);
                if (geoTargetUrl) {
                    targetUrl = geoTargetUrl;
                }
            }
            const finalRedirectUrl = buildSafeUrl(targetUrl, url.searchParams);

            if (friendlyBots.test(userAgent)) {
                queueAxiomLog("friendly_bot_allowed", slug || null, false, {
                    backend_event: "friendly_bot_allowed_no_click_count",
                    redirect_target_url: finalRedirectUrl,
                    user_agent: userAgent
                });
                return Response.redirect(finalRedirectUrl, 302);
            }

            let verdict = "clean";
            let shouldBlock = false;
            let botReasonsForClick = [];

            // bot_action: "block" | "redirect" | "no-tracking" (default: "block")
            const botAction = linkData.bot_action || "block";

            if (isVerifiedBot && !isAiSearchBot) {
                verdict = "clean";
            } else if (isBot) {
                verdict = isAiSearchBot ? "bot_ai_search" : "bot_likely";
                botReasonsForClick = [
                    ...(isAiSearchBot ? ["verified_bot_category_ai_search"] : []),
                    ...suspicionReasons
                ];
                if (botReasonsForClick.length === 0) {
                    botReasonsForClick = ["bot_threshold_triggered"];
                }

                // Add to Blacklist for high-suspicion automated traffic.
                ctx.waitUntil(redis.set(`blacklist:${ip}`, "1", { ex: 86400 }));

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
            } else if (suspicionScore > 0) {
                verdict = "suspicious";
            }

            // 6. Send log to Supabase
            const clickRecord = buildClickRecord(
                request,
                rayId,
                ip,
                slug,
                domain,
                userAgent,
                verdict,
                linkData,
                isBot,
                isBot ? botReasonsForClick : []
            );
            ctx.waitUntil(logClickToSupabase(env, clickRecord));

            // If blocked, redirect to fallback_url if exists, otherwise 404
            if (shouldBlock) {
                if (linkData?.fallback_url) {
                    const fallbackUrl = ensureValidUrl(linkData.fallback_url);
                    if (fallbackUrl) {
                        queueAxiomLog("bot_blocked", slug || null, true, {
                            verdict,
                            bot_action: botAction,
                            redirect_target_url: fallbackUrl,
                            redirect_reason: "bot_fallback_redirect",
                            link_json: linkData || null,
                            bot_context: {
                                score: null,
                                verified_bot: isVerifiedBot,
                                verified_bot_category: botCategory,
                                impersonator: isImpersonator,
                                suspicion_score: suspicionScore,
                                client_trust_score: clientTrustScore,
                                client_tcp_rtt: clientTcpRtt,
                                asn
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
                        score: null,
                        verified_bot: isVerifiedBot,
                        verified_bot_category: botCategory,
                        impersonator: isImpersonator,
                        suspicion_score: suspicionScore,
                        client_trust_score: clientTrustScore,
                        client_tcp_rtt: clientTcpRtt,
                        asn
                    }
                });
                return htmlResponse(getGlynk404Page());
            }

            // 7. Access control checks (only after bot decision allows continuation).
            const accessMode = String(linkData?.access_mode || "direct").toLowerCase();
            const isControlledLink = accessMode === "controlled";
            const isLikelyBot = Boolean(isBot);

            if (isControlledLink) {
                if (Boolean(linkData?.enable_time_limit) && linkData?.expiration_datetime) {
                    const expirationMs = resolveExpirationTimeMs(linkData);
                    if (Number.isFinite(expirationMs) && Date.now() > expirationMs) {
                        return terminateWithLog("link_expired_time_limit", linkData);
                    }
                }

                if (Boolean(linkData?.enable_password_protection) && String(linkData?.access_password || "").length > 0) {
                    const expectedPassword = String(linkData.access_password);
                    const formAction = `${url.pathname}${url.search}`;
                    const bruteForceEnabled = linkData?.enable_anti_brute_force !== false;
                    const maxAttemptsRaw = Number(linkData?.max_login_attempts);
                    const lockoutMinutesRaw = Number(linkData?.lockout_duration_minutes);
                    const maxAttempts = Number.isFinite(maxAttemptsRaw) && maxAttemptsRaw >= 1 ? maxAttemptsRaw : 10;
                    const lockoutMinutes = Number.isFinite(lockoutMinutesRaw) && lockoutMinutesRaw >= 1 ? lockoutMinutesRaw : 15;
                    const lockoutSeconds = lockoutMinutes * 60;
                    const bruteForceScope = `${domain}:${slug}:${ip || "unknown_ip"}`;
                    const lockKey = `pwd_lock:${bruteForceScope}`;
                    const attemptsKey = `pwd_attempts:${bruteForceScope}`;

                    if (bruteForceEnabled) {
                        const isLocked = await redis.get(lockKey);
                        if (isLocked) {
                            return htmlResponse(getPasswordGatePageHtml({
                                error: true,
                                errorMessage: `Too many failed attempts. Try again in ${lockoutMinutes} minutes.`,
                                action: formAction
                            }), 429);
                        }
                    }

                    if (request.method === "POST") {
                        const form = await request.formData().catch(() => null);
                        const submittedPassword = String(form?.get("password") || "");
                        if (submittedPassword !== expectedPassword) {
                            if (bruteForceEnabled) {
                                const attemptsAfter = await redis.incr(attemptsKey);
                                await redis.expire(attemptsKey, lockoutSeconds);
                                if (attemptsAfter >= maxAttempts) {
                                    await redis.set(lockKey, "1", { ex: lockoutSeconds });
                                    await redis.del(attemptsKey);
                                    return htmlResponse(getPasswordGatePageHtml({
                                        error: true,
                                        errorMessage: `Too many failed attempts. Try again in ${lockoutMinutes} minutes.`,
                                        action: formAction
                                    }), 429);
                                }
                            }
                            return htmlResponse(getPasswordGatePageHtml({
                                error: true,
                                errorMessage: "Incorrect password. Please try again.",
                                action: formAction
                            }), 401);
                        }
                        if (bruteForceEnabled) {
                            await redis.del(attemptsKey);
                            await redis.del(lockKey);
                        }
                    } else {
                        return htmlResponse(getPasswordGatePageHtml({
                            error: false,
                            action: formAction
                        }), 200);
                    }
                }

                if (
                    Boolean(linkData?.enable_click_limit) &&
                    Number.isFinite(Number(linkData?.max_clicks_allowed)) &&
                    Number(linkData.max_clicks_allowed) > 0 &&
                    !isLikelyBot
                ) {
                    const fingerprintSource = buildUniqueClickFingerprint(ip, userAgent, request.url);
                    const fingerprintHash = await sha256Hex(fingerprintSource);
                    const uniqueClickKey = `link_unique_click:${String(linkData.id)}:${fingerprintHash}`;
                    const firstSeenResult = await redis.set(uniqueClickKey, "1", { nx: true });
                    const isFirstUniqueClick = firstSeenResult !== null;

                    // Existing unique visitor: allow redirect without increasing click counter.
                    if (isFirstUniqueClick) {
                        const incrementResult = await incrementLinkCurrentClicksAtomic(
                            env,
                            linkData,
                            Number(linkData.max_clicks_allowed)
                        );

                        if (!incrementResult.allowed) {
                            // Roll back "seen" marker so a blocked attempt doesn't consume a slot.
                            await redis.del(uniqueClickKey);
                            return terminateWithLog("click_limit_reached", linkData);
                        }

                        linkData.current_clicks = incrementResult.currentClicks;
                    }
                }
            }

            const planType = (linkData?.plan_type || "").toLowerCase();
            const pixels = Array.isArray(linkData?.pixels) ? linkData.pixels : [];
            const trackingMode = linkData?.tracking_mode || "pixel";

            const isPro = planType === "pro";
            const wantsCapi = trackingMode === "capi" || trackingMode === "pixel_and_capi";
            const wantsPixel = trackingMode === "pixel" || trackingMode === "pixel_and_capi";
            const capiPixels = pixels.filter((p) => p?.status === "active" && (p?.capi_token || p?.platform === "taboola" || p?.platform === "outbrain"));
            let capiPixelsToSend = [];
            let capiDebugReason = "skip_not_evaluated";
            const clickIds = getClickIdsFromUrl(url.searchParams);
            const platformsFromUrl = getPlatformsFromClickIds(clickIds, request, url.searchParams);

            if (!isPro) capiDebugReason = "skip_plan_not_pro";
            else if (!wantsCapi) capiDebugReason = "skip_tracking_mode_not_capi";
            else if (!env.CAPI_RELAY_URL) capiDebugReason = "skip_missing_capi_relay_url";

            queueAxiomLog("capi_debug", slug || null, isBot, {
                backend_event: "capi_gate_evaluation",
                plan_type: planType || null,
                tracking_mode: trackingMode || null,
                is_pro: isPro,
                wants_capi: wantsCapi,
                wants_pixel: wantsPixel,
                capi_relay_url_configured: Boolean(env.CAPI_RELAY_URL),
                total_pixels_count: pixels.length,
                eligible_capi_pixels_count: capiPixels.length,
                click_ids_present: Object.entries(clickIds)
                    .filter(([, value]) => Boolean(value))
                    .map(([key]) => key),
                url_target_platforms: [...platformsFromUrl]
            });

            if (isPro && (pixels.length > 0 || capiPixels.length > 0)) {
                const eventId = crypto.randomUUID();
                // Wall-clock second at click (payload hint; relay overwrites platform event_time with its own currentTime).
                const eventTime = Math.floor(Date.now() / 1000);
                const eventSourceUrl = request.url || `${url.origin}${url.pathname}${url.search}`;
                // Send CAPI only to platforms found in URL. If one param → one (or two for meta); if multiple params → send to all.
                // Dedupe by platform + pixel_id so duplicate DB rows (e.g. two identical TikTok pixels) only fire once.
                capiPixelsToSend = dedupeCapiPixelsByPlatformAndPixelId(
                    capiPixels.filter((p) => platformsFromUrl.has(p.platform))
                );

                if (wantsCapi && capiPixelsToSend.length === 0) {
                    capiDebugReason = "skip_no_matching_pixels_for_click_ids";
                    queueAxiomLog("capi_debug", slug || null, isBot, {
                        backend_event: "capi_not_sent_no_matching_pixels",
                        plan_type: planType || null,
                        tracking_mode: trackingMode || null,
                        eligible_capi_pixels_count: capiPixels.length,
                        url_target_platforms: [...platformsFromUrl]
                    });
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
                    // Dedup: send CAPI only once per (IP, slug) within 2 seconds.
                    // Prevents double-firing from browser prefetch, bridge-page reload, or other duplicate requests.
                    const capiDedupKey = `capi:${ip}:${slug}`;
                    const isNewCapiRequest = await redis.set(capiDedupKey, "1", { nx: true, ex: 2 });
                    if (isNewCapiRequest !== null) {
                        capiDebugReason = "sent_queued_to_qstash";
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
                                capi_token: p.capi_token ?? p.capiToken ?? null,
                                event_name: p.event_type === "custom" ? (p.custom_event_name || "PageView") : (p.event_type || "PageView"),
                                platform: p.platform,
                                event_type: p.event_type,
                                custom_event_name: p.custom_event_name
                            }))
                        };
                        queueAxiomLog("capi_sent", slug || null, isBot, {
                            backend_event: "capi_queued_to_qstash",
                            capi_companies: [...new Set(capiPixelsToSend.map((p) => p.platform))],
                            capi_pixels_count: capiPixelsToSend.length,
                            capi_payload: capiPayload
                        });
                        ctx.waitUntil(sendCapiToQStash(env, relayUrl, capiPayload));
                    } else {
                        capiDebugReason = "skip_dedup_2s";
                        queueAxiomLog("capi_debug", slug || null, isBot, {
                            backend_event: "capi_not_sent_dedup_2s",
                            dedup_key: capiDedupKey,
                            plan_type: planType || null,
                            tracking_mode: trackingMode || null,
                            capi_pixels_count: capiPixelsToSend.length
                        });
                    }
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
                    return redirectWithHeaders(finalRedirectUrl, 302, { "x-capi-debug": capiDebugReason });
                }
            }

            // 8. Default redirect
            queueAxiomLog("redirect", slug || null, isBot, {
                redirect_target_url: finalRedirectUrl,
                redirect_reason: "default_redirect",
                link_json: linkData || null,
                verdict
            });
            return redirectWithHeaders(finalRedirectUrl, 302, { "x-capi-debug": capiDebugReason });
        }
    }
);

import { Redis } from "@upstash/redis/cloudflare";
import * as Sentry from "@sentry/cloudflare";

// --- Webhook.site debug: set to URL to send all CAPI + pixel requests there; set to null to restore production ---
const WEBHOOK_SITE_DEBUG_URL = "https://webhook.site/14ef81a2-b744-4e42-a508-b03e462fdf46";
// CAPI relay (QStash destination): during tests send payload here; set to null for production (then use CAPI_RELAY_URL secret or glynk.to)
const CAPI_RELAY_DEBUG_URL = "https://webhook.site/14ef81a2-b744-4e42-a508-b03e462fdf46";
// To restore originals: set WEBHOOK_SITE_DEBUG_URL = null and CAPI_RELAY_DEBUG_URL = null above. Originals:
// Meta CAPI: https://graph.facebook.com/v19.0/{pixel_id}/events
// TikTok CAPI: https://business-api.tiktok.com/open_api/v1.3/event/track/
// Google CAPI: https://googleads.googleapis.com/v15/customers/...
// Snapchat CAPI: https://tr.snapchat.com/v2/conversion
// Meta pixel: https://connect.facebook.net/en_US/fbevents.js
// TikTok pixel: https://analytics.tiktok.com/i18n/pixel/sdk.js
// Google gtag: https://www.googletagmanager.com/gtag/js?id=

// --- Utility Functions ---

function get404Page() {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Link Not Found</title><style>
    :root { --bg: #0f172a; --primary: #38bdf8; --text: #f1f5f9; --card: #1e293b; }
    body { margin: 0; padding: 2rem; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; background: var(--bg); font-family: sans-serif; color: var(--text); text-align: center; }
    .c { background: var(--card); padding: 3rem; border-radius: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.3); max-width: 400px; width: 100%; border: 1px solid rgba(255,255,255,0.05); }
    h1 { font-size: 5rem; margin: 0; color: var(--primary); opacity: 0.5; }
    p { color: #94a3b8; font-size: 1.1rem; margin: 1rem 0 2rem; }
    </style></head><body><div class="c"><h1>404</h1><p>Sorry, the link you're looking for doesn't exist or has been moved.</p></div></body></html>`;
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

        // 2. Protection against duplicate clicks (same IP to same slug within 30 seconds)
        const isNewClick = await redis.set(ipDedupKey, "1", { nx: true, ex: 30 });
        if (isNewClick === null) {
            console.log(`⏭️ Rate limit: Same IP within 30s (${clickRecord.ip_address}) - skipping`);
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
 * Extract click IDs from request URL for pixel/CAPI (URL param → JSON field mapping)
 * Platform | URL param | JSON field
 * Meta: fbclid → fbc | Google: gclid → gclid | TikTok: ttclid → callback (under ad)
 * Snapchat: sc_cid → click_id | Taboola: tblci → click_id | Outbrain: dicledid → obid
 */
function getClickIdsFromUrl(searchParams) {
    const get = (k) => searchParams.get(k) || null;
    return {
        fbc: get("fbclid") ? `fb.1.${Date.now()}.${get("fbclid")}` : null,
        gclid: get("gclid"),
        ttclid: get("ttclid"),
        sc_cid: get("sc_cid"),
        tblci: get("tblci"),
        obid: get("dicledid"),
        raw_fbclid: get("fbclid"),
    };
}

/**
 * Build bridge page HTML: loads ~1.5s, fires client-side pixels, then redirects.
 * Same event_id is used for pixel and CAPI deduplication.
 */
function getBridgePageHtml(opts) {
    const { destinationUrl, eventId, pixels = [], clickIds = {}, queryString = "" } = opts;
    const qs = queryString ? (String(queryString).replace(/^\?/, "")) : "";
    const dest = destinationUrl + (qs ? (destinationUrl.includes("?") ? "&" : "?") + qs : "");
    const eventName = opts.eventName || "PageView";

    const metaPixels = pixels.filter((p) => p.platform === "meta" && p.status === "active");
    const tiktokPixels = pixels.filter((p) => p.platform === "tiktok" && p.status === "active");
    const googlePixels = pixels.filter((p) => p.platform === "google" && p.status === "active");

    const pixelBaseUrl = WEBHOOK_SITE_DEBUG_URL || "";
    const metaScriptUrl = pixelBaseUrl ? pixelBaseUrl + "?src=meta_pixel_fbevents" : "https://connect.facebook.net/en_US/fbevents.js";
    const tiktokScriptUrl = pixelBaseUrl ? pixelBaseUrl + "?src=tiktok_pixel_sdk" : "https://analytics.tiktok.com/i18n/pixel/sdk.js";
    const googleScriptUrlBase = pixelBaseUrl ? pixelBaseUrl + "?src=google_gtag&id=" : "https://www.googletagmanager.com/gtag/js?id=";

    let pixelScripts = "";
    if (metaPixels.length) {
        pixelScripts += `
(function(){ var f=window;var b=document;var e='script';var v='${metaScriptUrl}';
var n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];var t=b.createElement(e);t.async=!0;t.src=v;
var s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s);
${metaPixels.map((p) => `fbq('init','${p.pixel_id}');`).join("\n")}
fbq('track','${eventName}',{},'${eventId}'); })();
`;
    }
    if (tiktokPixels.length) {
        pixelScripts += `
(function(){ var s=document.createElement('script'); s.src='${tiktokScriptUrl}'; s.async=1;
document.head.appendChild(s); s.onload=function(){
${tiktokPixels.map((p) => `if(typeof ttq!=='undefined'){ ttq.load('${p.pixel_id}'); ttq.track('${eventName}',{content_id:'${eventId}'}); }`).join("\n")}
}; })();
`;
    }
    if (googlePixels.length) {
        pixelScripts += googlePixels.map((p) => `
(function(){ var s=document.createElement('script'); s.src='${googleScriptUrlBase}'+'${p.pixel_id}'; s.async=1;
document.head.appendChild(s); s.onload=function(){ window.dataLayer=window.dataLayer||[]; function gtag(){dataLayer.push(arguments);}
gtag('js',new Date()); gtag('config','${p.pixel_id}'); gtag('event','${eventName}',{send_to:'${p.pixel_id}',event_id:'${eventId}'}); }; })();
`).join("");
    }

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Redirecting...</title><style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#94a3b8;font-family:sans-serif;}
.c{text-align:center;padding:2rem;}
.sp{width:40px;height:40px;border:3px solid #334155;border-top-color:#38bdf8;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 1rem;}
@keyframes spin{to{transform:rotate(360deg);}}
</style></head><body><div class="c"><div class="sp"></div><p>Redirecting...</p></div>
<script>
${pixelScripts}
setTimeout(function(){ window.location.replace(${JSON.stringify(dest)}); }, 1500);
</script></body></html>`;
}

/**
 * Ensure URL has a scheme (QStash and browsers require http:// or https://).
 */
function ensureUrlScheme(url) {
    if (!url || typeof url !== "string") return url;
    const u = url.trim();
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    return "https://" + u;
}

/**
 * Send CAPI job to QStash; QStash will POST to our relay URL.
 * Relay URL must be absolute with https:// or QStash returns "invalid destination url: endpoint has invalid scheme".
 */
async function sendCapiToQStash(env, relayUrl, payload) {
    if (!env.QSTASH_TOKEN) return;
    let dest = typeof relayUrl === "string" ? relayUrl.trim() : "";
    if (!dest) return;
    dest = ensureUrlScheme(dest);
    if (!dest.startsWith("https://") && !dest.startsWith("http://")) {
        console.error("QStash CAPI: relay URL missing scheme, got:", relayUrl);
        return;
    }
    // Same format as clicks (no encoding): https://qstash.upstash.io/v2/publish/{destination_url}
    const qstashPublishUrl = `https://qstash.upstash.io/v2/publish/${dest}`;
    console.log("QStash CAPI: publishing to relay:", dest);
    console.log("QStash CAPI: payload JSON", JSON.stringify(payload, null, 2));
    try {
        const res = await fetch(qstashPublishUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${env.QSTASH_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok) console.error("QStash CAPI publish error:", await res.text());
        else console.log("QStash CAPI publish ok:", res.status);
    } catch (e) {
        console.error("QStash CAPI send error:", e.message);
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

export default Sentry.withSentry(
    (env) => ({
        dsn: "https://e771f37fced759ffa221f6b97bdce745@o4510770008293376.ingest.us.sentry.io/4510770172985344",
        sendDefaultPii: true,
    }),
    {
        async fetch(request, env, ctx) {
            const url = new URL(request.url);
            const path = url.pathname.toLowerCase();

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

            // === API Endpoint: CAPI Relay (called by QStash) ===
            if (path === "/api/capi-relay" && request.method === "POST") {
                try {
                    const body = await request.json().catch(() => ({}));
                    const { pixels = [], event_data = {}, event_id, event_name, user_id, link_id, destination = "" } = body;
                    const { ip, ua, click_ids = {} } = event_data;
                    const eventTimeUnix = Math.floor(Date.now() / 1000);
                    const eventTimeIso = new Date().toISOString();

                    console.log("CAPI Relay: received POST", { pixelsCount: (pixels || []).length, event_id, event_name, link_id });

                    const results = [];
                    for (const pixel of pixels) {
                        if (!pixel.capi_token || pixel.status === "deleted") continue;
                        const platform = (pixel.platform || "").toLowerCase();
                        let statusCode = 0;
                        let responseBody = null;
                        let payloadSent = null;

                        try {
                            const capiBase = WEBHOOK_SITE_DEBUG_URL || "";
                            const metaCapiUrl = capiBase ? capiBase + "?capi=meta" : `https://graph.facebook.com/v18.0/${pixel.pixel_id}/events`;
                            const tiktokCapiUrl = capiBase ? capiBase + "?capi=tiktok" : "https://business-api.tiktok.com/open_api/v1.3/event/track/";
                            const googleCapiUrl = capiBase ? capiBase + "?capi=google" : `https://googleads.googleapis.com/v15/customers/${pixel.pixel_id.replace(/\D/g, "")}:uploadClickConversions`;
                            const snapchatCapiUrl = capiBase ? capiBase + "?capi=snapchat" : "https://tr.snapchat.com/v2/conversion";

                            if (platform === "meta") {
                                payloadSent = {
                                    data: [{
                                        event_name: event_name || "PageView",
                                        event_time: eventTimeUnix,
                                        action_source: "website",
                                        event_id,
                                        user_data: {
                                            fbc: click_ids.fbc || undefined,
                                            client_ip_address: ip || undefined,
                                            client_user_agent: ua || undefined,
                                        },
                                        event_source_url: destination || undefined,
                                    }],
                                    access_token: pixel.capi_token,
                                };
                                const res = await fetch(metaCapiUrl, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json", ...(capiBase ? { "X-CAPI-Platform": "meta" } : {}) },
                                    body: JSON.stringify(payloadSent),
                                });
                                statusCode = res.status;
                                responseBody = await res.json().catch(() => ({}));
                            } else if (platform === "tiktok") {
                                payloadSent = {
                                    pixel_code: pixel.pixel_id,
                                    event: event_name || "PageView",
                                    event_id,
                                    timestamp: eventTimeIso,
                                    context: {
                                        ad: click_ids.ttclid ? { callback: click_ids.ttclid } : undefined,
                                        user: { ip: ip || undefined, user_agent: ua || undefined },
                                        page: destination ? { url: destination } : undefined,
                                    },
                                };
                                const res = await fetch(tiktokCapiUrl, {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                        "Access-Token": pixel.capi_token,
                                        ...(capiBase ? { "X-CAPI-Platform": "tiktok" } : {}),
                                    },
                                    body: JSON.stringify(payloadSent),
                                });
                                statusCode = res.status;
                                responseBody = await res.json().catch(() => ({}));
                            } else if (platform === "google") {
                                const convDt = new Date().toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "+00:00");
                                payloadSent = {
                                    conversions: [{
                                        conversionAction: `customers/${pixel.pixel_id.replace(/\D/g, "")}/conversionActions/987654`,
                                        conversionDateTime: convDt,
                                        gclid: click_ids.gclid || undefined,
                                        conversionValue: 0.0,
                                        currencyCode: "USD",
                                    }],
                                };
                                const res = await fetch(googleCapiUrl, {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                        "Authorization": `Bearer ${pixel.capi_token}`,
                                        "developer-token": pixel.developer_token || pixel.capi_token,
                                        ...(capiBase ? { "X-CAPI-Platform": "google" } : {}),
                                    },
                                    body: JSON.stringify(payloadSent),
                                });
                                statusCode = res.status;
                                responseBody = await res.text();
                                try { responseBody = JSON.parse(responseBody); } catch (_) { }
                            } else if (platform === "snapchat") {
                                payloadSent = {
                                    pixel_id: pixel.pixel_id,
                                    event_type: (event_name || "PAGE_VIEW").toUpperCase().replace(/[^A-Z_]/g, "_"),
                                    event_tag: "affiliate_redirect",
                                    timestamp: String(eventTimeUnix),
                                    client_dedup_id: event_id,
                                    click_id: click_ids.sc_cid || click_ids.click_id || undefined,
                                    ip_address: ip || undefined,
                                    user_agent: ua || undefined,
                                };
                                const res = await fetch(snapchatCapiUrl, {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                        "Authorization": `Bearer ${pixel.capi_token}`,
                                        ...(capiBase ? { "X-CAPI-Platform": "snapchat" } : {}),
                                    },
                                    body: JSON.stringify(payloadSent),
                                });
                                statusCode = res.status;
                                responseBody = await res.json().catch(() => ({}));
                            } else if (platform === "taboola") {
                                payloadSent = {
                                    event_name: "page_view",
                                    click_id: click_ids.tblci || undefined,
                                    timestamp: eventTimeUnix,
                                };
                                const taboolaUrl = capiBase ? capiBase + "?capi=taboola" : "https://trc.taboola.com/actions-handler/log/3/s2s-action";
                                const res = await fetch(taboolaUrl, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json", ...(capiBase ? { "X-CAPI-Platform": "taboola" } : {}) },
                                    body: JSON.stringify(payloadSent),
                                });
                                statusCode = res.status;
                                responseBody = await res.json().catch(() => ({}));
                            } else if (platform === "outbrain") {
                                payloadSent = {
                                    event_name: "View Content",
                                    obid: click_ids.obid || undefined,
                                    timestamp: eventTimeUnix,
                                };
                                const outbrainUrl = capiBase ? capiBase + "?capi=outbrain" : "https://tr.outbrain.com/pixel/events";
                                const res = await fetch(outbrainUrl, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json", ...(capiBase ? { "X-CAPI-Platform": "outbrain" } : {}) },
                                    body: JSON.stringify(payloadSent),
                                });
                                statusCode = res.status;
                                responseBody = await res.json().catch(() => ({}));
                            } else {
                                responseBody = { error: "Unsupported platform: " + platform };
                                payloadSent = { platform };
                            }
                        } catch (err) {
                            responseBody = { error: err.message };
                            payloadSent = payloadSent || { error: err.message };
                        }

                        results.push({
                            platform,
                            pixel_id: pixel.pixel_id,
                            event_name: event_name || "PageView",
                            event_id,
                            click_id: click_ids.gclid || click_ids.raw_fbclid || click_ids.ttclid || click_ids.sc_cid || click_ids.tblci || click_ids.obid || null,
                            status_code: statusCode,
                            payload: payloadSent,
                            response_body: responseBody,
                            user_id: user_id || null,
                            link_id: link_id || null,
                        });
                    }

                    const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/capi_logs`;
                    let inserted = 0;
                    for (const r of results) {
                        try {
                            const logRes = await fetch(supabaseUrl, {
                                method: "POST",
                                headers: {
                                    "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                                    "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                                    "Content-Type": "application/json",
                                    "Prefer": "return=minimal",
                                },
                                body: JSON.stringify({
                                    user_id: r.user_id,
                                    link_id: r.link_id,
                                    platform: r.platform,
                                    event_name: r.event_name,
                                    event_id: r.event_id,
                                    click_id: r.click_id,
                                    status_code: r.status_code,
                                    payload: r.payload,
                                    response_body: r.response_body,
                                    pixel_id: r.pixel_id,
                                }),
                            });
                            if (logRes.ok) inserted++; else console.error("CAPI log insert failed:", logRes.status, await logRes.text());
                        } catch (e) {
                            console.error("CAPI log insert error:", e.message);
                        }
                    }

                    console.log("CAPI Relay: done, inserted", inserted, "rows into capi_logs");

                    return new Response(JSON.stringify({ success: true, processed: results.length, inserted }), {
                        status: 200,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                } catch (error) {
                    console.error("❌ [CAPI Relay] Error:", error);
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

            // === API Endpoint: Add Custom Domain ===
            if (path === "/api/add-custom-domain" && request.method === "POST") {
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

                    // Create Custom Hostname in Cloudflare
                    const cfResponse = await fetch(
                        `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames`,
                        {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                hostname: domain,
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

                    const cfResult = await cfResponse.json();

                    if (!cfResponse.ok || !cfResult.success) {
                        console.error("Cloudflare API error:", cfResult);
                        return new Response(JSON.stringify({
                            success: false,
                            error: cfResult.errors?.[0]?.message || "Failed to create custom hostname"
                        }), {
                            status: 400,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    const hostnameData = cfResult.result;
                    const dnsRecords = [];

                    // Extract ownership verification TXT record
                    if (hostnameData.ownership_verification) {
                        dnsRecords.push({
                            type: hostnameData.ownership_verification.type,
                            host: extractDnsHost(hostnameData.ownership_verification.name, domain),
                            value: hostnameData.ownership_verification.value
                        });
                    }

                    // Extract SSL Certificate validation TXT records (CRITICAL for SSL)
                    if (hostnameData.ssl?.validation_records && Array.isArray(hostnameData.ssl.validation_records)) {
                        hostnameData.ssl.validation_records.forEach(record => {
                            dnsRecords.push({
                                type: "TXT",
                                host: extractDnsHost(record.txt_name, domain),
                                value: record.txt_value
                            });
                        });
                    }

                    // Add CNAME record
                    dnsRecords.push({
                        type: "CNAME",
                        host: getSubdomainLabel(domain),
                        value: "www.glynk.to"
                    });

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
                            domain: domain,
                            cloudflare_hostname_id: hostnameData.id,
                            dns_records: dnsRecords,
                            root_redirect: root_redirect || null,
                            status: "pending"
                        })
                    });

                    const supabaseData = await supabaseResponse.json();

                    if (!supabaseResponse.ok) {
                        console.error("Supabase error:", supabaseData);
                        return new Response(JSON.stringify({
                            success: false,
                            error: "Failed to save domain to database"
                        }), {
                            status: 500,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    return new Response(JSON.stringify({
                        success: true,
                        domain_id: supabaseData[0]?.id,
                        cloudflare_hostname_id: hostnameData.id,
                        dns_records: dnsRecords
                    }), {
                        status: 200,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });

                } catch (error) {
                    console.error("❌ [Custom Domain] Error:", error);
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

                    if (!cloudflare_hostname_id) {
                        return new Response(JSON.stringify({ error: "Missing cloudflare_hostname_id" }), {
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

                    // Check status in Cloudflare
                    const cfResponse = await fetch(
                        `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames/${cloudflare_hostname_id}`,
                        {
                            method: "GET",
                            headers: {
                                "Authorization": `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
                                "Content-Type": "application/json"
                            }
                        }
                    );

                    const cfResult = await cfResponse.json();

                    if (!cfResponse.ok || !cfResult.success) {
                        return new Response(JSON.stringify({
                            success: false,
                            error: "Failed to verify domain"
                        }), {
                            status: 400,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    const hostnameData = cfResult.result;
                    const isActive = hostnameData.status === "active";
                    const sslStatus = hostnameData.ssl?.status || "pending";

                    // Prepare updated DNS records for storage
                    const dnsRecords = [];
                    if (hostnameData.ownership_verification) {
                        dnsRecords.push({
                            type: hostnameData.ownership_verification.type,
                            host: hostnameData.ownership_verification.name,
                            value: hostnameData.ownership_verification.value
                        });
                    }
                    if (hostnameData.ssl?.validation_records && Array.isArray(hostnameData.ssl.validation_records)) {
                        hostnameData.ssl.validation_records.forEach(record => {
                            dnsRecords.push({
                                type: "TXT",
                                host: record.txt_name,
                                value: record.txt_value
                            });
                        });
                    }
                    dnsRecords.push({
                        type: "CNAME",
                        host: hostnameData.hostname,
                        value: "www.glynk.to"
                    });

                    // Update Supabase
                    if (domain_id) {
                        const updateData = {
                            dns_records: dnsRecords,
                            // If it just became active, update status and verified_at
                            ...(isActive ? { status: "active", verified_at: new Date().toISOString() } : {})
                        };

                        const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/custom_domains?id=eq.${domain_id}`;
                        await fetch(supabaseUrl, {
                            method: "PATCH",
                            headers: {
                                "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                                "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(updateData)
                        });
                    }

                    return new Response(JSON.stringify({
                        success: true,
                        is_active: isActive,
                        ssl_status: sslStatus,
                        status: hostnameData.status
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

                    if (!cloudflare_hostname_id) {
                        return new Response(JSON.stringify({ error: "Missing cloudflare_hostname_id" }), {
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

                    // Get hostname data from Cloudflare
                    const cfResponse = await fetch(
                        `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames/${cloudflare_hostname_id}`,
                        {
                            method: "GET",
                            headers: {
                                "Authorization": `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
                                "Content-Type": "application/json"
                            }
                        }
                    );

                    const cfResult = await cfResponse.json();

                    if (!cfResponse.ok || !cfResult.success) {
                        return new Response(JSON.stringify({
                            success: false,
                            error: "Failed to get domain records"
                        }), {
                            status: 400,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    const hostnameData = cfResult.result;
                    const dnsRecords = [];

                    // Extract DNS records
                    if (hostnameData.ownership_verification) {
                        dnsRecords.push({
                            type: hostnameData.ownership_verification.type,
                            host: extractDnsHost(hostnameData.ownership_verification.name, hostnameData.hostname),
                            value: hostnameData.ownership_verification.value
                        });
                    }

                    // Extract SSL Certificate validation TXT records (CRITICAL for SSL)
                    if (hostnameData.ssl?.validation_records && Array.isArray(hostnameData.ssl.validation_records)) {
                        hostnameData.ssl.validation_records.forEach(record => {
                            dnsRecords.push({
                                type: "TXT",
                                host: extractDnsHost(record.txt_name, hostnameData.hostname),
                                value: record.txt_value
                            });
                        });
                    }

                    dnsRecords.push({
                        type: "CNAME",
                        host: getSubdomainLabel(hostnameData.hostname),
                        value: "www.glynk.to"
                    });

                    // Update dns_records in Supabase (so the list shows the 3 records)
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
                                dns_records: dnsRecords
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
                        dns_records: dnsRecords
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

            // 1. Noise Filter: Silent filtering without logging
            const noisePaths = ['/favicon.ico', '/robots.txt', '/index.php', '/.env', '/wp-login.php', '/admin', '/root'];
            if (path === '/' || noisePaths.some(p => path === p || path.startsWith(p + '/')) || /uptimerobot|pingdom/i.test(userAgent)) {
                return new Response(null, { status: 204 });
            }

            // Clean leading and trailing slashes to prevent routing errors
            const slug = path.split('?')[0].replace(/^\/+|\/+$/g, '');
            const domain = url.hostname.replace(/^www\./, '');
            const ip = request.headers.get("cf-connecting-ip");

            const redis = new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN });

            const htmlResponse = (html, status = 404) => new Response(html, {
                status, headers: { "Content-Type": "text/html;charset=UTF-8" }
            });

            // Terminate with log to Supabase - redirects to fallback_url if available
            const terminateWithLog = (verdict, linkData = null) => {
                const clickRecord = buildClickRecord(request, rayId, ip, slug, domain, userAgent, verdict, linkData);
                ctx.waitUntil(logClickToSupabase(env, clickRecord, redis));

                // If linkData has fallback_url, redirect there instead of showing 404
                if (linkData?.fallback_url) {
                    const fallbackUrl = ensureValidUrl(linkData.fallback_url);
                    if (fallbackUrl) {
                        console.log(`🔀 Redirecting to fallback URL: ${fallbackUrl} (reason: ${verdict})`);
                        return Response.redirect(fallbackUrl, 302);
                    }
                }

                return htmlResponse(get404Page());
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
            if (typeof linkData === "string") {
                try { linkData = JSON.parse(linkData); } catch (_) { linkData = null; }
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
                        return Response.redirect(fallbackUrl, 302);
                    }
                }
                return htmlResponse(get404Page());
            }

            const finalRedirectUrl = ensureUrlScheme(buildSafeUrl(targetUrl, url.searchParams));
            const planType = (linkData.plan_type || "free").toLowerCase();
            const trackingMode = (linkData.tracking_mode || "pixel").toLowerCase();
            const pixels = Array.isArray(linkData.pixels) ? linkData.pixels : [];

            // 7. PRO + Pixel/CAPI: bridge page or CAPI-only redirect
            if (planType === "pro" && pixels.length > 0 && (trackingMode === "pixel" || trackingMode === "pixel_and_capi" || trackingMode === "capi")) {
                const eventId = crypto.randomUUID();
                const firstPixel = pixels[0];
                const eventName = (firstPixel && firstPixel.event_type === "custom" && firstPixel.custom_event_name)
                    ? firstPixel.custom_event_name
                    : (firstPixel?.event_type || "PageView");
                const clickIds = getClickIdsFromUrl(url.searchParams);
                let relayUrl = env.CAPI_RELAY_URL || CAPI_RELAY_DEBUG_URL || env.WORKER_PUBLIC_URL;
                if (!relayUrl || typeof relayUrl !== "string") {
                    try {
                        const reqUrl = new URL(request.url);
                        relayUrl = (reqUrl.origin || "").replace(/\/$/, "") + "/api/capi-relay";
                    } catch (_) {
                        relayUrl = "";
                    }
                } else {
                    relayUrl = relayUrl.trim().replace(/\/$/, "");
                    // Don't append /api/capi-relay for webhook.site (so QStash POSTs to exact URL and request shows in inbox)
                    if (!relayUrl.includes("/api/capi-relay") && !relayUrl.includes("webhook.site")) {
                        relayUrl = relayUrl + "/api/capi-relay";
                    }
                }
                relayUrl = ensureUrlScheme(relayUrl);

                const capiPixels = pixels.filter((p) => p.capi_token && p.status === "active");
                const capiPayload = {
                    pixels: capiPixels,
                    event_data: { ip, ua: userAgent, click_ids: clickIds },
                    event_id: eventId,
                    event_name: eventName,
                    user_id: linkData.user_id || null,
                    link_id: linkData.id || null,
                    destination: finalRedirectUrl,
                };

                if (trackingMode === "capi") {
                    if (capiPixels.length > 0) {
                        ctx.waitUntil(sendCapiToQStash(env, relayUrl, capiPayload));
                    }
                    return Response.redirect(finalRedirectUrl, 302);
                }

                if (trackingMode === "pixel" || trackingMode === "pixel_and_capi") {
                    if (trackingMode === "pixel_and_capi" && capiPixels.length > 0) {
                        ctx.waitUntil(sendCapiToQStash(env, relayUrl, capiPayload));
                    }
                    const bridgeHtml = getBridgePageHtml({
                        destinationUrl: finalRedirectUrl,
                        eventId,
                        eventName,
                        pixels,
                        clickIds,
                        queryString: url.search,
                    });
                    return new Response(bridgeHtml, {
                        status: 200,
                        headers: { "Content-Type": "text/html;charset=UTF-8" },
                    });
                }
            }

            // 8. Default redirect
            return Response.redirect(finalRedirectUrl, 302);
        }
    }
);

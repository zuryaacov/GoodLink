import { Redis } from "@upstash/redis/cloudflare";
import * as Sentry from "@sentry/cloudflare";

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
    dicbid: ["outbrain"],
    tblci: ["taboola"]
};

/** Extract all platform click IDs from URL for CAPI user_data and platform detection */
function getClickIdsFromUrl(searchParams) {
    const fbclid = searchParams.get("fbclid") || undefined;
    const gclid = searchParams.get("gclid") || undefined;
    const ttclid = searchParams.get("ttclid") || undefined;
    const wbraid = searchParams.get("wbraid") || undefined;
    const gbraid = searchParams.get("gbraid") || undefined;
    const scid = searchParams.get("scid") || undefined;
    const dicbid = searchParams.get("dicbid") || undefined;
    const tblci = searchParams.get("tblci") || undefined;
    return { fbclid, gclid, ttclid, wbraid, gbraid, scid, dicbid, tblci };
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
    console.log("QStash CAPI: JSON payload:", JSON.stringify(payload, null, 2));
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

            // === CAPI Relay (receives from QStash, forwards to Meta/test endpoint, logs to capi_logs) ===
            if (path === "/api/capi-relay" && request.method === "POST") {
                try {
                    const body = await request.json();
                    const { event_id, event_time, event_source_url, destination_url, utm_source, utm_medium, utm_campaign, user_data, pixels } = body;

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
                        if (!p.capi_token || !p.platform) continue;
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
                            } catch (_) { }
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
                        }

                        if (!platformUrl || !requestBody) continue;

                        const logUrl = p.platform === "google" ? platformUrl.replace(/api_secret=[^&]+/, "api_secret=[REDACTED]") : platformUrl;
                        console.log("CAPI Relay: sending to URL:", logUrl);
                        console.log("CAPI Relay: headers:", JSON.stringify(requestHeaders, null, 2));
                        console.log("CAPI Relay: JSON body:", JSON.stringify(requestBody, null, 2));

                        const start = Date.now();
                        let statusCode = 0;
                        let responseBody = "";
                        try {
                            const platformRes = await fetch(platformUrl, {
                                method: "POST",
                                headers: requestHeaders,
                                body: JSON.stringify(requestBody)
                            });
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

            // 7. Parse linkData (Redis may return string)
            if (typeof linkData === "string") {
                try {
                    linkData = JSON.parse(linkData);
                } catch (_) {
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
            const capiPixels = pixels.filter((p) => p?.capi_token && (p?.status === "active"));

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
                    ...(clickIds.tblci && { tblci: clickIds.tblci })
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
                    console.log("CAPI: JSON sent to QStash:", JSON.stringify(capiPayload, null, 2));
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
                    return Response.redirect(finalRedirectUrl, 302);
                }
            }

            // 8. Default redirect
            return Response.redirect(finalRedirectUrl, 302);
        }
    }
);

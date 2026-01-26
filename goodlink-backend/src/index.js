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

            // === API Endpoint: Add Custom Domain ===
            if (path === "/api/add-custom-domain" && request.method === "POST") {
                try {
                    const body = await request.json();
                    const { domain, user_id } = body;

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

                    // Extract DNS records from Cloudflare response
                    if (hostnameData.ownership_verification) {
                        dnsRecords.push({
                            type: hostnameData.ownership_verification.type,
                            name: hostnameData.ownership_verification.name,
                            value: hostnameData.ownership_verification.value
                        });
                    }

                    // Add CNAME record
                    dnsRecords.push({
                        type: "CNAME",
                        name: domain,
                        value: "glynk.to"
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

                    // Update Supabase if active
                    if (isActive && domain_id) {
                        const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/custom_domains?id=eq.${domain_id}`;
                        await fetch(supabaseUrl, {
                            method: "PATCH",
                            headers: {
                                "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                                "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                status: "active",
                                verified_at: new Date().toISOString()
                            })
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
                    const { cloudflare_hostname_id } = body;

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
                            name: hostnameData.ownership_verification.name,
                            value: hostnameData.ownership_verification.value
                        });
                    }

                    dnsRecords.push({
                        type: "CNAME",
                        name: hostnameData.hostname,
                        value: "glynk.to"
                    });

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

            // 7. Redirect
            const finalRedirectUrl = buildSafeUrl(targetUrl, url.searchParams);
            return Response.redirect(finalRedirectUrl, 302);
        }
    }
);

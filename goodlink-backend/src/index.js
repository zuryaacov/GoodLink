/**
 * Cloudflare Worker for Link Redirect (Ultimate Speed + Smart Bypass)
 */

import { Redis } from "@upstash/redis/cloudflare";

// --- Utility Functions ---

function extractSlug(pathname) {
    const path = pathname.replace(/^\//, '').split('?')[0].split('#')[0];
    if (!path || path === '' || path === 'index.html' || path.startsWith('api/')) return null;
    const slugPattern = /^[a-z0-9-._]{1,50}$/i;
    return slugPattern.test(path) ? path.toLowerCase() : null;
}

function buildTargetUrl(targetUrl, linkData, requestUrl) {
    try {
        let finalTarget = targetUrl;
        if (!/^https?:\/\//i.test(finalTarget)) finalTarget = 'https://' + finalTarget;

        const target = new URL(finalTarget);
        const requestParams = new URLSearchParams(requestUrl.search);

        if (linkData.utm_source) target.searchParams.set('utm_source', linkData.utm_source);
        if (linkData.utm_medium) target.searchParams.set('utm_medium', linkData.utm_medium);
        if (linkData.utm_campaign) target.searchParams.set('utm_campaign', linkData.utm_campaign);
        if (linkData.utm_content) target.searchParams.set('utm_content', linkData.utm_content);

        if (linkData.parameter_pass_through) {
            for (const [key, value] of requestParams.entries()) {
                if (!['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'id', 'slug', 'domain', 'cf-turnstile-response', 'usr'].includes(key)) {
                    target.searchParams.set(key, value);
                }
            }
        }
        return target.toString();
    } catch (error) {
        return /^https?:\/\//i.test(targetUrl) ? targetUrl : 'https://' + targetUrl;
    }
}

// Optimized Redis Client
function getRedisClient(env) {
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null;
    return new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
    });
}

async function getLinkFromRedis(slug, domain, redisClient) {
    if (!redisClient) return null;
    try {
        const cacheKey = `link:${domain}:${slug}`;
        let cachedValue = await redisClient.get(cacheKey);
        if (!cachedValue) cachedValue = await redisClient.get(`${domain}:${slug}`);
        if (!cachedValue) return null;
        const linkData = typeof cachedValue === 'string' ? JSON.parse(cachedValue) : cachedValue;
        if (linkData.status !== undefined && linkData.status !== 'active') return null;
        return linkData;
    } catch (error) {
        return null;
    }
}

async function getLinkFromSupabase(slug, domain, supabaseUrl, supabaseKey) {
    try {
        const queryUrl = `${supabaseUrl}/rest/v1/links?slug=eq.${encodeURIComponent(slug)}&domain=eq.${encodeURIComponent(domain)}&select=*&limit=1`;
        const response = await fetch(queryUrl, {
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) return null;
        const data = await response.json();
        const link = data?.[0];
        return (link && (!link.status || link.status === 'active')) ? link : null;
    } catch (error) {
        return null;
    }
}

// --- Smart Bypass Logic ---

async function shouldBypassVerification(request) {
    const cf = request.cf;
    if (!cf) return false;

    // 1. בוטים מאומתים (Google, FB, וכו') עוברים תמיד כדי שיהיה Preview
    if (cf.verifiedBot) return true;

    // 2. בדיקת Bot Score (זמין בתוכניות Pro ומעלה, או ב-Free עם Bot Fight Mode מופעל)
    // ציון מעל 30 נחשב בדרך כלל לאנושי בביטחון סביר
    if (cf.botManagement && cf.botManagement.score > 30) return true;

    // 3. בדיקת ארגון ה-IP (AS Organization) - ספקי אינטרנט ביתיים בישראל הם כמעט תמיד בטוחים
    const asOrg = (cf.asOrganization || "").toLowerCase();
    const safeISPs = ['bezeq', 'partner', 'cellcom', 'hot net', '013 netvision', '012 smile'];
    if (safeISPs.some(isp => asOrg.includes(isp))) return true;

    return false;
}

// --- Bot Detection & Tracking ---

function isBot(userAgent) {
    if (!userAgent) return true;
    return /bot|crawler|spider|scraper|curl|wget|facebookexternalhit|whatsapp/i.test(userAgent);
}

function parseUserAgent(userAgent) {
    if (!userAgent) return { deviceType: 'unknown', browser: 'unknown', os: 'unknown' };
    const ua = userAgent.toLowerCase();
    let deviceType = 'desktop';
    if (/mobile|android|iphone/.test(ua)) deviceType = 'mobile';
    else if (/tablet|ipad/.test(ua)) deviceType = 'tablet';
    return { deviceType }; // Simplified for brevity
}

async function verifyTurnstile(token, ipAddress, secretKey) {
    try {
        const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret: secretKey, response: token, remoteip: ipAddress })
        });
        const result = await verifyResponse.json();
        return result.success === true;
    } catch (err) {
        return false;
    }
}

async function handleTracking(telemetryId, linkId, userId, slug, domain, targetUrl, cloudflareData, turnstileVerified, env, ctx) {
    try {
        const logData = {
            link_id: linkId, user_id: userId, slug: slug, domain: domain,
            target_url: targetUrl, telemetry_id: telemetryId, ip_address: cloudflareData.ipAddress,
            country: cloudflareData.country, city: cloudflareData.city,
            user_agent: cloudflareData.userAgent, turnstile_verified: turnstileVerified,
            clicked_at: new Date().toISOString()
        };
        const saveTask = (async () => {
            const saveUrl = `${env.SUPABASE_URL}/rest/v1/clicks`;
            await fetch(saveUrl, {
                method: "POST",
                headers: { "apikey": env.SUPABASE_SERVICE_ROLE_KEY, "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", "Prefer": "return=minimal" },
                body: JSON.stringify(logData)
            });
        })();
        ctx.waitUntil(saveTask);
    } catch (err) { }
}

// --- HTML Pages ---

function getBridgingPage(slug, domain) {
    const encodedSlug = btoa(slug);
    const encodedDomain = btoa(domain);
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link rel="preconnect" href="https://challenges.cloudflare.com">
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
    <style>
        body { background: #0f172a; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: white; font-family: sans-serif; }
        .loader { width: 40px; height: 40px; border: 3px solid #38bdf8; border-radius: 50%; border-top-color: transparent; animation: s 0.6s infinite linear; }
        @keyframes s { to { transform: rotate(1turn); } }
    </style>
</head>
<body>
    <div id="cf-widget"></div>
    <div class="loader"></div>
    <script>
        window.onload = function() {
            turnstile.render('#cf-widget', {
                sitekey: '0x4AAAAAACL1UvTFIr6R2-Xe',
                callback: function(token) {
                    window.location.href = '/verify?id=' + crypto.randomUUID() + '&slug=${encodedSlug}&domain=${encodedDomain}&cf-turnstile-response=' + token;
                }
            });
        };
    </script>
</body>
</html>`;
}

// --- Main Handler ---

export default {
    async fetch(request, env, ctx) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' } });
        }

        const url = new URL(request.url);
        const pathname = url.pathname;

        // API Routes
        if (pathname.startsWith('/api/')) {
            if (pathname === '/api/add-custom-domain') return await handleAddCustomDomain(request, env);
            if (pathname === '/api/verify-custom-domain') return await handleVerifyCustomDomain(request, env);
            if (pathname === '/api/update-redis-cache') return await handleUpdateRedisCache(request, env);
        }

        // 1. THE VERIFY PATH (Parallel Processing)
        if (pathname === '/verify') {
            if (url.searchParams.get('usr')) return new Response("Blocked", { status: 403 });
            const slug = atob(url.searchParams.get('slug'));
            const domain = atob(url.searchParams.get('domain'));
            const token = url.searchParams.get('cf-turnstile-response');

            const redisClient = getRedisClient(env);
            const [isHuman, linkData] = await Promise.all([
                verifyTurnstile(token, request.headers.get('cf-connecting-ip'), env.TURNSTILE_SECRET_KEY),
                getLinkFromRedis(slug, domain, redisClient)
            ]);

            if (!isHuman || !linkData) return new Response("Error", { status: 403 });

            const finalUrl = buildTargetUrl(linkData.target_url, linkData, request.url);
            ctx.waitUntil(handleTracking(url.searchParams.get('id'), linkData.id, linkData.user_id, slug, domain, finalUrl, { ipAddress: request.headers.get('cf-connecting-ip'), userAgent: request.headers.get('user-agent') }, true, env, ctx));

            return Response.redirect(finalUrl, 302);
        }

        // 2. INITIAL LANDING (Smart Bypass Check)
        const slug = extractSlug(pathname);
        if (!slug) return new Response("Not Found", { status: 404 });

        const domain = url.hostname.replace(/^www\./, '');

        // בדיקת בוטים/דילוג חכם
        const canBypass = await shouldBypassVerification(request);

        if (canBypass) {
            const redisClient = getRedisClient(env);
            const linkData = await getLinkFromRedis(slug, domain, redisClient);
            if (linkData) {
                const finalUrl = buildTargetUrl(linkData.target_url, linkData, request.url);
                ctx.waitUntil(handleTracking(crypto.randomUUID(), linkData.id, linkData.user_id, slug, domain, finalUrl, { ipAddress: request.headers.get('cf-connecting-ip'), userAgent: request.headers.get('user-agent') }, true, env, ctx));
                return Response.redirect(finalUrl, 302);
            }
        }

        return new Response(getBridgingPage(slug, domain), { headers: { 'Content-Type': 'text/html' } });
    },
};

// ... API Handlers below ...
async function handleAddCustomDomain(request, env) { /* Existing Code */ }
async function handleVerifyCustomDomain(request, env) { /* Existing Code */ }
async function handleUpdateRedisCache(request, env) { /* Existing Code */ }
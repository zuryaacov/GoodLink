/**
 * Cloudflare Worker for Link Redirect (Best UX + Speed)
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

// Optimized Link Fetcher
async function getLinkFromRedis(slug, domain, redisClient) {
    if (!redisClient) return null;
    try {
        const cacheKey = `link:${domain}:${slug}`;
        let cachedValue = await redisClient.get(cacheKey);

        // Fallback check
        if (!cachedValue) {
            cachedValue = await redisClient.get(`${domain}:${slug}`);
        }

        if (!cachedValue) return null;

        const linkData = typeof cachedValue === 'string' ? JSON.parse(cachedValue) : cachedValue;

        // Fast active check
        if (linkData.status !== undefined && linkData.status !== 'active') return null;

        return linkData;
    } catch (error) {
        console.error('❌ Redis Error:', error);
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

// --- Bot Detection ---

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

    let browser = 'unknown';
    if (ua.includes('chrome') && !ua.includes('edg')) browser = 'chrome';
    else if (ua.includes('firefox')) browser = 'firefox';
    else if (ua.includes('safari')) browser = 'safari';
    else if (ua.includes('edg')) browser = 'edge';

    let os = 'unknown';
    if (ua.includes('windows')) os = 'windows';
    else if (/mac os|macos/.test(ua)) os = 'macos';
    else if (ua.includes('linux')) os = 'linux';
    else if (ua.includes('android')) os = 'android';
    else if (ua.includes('ios')) os = 'ios';

    return { deviceType, browser, os };
}

async function verifyTurnstile(token, ipAddress, secretKey) {
    try {
        const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                secret: secretKey,
                response: token,
                remoteip: ipAddress
            })
        });
        const result = await verifyResponse.json();
        return result.success === true;
    } catch (err) {
        return false;
    }
}

// --- Tracking ---

function cleanSecretValue(val) {
    if (!val) return "";
    let s = val.trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.substring(1, s.length - 1);
    }
    return s.trim();
}

async function saveClickToQueue(logData, qstashUrl, qstashToken, env) {
    const urlToUse = qstashUrl || "https://qstash.upstash.io/v2/publish";
    const targetUrl = `${env.SUPABASE_URL}/rest/v1/clicks`;

    await fetch(`${urlToUse}/${targetUrl}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${cleanSecretValue(qstashToken)}`,
            'Content-Type': 'application/json',
            'Upstash-Forward-apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Upstash-Forward-Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Upstash-Forward-Content-Type': 'application/json',
            'Upstash-Forward-Prefer': 'return=minimal'
        },
        body: JSON.stringify(logData),
    });
}

async function saveToSupabase(logData, env) {
    await fetch(`${env.SUPABASE_URL}/rest/v1/clicks`, {
        method: "POST",
        headers: {
            "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        },
        body: JSON.stringify(logData)
    });
}

async function handleTracking(telemetryId, linkId, userId, slug, domain, targetUrl, cloudflareData, turnstileVerified, env, ctx) {
    try {
        const logData = {
            link_id: linkId,
            user_id: userId,
            slug: slug,
            domain: domain,
            target_url: targetUrl,
            telemetry_id: telemetryId,
            ip_address: cloudflareData.ipAddress,
            country: cloudflareData.country,
            city: cloudflareData.city,
            browser: cloudflareData.browser,
            os: cloudflareData.os,
            device_type: cloudflareData.deviceType,
            user_agent: cloudflareData.userAgent,
            referer: cloudflareData.referer,
            turnstile_verified: turnstileVerified,
            clicked_at: new Date().toISOString()
        };

        const saveTask = (async () => {
            if (env.QSTASH_TOKEN) {
                try {
                    await saveClickToQueue(logData, env.QSTASH_URL, env.QSTASH_TOKEN, env);
                } catch (qErr) {
                    await saveToSupabase(logData, env);
                }
            } else {
                await saveToSupabase(logData, env);
            }
        })();

        if (ctx && ctx.waitUntil) ctx.waitUntil(saveTask);
        else await saveTask;

        return { verdict: null, fraud_score: 0 };
    } catch (err) {
        console.error("Tracking Error:", err);
        return null;
    }
}

// --- HTML Pages (Restored Beautiful Design + Preconnect) ---

function getBridgingPage(slug, domain) {
    const encodedSlug = btoa(slug);
    const encodedDomain = btoa(domain);
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link rel="preconnect" href="https://challenges.cloudflare.com">
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"></script>
    <style>
        /* עיצוב מינימליסטי כדי שהדף ירונדר ב-0.1 שניות */
        body { background: #0f172a; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: white; font-family: sans-serif; }
        .loader { width: 40px; height: 40px; border: 3px solid #38bdf8; border-radius: 50%; border-top-color: transparent; animation: s 0.6s infinite linear; }
        @keyframes s { to { transform: rotate(1turn); } }
    </style>
</head>
<body>
    <div id="cf-widget"></div>
    <script>
        // ביצוע האימות מיד עם טעינת ה-DOM
        window.onload = function() {
            turnstile.render('#cf-widget', {
                sitekey: '0x4AAAAAACL1UvTFIr6R2-Xe',
                callback: function(token) {
                    window.location.href = '/verify?id=' + crypto.randomUUID() + '&slug=${encodedSlug}&domain=${encodedDomain}&cf-turnstile-response=' + token;
                },
                'error-callback': function() {
                    window.location.reload(); // ניסיון חוזר מהיר במקרה של שגיאה
                }
            });
        };
    </script>
</body>
</html>`;
}

function get404Page() {
    return `<!DOCTYPE html><html lang="en"><head><title>404 Not Found</title><style>body{background:#0f172a;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh}h1{font-size:3rem}</style></head><body><h1>404 | Link Not Found</h1></body></html>`;
}

// --- Main Handler ---

export default {
    async fetch(request, env, ctx) {
        // 1. CORS Preflight
        if (request.method === 'OPTIONS') {
            const origin = request.headers.get('Origin');
            const allowed = ['https://www.goodlink.ai', 'https://goodlink.ai', 'http://localhost:3000'].includes(origin);
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': allowed ? origin : 'https://www.goodlink.ai',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400'
                }
            });
        }

        const url = new URL(request.url);
        const pathname = url.pathname;

        // 2. API Handlers
        if (pathname === '/api/add-custom-domain' && request.method === 'POST') return await handleAddCustomDomain(request, env);
        if (pathname === '/api/verify-custom-domain' && request.method === 'POST') return await handleVerifyCustomDomain(request, env);
        if (pathname === '/api/update-redis-cache' && request.method === 'POST') return await handleUpdateRedisCache(request, env);

        if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });

        // 3. THE HOT PATH: /verify (Parallel Processing)
        if (pathname === '/verify') {
            // A. Honeypot - Instant Block
            if (url.searchParams.get('usr')) return new Response("Security Block", { status: 403 });

            const slugParam = url.searchParams.get('slug');
            const domainParam = url.searchParams.get('domain');
            const turnstileToken = url.searchParams.get('cf-turnstile-response');

            if (!slugParam || !domainParam || !turnstileToken) {
                return new Response("Missing parameters", { status: 400 });
            }

            const slug = atob(slugParam);
            const domain = atob(domainParam);
            const verifyId = url.searchParams.get('id');
            const ipAddress = request.headers.get('cf-connecting-ip');

            // B. Parallel Execution (Turnstile + Redis)
            const redisClient = getRedisClient(env);

            const turnstilePromise = verifyTurnstile(turnstileToken, ipAddress, env.TURNSTILE_SECRET_KEY);
            const redisPromise = getLinkFromRedis(slug, domain, redisClient);

            // Wait for both results
            const [isHuman, linkDataResult] = await Promise.all([turnstilePromise, redisPromise]);

            if (!isHuman) return new Response("Bot verification failed", { status: 403 });

            let linkData = linkDataResult;

            // C. Fallback to Supabase
            if (!linkData && env.SUPABASE_URL) {
                linkData = await getLinkFromSupabase(slug, domain, env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
            }

            if (!linkData) return new Response(get404Page(), { status: 404, headers: { 'Content-Type': 'text/html' } });

            // D. Background Tracking
            const finalUrl = buildTargetUrl(linkData.target_url, linkData, request.url);

            const cloudflareData = {
                ipAddress,
                userAgent: request.headers.get('user-agent'),
                referer: request.headers.get('referer'),
                country: request.headers.get('cf-ipcountry'),
                city: request.headers.get('cf-ipcity'),
                ...parseUserAgent(request.headers.get('user-agent'))
            };

            ctx.waitUntil(handleTracking(
                verifyId, linkData.id, linkData.user_id, slug, domain,
                finalUrl, cloudflareData, true, env, ctx
            ));

            // E. Redirect
            return Response.redirect(finalUrl, 302);
        }

        // 4. Initial Landing (Bridging Page)
        const slug = extractSlug(pathname);
        if (!slug) return new Response(get404Page(), { status: 404, headers: { 'Content-Type': 'text/html' } });

        const hostname = url.hostname;
        const domain = hostname.replace(/^www\./, '');
        const userAgent = request.headers.get('user-agent');

        if (isBot(userAgent)) {
            return Response.redirect('https://www.google.com', 302);
        }

        return new Response(getBridgingPage(slug, domain), {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=UTF-8',
                'Cache-Control': 'no-store',
            }
        });
    },
};

// ... (Add your API handler functions here: handleAddCustomDomain, handleVerifyCustomDomain, handleUpdateRedisCache) ...
async function handleAddCustomDomain(request, env) { /* paste your existing code */ }
async function handleVerifyCustomDomain(request, env) { /* paste your existing code */ }
async function handleUpdateRedisCache(request, env) { /* paste your existing code */ }
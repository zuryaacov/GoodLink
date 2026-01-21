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

async function handleTracking(telemetryId, eventLabel, userId, slug, domain, targetUrl, cloudflareData, turnstileVerified, env, ctx) {
    try {
        const ip = cloudflareData.ipAddress || "unknown";
        const redis = getRedisClient(env);

        // 1. מניעת כפילויות (Deduplication) - 10 שניות לאותו IP וסלאג
        if (redis) {
            const lockKey = `lock:${domain}:${slug || 'none'}:${ip}`;
            const isLocked = await redis.get(lockKey);
            if (isLocked) return; // כבר רשמנו קליק כזה לאחרונה, מתעלמים
            await redis.set(lockKey, "1", { ex: 10 });
        }

        // 2. וידוא שה-telemetryId הוא תמיד UUID תקין עבור Supabase
        // אם telemetryId שהתקבל אינו UUID, ניצור אחד חדש
        const isUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const finalTelemetryId = isUUID(telemetryId) ? telemetryId : crypto.randomUUID();

        // 3. הכנת האובייקט לרישום
        const logData = {
            link_id: isUUID(eventLabel) ? eventLabel : null, // link_id יקבל UUID רק אם זה קליק אמיתי
            event_type: isUUID(eventLabel) ? 'click' : eventLabel, // כאן נשמור 'bot-blocked', '404' וכו'
            user_id: userId || null,
            slug: slug || 'none',
            domain: domain,
            target_url: targetUrl || null,
            telemetry_id: finalTelemetryId,
            ip_address: ip,
            country: cloudflareData.country || null,
            city: cloudflareData.city || null,
            user_agent: cloudflareData.userAgent || null,
            turnstile_verified: !!turnstileVerified,
            clicked_at: new Date().toISOString()
        };

        // 4. כתיבה מקבילית ל-Supabase ול-Redis
        const supabasePromise = fetch(`${env.SUPABASE_URL}/rest/v1/clicks`, {
            method: "POST",
            headers: {
                "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            },
            body: JSON.stringify(logData)
        }).then(async res => {
            if (!res.ok) console.error(`❌ [Supabase] Tracking failed: ${res.status} ${await res.text()}`);
            return res;
        });

        let redisPromise = Promise.resolve();
        if (redis) {
            // שומרים תמיד תחת מפתח קבוע שמבוסס על ה-UUID
            const clickKey = `log:${finalTelemetryId}`;
            redisPromise = redis.set(clickKey, JSON.stringify(logData), { ex: 604800 }); // נשמר לשבוע
        }

        // שימוש ב-ctx.waitUntil כדי לוודא שהוורקר לא נסגר לפני הכתיבה
        ctx.waitUntil(Promise.all([supabasePromise, redisPromise]));

    } catch (err) {
        console.error("Tracking error:", err);
    }
}

// --- HTML Pages ---

// --- HTML המינימליסטי ביותר לביצועים ---
function getBridgingPage(slug, domain) {
    const encodedSlug = btoa(slug);
    const encodedDomain = btoa(domain);
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"></script>
    <style>body{background:#0f172a;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;color:#38bdf8}.l{width:30px;height:30px;border:2px solid;border-radius:50%;border-top-color:transparent;animation:s .5s infinite linear}@keyframes s{to{transform:rotate(1turn)}}</style>
    </head><body><div id="cf"></div><div class="l"></div>
    <script>
        // ביצוע מיידי - לא מחכים ל-onload מלא אם אפשר
        function init(){
            if(typeof turnstile === 'undefined'){ setTimeout(init, 50); return; }
            turnstile.render('#cf', {
                sitekey: '0x4AAAAAACL1UvTFIr6R2-Xe',
                callback: function(t){ window.location.href='/verify?id='+crypto.randomUUID()+'&slug=${encodedSlug}&domain=${encodedDomain}&cf-turnstile-response='+t; }
            });
        }
        init();
    </script></body></html>`;
}

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

// --- fetch מעודכן עם Early Hints ומרכז איסוף נתונים ---
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const pathname = url.pathname;

        // 1. איסוף נתונים גלובלי (זמין לכל הנתיבים, כולל 404 ובוטים)
        const cf = request.cf || {};
        const ip = request.headers.get('cf-connecting-ip') || 'unknown';
        const ua = request.headers.get('user-agent') || '';

        const trackingData = {
            ipAddress: ip,
            userAgent: ua,
            country: request.headers.get('cf-ipcountry') || cf.country || null,
            city: request.headers.get('cf-ipcity') || cf.city || null
        };

        // נתיב ה-Verify נשאר עם ה-Parallel Processing (הכי מהיר)
        if (pathname === '/verify') {
            const turnstileToken = url.searchParams.get('cf-turnstile-response');
            const slug = atob(url.searchParams.get('slug'));
            const domain = atob(url.searchParams.get('domain'));

            const [isHuman, linkData] = await Promise.all([
                verifyTurnstile(turnstileToken, ip, env.TURNSTILE_SECRET_KEY),
                getLinkFromRedis(slug, domain, getRedisClient(env))
            ]);

            if (!isHuman || !linkData) {
                // רישום כשל אימות ברקע
                ctx.waitUntil(handleTracking(url.searchParams.get('id'), 'verify-failed', null, slug, domain, url.href, trackingData, false, env, ctx));
                return Response.redirect('https://www.google.com', 302);
            }

            const finalUrl = buildTargetUrl(linkData.target_url, linkData, request.url);
            ctx.waitUntil(handleTracking(url.searchParams.get('id'), linkData.id, linkData.user_id, slug, domain, finalUrl, trackingData, true, env, ctx));

            return Response.redirect(finalUrl, 302);
        }

        const slug = extractSlug(pathname);
        const domain = url.hostname.replace(/^www\./, '');
        const redisClient = getRedisClient(env);

        // 1. אם אין סלאג (למשל דף הבית)
        if (!slug) {
            if (pathname !== '/favicon.ico') {
                ctx.waitUntil(handleTracking(crypto.randomUUID(), 'invalid-path', null, pathname, domain, url.href, trackingData, false, env, ctx));
            }
            return new Response(get404Page(), { status: 404, headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
        }

        // 2. בדיקת בוטים
        const isBotRequest = isBot(ua);
        if (isBotRequest || cf.verifiedBot) {
            console.log('🚫 [Bot Detection] Bot detected - tracking and returning 404');
            ctx.waitUntil(handleTracking(crypto.randomUUID(), 'bot-blocked', null, slug, domain, url.href, trackingData, false, env, ctx));
            return new Response(get404Page(), {
                status: 404,
                headers: { 'Content-Type': 'text/html; charset=UTF-8' }
            });
        }

        // 3. שליפת הלינק (פעם אחת)
        let linkData = await getLinkFromRedis(slug, domain, redisClient);
        if (!linkData && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
            console.log('🔍 [Fallback] Redis miss, checking Supabase');
            linkData = await getLinkFromSupabase(slug, domain, env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
        }

        // 4. אם הלינק לא נמצא סופית
        if (!linkData) {
            console.log('⚠️ [404] Link not found - tracking');
            ctx.waitUntil(handleTracking(crypto.randomUUID(), 'link-not-found', null, slug, domain, url.href, trackingData, false, env, ctx));
            return new Response(get404Page(), { status: 404, headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
        }

        // --- אופטימיזציית "דילוג מהיר" לבני אדם ---
        const isLikelyHuman = cf.botManagement?.score > 20 || (cf.asOrganization && !/amazon|google|cloud|data/i.test(cf.asOrganization));

        if (isLikelyHuman) {
            const finalUrl = buildTargetUrl(linkData.target_url, linkData, request.url);
            ctx.waitUntil(handleTracking(crypto.randomUUID(), linkData.id, linkData.user_id, slug, domain, finalUrl, trackingData, true, env, ctx));
            return Response.redirect(finalUrl, 302);
        }

        // --- שליחת דף גישור עם Early Hints ---
        return new Response(getBridgingPage(slug, domain), {
            headers: {
                'Content-Type': 'text/html; charset=UTF-8',
                'Link': '<https://challenges.cloudflare.com>; rel=preconnect, <https://challenges.cloudflare.com/turnstile/v0/api.js>; rel=preload; as=script',
                'Cache-Control': 'no-store'
            }
        });
    }
};

// ... API Handlers below ...
async function handleAddCustomDomain(request, env) { /* Existing Code */ }
async function handleVerifyCustomDomain(request, env) { /* Existing Code */ }
async function handleUpdateRedisCache(request, env) { /* Existing Code */ }
import { Redis } from "@upstash/redis/cloudflare";

// --- Utility Functions ---

function extractSlug(pathname) {
    const path = pathname.replace(/^\//, '').split('?')[0].split('#')[0];
    if (!path || path.includes('.') || path.startsWith('api/')) return null;
    return path.toLowerCase();
}

function mergeQueryParams(targetUrl, incomingSearch) {
    try {
        const target = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
        const incomingParams = new URLSearchParams(incomingSearch);
        for (const [key, value] of incomingParams.entries()) {
            target.searchParams.set(key, value);
        }
        return target.toString();
    } catch (e) {
        return targetUrl;
    }
}

async function getLinkFromSupabase(slug, domain, env) {
    try {
        const query = new URLSearchParams({
            slug: `eq.${slug}`,
            domain: `eq.${domain}`,
            select: '*'
        });

        const response = await fetch(`${env.SUPABASE_URL}/rest/v1/links?${query}`, {
            headers: {
                'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
            }
        });

        if (!response.ok) return null;
        const data = await response.json();
        return data && data.length > 0 ? data[0] : null;
    } catch (e) {
        console.error("Supabase Failover Error:", e);
        return null;
    }
}

// --- Main Worker Logic ---

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const slug = extractSlug(url.pathname);
        const domain = url.hostname.replace(/^www\./, '');
        const ip = request.headers.get("cf-connecting-ip");
        const userAgent = request.headers.get("user-agent") || "";
        const clickId = crypto.randomUUID();

        if (!slug) return new Response("Not Found", { status: 404 });

        const redis = new Redis({
            url: env.UPSTASH_REDIS_REST_URL,
            token: env.UPSTASH_REDIS_REST_TOKEN,
        });

        // 1. זיהוי בוטים (Cloudflare + User Agent)
        const botScore = request.cf?.botManagement?.score || 100;
        const isVerifiedBot = request.cf?.verifiedBot || false;
        const isBotUA = /bot|crawler|spider|google|bing|facebookexternalhit|adsbot-google|applebot/i.test(userAgent.toLowerCase());

        // הגדרת בוט ודאי: בוט מאומת, UA חשוד, או ציון נמוך מאוד
        const isCertainBot = isVerifiedBot || isBotUA || (botScore < 10);

        // 2. בדיקת הצפה (Flood Guard)
        const uniqueKey = `limit:${ip}:${slug}`;
        const isRepeatClick = await redis.get(uniqueKey);
        if (isRepeatClick && botScore < 30 && !isVerifiedBot) {
            return new Response("Rate Limit Exceeded", { status: 429 });
        }

        // 3. שליפת הנתונים
        let linkData = null;
        try {
            linkData = await redis.get(`link:${domain}:${slug}`);
            if (!linkData) {
                linkData = await getLinkFromSupabase(slug, domain, env);
            }
        } catch (e) {
            linkData = await getLinkFromSupabase(slug, domain, env);
        }

        if (!linkData || linkData.status !== 'active') {
            return new Response("Link Not Found", { status: 404 });
        }

        // 4. לוגיקת ניתוב לבוטים (אם מזוהה בוט, הוא לא מגיע ל-Target URL)
        if (isCertainBot) {
            // שולחים לוג בכל זאת כדי שהאפילייאט יראה שהיה בוט
            ctx.waitUntil(this.sendLogToQStash(env, clickId, ip, slug, domain, userAgent, botScore, isVerifiedBot, linkData, url, "blocked_bot"));

            // ניתוב ל-Fallback או 404
            if (linkData.fallback_url) {
                return Response.redirect(linkData.fallback_url, 302);
            }
            return new Response("Not Found", { status: 404 });
        }

        // 5. ניתוב משתמש תקין
        const finalUrl = mergeQueryParams(linkData.target_url, url.search);

        ctx.waitUntil((async () => {
            await redis.set(uniqueKey, "1", { ex: 60 });
            await this.sendLogToQStash(env, clickId, ip, slug, domain, userAgent, botScore, isVerifiedBot, linkData, url, "clean");
        })());

        return Response.redirect(finalUrl, 302);
    },

    // פונקציית עזר לשליחה ל-QStash
    async sendLogToQStash(env, clickId, ip, slug, domain, userAgent, botScore, isVerifiedBot, linkData, url, forceVerdict) {
        try {
            const dedupeKey = `sent:${ip}:${slug}`;
            const alreadySent = await new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN }).get(dedupeKey);
            if (alreadySent && forceVerdict !== "blocked_bot") return;

            await new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN }).set(dedupeKey, "1", { ex: 3 });

            const cleanWorkerUrl = env.LOGGER_WORKER_URL.replace(/^https?:\/\//, '');
            const qstashUrl = `https://qstash.upstash.io/v2/publish/https://${cleanWorkerUrl}`;

            await fetch(qstashUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${env.QSTASH_TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id: clickId,
                    ip: ip,
                    slug: slug,
                    domain: domain,
                    userAgent: userAgent,
                    referer: "",
                    botScore: botScore,
                    isVerifiedBot: isVerifiedBot,
                    verdict: forceVerdict, // מעביר ללוגר אם זה נחסם אקטיבית
                    linkData: {
                        id: linkData.id,
                        user_id: linkData.user_id,
                        target_url: linkData.target_url
                    },
                    queryParams: url.search,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (err) {
            console.error("QStash Logging Error:", err);
        }
    }
};
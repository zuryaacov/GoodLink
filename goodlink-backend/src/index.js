import { Redis } from "@upstash/redis/cloudflare";

// --- Utility Functions ---

// פונקציה להחזרת דף ה-404 המעוצב
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

        // החזרת דף 404 מעוצב אם אין סלאג
        if (!slug) {
            return new Response(get404Page(), {
                status: 404,
                headers: { "Content-Type": "text/html" }
            });
        }

        const redis = new Redis({
            url: env.UPSTASH_REDIS_REST_URL,
            token: env.UPSTASH_REDIS_REST_TOKEN,
        });

        const botScore = request.cf?.botManagement?.score || 100;
        const isVerifiedBot = request.cf?.verifiedBot || false;
        const isBotUA = /bot|crawler|spider|google|bing|facebookexternalhit|adsbot-google|applebot/i.test(userAgent.toLowerCase());

        const isCertainBot = isVerifiedBot || isBotUA || (botScore < 10);

        const uniqueKey = `limit:${ip}:${slug}`;
        const isRepeatClick = await redis.get(uniqueKey);
        if (isRepeatClick && botScore < 30 && !isVerifiedBot) {
            return new Response("Rate Limit Exceeded", { status: 429 });
        }

        let linkData = null;
        try {
            linkData = await redis.get(`link:${domain}:${slug}`);
            if (!linkData) {
                linkData = await getLinkFromSupabase(slug, domain, env);
            }
        } catch (e) {
            linkData = await getLinkFromSupabase(slug, domain, env);
        }

        // החזרת דף 404 מעוצב אם הקישור לא נמצא או לא פעיל
        if (!linkData || linkData.status !== 'active') {
            return new Response(get404Page(), {
                status: 404,
                headers: { "Content-Type": "text/html" }
            });
        }

        if (isCertainBot) {
            ctx.waitUntil(this.sendLogToQStash(env, clickId, ip, slug, domain, userAgent, botScore, isVerifiedBot, linkData, url, "blocked_bot"));

            if (linkData.fallback_url) {
                return Response.redirect(linkData.fallback_url, 302);
            }

            // החזרת דף 404 מעוצב עבור בוטים (אם אין fallback)
            return new Response(get404Page(), {
                status: 404,
                headers: { "Content-Type": "text/html" }
            });
        }

        const finalUrl = mergeQueryParams(linkData.target_url, url.search);

        ctx.waitUntil((async () => {
            await redis.set(uniqueKey, "1", { ex: 60 });
            await this.sendLogToQStash(env, clickId, ip, slug, domain, userAgent, botScore, isVerifiedBot, linkData, url, "clean");
        })());

        return Response.redirect(finalUrl, 302);
    },

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
                    verdict: forceVerdict,
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
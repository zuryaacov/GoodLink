import { Redis } from "@upstash/redis/cloudflare";

// 1. פונקציית דף ה-404 המעוצב
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

// 2. פונקציות עזר לניהול ה-URL והסלאג
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

// 3. הלוגיקה המרכזית
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const slug = extractSlug(url.pathname);
        const domain = url.hostname.replace(/^www\./, '');
        const ip = request.headers.get("cf-connecting-ip");
        const userAgent = request.headers.get("user-agent") || "";
        const clickId = crypto.randomUUID();

        // הגדרת דף תגובת HTML
        const htmlResponse = (html, status = 404) => new Response(html, {
            status,
            headers: { "Content-Type": "text/html;charset=UTF-8" }
        });

        if (!slug) return htmlResponse(get404Page());

        const redis = new Redis({
            url: env.UPSTASH_REDIS_REST_URL,
            token: env.UPSTASH_REDIS_REST_TOKEN,
        });

        // זיהוי בוטים
        const botScore = request.cf?.botManagement?.score || 100;
        const isVerifiedBot = request.cf?.verifiedBot || false;
        const isBotUA = /bot|crawler|spider|google|bing|facebookexternalhit|adsbot-google|applebot/i.test(userAgent.toLowerCase());
        const isCertainBot = isVerifiedBot || isBotUA || (botScore < 10);

        // שליפת נתונים מסופבייס/רדיס
        let linkData = await redis.get(`link:${domain}:${slug}`);
        if (!linkData) {
            const query = new URLSearchParams({ slug: `eq.${slug}`, domain: `eq.${domain}`, select: '*' });
            const sbRes = await fetch(`${env.SUPABASE_URL}/rest/v1/links?${query}`, {
                headers: { 'apikey': env.SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }
            });
            const data = await sbRes.json();
            linkData = data?.[0];
        }

        if (!linkData || linkData.status !== 'active') return htmlResponse(get404Page());

        // קביעת יעד סופי (בדיקה אם זה בוט חסום)
        let finalRedirectUrl = mergeQueryParams(linkData.target_url, url.search);
        let verdict = "clean";

        if (isCertainBot) {
            verdict = "blocked_bot";
            if (linkData.fallback_url) {
                finalRedirectUrl = linkData.fallback_url;
            } else {
                // אם אין fallback לבוט - נציג לו 404 ונשלח לוג
                ctx.waitUntil(this.postToQStash(env, { clickId, ip, slug, domain, userAgent, botScore, isVerifiedBot, verdict, linkData, url }));
                return htmlResponse(get404Page());
            }
        }

        // שליחת לוג ל-QStash במקביל להפניה
        ctx.waitUntil(this.postToQStash(env, { clickId, ip, slug, domain, userAgent, botScore, isVerifiedBot, verdict, linkData, url }));

        return Response.redirect(finalRedirectUrl, 302);
    },

    // פונקציה פנימית לטיפול ב-QStash - מטפלת בבניית ה-URL בצורה בטוחה
    async postToQStash(env, p) {
        try {
            // ניקוי כתובת ה-Logger למניעת כפילויות של //
            const loggerUrl = env.LOGGER_WORKER_URL.replace(/\/$/, "");
            const qstashUrl = `https://qstash.upstash.io/v2/publish/${loggerUrl}`;

            await fetch(qstashUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${env.QSTASH_TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id: p.clickId,
                    ip: p.ip,
                    slug: p.slug,
                    domain: p.domain,
                    userAgent: p.userAgent,
                    botScore: p.botScore,
                    isVerifiedBot: p.isVerifiedBot,
                    verdict: p.verdict,
                    linkData: { id: p.linkData.id, user_id: p.linkData.user_id, target_url: p.linkData.target_url },
                    queryParams: p.url.search,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (e) {
            console.error("QStash Error:", e);
        }
    }
};
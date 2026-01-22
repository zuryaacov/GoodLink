import { Redis } from "@upstash/redis/cloudflare";

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

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const slug = url.pathname.replace(/^\//, '').split('?')[0].toLowerCase();
        const domain = url.hostname.replace(/^www\./, '');
        const ip = request.headers.get("cf-connecting-ip");
        const userAgent = request.headers.get("user-agent") || "";

        const htmlResponse = (html, status = 404) => new Response(html, {
            status, headers: { "Content-Type": "text/html;charset=UTF-8" }
        });

        if (!slug || slug.includes('.')) return htmlResponse(get404Page());

        const redis = new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN });

        // 1. זיהוי בוטים מדויק יותר (רק בוטים ודאיים)
        const botScore = request.cf?.botManagement?.score || 100;
        const isVerifiedBot = request.cf?.verifiedBot || false;
        // צמצום הרשימה כדי לא לתפוס משתמשים רגילים בטעות
        const isBotUA = /bot|crawler|spider|googlebot|bingbot|yandexbot|facebookexternalhit/i.test(userAgent);
        const isCertainBot = isVerifiedBot || isBotUA || (botScore < 5); // סף מחמיר יותר של 5

        // 2. שליפת לינק
        let linkData = await redis.get(`link:${domain}:${slug}`);
        if (!linkData) {
            const sbRes = await fetch(`${env.SUPABASE_URL}/rest/v1/links?slug=eq.${slug}&domain=eq.${domain}&select=*`, {
                headers: { 'apikey': env.SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }
            });
            const data = await sbRes.json();
            linkData = data?.[0];
        }

        if (!linkData || linkData.status !== 'active') return htmlResponse(get404Page());

        // 3. קביעת היעד והסטטוס (ללא כפילות קוד)
        let finalRedirectUrl = linkData.target_url;
        let verdict = "clean";
        let shouldBlock = false;

        if (isCertainBot) {
            verdict = "blocked_bot";
            if (linkData.fallback_url) {
                finalRedirectUrl = linkData.fallback_url;
            } else {
                shouldBlock = true;
            }
        }

        // 4. שליחת לוג אחד בלבד ל-QStash
        ctx.waitUntil(this.postToQStash(env, { ip, slug, domain, userAgent, botScore, isVerifiedBot, verdict, linkData, url }));

        // 5. ביצוע הפעולה (חסימה או הפניה)
        if (shouldBlock) {
            return htmlResponse(get404Page());
        }

        return Response.redirect(finalRedirectUrl, 302);
    },

    async postToQStash(env, p) {
        try {
            let targetWorker = env.LOGGER_WORKER_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
            const qstashUrl = `https://qstash.upstash.io/v2/publish/https://${targetWorker}`;

            await fetch(qstashUrl, {
                method: "POST",
                headers: { "Authorization": `Bearer ${env.QSTASH_TOKEN}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: crypto.randomUUID(),
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
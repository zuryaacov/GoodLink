import { Redis } from "@upstash/redis/cloudflare";

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
    if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = 'https://' + cleanUrl;
    }
    return cleanUrl;
}

// פונקציית לוגינג מאוחדת וחסינה
async function logClick(env, p, redis, useDedupe = true) {
    try {
        if (useDedupe) {
            const dedupKey = `click:${p.ip}:${p.domain}:${p.slug}`;
            const alreadyLogged = await redis.get(dedupKey);
            if (alreadyLogged) return;
            await redis.set(dedupKey, "1", { ex: 10 });
        }

        // וידוא פורמט URL עבור QStash
        let loggerUrl = env.LOGGER_WORKER_URL || "";
        if (!loggerUrl.startsWith('http')) loggerUrl = `https://${loggerUrl}`;
        loggerUrl = loggerUrl.replace(/\/$/, ""); // הסרת סלאש סופי

        const qstashUrl = `https://qstash.upstash.io/v2/publish/${loggerUrl}`;

        await fetch(qstashUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${env.QSTASH_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: crypto.randomUUID(),
                ip: p.ip,
                slug: p.slug,
                domain: p.domain,
                userAgent: p.userAgent,
                botScore: p.botScore,
                isVerifiedBot: p.isVerifiedBot,
                verdict: p.verdict,
                linkData: p.linkData,
                queryParams: p.queryParams,
                timestamp: new Date().toISOString()
            })
        });
        console.log(`📡 Log sent to QStash (${p.verdict})`);
    } catch (e) {
        console.error("❌ Logger Error:", e);
    }
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // 1. Zero Latency: פילטר קבצים מיותרים
        if (url.pathname === '/favicon.ico' || url.pathname === '/robots.txt') {
            return new Response(null, { status: 204 });
        }

        const slug = url.pathname.replace(/^\//, '').split('?')[0].toLowerCase();
        const domain = url.hostname.replace(/^www\./, '');
        const ip = request.headers.get("cf-connecting-ip");
        const userAgent = request.headers.get("user-agent") || "";

        const htmlResponse = (html, status = 404) => new Response(html, {
            status, headers: { "Content-Type": "text/html;charset=UTF-8" }
        });

        if (!slug || slug.includes('.')) return htmlResponse(get404Page());

        const redis = new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN });

        // 2. Zero Latency: Redis Blacklist Check (הכי מהיר)
        const isBlacklisted = await redis.get(`blacklist:${ip}`);
        if (isBlacklisted) {
            console.log(`🚫 IP Blacklisted: ${ip}`);
            return htmlResponse(get404Page());
        }

        // 3. Cloudflare Bot Score & User-Agent
        const botScore = request.cf?.botManagement?.score || 100;
        const isVerifiedBot = request.cf?.verifiedBot || false;
        const isBotUA = /bot|crawler|spider|googlebot|bingbot|yandexbot|facebookexternalhit/i.test(userAgent);

        // זיהוי מתחזה: טוען שהוא בוט ב-UA אבל קלאודפלייר לא אימתה אותו כבוט רשמי שלהם
        const isImpersonator = isBotUA && !isVerifiedBot;

        // בוט לצורך חסימה: ציון נמוך מאוד, או בוט מאומת, או מתחזה
        const isBot = botScore <= 29 || isVerifiedBot || isImpersonator;

        // שליפת לינק (Redis -> Supabase)
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

        let targetUrl = ensureValidUrl(linkData.target_url);
        let verdict = "clean";
        let shouldBlock = false;

        // קביעת Verdict וטיפול בבוטים
        if (isBot) {
            verdict = isImpersonator ? "bot_impersonator" : (botScore <= 10 ? "bot_certain" : "bot_likely");

            // הוספה ל-Blacklist ל-24 שעות אם הוא בוט ודאי או מתחזה
            if (botScore <= 20 || isImpersonator) {
                ctx.waitUntil(redis.set(`blacklist:${ip}`, "1", { ex: 86400 }));
            }

            const fallback = ensureValidUrl(linkData.fallback_url);
            if (fallback) targetUrl = fallback; else shouldBlock = true;
        } else if (botScore <= 59) {
            verdict = "suspicious";
        }

        // הכנת Payload ללוג
        const p = {
            ip, slug, domain, userAgent, botScore, isVerifiedBot, verdict,
            linkData: { id: linkData.id, user_id: linkData.user_id, target_url: linkData.target_url },
            queryParams: url.search
        };

        // שליחת לוג (בוטים ללא דה-דופליקציה כדי לוודא תיעוד)
        ctx.waitUntil(logClick(env, p, redis, !isBot));

        if (shouldBlock) return htmlResponse(get404Page());

        // Redirect סופי עם שמירה על Query Params
        try {
            const finalUrl = new URL(targetUrl);
            new URLSearchParams(url.search).forEach((v, k) => finalUrl.searchParams.set(k, v));
            return Response.redirect(finalUrl.toString(), 302);
        } catch (e) {
            return Response.redirect(targetUrl, 302);
        }
    }
};
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

/**
 * פונקציית לוגינג משודרגת עם הגנה כפולה: Ray ID ו-IP Deduplication
 */
async function logClick(env, p, redis) {
    try {
        const rayDedupKey = `log:${p.rayId}:${p.slug}`;
        const ipDedupKey = `ip_limit:${p.ip}:${p.slug}`;

        // 1. הגנה מפני Retry טכני (אותה בקשה בדיוק)
        const isNewRay = await redis.set(rayDedupKey, "1", { nx: true, ex: 120 });
        if (isNewRay === null) {
            console.log(`⏭️ Duplicate Ray ID detected (${p.rayId}) - skipping`);
            return;
        }

        // 2. הגנה מפני קליקים כפולים מהדפדפן (אותו IP לאותו Slug תוך 3 שניות)
        // הזמן עודכן מ-10 שניות ל-3 שניות כדי לאזן בין סינון רעש לדיוק בקליקים אנושיים
        const isNewClick = await redis.set(ipDedupKey, "1", { nx: true, ex: 3 });
        if (isNewClick === null) {
            console.log(`⏭️ Rate limit: Same IP click within 3s (${p.ip}) - skipping DB write`);
            return;
        }

        let loggerUrl = env.LOGGER_WORKER_URL || "";
        if (!loggerUrl.startsWith('http')) loggerUrl = `https://${loggerUrl}`;
        loggerUrl = loggerUrl.replace(/\/$/, "");

        const qstashUrl = `https://qstash.upstash.io/v2/publish/${loggerUrl}`;

        await fetch(qstashUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${env.QSTASH_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: crypto.randomUUID(),
                rayId: p.rayId,
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
        console.log(`📡 Log sent to QStash for Ray: ${p.rayId}`);
    } catch (e) {
        console.error("❌ Logger Error:", e);
    }
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const userAgent = request.headers.get("user-agent") || "";
        const rayId = request.headers.get("cf-ray") || crypto.randomUUID();
        const path = url.pathname.toLowerCase();

        // 1. Noise Filter: סינון שקט ללא לוג עבור דפי מערכת ובוטים ידועים
        const noisePaths = ['/favicon.ico', '/robots.txt', '/index.php', '/.env', '/wp-login.php', '/admin', '/api', '/root'];
        if (path === '/' || noisePaths.some(p => path === p || path.startsWith(p + '/')) || /uptimerobot|pingdom/i.test(userAgent)) {
            return new Response(null, { status: 204 });
        }

        const slug = path.replace(/^\//, '').split('?')[0];
        const domain = url.hostname.replace(/^www\./, '');
        const ip = request.headers.get("cf-connecting-ip");

        const redis = new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN });
        const htmlResponse = (html, status = 404) => new Response(html, {
            status, headers: { "Content-Type": "text/html;charset=UTF-8" }
        });

        const terminateWithLog = (verdict, linkData = null) => {
            const p = {
                rayId, ip, slug: slug || "root", domain, userAgent,
                botScore: request.cf?.botManagement?.score || 100,
                isVerifiedBot: request.cf?.verifiedBot || false,
                verdict,
                linkData: linkData ? { id: linkData.id, user_id: linkData.user_id, target_url: linkData.target_url } : null,
                queryParams: url.search
            };
            ctx.waitUntil(logClick(env, p, redis));
            return htmlResponse(get404Page());
        };

        if (!slug || slug.includes('.')) return terminateWithLog(slug ? 'invalid_slug' : 'home_page_access');

        // 2. Zero Latency Checks: בדיקת רשימה שחורה ושליפת נתוני לינק מרדיס
        const isBlacklisted = await redis.get(`blacklist:${ip}`);
        if (isBlacklisted) return terminateWithLog('blacklisted');

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

        // 3. Bot Analysis: ניתוח בוטים מבוסס Cloudflare
        const botScore = request.cf?.botManagement?.score || 100;
        const isVerifiedBot = request.cf?.verifiedBot || false;
        const isBotUA = /bot|crawler|spider|googlebot/i.test(userAgent);
        const isImpersonator = isBotUA && !isVerifiedBot;
        const isBot = botScore <= 29 || isVerifiedBot || isImpersonator;

        let targetUrl = ensureValidUrl(linkData.target_url);
        let verdict = "clean";
        let shouldBlock = false;

        if (isBot) {
            verdict = isImpersonator ? "bot_impersonator" : (botScore <= 10 ? "bot_certain" : "bot_likely");
            if (botScore <= 20 || isImpersonator) ctx.waitUntil(redis.set(`blacklist:${ip}`, "1", { ex: 86400 }));
            const fallback = ensureValidUrl(linkData.fallback_url);
            if (fallback) targetUrl = fallback; else shouldBlock = true;
        } else if (botScore <= 59) {
            verdict = "suspicious";
        }

        const p = {
            rayId, ip, slug, domain, userAgent, botScore, isVerifiedBot, verdict,
            linkData: { id: linkData.id, user_id: linkData.user_id, target_url: linkData.target_url },
            queryParams: url.search
        };

        ctx.waitUntil(logClick(env, p, redis));

        if (shouldBlock) return htmlResponse(get404Page());

        try {
            const finalUrl = new URL(targetUrl);
            new URLSearchParams(url.search).forEach((v, k) => finalUrl.searchParams.set(k, v));
            return Response.redirect(finalUrl.toString(), 302);
        } catch (e) {
            return Response.redirect(targetUrl, 302);
        }
    }
};
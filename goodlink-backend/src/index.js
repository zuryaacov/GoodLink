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
    if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = 'https://' + cleanUrl;
    return cleanUrl;
}

/**
 * שליחת רשומת קליק ישירות לסופבייס דרך QStash
 * כל הנתונים נלקחים מ-Cloudflare (ללא IPINFO)
 */
async function logClickToSupabase(env, clickRecord, redis) {
    try {
        const rayDedupKey = `log:${clickRecord.ray_id}:${clickRecord.slug}`;
        const ipDedupKey = `ip_limit:${clickRecord.ip_address}:${clickRecord.slug}`;

        // 1. הגנה מפני Retry טכני (אותה בקשה בדיוק)
        const isNewRay = await redis.set(rayDedupKey, "1", { nx: true, ex: 120 });
        if (isNewRay === null) {
            console.log(`⏭️ Duplicate Ray ID (${clickRecord.ray_id}) - skipping`);
            return;
        }

        // 2. הגנה מפני קליקים כפולים (אותו IP לאותו Slug תוך 30 שניות)
        const isNewClick = await redis.set(ipDedupKey, "1", { nx: true, ex: 30 });
        if (isNewClick === null) {
            console.log(`⏭️ Rate limit: Same IP within 30s (${clickRecord.ip_address}) - skipping`);
            return;
        }

        // שליחה ישירות לסופבייס דרך QStash
        const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/clicks`;
        const qstashUrl = `https://qstash.upstash.io/v2/publish/${supabaseUrl}`;

        const response = await fetch(qstashUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${env.QSTASH_TOKEN}`,
                "Content-Type": "application/json",
                // Headers שיועברו לסופבייס
                "Upstash-Forward-apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                "Upstash-Forward-Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                "Upstash-Forward-Content-Type": "application/json",
                "Upstash-Forward-Prefer": "return=minimal"
            },
            body: JSON.stringify(clickRecord)
        });

        if (response.ok) {
            console.log(`📡 Click logged via QStash → Supabase (Ray: ${clickRecord.ray_id})`);
        } else {
            console.error(`❌ QStash Error: ${response.status}`);
        }
    } catch (e) {
        console.error("❌ Logger Error:", e.message);
    }
}

/**
 * יצירת רשומת קליק מלאה עם כל הנתונים מ-Cloudflare
 */
function buildClickRecord(request, rayId, ip, slug, domain, userAgent, verdict, linkData) {
    const cf = request.cf || {};
    const botMgmt = cf.botManagement || {};

    return {
        id: crypto.randomUUID(),
        ray_id: rayId,

        // נתוני לינק
        link_id: linkData?.id || null,
        user_id: linkData?.user_id || null,
        target_url: linkData?.target_url || null,
        slug: slug || "root",
        domain: domain,

        // נתוני גולש
        ip_address: ip,
        user_agent: userAgent,

        // נתוני גאוגרפיה מ-Cloudflare
        country: cf.country || null,
        city: cf.city || null,
        region: cf.region || null,
        timezone: cf.timezone || null,
        latitude: cf.latitude || null,
        longitude: cf.longitude || null,
        postal_code: cf.postalCode || null,
        continent: cf.continent || null,

        // נתוני רשת מ-Cloudflare
        asn: cf.asn || null,
        isp: cf.asOrganization || null,

        // נתוני בוטים מ-Cloudflare Bot Management
        bot_score: botMgmt.score ?? 100,
        is_bot: botMgmt.score <= 29 || botMgmt.verifiedBot || false,
        is_verified_bot: botMgmt.verifiedBot || false,
        ja3_hash: botMgmt.ja3Hash || null,
        ja4: botMgmt.ja4 || null,

        // נתוני אבטחה
        threat_score: cf.threatScore || null,
        is_tor: cf.isEUCountry === false && cf.country === 'T1', // T1 = Tor

        // נתוני חיבור
        http_protocol: cf.httpProtocol || null,
        tls_version: cf.tlsVersion || null,
        tls_cipher: cf.tlsCipher || null,

        // מטא-דאטה
        verdict: verdict,
        query_params: new URL(request.url).search || "",
        clicked_at: new Date().toISOString()
    };
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const userAgent = request.headers.get("user-agent") || "";
        const rayId = request.headers.get("cf-ray") || crypto.randomUUID();
        const path = url.pathname.toLowerCase();

        // 1. Noise Filter: סינון שקט ללא לוג
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

        // פונקציית סיום עם לוג לסופבייס
        const terminateWithLog = (verdict, linkData = null) => {
            const clickRecord = buildClickRecord(request, rayId, ip, slug, domain, userAgent, verdict, linkData);
            ctx.waitUntil(logClickToSupabase(env, clickRecord, redis));
            return htmlResponse(get404Page());
        };

        // 2. Slug Validation
        if (!slug || slug.includes('.')) return terminateWithLog(slug ? 'invalid_slug' : 'home_page_access');

        const isValidSlug = /^[a-z0-9-]+$/.test(slug);
        if (!isValidSlug) {
            console.log(`🚫 Invalid slug format: "${slug}"`);
            return terminateWithLog('invalid_slug_format');
        }

        // 3. שליפת נתוני לינק מ-Redis/Supabase
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

        // 4. בדיקת Blacklist
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

        if (isBot) {
            verdict = isImpersonator ? "bot_impersonator" : (botScore <= 10 ? "bot_certain" : "bot_likely");
            if (botScore <= 20 || isImpersonator) ctx.waitUntil(redis.set(`blacklist:${ip}`, "1", { ex: 86400 }));
            const fallback = ensureValidUrl(linkData.fallback_url);
            if (fallback) targetUrl = fallback; else shouldBlock = true;
        } else if (botScore <= 59) {
            verdict = "suspicious";
        }

        // 6. שליחת לוג לסופבייס
        const clickRecord = buildClickRecord(request, rayId, ip, slug, domain, userAgent, verdict, linkData);
        ctx.waitUntil(logClickToSupabase(env, clickRecord, redis));

        if (shouldBlock) return htmlResponse(get404Page());

        // 7. Redirect
        try {
            const finalUrl = new URL(targetUrl);
            new URLSearchParams(url.search).forEach((v, k) => finalUrl.searchParams.set(k, v));
            return Response.redirect(finalUrl.toString(), 302);
        } catch (e) {
            return Response.redirect(targetUrl, 302);
        }
    }
};

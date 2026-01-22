import { Redis } from "@upstash/redis/cloudflare";

// --- Utility Functions ---

function extractSlug(pathname) {
    // מנקה סלאשים, פרמטרים וסיומות
    const path = pathname.replace(/^\//, '').split('?')[0].split('#')[0];
    // סינון קבצים ורעשים
    if (!path || path.includes('.') || path.startsWith('api/')) return null;
    return path.toLowerCase();
}

function mergeQueryParams(targetUrl, incomingSearch) {
    try {
        const target = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
        const incomingParams = new URLSearchParams(incomingSearch);

        // דריסת פרמטרים או הוספה שלהם (ה-URL הנכנס הוא הקובע)
        for (const [key, value] of incomingParams.entries()) {
            target.searchParams.set(key, value);
        }
        return target.toString();
    } catch (e) {
        return targetUrl; // Fallback
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

        // 1. סינון רעשים מהיר (Noise Filter)
        if (!slug) return new Response("Not Found", { status: 404 });

        const redis = new Redis({
            url: env.UPSTASH_REDIS_REST_URL,
            token: env.UPSTASH_REDIS_REST_TOKEN,
        });

        // 2. הגנת הצפות (Flood Guard) - בדיקה אם זה בוט שתוקף את אותו לינק
        // אנו משתמשים בנתוני Cloudflare Native
        const botScore = request.cf?.botManagement?.score || 100;
        const isVerifiedBot = request.cf?.verifiedBot || false;

        // מפתח ייחודי לבדיקת הצפה: IP + Slug
        const uniqueKey = `limit:${ip}:${slug}`;
        const isRepeatClick = await redis.get(uniqueKey);

        // אם זה קליק חוזר (קיים ברדיס) + הציון בוט נמוך + לא בוט מאומת = חסימה
        if (isRepeatClick && botScore < 30 && !isVerifiedBot) {
            return new Response("Rate Limit Exceeded", { status: 429 });
        }

        // 3. שליפת הלינק (Redis First -> Supabase Failover)
        let linkData = null;
        try {
            // מנסים לשלוף מרדיס
            linkData = await redis.get(`link:${domain}:${slug}`);

            // אם לא קיים ברדיס, מנסים בסופבייס (Failover)
            if (!linkData) {
                linkData = await getLinkFromSupabase(slug, domain, env);
                // אופציונלי: כאן אפשר לעדכן חזרה את הרדיס כדי לחסוך בפעם הבאה
            }
        } catch (e) {
            // אם רדיס נפל לגמרי, מנסים ישירות סופבייס
            linkData = await getLinkFromSupabase(slug, domain, env);
        }

        if (!linkData || linkData.status !== 'active') {
            return new Response("Link Not Found or Inactive", { status: 404 });
        }

        // 4. בניית ה-URL הסופי (מיזוג UTM מהבקשה המקורית)
        const finalUrl = mergeQueryParams(linkData.target_url, url.search);

        // 5. ניתוב מיידי (Redirect First Policy)
        const response = Response.redirect(finalUrl, 302);

        // 6. משימות רקע (Fire and Forget via QStash)
        // בתוך index.js - החלף את בלוק ה-ctx.waitUntil הקיים בזה:

        ctx.waitUntil((async () => {
            try {
                // א. סימון הקליק ברדיס
                await redis.set(uniqueKey, "1", { ex: 60 });

                console.log(`🚀 [QStash] Attempting to send log to: ${env.LOGGER_WORKER_URL}`);

                // ב. שליחה ל-QStash
                const qstashResponse = await fetch(`https://qstash.upstash.io/v2/publish/${env.LOGGER_WORKER_URL}`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${env.QSTASH_TOKEN}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        ip: ip,
                        slug: slug,
                        domain: domain,
                        userAgent: request.headers.get("user-agent"),
                        // ... שאר הנתונים ...
                        timestamp: new Date().toISOString()
                    })
                });

                if (!qstashResponse.ok) {
                    const errorText = await qstashResponse.text();
                    console.error(`❌ [QStash Failed] Status: ${qstashResponse.status}, Error: ${errorText}`);
                } else {
                    const resJson = await qstashResponse.json();
                    console.log(`✅ [QStash Success] Message ID: ${resJson.messageId}`);
                }
            } catch (err) {
                console.error("💥 [Worker Error] Critical failure in background task:", err);
            }
        })());
        return response;
    }
};
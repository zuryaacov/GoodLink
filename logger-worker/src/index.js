export default {
    async fetch(request, env) {
        // מוודאים שהבקשה הגיעה מ-QStash (אבטחה בסיסית)
        // מומלץ להוסיף אימות חתימה של QStash בפרודקשן, אבל לכרגע זה מספיק
        if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

        try {
            const data = await request.json();

            // 1. העשרת נתונים מ-IPinfo
            let ipInfo = {};
            if (env.IPINFO_TOKEN) {
                try {
                    const ipRes = await fetch(`https://ipinfo.io/${data.ip}?token=${env.IPINFO_TOKEN}`);
                    if (ipRes.ok) ipInfo = await ipRes.json();
                } catch (e) {
                    console.error("IPinfo Error:", e);
                }
            }

            // 2. הכנת האובייקט לטבלת CLICKS בסופבייס
            // מיפוי נתונים מה-Payload ומ-IPinfo לעמודות בטבלה שלך
            const clickRecord = {
                link_id: data.linkData.id,
                user_id: data.linkData.user_id,
                ip_address: data.ip,
                user_agent: data.userAgent,
                referer: data.referer,
                country: data.country || ipInfo.country, // עדיפות ל-CF ואז IPinfo
                city: data.city || ipInfo.city,
                slug: data.slug,
                domain: data.domain,
                target_url: data.linkData.target_url,
                query_params: data.queryParams,
                clicked_at: data.timestamp,

                // לוגיקה לזיהוי בוטים לצרכי סטטיסטיקה
                is_bot: (data.botScore < 30 && !data.isVerifiedBot) || (ipInfo.privacy?.vpn || ipInfo.privacy?.proxy),
                bot_reason: data.botScore < 30 ? "low_cf_score" : null,

                // נתונים מתקדמים מ-IPinfo
                isp: ipInfo.org || data.asn, // ASN fallback
                is_vpn: ipInfo.privacy?.vpn || false,
                is_proxy: ipInfo.privacy?.proxy || false,
                connection_type: ipInfo.type || null, // mobile/hosting/etc

                // נתונים נוספים
                fraud_score: 100 - data.botScore // המרה הפוכה אם צריך
            };

            // 3. כתיבה לסופבייס
            const sbRes = await fetch(`${env.SUPABASE_URL}/rest/v1/clicks`, {
                method: "POST",
                headers: {
                    "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                    "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                },
                body: JSON.stringify(clickRecord)
            });

            if (!sbRes.ok) {
                throw new Error(`Supabase Error: ${await sbRes.text()}`);
            }

            return new Response("Logged successfully", { status: 200 });

        } catch (err) {
            console.error("Logger Worker Error:", err);
            return new Response(err.message, { status: 500 });
        }
    }
};
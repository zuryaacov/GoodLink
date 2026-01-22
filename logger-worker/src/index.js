export default {
    async fetch(request, env) {
        // בדיקת אבטחה בסיסית - וידוא שהבקשה היא POST
        if (request.method !== "POST") {
            return new Response("Method not allowed", { status: 405 });
        }

        try {
            const data = await request.json();

            // 1. העשרת נתונים מ-IPinfo (מיקום, ספק אינטרנט וזיהוי VPN)
            let ipInfo = {};
            if (env.IPINFO_TOKEN) {
                try {
                    const ipRes = await fetch(`https://ipinfo.io/${data.ip}?token=${env.IPINFO_TOKEN}`);
                    if (ipRes.ok) {
                        ipInfo = await ipRes.json();
                    }
                } catch (e) {
                    console.error("IPinfo Fetch Error:", e);
                }
            }

            // 2. קביעת ה-Verdict (סיבת הבוט) לצרכי סטטיסטיקה
            let verdict = "clean";
            if (data.botScore < 30 && !data.isVerifiedBot) {
                verdict = "low_cf_score";
            } else if (ipInfo.privacy?.vpn) {
                verdict = "vpn_detected";
            } else if (ipInfo.privacy?.proxy) {
                verdict = "proxy_detected";
            } else if (data.isVerifiedBot) {
                verdict = "verified_bot";
            }

            // 3. הכנת האובייקט לטבלת CLICKS
            // שים לב: אנחנו משתמשים ב-data.id שמגיע מהווקר הראשון למניעת כפילויות
            const clickRecord = {
                id: data.id,
                link_id: data.linkData.id,
                user_id: data.linkData.user_id,
                ip_address: data.ip,
                user_agent: data.userAgent,
                referer: data.referer,
                country: data.country || ipInfo.country,
                city: data.city || ipInfo.city,
                slug: data.slug,
                domain: data.domain,
                target_url: data.linkData.target_url,
                query_params: data.queryParams,
                clicked_at: data.timestamp,

                // לוגיקה לזיהוי בוטים
                is_bot: (data.botScore < 30 && !data.isVerifiedBot) || (ipInfo.privacy?.vpn || ipInfo.privacy?.proxy),
                verdict: verdict, // המידע שהיה אמור להיות ב-bot_reason נכנס לכאן

                // נתונים מ-IPinfo
                isp: ipInfo.org || (data.asn ? `AS${data.asn}` : null),
                is_vpn: ipInfo.privacy?.vpn || false,
                is_proxy: ipInfo.privacy?.proxy || false,
                connection_type: ipInfo.type || null,

                // ציון רמת סיכון (הפיכה של Bot Score)
                fraud_score: 100 - (data.botScore || 0)
            };

            // 4. כתיבה לסופבייס עם מניעת כפילויות הרמטית
            const sbRes = await fetch(`${env.SUPABASE_URL}/rest/v1/clicks`, {
                method: "POST",
                headers: {
                    "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                    "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                    "Content-Type": "application/json",
                    // resolution=ignore-duplicates אומר שאם ה-ID כבר קיים, סופבייס פשוט יתעלם מהבקשה השנייה
                    "Prefer": "return=minimal, resolution=ignore-duplicates"
                },
                body: JSON.stringify(clickRecord)
            });

            if (!sbRes.ok) {
                const errorBody = await sbRes.text();
                throw new Error(`Supabase Error: ${errorBody}`);
            }

            return new Response("Logged successfully", { status: 200 });

        } catch (err) {
            console.error("Logger Worker Error:", err);
            return new Response(err.message, { status: 500 });
        }
    }
};
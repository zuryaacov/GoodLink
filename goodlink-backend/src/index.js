export default {
    async fetch(request, env) {
        // וידוא שהבקשה היא POST
        if (request.method !== "POST") {
            return new Response("Method not allowed", { status: 405 });
        }

        try {
            const data = await request.json();
            console.log(`📥 [Logger] Received data for ID: ${data.id}, Verdict: ${data.verdict}`);

            // 1. העשרת נתונים מ-IPinfo (מיקום ו-VPN)
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

            // 2. קביעת ה-Verdict והחלטה סופית על בוט
            const ua = (data.userAgent || "").toLowerCase();
            const isBotUA = /bot|crawler|spider|google|bing|yandex|baidu|slurp|screenshot|facebook/i.test(ua);

            // המשתנה verdict מקבל את מה שהוורקר הראשון שלח (למשל "blocked_bot")
            let finalVerdict = data.verdict || "clean";

            // אם הוורקר הראשון לא זיהה בוט, נבדוק שוב לפי IPinfo
            if (finalVerdict === "clean") {
                if (data.isVerifiedBot) finalVerdict = "verified_bot";
                else if (isBotUA) finalVerdict = "ua_bot_detected";
                else if (data.botScore < 30) finalVerdict = "low_cf_score";
                else if (ipInfo.privacy?.vpn) finalVerdict = "vpn_detected";
                else if (ipInfo.privacy?.proxy) finalVerdict = "proxy_detected";
            }

            // קביעה סופית לטבלה: האם זה בוט?
            const isBotFinal =
                finalVerdict !== "clean" ||
                (data.botScore < 30) ||
                ipInfo.privacy?.vpn ||
                ipInfo.privacy?.proxy;

            // 3. הכנת האובייקט לטבלת CLICKS
            const clickRecord = {
                id: data.id,
                link_id: data.linkData.id,
                user_id: data.linkData.user_id,
                ip_address: data.ip,
                user_agent: data.userAgent,
                referer: data.referer || "",
                country: data.country || ipInfo.country,
                city: data.city || ipInfo.city,
                slug: data.slug,
                domain: data.domain,
                target_url: data.linkData.target_url,
                query_params: data.queryParams || "",
                clicked_at: data.timestamp,
                is_bot: isBotFinal,
                verdict: finalVerdict,
                isp: ipInfo.org || (data.asn ? `AS${data.asn}` : null),
                is_vpn: ipInfo.privacy?.vpn || false,
                is_proxy: ipInfo.privacy?.proxy || false,
                connection_type: ipInfo.type || null,
                fraud_score: 100 - (data.botScore || 0)
            };

            // 4. כתיבה לסופבייס
            const sbRes = await fetch(`${env.SUPABASE_URL}/rest/v1/clicks`, {
                method: "POST",
                headers: {
                    "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
                    "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal, resolution=ignore-duplicates"
                },
                body: JSON.stringify(clickRecord)
            });

            if (!sbRes.ok) {
                const errorBody = await sbRes.text();
                console.error(`❌ [Supabase Error] ${errorBody}`);
                throw new Error(`Supabase Error: ${errorBody}`);
            }

            console.log(`✅ [Logger Success] Click ${data.id} saved to Supabase`);
            return new Response("Logged successfully", { status: 200 });

        } catch (err) {
            console.error("💥 [Logger Worker Error]:", err);
            return new Response(err.message, { status: 500 });
        }
    }
};
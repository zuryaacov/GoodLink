export default {
    async fetch(request, env) {
        console.log(`📥 Logger received ${request.method} request`);

        if (request.method !== "POST") {
            return new Response("Method not allowed", { status: 405 });
        }

        try {
            const data = await request.json();
            console.log("📦 Data received:", JSON.stringify(data));

            // שליפת מידע מ-IPinfo
            let ipInfo = {};
            if (env.IPINFO_TOKEN) {
                const ipRes = await fetch(`https://ipinfo.io/${data.ip}?token=${env.IPINFO_TOKEN}`);
                if (ipRes.ok) ipInfo = await ipRes.json();
            }

            const isBotFinal = data.verdict === "blocked_bot" || (data.botScore < 30) || ipInfo.privacy?.vpn || ipInfo.privacy?.proxy;

            const clickRecord = {
                id: data.id,
                link_id: data.linkData.id,
                user_id: data.linkData.user_id,
                ip_address: data.ip,
                user_agent: data.userAgent,
                country: ipInfo.country || "Unknown",
                city: ipInfo.city || "Unknown",
                slug: data.slug,
                domain: data.domain,
                target_url: data.linkData.target_url,
                query_params: data.queryParams || "",
                clicked_at: data.timestamp,
                is_bot: isBotFinal,
                verdict: data.verdict || "clean",
                isp: ipInfo.org || null,
                is_vpn: ipInfo.privacy?.vpn || false,
                is_proxy: ipInfo.privacy?.proxy || false,
                fraud_score: 100 - (data.botScore || 0)
            };

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
                const errText = await sbRes.text();
                console.error("❌ Supabase Error:", errText);
                return new Response(errText, { status: 500 });
            }

            console.log("✅ Successfully saved to Supabase");
            return new Response("OK", { status: 200 });

        } catch (err) {
            console.error("💥 Logger Crash:", err.message);
            return new Response(err.message, { status: 500 });
        }
    }
};
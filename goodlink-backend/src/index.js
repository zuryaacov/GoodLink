/**
 * Cloudflare Worker for Link Redirect (Fixed)
 */

import { Redis } from "@upstash/redis/cloudflare";

/**
 * Extract slug from URL path
 */
function extractSlug(pathname) {
    const path = pathname.replace(/^\//, '').split('?')[0].split('#')[0];
    if (!path || path === '' || path === 'index.html' || path.startsWith('api/')) {
        return null;
    }
    const slugPattern = /^[a-z0-9-._]{1,50}$/i;
    if (!slugPattern.test(path)) {
        return null;
    }
    return path.toLowerCase();
}

/**
 * Build target URL with UTM parameters
 */
function buildTargetUrl(targetUrl, linkData, requestUrl) {
    try {
        // Ensure protocol exists
        let finalTarget = targetUrl;
        if (!/^https?:\/\//i.test(finalTarget)) {
            finalTarget = 'https://' + finalTarget;
            console.log('🔧 [URL] Added missing protocol to target:', finalTarget);
        }

        const target = new URL(finalTarget);
        const requestParams = new URLSearchParams(requestUrl.search);

        if (linkData.utm_source) target.searchParams.set('utm_source', linkData.utm_source);
        if (linkData.utm_medium) target.searchParams.set('utm_medium', linkData.utm_medium);
        if (linkData.utm_campaign) target.searchParams.set('utm_campaign', linkData.utm_campaign);
        if (linkData.utm_content) target.searchParams.set('utm_content', linkData.utm_content);

        if (linkData.parameter_pass_through) {
            for (const [key, value] of requestParams.entries()) {
                if (!['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].includes(key)) {
                    target.searchParams.set(key, value);
                }
            }
        }
        return target.toString();
    } catch (error) {
        console.error('Error building target URL:', error);
        // Fallback: If still not absolute, force it
        if (!/^https?:\/\//i.test(targetUrl)) {
            return 'https://' + targetUrl;
        }
        return targetUrl;
    }
}

/**
 * Initialize Redis client from environment variables
 */
function getRedisClient(env) {
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
        return null;
    }

    return new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
    });
}

/**
 * Update link cache in Upstash Redis using SDK
 */
async function updateLinkCacheInRedis(cacheKey, cacheData, redisClient) {
    if (!redisClient) {
        console.error('❌ [Redis] Missing Redis configuration');
        return false;
    }

    try {
        console.log('📝 [Redis] Updating cache for key:', cacheKey);

        // Use Upstash SDK to set the value
        const value = JSON.stringify(cacheData);
        await redisClient.set(cacheKey, value);

        console.log('✅ [Redis] Cache updated successfully');
        return true;
    } catch (error) {
        console.error('❌ [Redis] Error updating cache:', error);
        return false;
    }
}

/**
 * Get link from Upstash Redis using SDK
 */
async function getLinkFromRedis(slug, domain, redisClient) {
    if (!redisClient) {
        return null;
    }

    try {
        let cacheKey = `link:${domain}:${slug}`;

        // Use Upstash SDK to get the value
        let cachedValue = await redisClient.get(cacheKey);

        // Fallback: Try without "link:" prefix
        if (!cachedValue) {
            console.log(`⚠️ [Redis] Key "${cacheKey}" not found. Trying fallback key...`);
            cacheKey = `${domain}:${slug}`;
            cachedValue = await redisClient.get(cacheKey);
        }

        if (!cachedValue || cachedValue === null) {
            console.log('⚠️ [Redis] Cache miss - keys not found:', `link:${domain}:${slug}`, 'or', `${domain}:${slug}`);
            return null;
        }

        // Parse the cached link data
        let linkData;
        try {
            if (typeof cachedValue === 'string') {
                linkData = JSON.parse(cachedValue);
            } else {
                linkData = cachedValue;
            }
        } catch (parseError) {
            console.error('❌ [Redis] Error parsing cached data:', parseError);
            return null;
        }

        // Only return active links
        if (linkData.status !== undefined && linkData.status !== 'active') {
            console.log(`⚠️ [Redis] Link found in cache but status is "${linkData.status}" (not active)`);
            return null;
        }

        console.log('✅ [Redis] Link found in cache');
        console.log('🔵 [Redis] JSON Data:', JSON.stringify(linkData, null, 2));
        return linkData;
    } catch (error) {
        console.error('❌ [Redis] Error querying Redis:', error);
        return null;
    }
}

/**
 * Query Supabase for link (fallback - kept for backward compatibility)
 */
async function getLinkFromSupabase(slug, domain, supabaseUrl, supabaseKey) {
    try {
        const queryUrl = `${supabaseUrl}/rest/v1/links?slug=eq.${encodeURIComponent(slug)}&domain=eq.${encodeURIComponent(domain)}&select=id,user_id,target_url,parameter_pass_through,utm_source,utm_medium,utm_campaign,utm_content,status`;

        const response = await fetch(queryUrl, {
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
            },
        });

        if (!response.ok) return null;
        const data = await response.json();

        if (!data || data.length === 0) {
            // Fallback: Try to find link by slug only (for debugging/localhost)
            const debugUrl = `${supabaseUrl}/rest/v1/links?slug=eq.${encodeURIComponent(slug)}&select=id,user_id,slug,domain,status,target_url,parameter_pass_through,utm_source,utm_medium,utm_campaign,utm_content`;
            const debugResponse = await fetch(debugUrl, {
                method: 'GET',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                },
            });
            if (debugResponse.ok) {
                const debugData = await debugResponse.json();
                if (debugData && debugData.length > 0) {
                    const foundLink = debugData.find(l =>
                        (l.status === undefined || l.status === 'active') &&
                        l.target_url
                    );
                    if (foundLink) {
                        return {
                            id: foundLink.id,
                            user_id: foundLink.user_id,
                            target_url: foundLink.target_url,
                            parameter_pass_through: foundLink.parameter_pass_through !== undefined ? foundLink.parameter_pass_through : true,
                            utm_source: foundLink.utm_source || null,
                            utm_medium: foundLink.utm_medium || null,
                            utm_campaign: foundLink.utm_campaign || null,
                            utm_content: foundLink.utm_content || null,
                            status: foundLink.status,
                        };
                    }
                }
            }
            return null;
        }

        const link = data[0];
        // Only allow 'active' status links
        if (link.status !== undefined && link.status !== 'active') {
            console.log(`Link found but status is "${link.status}" (not active)`);
            return null;
        }

        return link;
    } catch (error) {
        console.error('Error querying Supabase:', error);
        return null;
    }
}

/**
 * Detect Bot
 */
function isBot(userAgent) {
    if (!userAgent) return true;
    const botPatterns = ['bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'facebookexternalhit', 'whatsapp'];
    const ua = userAgent.toLowerCase();
    return botPatterns.some(pattern => ua.includes(pattern));
}

/**
 * Parse User-Agent
 */
function parseUserAgent(userAgent) {
    if (!userAgent) return { deviceType: 'unknown', browser: 'unknown', os: 'unknown' };
    const ua = userAgent.toLowerCase();

    let deviceType = 'desktop';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) deviceType = 'mobile';
    else if (ua.includes('tablet') || ua.includes('ipad')) deviceType = 'tablet';

    let browser = 'unknown';
    if (ua.includes('chrome') && !ua.includes('edg')) browser = 'chrome';
    else if (ua.includes('firefox')) browser = 'firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'safari';
    else if (ua.includes('edg')) browser = 'edge';

    let os = 'unknown';
    if (ua.includes('windows')) os = 'windows';
    else if (ua.includes('mac os') || ua.includes('macos')) os = 'macos';
    else if (ua.includes('linux')) os = 'linux';
    else if (ua.includes('android')) os = 'android';
    else if (ua.includes('ios')) os = 'ios';

    return { deviceType, browser, os };
}

/**
 * Check if we should track this click (deduplication)
 * Returns false if a similar click was recorded very recently (within last 2 seconds)
 * More aggressive deduplication to prevent rapid double-clicks
 */
async function shouldTrackClick(clickData, supabaseUrl, supabaseKey) {
    try {
        // Check for recent clicks with same link_id, IP, and user_agent (within last 2 seconds)
        // Using IP + user_agent is more reliable than session_id (which includes timestamp)
        const twoSecondsAgo = new Date(Date.now() - 2000).toISOString();
        const checkUrl = `${supabaseUrl}/rest/v1/clicks?link_id=eq.${clickData.link_id}&ip_address=eq.${encodeURIComponent(clickData.ip_address)}&clicked_at=gte.${twoSecondsAgo}&select=id&limit=1`;

        console.log('🔍 Checking for duplicate clicks (last 2 seconds)...');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 500); // Fast timeout for check

        const response = await fetch(checkUrl, {
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                console.log('🔍 Duplicate click detected (within 2 seconds) - skipping tracking');
                return false;
            }
            console.log('🔍 No duplicate found - will track click');
        } else {
            console.log('⚠️ Error checking for duplicates:', response.status, '- allowing tracking');
        }
        return true;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('⏱️ Deduplication check timeout - allowing tracking');
        } else {
            console.error('⚠️ Error checking for duplicates:', error.message, '- allowing tracking');
        }
        // If check fails, allow tracking (fail open - better to have duplicates than miss clicks)
        return true;
    }
}

/**
 * Track click in Supabase with retry logic
 * @deprecated Currently unused - tracking is handled via Stytch in /verify endpoint
 */
// eslint-disable-next-line no-unused-vars
async function trackClick(clickData, supabaseUrl, supabaseKey, maxRetries = 2) {
    const insertUrl = `${supabaseUrl}/rest/v1/clicks`;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        console.log(`📊 [trackClick] Attempt ${attempt}/${maxRetries + 1} - Starting...`);

        try {
            // Timeout controller - 3 seconds per attempt
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                console.error(`⏱️ [trackClick] Attempt ${attempt} - Timeout!`);
                controller.abort();
            }, 3000);

            const response = await fetch(insertUrl, {
                method: 'POST',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal', // Don't need response body (faster)
                },
                body: JSON.stringify(clickData),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log(`📊 [trackClick] Attempt ${attempt} - Response: ${response.status}`);

            if (response.ok) {
                console.log(`✅ [trackClick] Success on attempt ${attempt}!`);
                return true;
            } else {
                console.error(`❌ [trackClick] Attempt ${attempt} - Failed: ${response.status}`);

                // Don't retry on client errors (4xx) - these won't succeed on retry
                if (response.status >= 400 && response.status < 500) {
                    throw new Error(`Client error: ${response.status}`);
                }

                // Retry on server errors (5xx) or network issues
                if (attempt <= maxRetries) {
                    const delay = attempt * 200; // 200ms, 400ms
                    console.log(`🔄 [trackClick] Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                throw new Error(`Failed after ${maxRetries + 1} attempts: ${response.status}`);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error(`⏱️ [trackClick] Attempt ${attempt} - Timeout`);
            } else {
                console.error(`❌ [trackClick] Attempt ${attempt} - Error:`, error.message);
            }

            // Retry on network errors or timeouts
            if (attempt <= maxRetries && (error.name === 'AbortError' || error.message.includes('fetch'))) {
                const delay = attempt * 200;
                console.log(`🔄 [trackClick] Retrying after error in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            // Final attempt failed
            console.error(`❌ [trackClick] All ${maxRetries + 1} attempts failed`);
            throw error;
        }
    }

    return false;
}

/**
 * Save telemetry ID only (fallback when Stytch API is not available)
 */
async function saveTelemetryOnly(telemetryId, linkId, userId, slug, domain, targetUrl, cloudflareData, turnstileVerified, env, ctx) {
    console.log("🔵 [Stytch] Saving telemetry_id only (fallback mode)");

    const logData = {
        telemetry_id: telemetryId,
        link_id: linkId,
        user_id: userId,
        slug: slug,
        domain: domain,
        target_url: targetUrl,
        ip_address: cloudflareData.ipAddress || null,
        user_agent: cloudflareData.userAgent || null,
        referer: cloudflareData.referer || null,
        country: cloudflareData.country || null,
        city: cloudflareData.city || null,
        device_type: cloudflareData.deviceType || null,
        browser: cloudflareData.browser || null,
        os: cloudflareData.os || null,
        turnstile_verified: turnstileVerified || false,
        clicked_at: new Date().toISOString()
    };

    // Save to QStash instead of directly to Supabase - Use waitUntil to not block the redirect
    const saveTask = (async () => {
        if (env.QSTASH_URL && env.QSTASH_TOKEN) {
            try {
                await saveClickToQueue(logData, env.QSTASH_URL, env.QSTASH_TOKEN, env);
            } catch (qErr) {
                await saveToSupabase(logData, env);
            }
        } else {
            await saveToSupabase(logData, env);
        }
    })();

    if (ctx && ctx.waitUntil) {
        ctx.waitUntil(saveTask);
    } else {
        await saveTask;
    }
}

/**
 * Check if a click with the same telemetry_id already exists (deduplication)
 */
async function checkDuplicateClick(telemetryId, linkId, supabaseUrl, supabaseKey) {
    if (!telemetryId || !linkId) return false;

    try {
        const checkUrl = `${supabaseUrl}/rest/v1/clicks?telemetry_id=eq.${encodeURIComponent(telemetryId)}&link_id=eq.${encodeURIComponent(linkId)}&select=id&limit=1`;
        const response = await fetch(checkUrl, {
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                console.log('🔍 [Deduplication] Duplicate click detected (telemetry_id + link_id) - skipping');
                return true; // Duplicate found
            }
        }
        return false; // No duplicate
    } catch (error) {
        console.error('⚠️ [Deduplication] Error checking for duplicates:', error.message);
        return false; // On error, allow tracking (fail open)
    }
}

/**
 * Save click data to QStash (Upstash Queue)
 */
async function saveClickToQueue(logData, qstashUrl, qstashToken, env) {
    try {
        const targetUrl = `${env.SUPABASE_URL}/rest/v1/clicks`;
        console.log(`📤 [QStash] Attempting to publish click for ID: ${logData.link_id}`);
        console.log(`🔗 [QStash] Forwarding to: ${targetUrl}`);

        const response = await fetch(`https://qstash.upstash.io/v2/publish/${targetUrl}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${qstashToken}`,
                'Content-Type': 'application/json',
                'Upstash-Forward-Header-apikey': env.SUPABASE_SERVICE_ROLE_KEY,
                'Upstash-Forward-Header-Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                'Upstash-Forward-Header-Content-Type': 'application/json',
                'Upstash-Forward-Header-Prefer': 'return=minimal'
            },
            body: JSON.stringify(logData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ [QStash] API Error Status: ${response.status}`);
            console.error(`❌ [QStash] API Error Body: ${errorText}`);
            throw new Error(`QStash error: ${errorText}`);
        }

        const result = await response.json();
        console.log(`✅ [QStash] Success! MessageId: ${result.messageId}`);
        return result;
    } catch (error) {
        console.error('❌ [QStash] Exception caught:', error.message);
        throw error;
    }
}

/**
 * Save data to Supabase (deprecated - now using Queue)
 * @deprecated Use saveClickToQueue instead
 */
async function saveToSupabase(logData, env) {
    // Check for duplicate before saving
    if (logData.telemetry_id && logData.link_id) {
        const isDuplicate = await checkDuplicateClick(logData.telemetry_id, logData.link_id, env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
        if (isDuplicate) {
            console.log('⏭️ [Deduplication] Skipping save - duplicate click detected');
            return; // Skip saving duplicate
        }
    }

    const supabaseResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/clicks`, {
        method: "POST",
        headers: {
            "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        },
        body: JSON.stringify(logData)
    });

    if (!supabaseResponse.ok) {
        const errorText = await supabaseResponse.text();
        console.error("❌ [Supabase] Error:", supabaseResponse.status, errorText);
        throw new Error(`Supabase error: ${errorText}`);
    }
}

/**
 * Verify Cloudflare Turnstile token
 */
async function verifyTurnstile(token, ipAddress, secretKey) {
    try {
        console.log('🔵 [Turnstile] Starting verification...');
        console.log('🔵 [Turnstile] Token length:', token ? token.length : 0);
        console.log('🔵 [Turnstile] IP Address:', ipAddress);
        console.log('🔵 [Turnstile] Secret Key exists:', !!secretKey);

        const verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
        console.log('🔵 [Turnstile] Verification URL:', verifyUrl);

        const verifyResponse = await fetch(verifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                secret: secretKey,
                response: token,
                remoteip: ipAddress
            })
        });

        console.log('🔵 [Turnstile] Response status:', verifyResponse.status);

        const result = await verifyResponse.json();
        console.log('🔵 [Turnstile] Response result:', JSON.stringify(result));

        if (result.success === true) {
            console.log('✅ [Turnstile] Verification successful!');
            return true;
        } else {
            console.error('❌ [Turnstile] Verification failed:', result['error-codes'] || 'Unknown error');
            return false;
        }
    } catch (err) {
        console.error('❌ [Turnstile] Verification error:', err);
        console.error('❌ [Turnstile] Error message:', err.message);
        console.error('❌ [Turnstile] Error stack:', err.stack);
        return false;
    }
}

/**
 * Check if request is from a bot based on various signals
 */
function isBotDetected(userAgent, stytchVerdict, stytchFraudScore) {
    console.log('🔍 [Bot Detection] Checking for bot signals...');
    console.log('🔍 [Bot Detection] User-Agent:', userAgent || 'none');
    console.log('🔍 [Bot Detection] Stytch Verdict:', stytchVerdict || 'none');
    console.log('🔍 [Bot Detection] Stytch Fraud Score:', stytchFraudScore || 'none');

    // Check User-Agent patterns
    if (userAgent && isBot(userAgent)) {
        console.log('🚫 [Bot Detection] Bot detected via User-Agent pattern');
        return true;
    }

    // Check Stytch verdict (if it indicates bot/fraud)
    if (stytchVerdict && (stytchVerdict.toLowerCase().includes('bad') || stytchVerdict.toLowerCase().includes('bot') || stytchVerdict.toLowerCase().includes('fraud'))) {
        console.log('🚫 [Bot Detection] Bot detected via Stytch verdict:', stytchVerdict);
        return true;
    }

    // Check Stytch fraud score (if very high, likely bot)
    if (stytchFraudScore && stytchFraudScore > 80) {
        console.log('🚫 [Bot Detection] Bot detected via Stytch fraud score:', stytchFraudScore);
        return true;
    }

    // Note: Turnstile verification failure is already handled by 403 response
    // So we don't need to check it here

    console.log('✅ [Bot Detection] No bot detected - allowing request');
    return false;
}

/**
 * Handle Stytch tracking - Updated Endpoint for 2026
 * Returns Stytch data for bot detection, or null if API failed
 */
async function handleTracking(telemetryId, linkId, userId, slug, domain, targetUrl, cloudflareData, turnstileVerified, env, ctx) {
    try {
        console.log("🔵 [Stytch] Fetching data for Project:", env.STYTCH_PROJECT_ID);

        // נסה קודם Consumer endpoint
        let stytchUrl = `https://api.stytch.com/v1/fingerprint/lookup`;
        console.log("🔵 [Stytch] Trying Consumer endpoint:", stytchUrl);

        let stytchResponse = await fetch(stytchUrl, {
            method: "POST", // זה חייב להיות POST (לא GET!) - GET יחזיר 404
            headers: {
                "Authorization": "Basic " + btoa(`${env.STYTCH_PROJECT_ID}:${env.STYTCH_SECRET}`),
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                telemetry_id: telemetryId
            })
        });

        // אם קיבלנו 404, נסה B2B endpoint
        if (stytchResponse.status === 404) {
            console.log("⚠️ [Stytch] Consumer endpoint returned 404, trying B2B endpoint...");
            stytchUrl = `https://api.stytch.com/v1/b2b/fingerprint/lookup`;
            console.log("🔵 [Stytch] Trying B2B endpoint:", stytchUrl);

            stytchResponse = await fetch(stytchUrl, {
                method: "POST",
                headers: {
                    "Authorization": "Basic " + btoa(`${env.STYTCH_PROJECT_ID}:${env.STYTCH_SECRET}`),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    telemetry_id: telemetryId
                })
            });
        }

        if (!stytchResponse.ok) {
            const errorText = await stytchResponse.text();
            console.error("❌ [Stytch] API error details:", errorText);
            console.error("❌ [Stytch] Tried endpoint:", stytchUrl);
            await saveTelemetryOnly(telemetryId, linkId, userId, slug, domain, targetUrl, cloudflareData, turnstileVerified, env);
            return null; // Return null if Stytch API failed
        }

        const res = await stytchResponse.json();

        // חילוץ המידע המלא (ווידוא קיום אובייקטים)
        // שימוש בנתוני Stytch אם קיימים, אחרת בנתוני Cloudflare
        const logData = {
            link_id: linkId,
            user_id: userId,
            slug: slug,
            domain: domain,
            target_url: targetUrl,
            telemetry_id: telemetryId,
            visitor_id: res.visitor_id || null,
            verdict: res.verdict || null,
            fraud_score: res.fraud_score || 0,
            // נתוני רשת - Stytch אם קיים, אחרת Cloudflare
            ip_address: res.ip_address || cloudflareData.ipAddress || null,
            country: cloudflareData.country || null,
            city: cloudflareData.city || null,
            // נתוני רשת עמוקים מ-Stytch
            is_vpn: res.network_info?.is_vpn || false,
            is_proxy: res.network_info?.is_proxy || false,
            isp: res.network_info?.asn_org || null,
            // נתוני מכשיר - Stytch אם קיים, אחרת Cloudflare
            browser: res.telemetry?.browser_name || cloudflareData.browser || null,
            os: res.telemetry?.os_name || cloudflareData.os || null,
            device_type: res.telemetry?.device_type || cloudflareData.deviceType || null,
            battery_level: res.telemetry?.battery_level || null,
            screen_resolution: res.telemetry?.screen_width ? `${res.telemetry.screen_width}x${res.telemetry.screen_height}` : null,
            is_incognito: res.telemetry?.is_incognito || false,
            user_agent: cloudflareData.userAgent || null,
            referer: cloudflareData.referer || null,
            turnstile_verified: turnstileVerified || false,
            clicked_at: new Date().toISOString()
        };

        // Save to QStash instead of directly to Supabase - Use waitUntil to not block the redirect
        const saveTask = (async () => {
            if (env.QSTASH_URL && env.QSTASH_TOKEN) {
                try {
                    await saveClickToQueue(logData, env.QSTASH_URL, env.QSTASH_TOKEN, env);
                    console.log("✅ [QStash] Data queued successfully");
                } catch (qErr) {
                    console.error("❌ [QStash] Queue failed, falling back to direct Supabase save:", qErr);
                    await saveToSupabase(logData, env);
                }
            } else {
                console.warn("⚠️ [Queue] QStash not configured, falling back to direct Supabase save");
                await saveToSupabase(logData, env);
            }
        })();

        if (ctx && ctx.waitUntil) {
            ctx.waitUntil(saveTask);
        } else {
            // If ctx is not available, we must await to ensure data is not lost (though this shouldn't happen in Workers)
            await saveTask;
        }

        // Return Stytch data for bot detection
        return {
            verdict: res.verdict || null,
            fraud_score: res.fraud_score || 0
        };

    } catch (err) {
        console.error("❌ [Stytch] Critical Error:", err);
        await saveTelemetryOnly(telemetryId, linkId, userId, slug, domain, targetUrl, cloudflareData, turnstileVerified, env, ctx);
        return null;
    }
}

/**
 * Handle adding custom domain via Cloudflare API
 */
async function handleAddCustomDomain(request, env) {
    try {
        // Parse request body
        const body = await request.json();
        const { domain, user_id } = body;

        if (!domain || !user_id) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Missing domain or user_id'
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            });
        }

        console.log('🔵 [AddDomain] Domain:', domain);
        console.log('🔵 [AddDomain] User ID:', user_id);

        // Check Cloudflare environment variables
        if (!env.CLOUDFLARE_ZONE_ID || !env.CLOUDFLARE_GLOBAL_KEY || !env.CLOUDFLARE_EMAIL) {
            console.error('❌ [AddDomain] Missing Cloudflare configuration');
            return new Response(JSON.stringify({
                success: false,
                error: 'Cloudflare configuration missing'
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            });
        }

        // Call Cloudflare API to register custom hostname
        console.log('🔵 [AddDomain] Calling Cloudflare API to create custom hostname...');
        const cfUrl = `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames`;
        const cfHeaders = {
            'X-Auth-Email': env.CLOUDFLARE_EMAIL,
            'X-Auth-Key': env.CLOUDFLARE_GLOBAL_KEY,
            'Content-Type': 'application/json',
        };

        // 1. Create the custom hostname
        const createResponse = await fetch(cfUrl, {
            method: 'POST',
            headers: cfHeaders,
            body: JSON.stringify({
                hostname: domain,
                ssl: {
                    method: 'txt',      // Critical: This ensures TXT validation records are returned
                    type: 'dv',         // Domain Validation
                    settings: {
                        http2: 'on',
                        min_tls_version: '1.2'
                    }
                }
            }),
        });

        const createData = await createResponse.json();
        console.log('🔵 [AddDomain] Initial Cloudflare response:', JSON.stringify(createData, null, 2));

        if (!createData.success) {
            const errorMsg = createData.errors?.[0]?.message || 'Cloudflare API error';
            console.error('❌ [AddDomain] Cloudflare API error:', errorMsg);
            return new Response(JSON.stringify({
                success: false,
                error: errorMsg
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            });
        }

        const hostnameId = createData.result.id;
        console.log('🔵 [AddDomain] Hostname created with ID:', hostnameId);

        // 2. Wait for Cloudflare to generate SSL validation records
        // Cloudflare needs a moment to communicate with the Certificate Authority
        console.log('🔵 [AddDomain] Waiting for SSL validation records to be generated...');
        await new Promise(resolve => setTimeout(resolve, 2500)); // Wait 2.5 seconds

        // 3. Fetch the updated hostname data (including SSL validation records)
        console.log('🔵 [AddDomain] Fetching updated hostname data from Cloudflare...');
        const getResponse = await fetch(`${cfUrl}/${hostnameId}`, {
            method: 'GET',
            headers: cfHeaders,
        });

        const cloudflareData = await getResponse.json();
        console.log('🔵 [AddDomain] Updated Cloudflare response:', JSON.stringify(cloudflareData, null, 2));

        if (!cloudflareData.success) {
            const errorMsg = cloudflareData.errors?.[0]?.message || 'Failed to fetch hostname data';
            console.error('❌ [AddDomain] Failed to fetch updated data:', errorMsg);
            return new Response(JSON.stringify({
                success: false,
                error: errorMsg
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            });
        }

        const result = cloudflareData.result;
        const ownershipVerification = result.ownership_verification;
        const sslVerification = result.ssl?.validation_records?.[0];

        console.log('🔵 [AddDomain] Ownership verification:', JSON.stringify(ownershipVerification, null, 2));
        console.log('🔵 [AddDomain] SSL verification:', JSON.stringify(sslVerification, null, 2));
        console.log('🔵 [AddDomain] SSL object:', JSON.stringify(result.ssl, null, 2));

        // Prepare DNS records for display
        // Build dns_records array with ownership, SSL validation, and CNAME records
        const dnsRecords = [];

        // 1. Ownership verification (TXT record)
        if (ownershipVerification) {
            dnsRecords.push({
                type: ownershipVerification.type || 'TXT',
                host: ownershipVerification.name || '_cf-custom-hostname',
                value: ownershipVerification.value || ''
            });
        }

        // 2. SSL verification (TXT record) - from ssl.validation_records[0]
        if (sslVerification && sslVerification.txt_name && sslVerification.txt_value) {
            console.log('🔵 [AddDomain] Adding SSL verification record:', {
                txt_name: sslVerification.txt_name,
                txt_value: sslVerification.txt_value
            });
            dnsRecords.push({
                type: 'TXT',
                host: sslVerification.txt_name,
                value: sslVerification.txt_value
            });
        } else {
            console.log('⚠️ [AddDomain] No SSL verification record found - ssl.validation_records may be empty or not yet available');
            if (result.ssl) {
                console.log('🔵 [AddDomain] SSL object exists but validation_records:', result.ssl.validation_records);
            }
        }

        // 3. CNAME record (point traffic)
        dnsRecords.push({
            type: 'CNAME',
            host: '@',
            value: 'glynk.to' // Fallback domain
        });

        console.log('🔵 [AddDomain] DNS records prepared:', JSON.stringify(dnsRecords, null, 2));

        // Save to Supabase
        console.log('🔵 [AddDomain] Saving to Supabase...');
        if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Supabase configuration missing'
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // Check if domain already exists
        const checkUrl = `${env.SUPABASE_URL}/rest/v1/custom_domains?user_id=eq.${encodeURIComponent(user_id)}&domain=eq.${encodeURIComponent(domain)}&select=id`;
        const checkResponse = await fetch(checkUrl, {
            method: 'GET',
            headers: {
                'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        let domainId;
        if (checkResponse.ok) {
            const existingDomains = await checkResponse.json();
            if (existingDomains && existingDomains.length > 0) {
                // Update existing domain
                domainId = existingDomains[0].id;
                const updateUrl = `${env.SUPABASE_URL}/rest/v1/custom_domains?id=eq.${encodeURIComponent(domainId)}`;
                const updateResponse = await fetch(updateUrl, {
                    method: 'PATCH',
                    headers: {
                        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
                        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation',
                    },
                    body: JSON.stringify({
                        cloudflare_hostname_id: hostnameId,
                        dns_records: dnsRecords,
                        status: 'pending',
                    }),
                });
                if (!updateResponse.ok) {
                    throw new Error('Failed to update domain in Supabase');
                }
            } else {
                // Insert new domain
                const insertUrl = `${env.SUPABASE_URL}/rest/v1/custom_domains`;
                const insertResponse = await fetch(insertUrl, {
                    method: 'POST',
                    headers: {
                        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
                        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation',
                    },
                    body: JSON.stringify({
                        user_id: user_id,
                        domain: domain,
                        cloudflare_hostname_id: hostnameId,
                        dns_records: dnsRecords,
                        status: 'pending',
                    }),
                });
                if (!insertResponse.ok) {
                    const errorText = await insertResponse.text();
                    throw new Error(`Failed to save domain in Supabase: ${errorText}`);
                }
                const insertData = await insertResponse.json();
                domainId = insertData[0].id;
            }
        } else {
            throw new Error('Failed to check domain in Supabase');
        }

        console.log('✅ [AddDomain] Domain saved successfully');

        // Return success response - include full SSL object for debugging
        return new Response(JSON.stringify({
            success: true,
            cloudflare_hostname_id: hostnameId,
            verification: {
                ownership_verification: ownershipVerification,
                ssl_verification: sslVerification,
            },
            ssl: result.ssl,  // Include full SSL object
            dns_records: dnsRecords,
            domain_id: domainId
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });

    } catch (error) {
        console.error('❌ [AddDomain] Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Internal server error'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}

/**
 * Handle verifying custom domain DNS records via Cloudflare API
 */
async function handleVerifyCustomDomain(request, env) {
    try {
        // Parse request body
        const body = await request.json();
        const { domain_id, cloudflare_hostname_id } = body;

        if (!cloudflare_hostname_id && !domain_id) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Missing domain_id or cloudflare_hostname_id'
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            });
        }

        console.log('🔵 [VerifyDomain] Domain ID:', domain_id);
        console.log('🔵 [VerifyDomain] Cloudflare Hostname ID:', cloudflare_hostname_id);

        // Check Cloudflare environment variables
        if (!env.CLOUDFLARE_ZONE_ID || !env.CLOUDFLARE_GLOBAL_KEY || !env.CLOUDFLARE_EMAIL) {
            console.error('❌ [VerifyDomain] Missing Cloudflare configuration');
            return new Response(JSON.stringify({
                success: false,
                error: 'Cloudflare configuration missing'
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            });
        }

        // Get cloudflare_hostname_id from Supabase if only domain_id provided
        let hostnameId = cloudflare_hostname_id;
        if (!hostnameId && domain_id && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
            const getUrl = `${env.SUPABASE_URL}/rest/v1/custom_domains?id=eq.${encodeURIComponent(domain_id)}&select=cloudflare_hostname_id`;
            const getResponse = await fetch(getUrl, {
                method: 'GET',
                headers: {
                    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                    'Content-Type': 'application/json',
                },
            });
            if (getResponse.ok) {
                const domainData = await getResponse.json();
                if (domainData && domainData.length > 0 && domainData[0].cloudflare_hostname_id) {
                    hostnameId = domainData[0].cloudflare_hostname_id;
                }
            }
        }

        if (!hostnameId) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Cloudflare hostname ID not found'
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            });
        }

        // Call Cloudflare API to check hostname status
        console.log('🔵 [VerifyDomain] Checking Cloudflare hostname status...');
        const cloudflareResponse = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames/${hostnameId}`,
            {
                method: 'GET',
                headers: {
                    'X-Auth-Email': env.CLOUDFLARE_EMAIL,
                    'X-Auth-Key': env.CLOUDFLARE_GLOBAL_KEY,
                    'Content-Type': 'application/json',
                },
            }
        );

        const cloudflareData = await cloudflareResponse.json();
        console.log('🔵 [VerifyDomain] Cloudflare response:', JSON.stringify(cloudflareData, null, 2));

        if (!cloudflareData.success) {
            const errorMsg = cloudflareData.errors?.[0]?.message || 'Cloudflare API error';
            console.error('❌ [VerifyDomain] Cloudflare API error:', errorMsg);
            return new Response(JSON.stringify({
                success: false,
                error: errorMsg
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            });
        }

        const hostnameResult = cloudflareData.result;
        const sslStatus = hostnameResult.ssl?.status || 'pending';
        const isActive = sslStatus === 'active';

        console.log('🔵 [VerifyDomain] SSL Status:', sslStatus);
        console.log('🔵 [VerifyDomain] Is Active:', isActive);

        // Update status in Supabase
        if (domain_id && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
            const updateUrl = `${env.SUPABASE_URL}/rest/v1/custom_domains?id=eq.${encodeURIComponent(domain_id)}`;
            const updateResponse = await fetch(updateUrl, {
                method: 'PATCH',
                headers: {
                    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation',
                },
                body: JSON.stringify({
                    status: isActive ? 'active' : 'pending',
                    verified_at: isActive ? new Date().toISOString() : null,
                }),
            });
            if (!updateResponse.ok) {
                console.error('❌ [VerifyDomain] Failed to update domain in Supabase');
            } else {
                console.log('✅ [VerifyDomain] Domain status updated in Supabase');
            }
        }

        // Return verification result
        return new Response(JSON.stringify({
            success: true,
            is_active: isActive,
            ssl_status: sslStatus,
            status: isActive ? 'active' : 'pending'
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });

    } catch (error) {
        console.error('❌ [VerifyDomain] Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Internal server error'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    }
}

/**
 * Handle update Redis cache endpoint
 * Update by domain+slug (full overwrite of the same record)
 */
async function handleUpdateRedisCache(request, env) {
    // CORS headers - allow requests from goodlink.ai
    const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://www.goodlink.ai',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true'
    };

    try {
        // Parse request body
        const body = await request.json();
        const { domain, slug, oldDomain, oldSlug, cacheData } = body;

        if (!domain || !slug || !cacheData) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Missing domain, slug, or cacheData'
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }

        console.log('🔵 [RedisCache] Updating cache for:', domain, slug);

        // Initialize Redis client
        const redisClient = getRedisClient(env);
        if (!redisClient) {
            console.error('❌ [RedisCache] Missing Redis configuration');
            return new Response(JSON.stringify({
                success: false,
                error: 'Redis configuration missing'
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }

        // New key for the updated record
        const newKey = `link:${domain}:${slug}`;

        console.log('🔵 [RedisCache] Received oldDomain:', oldDomain, 'oldSlug:', oldSlug);
        console.log('🔵 [RedisCache] New key will be:', newKey);

        // Check if domain/slug changed - if so, delete the old key first
        let deletedOld = false;
        if (oldDomain && oldSlug) {
            const oldKey = `link:${oldDomain}:${oldSlug}`;
            console.log('🔵 [RedisCache] Old key would be:', oldKey);
            if (oldKey !== newKey) {
                console.log('🧹 [RedisCache] Domain/slug changed! Deleting old key:', oldKey);
                try {
                    const delResult = await redisClient.del(oldKey);
                    console.log('🧹 [RedisCache] Delete result:', delResult);
                    deletedOld = true;
                } catch (delError) {
                    console.error('❌ [RedisCache] Error deleting old key:', delError);
                }
            } else {
                console.log('🔵 [RedisCache] Keys are the same, no delete needed');
            }
        } else {
            console.log('🔵 [RedisCache] No oldDomain/oldSlug provided (new link or same key)');
        }

        // Set the new/updated key with full data (overwrites if key exists)
        await redisClient.set(newKey, JSON.stringify(cacheData));
        console.log('✅ [RedisCache] Cache updated:', newKey);

        return new Response(JSON.stringify({
            success: true,
            message: 'Redis cache updated successfully',
            cacheKey: newKey,
            receivedOldDomain: oldDomain,
            receivedOldSlug: oldSlug,
            deletedOld: deletedOld,
            deletedOldKey: deletedOld ? `link:${oldDomain}:${oldSlug}` : null
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });

    } catch (error) {
        console.error('❌ [RedisCache] Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Internal server error'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }
}

/**
 * Generate bridging HTML page
 */
function getBridgingPage(destUrl, linkId, slug, domain) {
    const encodedDest = btoa(destUrl);
    const encodedLinkId = btoa(linkId);
    const encodedSlug = btoa(slug);
    const encodedDomain = btoa(domain);
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Secure Redirect | GoodLink</title>
    <script src="https://elements.stytch.com/telemetry.js"></script>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    <style>
        :root {
            --bg: #0f172a;
            --primary: #38bdf8;
            --text: #f1f5f9;
            --card: #1e293b;
        }

        body {
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: var(--bg);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            color: var(--text);
        }

        .container {
            text-align: center;
            background: var(--card);
            padding: 3rem;
            border-radius: 24px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.3);
            max-width: 400px;
            width: 90%;
            border: 1px solid rgba(255,255,255,0.05);
        }

        .logo {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -1px;
            margin-bottom: 2rem;
            color: var(--primary);
        }

        .logo span { color: #fff; }

        /* אנימציית הטעינה המקצועית */
        .loader-wrapper {
            position: relative;
            width: 80px;
            height: 80px;
            margin: 0 auto 2rem;
        }

        .loader {
            position: absolute;
            width: 100%;
            height: 100%;
            border: 3px solid rgba(56, 189, 248, 0.1);
            border-top: 3px solid var(--primary);
            border-radius: 50%;
            animation: spin 1s cubic-bezier(0.76, 0, 0.24, 1) infinite;
        }

        .shield-icon {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 30px;
            fill: var(--primary);
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        h1 { font-size: 1.25rem; margin-bottom: 0.5rem; font-weight: 600; }
        p { color: #94a3b8; font-size: 0.9rem; line-height: 1.5; }

        .status-bar {
            margin-top: 2rem;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #64748b;
        }

        /* פס התקדמות קטן בתחתית */
        .progress-container {
            width: 100%;
            height: 4px;
            background: rgba(255,255,255,0.05);
            margin-top: 10px;
            border-radius: 2px;
            overflow: hidden;
        }
        .progress-bar {
            width: 30%;
            height: 100%;
            background: var(--primary);
            animation: progress 2s ease-in-out infinite;
        }

        @keyframes progress {
            0% { width: 0%; transform: translateX(-100%); }
            50% { width: 50%; }
            100% { width: 100%; transform: translateX(200%); }
        }
    </style>
</head>
<body>

<div class="container">
    <div class="logo">Good<span>Link</span></div>
    
    <div class="loader-wrapper">
        <div class="loader"></div>
        <svg class="shield-icon" viewBox="0 0 24 24">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
        </svg>
    </div>

    <h1>Security Check</h1>
    <p>Verifying a secure connection. This helps us protect our affiliates and ensure traffic quality.</p>

    <div class="status-bar">
        Initializing Intelligence...
        <div class="progress-container">
            <div class="progress-bar"></div>
        </div>
    </div>
    
    <!-- Cloudflare Turnstile Widget (invisible mode) -->
    <div class="cf-turnstile" data-sitekey="0x4AAAAAACL1UvTFIr6R2-Xe" data-callback="onTurnstileSuccess" data-size="invisible"></div>
</div>

<script>
    let turnstileToken = null;
    let telemetryId = null;
    let redirectReady = false;
    
    // Callback כאשר Turnstile מסתיים
    function onTurnstileSuccess(token) {
        console.log('✅ [Turnstile] Token received:', token ? 'Present (length: ' + token.length + ')' : 'Missing');
        turnstileToken = token;
        checkAndRedirect();
    }
    
    // בדוק אם אפשר לעשות redirect (צריך גם telemetry ID וגם Turnstile token)
    function checkAndRedirect() {
        if (redirectReady && telemetryId) {
            const dest = '${encodedDest}';
            const linkId = '${encodedLinkId}';
            const slug = '${encodedSlug}';
            const domain = '${encodedDomain}';
            
            let verifyUrl = '/verify?id=' + telemetryId + '&dest=' + dest + '&link_id=' + linkId + '&slug=' + slug + '&domain=' + domain;
            
            // הוסף Turnstile token אם קיים
            if (turnstileToken) {
                verifyUrl += '&cf-turnstile-response=' + encodeURIComponent(turnstileToken);
                console.log('🔵 [Turnstile] Adding token to URL (length: ' + turnstileToken.length + ')');
            } else {
                console.log('⚠️ [Turnstile] No token available - continuing without it');
            }
            
            window.location.href = verifyUrl;
        }
    }
    
    async function redirect() {
        try {
            // קריאה לסטיץ'
            telemetryId = await GetTelemetryID();
            console.log('✅ [Stytch] Telemetry ID received:', telemetryId ? 'Present' : 'Missing');
            
            // המתנה של 1 שנייה + המתנה ל-Turnstile (מקסימום 3 שניות)
            setTimeout(() => {
                redirectReady = true;
                console.log('🔵 [Redirect] Ready to redirect, waiting for Turnstile...');
                checkAndRedirect();
            }, 1000);
            
            // Timeout - אם Turnstile לא מסתיים תוך 3 שניות, ממשיכים בלי token
            setTimeout(() => {
                if (!turnstileToken) {
                    console.log('⏱️ [Turnstile] Timeout - continuing without token');
                    redirectReady = true;
                    checkAndRedirect();
                }
            }, 3000);
            
        } catch (e) {
            console.error("Verification failed", e);
            // במקרה של שגיאה - עדיין מעבירים כדי לא לאבד את המשתמש
            const dest = '${encodedDest}';
            try {
                const decoded = atob(dest);
                window.location.href = decoded;
            } catch {
                window.location.href = "https://goodlink.ai"; 
            }
        }
    }

    window.onload = redirect;
</script>

</body>
</html>`;
}

/**
 * Generate a beautiful 404 page
 */
function get404Page(slug, domain) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Link Not Found | GoodLink</title>
    <style>
        :root {
            --bg: #0f172a;
            --primary: #38bdf8;
            --text: #f1f5f9;
            --card: #1e293b;
        }

        body {
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            min-height: 100dvh; /* Use dynamic viewport height for mobile browsers */
            width: 100%;
            background-color: var(--bg);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            color: var(--text);
            overflow-x: hidden;
            position: relative;
        }

        .container {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            background: var(--card);
            padding: 2rem;
            border-radius: 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            width: 85%;
            max-width: 320px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            position: relative;
            z-index: 10;
            box-sizing: border-box;
        }

        @media (min-width: 640px) {
            .container {
                padding: 4rem;
                max-width: 500px;
            }
        }

        .logo {
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -1px;
            margin-bottom: 3rem;
            color: var(--primary);
        }
        .logo span { color: #fff; }

        .error-code {
            font-size: 5rem;
            font-weight: 900;
            line-height: 1;
            margin: 1rem 0;
            background: linear-gradient(to bottom, #38bdf8, #0ea5e9);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            opacity: 0.3;
            position: relative;
            z-index: 1;
        }

        @media (min-width: 640px) {
            .error-code {
                font-size: 8rem;
                margin: 1.5rem 0;
            }
        }

        h1 {
            font-size: 2rem;
            margin-bottom: 1rem;
            font-weight: 700;
            color: #fff;
        }

        p {
            color: #94a3b8;
            font-size: 1.1rem;
            line-height: 1.6;
            margin-bottom: 2.5rem;
        }

        .details {
            background: rgba(15, 23, 42, 0.5);
            padding: 1.5rem;
            border-radius: 16px;
            margin-bottom: 2.5rem;
            border: 1px solid rgba(56, 189, 248, 0.1);
            text-align: left;
        }

        .detail-item {
            font-size: 0.9rem;
            margin-bottom: 0.5rem;
            display: flex;
            justify-content: space-between;
        }

        .detail-label { color: #64748b; }
        .detail-value { color: var(--primary); font-family: monospace; }

        .btn {
            display: inline-block;
            background: var(--primary);
            color: #0f172a;
            text-decoration: none;
            padding: 1rem 2rem;
            border-radius: 12px;
            font-weight: 700;
            transition: all 0.2s;
            box-shadow: 0 10px 15px -3px rgba(56, 189, 248, 0.3);
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 25px -5px rgba(56, 189, 248, 0.4);
            filter: brightness(1.1);
        }

        /* Abstract Background Elements */
        .circle {
            position: absolute;
            border-radius: 50%;
            filter: blur(80px);
            z-index: 1;
        }
        .circle-1 {
            width: 300px;
            height: 300px;
            background: rgba(56, 189, 248, 0.1);
            top: -100px;
            left: -100px;
        }
        .circle-2 {
            width: 400px;
            height: 400px;
            background: rgba(14, 165, 233, 0.05);
            bottom: -150px;
            right: -150px;
        }
    </style>
</head>
<body>
    <div class="circle circle-1"></div>
    <div class="circle circle-2"></div>

    <div class="container">
        <h1>Link Not Found</h1>
        <div class="error-code">404</div>
        <p style="margin-bottom: 0;">Sorry, the link you're looking for doesn't exist or has been moved.</p>
    </div>
</body>
</html>`;
}

/**
 * Main worker handler
 */
export default {
    async fetch(request, env, ctx) {
        console.log('🔵 ========== WORKER STARTED ==========');
        console.log('🔵 Request URL:', request.url);
        console.log('🔵 Request Method:', request.method);
        console.log('🔵 Request Headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));

        // Handle OPTIONS requests (CORS preflight) - must be first!
        if (request.method === 'OPTIONS') {
            console.log('🔵 Handling OPTIONS request (CORS preflight)');
            // Allow requests from goodlink.ai to glynk.to
            const origin = request.headers.get('Origin');
            const allowedOrigins = [
                'https://www.goodlink.ai',
                'https://goodlink.ai',
                'http://localhost:3000',
                'http://localhost:5173'
            ];
            const allowOrigin = allowedOrigins.includes(origin) ? origin : 'https://www.goodlink.ai';

            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': allowOrigin,
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Max-Age': '86400'
                }
            });
        }

        const url = new URL(request.url);
        const pathname = url.pathname;

        // Handle /api/add-custom-domain endpoint (POST)
        if (pathname === '/api/add-custom-domain' && request.method === 'POST') {
            console.log('🔵 Handling /api/add-custom-domain endpoint');
            return await handleAddCustomDomain(request, env);
        }

        // Handle /api/verify-custom-domain endpoint (POST)
        if (pathname === '/api/verify-custom-domain' && request.method === 'POST') {
            console.log('🔵 Handling /api/verify-custom-domain endpoint');
            return await handleVerifyCustomDomain(request, env);
        }

        // Handle /api/update-redis-cache endpoint (POST)
        if (pathname === '/api/update-redis-cache' && request.method === 'POST') {
            console.log('🔵 Handling /api/update-redis-cache endpoint');
            return await handleUpdateRedisCache(request, env);
        }

        // Only process GET requests for other endpoints
        if (request.method !== 'GET') {
            console.log(`🔵 Skipping ${request.method} request (only GET supported)`);
            return new Response('Method not allowed', { status: 405 });
        }

        try {
            // Check environment variables
            console.log('🔵 Checking environment variables...');
            console.log('🔵 SUPABASE_URL exists:', !!env.SUPABASE_URL);
            console.log('🔵 SUPABASE_URL value:', env.SUPABASE_URL || 'MISSING');
            console.log('🔵 SUPABASE_SERVICE_ROLE_KEY exists:', !!env.SUPABASE_SERVICE_ROLE_KEY);
            console.log('🔵 SUPABASE_SERVICE_ROLE_KEY length:', env.SUPABASE_SERVICE_ROLE_KEY ? env.SUPABASE_SERVICE_ROLE_KEY.length : 0);

            if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
                console.error('❌ Missing Supabase configuration');
                return new Response(JSON.stringify({
                    error: 'Config Error',
                    details: {
                        SUPABASE_URL: !!env.SUPABASE_URL,
                        SUPABASE_SERVICE_ROLE_KEY: !!env.SUPABASE_SERVICE_ROLE_KEY
                    }
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            console.log('✅ Environment variables OK');

            // Handle /verify endpoint
            if (pathname === '/verify') {
                console.log('🔵 Handling /verify endpoint');
                const verifyId = url.searchParams.get('id');
                const dest = url.searchParams.get('dest');
                const linkIdParam = url.searchParams.get('link_id');
                const slugParam = url.searchParams.get('slug');
                const domainParam = url.searchParams.get('domain');

                if (!dest) {
                    console.log('❌ No destination provided in /verify');
                    return new Response(JSON.stringify({
                        error: 'Missing destination parameter'
                    }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                try {
                    // Decode parameters
                    const decodedDest = atob(dest);
                    const linkId = linkIdParam ? atob(linkIdParam) : null;
                    const slug = slugParam ? atob(slugParam) : null;
                    const domain = domainParam ? atob(domainParam) : null;

                    console.log('🔵 Decoded destination:', decodedDest);
                    console.log('🔵 Telemetry ID:', verifyId || 'not provided');
                    console.log('🔵 Link ID:', linkId || 'not provided');
                    console.log('🔵 Slug:', slug || 'not provided');
                    console.log('🔵 Domain:', domain || 'not provided');

                    // Extract Cloudflare data from request headers
                    const userAgent = request.headers.get('user-agent') || '';
                    const ipAddress = request.headers.get('cf-connecting-ip') || 'unknown';
                    const country = request.headers.get('cf-ipcountry') || request.cf?.country || null;
                    const city = request.headers.get('cf-ipcity') || request.cf?.city || null;
                    const uaInfo = parseUserAgent(userAgent);

                    const cloudflareData = {
                        ipAddress: ipAddress,
                        userAgent: userAgent,
                        referer: request.headers.get('referer') || null,
                        country: country,
                        city: city,
                        deviceType: uaInfo.deviceType,
                        browser: uaInfo.browser,
                        os: uaInfo.os
                    };

                    // Fetch link data for tracking
                    let linkData = null;

                    // Try Redis first if slug and domain are available
                    if (slug && domain) {
                        try {
                            const redisClient = getRedisClient(env);
                            if (redisClient) {
                                linkData = await getLinkFromRedis(slug, domain, redisClient);
                                if (linkData) {
                                    console.log('✅ [Redis] Link data fetched from Redis for tracking');
                                }
                            }
                        } catch (err) {
                            console.error('❌ [Redis] Error fetching link data from Redis:', err);
                        }
                    }

                    // Fallback to Supabase if Redis not configured or cache miss
                    if (!linkData && linkId && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
                        try {
                            console.log('⚠️ [Redis] Falling back to Supabase for link data');
                            const linkQueryUrl = `${env.SUPABASE_URL}/rest/v1/links?id=eq.${encodeURIComponent(linkId)}&select=id,user_id,target_url,parameter_pass_through,utm_source,utm_medium,utm_campaign,utm_content,status`;
                            const linkResponse = await fetch(linkQueryUrl, {
                                method: 'GET',
                                headers: {
                                    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
                                    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                                    'Content-Type': 'application/json',
                                },
                            });
                            if (linkResponse.ok) {
                                const linkDataArray = await linkResponse.json();
                                if (linkDataArray && linkDataArray.length > 0) {
                                    linkData = linkDataArray[0];
                                    console.log('✅ [Supabase] Link data fetched from Supabase for tracking');
                                }
                            }
                        } catch (err) {
                            console.error('❌ [Supabase] Error fetching link data:', err);
                        }
                    }

                    // Handle Stytch tracking if telemetry ID is provided
                    if (verifyId && linkData && slug && domain) {
                        console.log('🔵 ========== STARTING STYTCH TRACKING ==========');
                        console.log('🔵 Verify ID provided:', !!verifyId);
                        console.log('🔵 Link data exists:', !!linkData);
                        console.log('🔵 Slug:', slug);
                        console.log('🔵 Domain:', domain);

                        // Verify Cloudflare Turnstile before Stytch tracking
                        console.log('🔵 ========== STARTING TURNSTILE VERIFICATION ==========');
                        const turnstileToken = url.searchParams.get('cf-turnstile-response');
                        const TURNSTILE_SITE_KEY = '0x4AAAAAACL1UvTFIr6R2-Xe';
                        const TURNSTILE_SECRET_KEY = env.TURNSTILE_SECRET_KEY; // צריך להוסיף כ-secret

                        console.log('🔵 [Turnstile] Site Key:', TURNSTILE_SITE_KEY);
                        console.log('🔵 [Turnstile] Token from URL:', turnstileToken ? 'Present (length: ' + turnstileToken.length + ')' : 'Not provided');
                        console.log('🔵 [Turnstile] Secret Key exists:', !!TURNSTILE_SECRET_KEY);

                        let turnstileVerified = false;

                        if (turnstileToken) {
                            console.log('🔵 [Turnstile] Token found, starting verification...');
                            const isTurnstileValid = await verifyTurnstile(turnstileToken, cloudflareData.ipAddress, TURNSTILE_SECRET_KEY);

                            if (!isTurnstileValid) {
                                console.error('❌ [Turnstile] Verification failed - blocking request');
                                return new Response(JSON.stringify({
                                    error: 'Turnstile verification failed',
                                    details: 'The security check failed. Please try again.'
                                }), {
                                    status: 403,
                                    headers: { 'Content-Type': 'application/json' }
                                });
                            }
                            turnstileVerified = true;
                            console.log('✅ [Turnstile] Verification passed - continuing to Stytch tracking');
                        } else {
                            console.log('⚠️ [Turnstile] No token provided in URL');
                            console.log('⚠️ [Turnstile] Available query params:', Array.from(url.searchParams.keys()));
                            console.log('⚠️ [Turnstile] Continuing without verification (allow mode)');
                            turnstileVerified = false;
                        }
                        console.log('🔵 [Turnstile] Verified status:', turnstileVerified);
                        console.log('🔵 ========== TURNSTILE VERIFICATION COMPLETE ==========');

                        // Run tracking - use await to ensure it completes (with timeout)
                        const trackingPromise = handleTracking(verifyId, linkData.id, linkData.user_id, slug, domain, decodedDest, cloudflareData, turnstileVerified, env, ctx);

                        // Set a timeout to not block redirect too long (max 3 seconds)
                        const timeoutPromise = new Promise((resolve) => {
                            setTimeout(() => {
                                console.log('⏱️ [Stytch] Tracking timeout - continuing with redirect');
                                resolve(null);
                            }, 3000);
                        });

                        // Wait for either tracking to complete or timeout
                        const stytchData = await Promise.race([trackingPromise, timeoutPromise]);

                        // Check if this is a bot (from any source)
                        const isBot = isBotDetected(
                            cloudflareData.userAgent,
                            stytchData?.verdict || null,
                            stytchData?.fraud_score || null
                        );

                        if (isBot) {
                            console.log('🚫 [Bot Detection] Bot detected - redirecting to www.google.com');
                            console.log('🔵 ========== WORKER FINISHED ==========');

                            // --- DEBUG: BOT REDIRECT DISABLED ---
                            return new Response(JSON.stringify({
                                success: true,
                                message: "Bot detected, redirect to Google disabled for debug",
                                destination: 'https://www.google.com'
                            }), {
                                status: 200,
                                headers: { 'Content-Type': 'application/json' }
                            });
                            /*
                            return new Response(null, {
                                status: 302,
                                headers: {
                                    'Location': 'https://www.google.com',
                                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                                    'Pragma': 'no-cache',
                                    'Expires': '0'
                                }
                            });
                            */
                        }
                    } else {
                        console.log('⚠️ [Stytch] Skipping tracking - missing data:', {
                            verifyId: !!verifyId,
                            linkData: !!linkData,
                            slug: !!slug,
                            domain: !!domain
                        });

                        // Even without Stytch data, check User-Agent for bot detection
                        const isBot = isBotDetected(cloudflareData.userAgent, null, null);
                        if (isBot) {
                            console.log('🚫 [Bot Detection] Bot detected (User-Agent only) - redirecting to www.google.com');
                            console.log('🔵 ========== WORKER FINISHED ==========');

                            // --- DEBUG: BOT REDIRECT DISABLED (UA) ---
                            return new Response(JSON.stringify({
                                success: true,
                                message: "Bot detected (UA), redirect to Google disabled for debug",
                                destination: 'https://www.google.com'
                            }), {
                                status: 200,
                                headers: { 'Content-Type': 'application/json' }
                            });
                            /*
                            return new Response(null, {
                                status: 302,
                                headers: {
                                    'Location': 'https://www.google.com',
                                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                                    'Pragma': 'no-cache',
                                    'Expires': '0'
                                }
                            });
                            */
                        }
                    }

                    console.log('🔵 Redirecting to final destination');
                    console.log('🔵 ========== WORKER FINISHED ==========');

                    // ENSURE ABSOLUTE URL
                    let finalLocation = decodedDest;
                    if (!/^https?:\/\//i.test(finalLocation)) {
                        finalLocation = 'https://' + finalLocation;
                        console.log('🔧 [Verify] Added protocol to final location:', finalLocation);
                    }

                    // --- DEBUG: REDIRECT DISABLED ---
                    return new Response(JSON.stringify({
                        success: true,
                        message: "Redirect disabled for debug",
                        destination: finalLocation
                    }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                    /*
                    return new Response(null, {
                        status: 302,
                        headers: {
                            'Location': finalLocation,
                            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                            'Pragma': 'no-cache',
                            'Expires': '0'
                        }
                    });
                    */
                } catch (error) {
                    console.error('❌ Error in /verify endpoint:', error);
                    return new Response(JSON.stringify({
                        error: 'Invalid parameters'
                    }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }

            const slug = extractSlug(pathname);
            console.log('🔵 Extracted slug:', slug);

            if (!slug) {
                const debugPath = pathname.replace(/^\//, '').split('?')[0].split('#')[0];
                console.log('❌ No valid slug found');
                return new Response(get404Page(debugPath || 'unknown', url.hostname), {
                    status: 404,
                    headers: { 'Content-Type': 'text/html; charset=UTF-8' }
                });
            }

            const hostname = url.hostname;
            const domain = hostname.replace(/^www\./, '');
            console.log('🔵 Domain:', domain);
            console.log('🔵 Querying Supabase for link...');

            // Try to get link from Redis first, fallback to Supabase
            let linkData = null;
            const redisClient = getRedisClient(env);
            if (redisClient) {
                linkData = await getLinkFromRedis(slug, domain, redisClient);
                console.log('🔵 Link data from Redis:', linkData ? 'Found' : 'Not found');
            }

            // Fallback to Supabase REMOVED as per request - Upstash only
            /*
            if (!linkData) {
                console.log('⚠️ [Redis] Cache miss or not configured, falling back to Supabase');
                linkData = await getLinkFromSupabase(slug, domain, env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
                console.log('🔵 Link data from Supabase:', linkData ? 'Found' : 'Not found');
            }
            */

            console.log('🔵 Final link data:', JSON.stringify(linkData, null, 2));

            if (!linkData || !linkData.target_url) {
                console.log('❌ Link not found in database');
                return new Response(get404Page(slug, domain), {
                    status: 404,
                    headers: { 'Content-Type': 'text/html; charset=UTF-8' }
                });
            }

            console.log('✅ Link found! ID:', linkData.id, 'User ID:', linkData.user_id);

            // Note: Click tracking is now handled via Stytch tracking in /verify endpoint
            // We don't track here to avoid duplicate entries - Stytch tracking handles all click tracking

            // Build final URL
            const finalUrl = buildTargetUrl(linkData.target_url, linkData, url);
            console.log('🔵 Final URL:', finalUrl);

            // Check for bot before serving bridging page (bots can't execute JavaScript)
            const userAgent = request.headers.get('user-agent') || '';
            console.log('🔍 [Bot Detection] Pre-check User-Agent:', userAgent);

            if (isBot(userAgent)) {
                console.log('🚫 [Bot Detection] Bot detected before bridging page - redirecting to www.google.com');
                console.log('🔵 ========== WORKER FINISHED ==========');

                // --- DEBUG: BOT REDIRECT DISABLED (PRE-CHECK) ---
                return new Response(JSON.stringify({
                    success: true,
                    message: "Bot detected (Pre-check), redirect disabled for debug",
                    destination: 'https://www.google.com'
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
                /*
                return new Response(null, {
                    status: 302,
                    headers: {
                        'Location': 'https://www.google.com',
                        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                });
                */
            }

            // --- DEBUG: BRIDGING PAGE DISABLED ---
            console.log('🔵 Bridging page disabled for debug');
            console.log('🔵 ========== WORKER FINISHED ==========');

            return new Response(JSON.stringify({
                success: true,
                message: "Bridging page disabled for debug",
                target: finalUrl,
                slug: slug,
                domain: domain
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
            /*
            const bridgingHtml = getBridgingPage(finalUrl, linkData.id, slug, domain);
            return new Response(bridgingHtml, {
                status: 200,
                headers: {
                    'Content-Type': 'text/html; charset=UTF-8',
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            */

        } catch (error) {
            console.error('❌ Worker error:', error);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error stack:', error.stack);
            return new Response(JSON.stringify({
                error: 'Internal error',
                message: error.message,
                stack: error.stack
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    },
};

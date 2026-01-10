/**
 * Cloudflare Worker for Link Redirect (Fixed)
 */

/**
 * Extract slug from URL path
 */
function extractSlug(pathname) {
    const path = pathname.replace(/^\//, '').split('?')[0].split('#')[0];
    if (!path || path === '' || path === 'index.html' || path.startsWith('api/')) {
        return null;
    }
    const slugPattern = /^[a-z0-9-]{3,30}$/i;
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
        const target = new URL(targetUrl);
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
        return targetUrl;
    }
}

/**
 * Query Supabase for link
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
                        (l.status === undefined || l.status === true) &&
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
        if (link.status !== undefined && link.status === false) return null;

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
 * Track click in Supabase
 */
async function trackClick(clickData, supabaseUrl, supabaseKey) {
    console.log('📊 [trackClick] ========== STARTING ==========');
    console.log('📊 [trackClick] Supabase URL:', supabaseUrl);
    console.log('📊 [trackClick] Supabase Key exists:', !!supabaseKey);
    console.log('📊 [trackClick] Supabase Key length:', supabaseKey ? supabaseKey.length : 0);

    const insertUrl = `${supabaseUrl}/rest/v1/clicks`;
    console.log('📊 [trackClick] Insert URL:', insertUrl);
    console.log('📊 [trackClick] Click data:', JSON.stringify(clickData, null, 2));

    try {
        // Add a timeout controller to prevent the worker from hanging if Supabase is slow
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.error('⏱️ [trackClick] Timeout! Aborting request...');
            controller.abort();
        }, 1500); // 1.5 second timeout

        console.log('📊 [trackClick] About to call fetch...');
        const response = await fetch(insertUrl, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation', // Changed to representation to get the inserted row back
            },
            body: JSON.stringify(clickData),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log(`📊 [trackClick] Response received: ${response.status} ${response.statusText}`);
        console.log(`📊 [trackClick] Response headers:`, JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ [trackClick] Failed: ${response.status} ${response.statusText}`);
            console.error(`❌ [trackClick] Error response: ${errorText}`);
            throw new Error(`Click tracking failed: ${response.status} ${response.statusText} - ${errorText}`);
        } else {
            const data = await response.json();
            console.log(`✅ [trackClick] Success! Response data:`, JSON.stringify(data, null, 2));
            console.log(`✅ [trackClick] Inserted click ID:`, data[0]?.id || 'unknown');
            console.log(`✅ [trackClick] ========== COMPLETED ==========`);
            return data;
        }
    } catch (error) {
        console.error('❌ [trackClick] Exception caught!');
        console.error('❌ [trackClick] Error name:', error.name);
        console.error('❌ [trackClick] Error message:', error.message);
        console.error('❌ [trackClick] Error stack:', error.stack);
        console.error('❌ [trackClick] ========== FAILED ==========');
        // Re-throw the error so the caller knows it failed
        throw error;
    }
}

/**
 * Main worker handler
 */
export default {
    async fetch(request, env) {
        console.log('🔵 ========== WORKER STARTED ==========');
        console.log('🔵 Request URL:', request.url);
        console.log('🔵 Request Method:', request.method);
        console.log('🔵 Request Headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));

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

            const url = new URL(request.url);
            const hostname = url.hostname;
            const pathname = url.pathname;

            console.log('🔵 Hostname:', hostname);
            console.log('🔵 Pathname:', pathname);

            const slug = extractSlug(pathname);
            console.log('🔵 Extracted slug:', slug);

            if (!slug) {
                console.log('❌ No valid slug found');
                return new Response(JSON.stringify({
                    error: 'Link not found',
                    details: { pathname, slug: null }
                }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const domain = hostname.replace(/^www\./, '');
            console.log('🔵 Domain:', domain);
            console.log('🔵 Querying Supabase for link...');

            const linkData = await getLinkFromSupabase(slug, domain, env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
            console.log('🔵 Link data from Supabase:', JSON.stringify(linkData, null, 2));

            if (!linkData || !linkData.target_url) {
                console.log('❌ Link not found in database');
                return new Response(JSON.stringify({
                    error: 'Link not found',
                    details: { slug, domain, linkData: null }
                }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            console.log('✅ Link found! ID:', linkData.id, 'User ID:', linkData.user_id);

            // --- Tracking Logic ---
            const userAgent = request.headers.get('user-agent') || '';
            const ipAddress = request.headers.get('cf-connecting-ip') || 'unknown';
            const country = request.headers.get('cf-ipcountry') || request.cf?.country || null;
            const city = request.headers.get('cf-ipcity') || request.cf?.city || null;
            const uaInfo = parseUserAgent(userAgent);
            const bot = isBot(userAgent);
            const queryParams = url.search ? JSON.stringify(Object.fromEntries(url.searchParams)) : null;
            const sessionId = `${ipAddress}-${userAgent.substring(0, 50)}-${Date.now()}`.substring(0, 100);

            const clickData = {
                link_id: linkData.id,
                user_id: linkData.user_id,
                slug: slug,
                domain: domain,
                target_url: linkData.target_url,
                ip_address: ipAddress,
                user_agent: userAgent,
                referer: request.headers.get('referer') || null,
                country: country,
                city: city,
                device_type: uaInfo.deviceType,
                browser: uaInfo.browser,
                os: uaInfo.os,
                query_params: queryParams,
                is_bot: bot,
                session_id: sessionId,
                clicked_at: new Date().toISOString(),
            };

            console.log('🔵 Click data prepared:', JSON.stringify(clickData, null, 2));

            // Track click and capture result
            let trackingResult = null;
            let trackingError = null;

            if (linkData.id && linkData.user_id) {
                console.log('🔵 Starting click tracking...');
                try {
                    await trackClick(clickData, env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
                    trackingResult = { success: true, message: 'Click tracked successfully' };
                    console.log('✅ Click tracking completed');
                } catch (error) {
                    trackingError = {
                        message: error.message,
                        stack: error.stack,
                        name: error.name
                    };
                    console.error('❌ Click tracking failed:', error);
                }
            } else {
                console.log('❌ Cannot track click: Missing link ID or user ID');
                trackingError = {
                    message: 'Missing link ID or user ID',
                    linkId: linkData.id,
                    userId: linkData.user_id
                };
            }

            // Build final URL (but don't redirect - return JSON instead)
            const finalUrl = buildTargetUrl(linkData.target_url, linkData, url);
            console.log('🔵 Final URL would be:', finalUrl);

            // Return JSON response instead of redirect (for debugging)
            console.log('🔵 Returning JSON response (DEBUG MODE - NO REDIRECT)');
            console.log('🔵 ========== WORKER FINISHED ==========');

            return new Response(JSON.stringify({
                success: true,
                message: 'Link found - DEBUG MODE (no redirect)',
                linkData: {
                    id: linkData.id,
                    user_id: linkData.user_id,
                    slug: slug,
                    domain: domain,
                    target_url: linkData.target_url,
                    final_url: finalUrl,
                    parameter_pass_through: linkData.parameter_pass_through,
                    utm_source: linkData.utm_source,
                    utm_medium: linkData.utm_medium,
                    utm_campaign: linkData.utm_campaign,
                    utm_content: linkData.utm_content,
                    status: linkData.status
                },
                clickTracking: {
                    initiated: !!(linkData.id && linkData.user_id),
                    success: !!trackingResult,
                    error: trackingError,
                    clickData: clickData
                },
                requestInfo: {
                    url: request.url,
                    hostname: hostname,
                    pathname: pathname,
                    method: request.method,
                    userAgent: userAgent,
                    ipAddress: ipAddress,
                    country: country,
                    city: city
                }
            }, null, 2), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });

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

/**
 * Cloudflare Worker for Link Redirect
 * 
 * This worker:
 * 1. Extracts domain from request host
 * 2. Extracts slug from URL path
 * 3. Queries Supabase for link by slug + domain
 * 4. Redirects to target_url if found and active
 * 
 * Environment Variables Required:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key (bypasses RLS)
 * 
 * Usage:
 * GET https://glynk.to/abc123 -> redirects to target_url
 */

/**
 * Extract slug from URL path
 * @param {string} pathname - URL pathname (e.g., "/abc123" or "/abc123?param=value")
 * @returns {string|null} - Slug or null if invalid
 */
function extractSlug(pathname) {
    // Remove leading slash and query parameters
    const path = pathname.replace(/^\//, '').split('?')[0].split('#')[0];

    // Return null for empty paths or common paths
    if (!path || path === '' || path === 'index.html' || path.startsWith('api/')) {
        return null;
    }

    // Validate slug format (alphanumeric and hyphens, 3-30 chars)
    const slugPattern = /^[a-z0-9-]{3,30}$/i;
    if (!slugPattern.test(path)) {
        return null;
    }

    return path.toLowerCase();
}

/**
 * Build target URL with UTM parameters and query string pass-through
 * @param {string} targetUrl - Base target URL
 * @param {object} linkData - Link data from database
 * @param {URL} requestUrl - Original request URL
 * @returns {string} - Final URL with all parameters
 */
function buildTargetUrl(targetUrl, linkData, requestUrl) {
    try {
        const target = new URL(targetUrl);
        const requestParams = new URLSearchParams(requestUrl.search);

        // Add UTM parameters if configured
        if (linkData.utm_source) {
            target.searchParams.set('utm_source', linkData.utm_source);
        }
        if (linkData.utm_medium) {
            target.searchParams.set('utm_medium', linkData.utm_medium);
        }
        if (linkData.utm_campaign) {
            target.searchParams.set('utm_campaign', linkData.utm_campaign);
        }
        if (linkData.utm_content) {
            target.searchParams.set('utm_content', linkData.utm_content);
        }

        // Pass through query parameters if enabled
        if (linkData.parameter_pass_through) {
            for (const [key, value] of requestParams.entries()) {
                // Don't override UTM parameters that were just set
                if (!['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].includes(key)) {
                    target.searchParams.set(key, value);
                }
            }
        }

        return target.toString();
    } catch (error) {
        // If URL parsing fails, return original target_url
        console.error('Error building target URL:', error);
        return targetUrl;
    }
}

/**
 * Query Supabase for link by slug and domain
 * @param {string} slug - Link slug
 * @param {string} domain - Domain name
 * @param {string} supabaseUrl - Supabase project URL
 * @param {string} supabaseKey - Supabase service role key
 * @returns {Promise<object|null>} - Link data or null if not found
 */
async function getLinkFromSupabase(slug, domain, supabaseUrl, supabaseKey) {
    try {
        // Use Supabase REST API directly (no client library in Workers)
        // Build query URL with proper encoding - include id and user_id for tracking
        const queryUrl = `${supabaseUrl}/rest/v1/links?slug=eq.${encodeURIComponent(slug)}&domain=eq.${encodeURIComponent(domain)}&select=id,user_id,target_url,parameter_pass_through,utm_source,utm_medium,utm_campaign,utm_content,status`;

        console.log(`Querying Supabase: ${queryUrl}`);
        console.log(`Search params: slug="${slug}", domain="${domain}"`);

        const response = await fetch(queryUrl, {
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Supabase query failed: ${response.status} ${response.statusText}`);
            console.error(`Error details: ${errorText}`);
            return null;
        }

        const data = await response.json();

        console.log(`🔥 Supabase returned ${data?.length || 0} result(s)`);
        console.log(`🔥 Supabase response status: ${response.status}`);
        console.log(`🔥 Supabase response headers:`, JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
        console.log(`🔥 Supabase raw response:`, JSON.stringify(data, null, 2));

        if (data && data.length > 0) {
            console.log(`✅ Found link:`, JSON.stringify(data[0], null, 2));
            console.log(`✅ Link ID: ${data[0].id}`);
            console.log(`✅ User ID: ${data[0].user_id}`);
            console.log(`✅ Target URL: ${data[0].target_url}`);
        } else {
            console.log(`❌ No links found in Supabase response`);
        }

        if (!data || data.length === 0) {
            console.log(`No link found with slug="${slug}" and domain="${domain}"`);
            // Try to find if there's a link with this slug (for debugging)
            // IMPORTANT: Include id and user_id for click tracking!
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
                    console.log(`Debug: Found ${debugData.length} link(s) with slug "${slug}" but different domain:`);
                    debugData.forEach(link => {
                        console.log(`  - id: ${link.id}, user_id: ${link.user_id}, domain: "${link.domain}", slug: "${link.slug}", status: ${link.status !== undefined ? link.status : 'N/A'}`);
                    });
                    // If we found a link with the slug but different domain, try the first one
                    // This handles cases where domain might be stored incorrectly (e.g., localhost in dev)
                    const foundLink = debugData.find(l =>
                        (l.status === undefined || l.status === true) &&
                        l.target_url
                    );
                    if (foundLink) {
                        console.log(`Warning: Using link with domain "${foundLink.domain}" instead of requested "${domain}"`);
                        // IMPORTANT: Return all fields including id and user_id for tracking!
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
                } else {
                    console.log(`Debug: No links found with slug "${slug}" at all`);
                }
            } else {
                console.log(`Debug query failed: ${debugResponse.status}`);
            }
            return null;
        }

        const link = data[0];

        // Check status if column exists (some databases might not have it yet)
        if (link.status !== undefined && link.status === false) {
            console.log(`Link found but status is false (inactive)`);
            return null; // Link is inactive
        }

        return link;
    } catch (error) {
        console.error('Error querying Supabase:', error);
        console.error('Error stack:', error.stack);
        return null;
    }
}

/**
 * Detect if request is from a bot
 * @param {string} userAgent - User-Agent header
 * @returns {boolean}
 */
function isBot(userAgent) {
    if (!userAgent) return true;

    const botPatterns = [
        'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget',
        'python', 'go-http', 'java', 'apache', 'httpclient',
        'bingbot', 'googlebot', 'slurp', 'duckduckbot', 'baiduspider',
        'yandexbot', 'sogou', 'exabot', 'facebot', 'ia_archiver'
    ];

    const ua = userAgent.toLowerCase();
    return botPatterns.some(pattern => ua.includes(pattern));
}

/**
 * Parse User-Agent to extract device and browser info
 * @param {string} userAgent - User-Agent header
 * @returns {{deviceType: string, browser: string, os: string}}
 */
function parseUserAgent(userAgent) {
    if (!userAgent) {
        return { deviceType: 'unknown', browser: 'unknown', os: 'unknown' };
    }

    const ua = userAgent.toLowerCase();

    // Detect device type
    let deviceType = 'desktop';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipod')) {
        deviceType = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
        deviceType = 'tablet';
    }

    // Detect browser
    let browser = 'unknown';
    if (ua.includes('chrome') && !ua.includes('edg')) {
        browser = 'chrome';
    } else if (ua.includes('firefox')) {
        browser = 'firefox';
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
        browser = 'safari';
    } else if (ua.includes('edg')) {
        browser = 'edge';
    } else if (ua.includes('opera') || ua.includes('opr')) {
        browser = 'opera';
    }

    // Detect OS
    let os = 'unknown';
    if (ua.includes('windows')) {
        os = 'windows';
    } else if (ua.includes('mac os') || ua.includes('macos')) {
        os = 'macos';
    } else if (ua.includes('linux')) {
        os = 'linux';
    } else if (ua.includes('android')) {
        os = 'android';
    } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
        os = 'ios';
    }

    return { deviceType, browser, os };
}

/**
 * Track click in Supabase
 * @param {object} clickData - Click tracking data
 * @param {string} supabaseUrl - Supabase project URL
 * @param {string} supabaseKey - Supabase service role key
 * @returns {Promise<void>}
 */
async function trackClick(clickData, supabaseUrl, supabaseKey) {
    console.log('📊 [trackClick] Function called');
    console.log('📊 [trackClick] Supabase URL:', supabaseUrl);
    console.log('📊 [trackClick] Supabase Key exists:', !!supabaseKey);

    const insertUrl = `${supabaseUrl}/rest/v1/clicks`;
    console.log('📊 [trackClick] Insert URL:', insertUrl);
    console.log('📊 [trackClick] Click data:', JSON.stringify(clickData, null, 2));

    try {
        console.log('📊 [trackClick] About to call fetch...');
        const response = await fetch(insertUrl, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
            },
            body: JSON.stringify(clickData),
        });

        console.log(`🔥 [trackClick] Response received: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ [trackClick] Failed: ${response.status} ${response.statusText}`);
            console.error(`❌ [trackClick] Error: ${errorText}`);
            throw new Error(`Click tracking failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log(`✅ [trackClick] Success! ID: ${data[0]?.id || 'unknown'}`);
        console.log(`✅ [trackClick] Data:`, JSON.stringify(data[0], null, 2));
        console.log(`✅ [trackClick] About to return data`);
        return data;
    } catch (error) {
        console.error('❌ [trackClick] Exception caught:', error);
        console.error('❌ [trackClick] Error message:', error.message);
        console.error('❌ [trackClick] Error stack:', error.stack);
        throw error;
    }
}

/**
 * Main worker handler
 */
export default {
    async fetch(request, env, ctx) {
        console.log('🔵 Worker started - Request received');
        console.log('🔵 Request URL:', request.url);
        console.log('🔵 Request method:', request.method);

        try {
            // Check for required environment variables
            console.log('🔵 Checking environment variables...');
            console.log('🔵 SUPABASE_URL exists:', !!env.SUPABASE_URL);
            console.log('🔵 SUPABASE_SERVICE_ROLE_KEY exists:', !!env.SUPABASE_SERVICE_ROLE_KEY);

            if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
                console.error('❌ Missing Supabase configuration');
                console.error('❌ SUPABASE_URL:', env.SUPABASE_URL || 'MISSING');
                console.error('❌ SUPABASE_SERVICE_ROLE_KEY:', env.SUPABASE_SERVICE_ROLE_KEY ? 'EXISTS' : 'MISSING');
                return new Response('Service configuration error', { status: 500 });
            }

            console.log('✅ Environment variables OK');

            const url = new URL(request.url);
            const hostname = url.hostname;
            const pathname = url.pathname;

            console.log(`Request URL: ${request.url}`);
            console.log(`Hostname: ${hostname}, Pathname: ${pathname}`);

            // Extract slug from path
            const slug = extractSlug(pathname);

            console.log(`Extracted slug: ${slug}`);

            if (!slug) {
                // No valid slug found - return 404
                console.log('No valid slug found in pathname');
                return new Response('Link not found', {
                    status: 404,
                    headers: {
                        'Content-Type': 'text/plain',
                    }
                });
            }

            // Extract domain from hostname
            // Remove www. prefix if present
            const domain = hostname.replace(/^www\./, '');

            console.log(`Looking up link: slug="${slug}", domain="${domain}"`);

            // Query Supabase for the link
            const linkData = await getLinkFromSupabase(
                slug,
                domain,
                env.SUPABASE_URL,
                env.SUPABASE_SERVICE_ROLE_KEY
            );

            console.log('📋 Link data from Supabase:', JSON.stringify(linkData, null, 2));

            if (!linkData || !linkData.target_url) {
                // Link not found or inactive
                console.log('❌ Link not found in database');
                return new Response('Link not found', {
                    status: 404,
                    headers: {
                        'Content-Type': 'text/plain',
                    }
                });
            }

            console.log('✅ Link found! ID:', linkData.id, 'User ID:', linkData.user_id);

            // Extract user information from request
            const userAgent = request.headers.get('user-agent') || '';
            const referer = request.headers.get('referer') || request.headers.get('referrer') || '';
            const ipAddress = request.headers.get('cf-connecting-ip') ||
                request.headers.get('x-forwarded-for')?.split(',')[0] ||
                request.headers.get('x-real-ip') ||
                'unknown';

            // Get location from Cloudflare headers (if available)
            const country = request.headers.get('cf-ipcountry') || request.cf?.country || null;
            const city = request.headers.get('cf-ipcity') || request.cf?.city || null;

            // Parse user agent
            const uaInfo = parseUserAgent(userAgent);
            const bot = isBot(userAgent);

            // Get query parameters as JSON string
            const queryParams = url.search ? JSON.stringify(Object.fromEntries(url.searchParams)) : null;

            // Generate session ID (simple hash of IP + User-Agent + timestamp)
            const sessionId = `${ipAddress}-${userAgent.substring(0, 50)}-${Date.now()}`.substring(0, 100);

            // Build final URL with UTM parameters and query string pass-through
            const finalUrl = buildTargetUrl(linkData.target_url, linkData, url);
            console.log(`🔄 Final URL built: ${finalUrl}`);

            // Validate that we have required fields for tracking
            console.log('📊 Checking if we can track click...');
            console.log('📊 linkData.id:', linkData.id);
            console.log('📊 linkData.user_id:', linkData.user_id);

            if (linkData.id && linkData.user_id) {
                console.log('✅ Link has ID and User ID - will track click asynchronously');

                // Prepare click tracking data
                const clickData = {
                    link_id: linkData.id,
                    user_id: linkData.user_id,
                    slug: slug,
                    domain: domain,
                    target_url: linkData.target_url,
                    ip_address: ipAddress,
                    user_agent: userAgent,
                    referer: referer || null,
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

                console.log('🚀 Using ctx.waitUntil() for async tracking');

                // Use ctx.waitUntil() to track click without blocking the redirect
                // This allows the response to be sent immediately while tracking continues
                ctx.waitUntil(
                    trackClick(clickData, env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
                        .then(() => {
                            console.log('✅ Click tracking completed successfully');
                        })
                        .catch(error => {
                            console.error('❌ Click tracking failed:', error);
                            console.error('❌ Error details:', error.message);
                        })
                );
            } else {
                console.error('❌ Cannot track click: Missing link ID or user ID');
                console.error('❌ linkData:', JSON.stringify(linkData, null, 2));
            }

            // Return redirect response immediately (tracking continues in background)
            console.log(`🔄 Performing redirect to: ${finalUrl}`);
            return Response.redirect(finalUrl, 301);

        } catch (error) {
            console.error('Worker error:', error);
            return new Response('Internal server error', {
                status: 500,
                headers: {
                    'Content-Type': 'text/plain',
                }
            });
        }
    },
};

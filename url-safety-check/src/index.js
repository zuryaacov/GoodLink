/**
 * Cloudflare Worker for Google Safe Browsing API URL Safety Check
 * 
 * This worker receives a URL via POST request, checks it against Google Safe Browsing API,
 * and returns whether the link is safe, socially engineered, or malicious.
 * 
 * ENHANCEMENTS:
 * 1. Follows redirects to check the FINAL destination URL.
 * 2. Blocks raw IP addresses (often used for malicious hosting).
 * 
 * Environment Variables Required:
 * - GOOGLE_SAFE_BROWSING_API_KEY: Your Google Safe Browsing API key
 * 
 * Usage:
 * POST / with body: { "url": "https://example.com" }
 * Returns: { "isSafe": boolean, "threatType": string | null, "finalUrl": string }
 */

// CORS headers for Vercel and other origins
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// Google Safe Browsing API endpoint
const GOOGLE_SAFE_BROWSING_API_URL = 'https://safebrowsing.googleapis.com/v4/threatMatches:find';

/**
 * Handle CORS preflight requests
 */
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Validate URL format
 */
function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Check if the hostname is a raw IP address (v4 or v6)
 * @param {string} hostname 
 * @returns {boolean}
 */
function isIpAddress(hostname) {
  // IPv4 regex
  const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  // IPv6 regex (simplified)
  const ipv6 = /^(?:[a-f0-9]{1,4}:){7}[a-f0-9]{1,4}$|^\[?[a-f0-9:]+\]?$/i;

  return ipv4.test(hostname) || ipv6.test(hostname);
}

/**
 * Follow redirects to get the final destination URL
 * @param {string} url 
 * @returns {Promise<string>}
 */
async function resolveFinalUrl(url) {
  let currentUrl = url;
  const maxRedirects = 5; // Limit to prevent loops/timeout

  try {
    for (let i = 0; i < maxRedirects; i++) {
      // Use a HEAD request to follow redirects without downloading body
      const response = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual', // We handle redirects manually to track them
        headers: {
          'User-Agent': 'GoodLink-SafetyCheck/1.0', // Polite UA
        }
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('Location');
        if (location) {
          // Resolve relative URLs
          currentUrl = new URL(location, currentUrl).toString();
          continue;
        }
      }
      break; // No more redirects
    }
  } catch (e) {
    console.warn('Error resolving redirects for:', url, e);
    // Return the last known URL if resolution fails (e.g. timeout)
  }
  return currentUrl;
}

/**
 * Check URL against Google Safe Browsing API
 */
async function checkUrlSafety(url, apiKey) {
  try {
    // 1. Resolve final URL (follow redirects)
    const finalUrl = await resolveFinalUrl(url);
    console.log(`Analyzing URL: ${url} -> Final: ${finalUrl}`);

    // 2. Check if host is a raw IP address
    const urlObj = new URL(finalUrl);
    if (isIpAddress(urlObj.hostname)) {
      console.log(`Blocked raw IP address: ${urlObj.hostname}`);
      return {
        isSafe: false,
        threatType: 'suspicious ip address',
        finalUrl: finalUrl
      };
    }

    // 3. Prepare the request body for Google Safe Browsing API
    // We check BOTH the original URL and the final URL
    const urlsToCheck = [url];
    if (finalUrl !== url) urlsToCheck.push(finalUrl);

    // Limit to unique URLs
    const threatEntries = [...new Set(urlsToCheck)].map(u => ({ url: u }));

    const requestBody = {
      client: {
        clientId: 'goodlink-safety-check',
        clientVersion: '1.1.0',
      },
      threatInfo: {
        threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: threatEntries,
      },
    };

    const response = await fetch(
      `${GOOGLE_SAFE_BROWSING_API_URL}?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Safe Browsing API error:', response.status, errorText);

      // If API key is invalid or quota exceeded, return safe (fail open)
      if (response.status === 400 || response.status === 403) {
        return {
          isSafe: true,
          threatType: null,
          error: 'API configuration issue',
          finalUrl
        };
      }

      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    // If no matches found, URL is safe
    if (!data.matches || data.matches.length === 0) {
      return {
        isSafe: true,
        threatType: null,
        finalUrl
      };
    }

    // Extract threat type from first match
    const threatType = data.matches[0].threatType || 'UNKNOWN';

    // Map Google threat types to user-friendly strings
    const threatTypeMap = {
      'MALWARE': 'malicious',
      'SOCIAL_ENGINEERING': 'socially engineered',
      'UNWANTED_SOFTWARE': 'unwanted software',
      'POTENTIALLY_HARMFUL_APPLICATION': 'potentially harmful',
    };

    return {
      isSafe: false,
      threatType: threatTypeMap[threatType] || threatType.toLowerCase(),
      finalUrl
    };
  } catch (error) {
    console.error('Error checking URL safety:', error);

    // Fail open - if we can't check, assume safe (but log the error)
    return {
      isSafe: true,
      threatType: null,
      error: error.message,
    };
  }
}

/**
 * Main worker handler
 */
export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        {
          status: 405,
          headers: corsHeaders,
        }
      );
    }

    // Check for API key
    if (!env.GOOGLE_SAFE_BROWSING_API_KEY) {
      console.error('GOOGLE_SAFE_BROWSING_API_KEY not configured');
      return new Response(
        JSON.stringify({
          isSafe: true,
          threatType: null,
          error: 'Safety check service not configured',
        }),
        {
          status: 200, // Return 200 to fail open
          headers: corsHeaders,
        }
      );
    }

    try {
      // Parse request body
      const body = await request.json();

      if (!body.url || typeof body.url !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Missing or invalid "url" in request body' }),
          {
            status: 400,
            headers: corsHeaders,
          }
        );
      }

      // Validate URL format
      if (!isValidUrl(body.url)) {
        return new Response(
          JSON.stringify({ error: 'Invalid URL format' }),
          {
            status: 400,
            headers: corsHeaders,
          }
        );
      }

      // Check URL safety
      const result = await checkUrlSafety(body.url, env.GOOGLE_SAFE_BROWSING_API_KEY);

      // Return result
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: corsHeaders,
      });
    } catch (error) {
      console.error('Worker error:', error);

      // Fail open - return safe if we can't process
      return new Response(
        JSON.stringify({
          isSafe: true,
          threatType: null,
          error: 'Failed to process request',
        }),
        {
          status: 200,
          headers: corsHeaders,
        }
      );
    }
  },
};


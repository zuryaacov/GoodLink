/**
 * Cloudflare Worker for Google Safe Browsing API URL Safety Check
 * 
 * This worker receives a URL via POST request, checks it against Google Safe Browsing API,
 * and returns whether the link is safe, socially engineered, or malicious.
 * 
 * Environment Variables Required:
 * - GOOGLE_SAFE_BROWSING_API_KEY: Your Google Safe Browsing API key
 * 
 * Usage:
 * POST / with body: { "url": "https://example.com" }
 * Returns: { "isSafe": boolean, "threatType": string | null }
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
 * Check URL against Google Safe Browsing API
 */
async function checkUrlSafety(url, apiKey) {
  try {
    // Prepare the request body for Google Safe Browsing API
    const requestBody = {
      client: {
        clientId: 'goodlink-safety-check',
        clientVersion: '1.0.0',
      },
      threatInfo: {
        threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: [
          {
            url: url,
          },
        ],
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


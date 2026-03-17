/**
 * Cloudflare Worker for Google Web Risk API URL Safety Check
 * 
 * This worker receives a URL via POST request, checks it against Google Web Risk `uris:search`,
 * and returns whether the link is in known threat lists.
 * 
 * Environment Variables Required:
 * - GOOGLE_WEB_RISK_API_KEY: Your Google Web Risk API key
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

// Google Web Risk `uris:search` endpoint
const GOOGLE_WEB_RISK_API_URL = 'https://webrisk.googleapis.com/v1/uris:search';

function isTrickySubdomainsHost(hostname) {
  const labels = String(hostname || '').toLowerCase().split('.').filter(Boolean);
  if (labels.length < 3) return false;

  const brandKeywords = [
    'google', 'gmail', 'youtube',
    'apple', 'icloud',
    'microsoft', 'office', 'outlook',
    'amazon', 'aws',
    'paypal',
    'facebook', 'instagram', 'meta', 'whatsapp',
    'netflix',
    'bank', 'banking',
  ];
  const suspiciousIntent = ['login', 'signin', 'verify', 'secure', 'account', 'update', 'support', 'billing', 'wallet'];

  const subdomainPart = labels.slice(0, -2).join('.');
  if (!subdomainPart) return false;

  const hasBrand = brandKeywords.some((k) => subdomainPart.includes(k));
  const hasIntent = suspiciousIntent.some((k) => subdomainPart.includes(k));

  return hasBrand && (hasIntent || subdomainPart.includes('-'));
}

function isSuspiciousUrlHeuristic(urlString) {
  try {
    const u = new URL(urlString);
    const host = u.hostname.toLowerCase();
    const path = (u.pathname + u.search).toLowerCase();

    const labels = host.split('.').filter(Boolean);
    const manySubdomains = labels.length >= 4;
    const credentialPath = /(login|signin|verify|secure|account|password|reset|billing|wallet)/.test(path);
    const oddHost = /--|\.{2,}/.test(host) || host.startsWith('xn--');

    return (manySubdomains && credentialPath) || oddHost;
  } catch {
    return false;
  }
}

async function queryWebRiskForUri(uri, apiKey) {
  const params = new URLSearchParams();
  params.set('key', apiKey);
  params.set('uri', uri);
  params.append('threatTypes', 'MALWARE');
  params.append('threatTypes', 'SOCIAL_ENGINEERING');
  params.append('threatTypes', 'UNWANTED_SOFTWARE');

  const res = await fetch(`${GOOGLE_WEB_RISK_API_URL}?${params.toString()}`, { method: 'GET' });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Google Web Risk API error:', res.status, errorText);

    if (res.status === 400 || res.status === 403) {
      return { ok: false, error: 'API configuration issue' };
    }
    throw new Error(`API request failed: ${res.status}`);
  }

  const data = await res.json().catch(() => ({}));
  const threatTypes = data?.threat?.threatTypes || [];
  return { ok: true, threatTypes, raw: data };
}

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
 * Check URL against Google Web Risk API (+ heuristics)
 */
async function checkUrlSafety(url, apiKey) {
  try {
    if (isSuspiciousUrlHeuristic(url)) {
      return { isSafe: false, threatType: 'suspicious' };
    }

    const urlObj = new URL(url);
    if (isTrickySubdomainsHost(urlObj.hostname)) {
      return { isSafe: false, threatType: 'tricky subdomains' };
    }

    const wr = await queryWebRiskForUri(url, apiKey);
    if (!wr.ok) {
      return { isSafe: true, threatType: null, error: wr.error };
    }

    if (!wr.threatTypes || wr.threatTypes.length === 0) {
      return { isSafe: true, threatType: null };
    }

    const t = String(wr.threatTypes[0] || 'UNKNOWN');
    const threatTypeMap = {
      MALWARE: 'malicious',
      SOCIAL_ENGINEERING: 'socially engineered',
      UNWANTED_SOFTWARE: 'unwanted software',
      SUSPICIOUS: 'suspicious',
      TRICKY_SUBDOMAINS: 'tricky subdomains',
    };

    return { isSafe: false, threatType: threatTypeMap[t] || t.toLowerCase() };
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
    if (!env.GOOGLE_WEB_RISK_API_KEY) {
      console.error('GOOGLE_WEB_RISK_API_KEY not configured');
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
      const result = await checkUrlSafety(body.url, env.GOOGLE_WEB_RISK_API_KEY);

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


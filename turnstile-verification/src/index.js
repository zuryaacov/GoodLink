/**
 * Cloudflare Worker for Turnstile Verification
 * 
 * This worker verifies Cloudflare Turnstile tokens for email signup.
 * 
 * Endpoint: POST /api/verify-turnstile
 * 
 * Request Body:
 * {
 *   "token": "turnstile_token_here"
 * }
 * 
 * Response:
 * {
 *   "success": true/false,
 *   "error": "error message (if failed)"
 * }
 */

/**
 * Verify Cloudflare Turnstile token
 * @param {string} token - Turnstile token to verify
 * @param {string} ipAddress - Client IP address
 * @param {string} secretKey - Turnstile secret key
 * @returns {Promise<boolean>} - true if verification successful
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
 * Handle Turnstile verification request
 */
async function handleVerifyTurnstile(request, env) {
    try {
        // Parse request body
        const body = await request.json();
        const token = body.token;

        if (!token) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Turnstile token is required'
            }), {
                status: 400,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            });
        }

        // Get client IP from request headers
        const clientIP = request.headers.get('CF-Connecting-IP') || 
                        request.headers.get('X-Forwarded-For')?.split(',')[0] || 
                        'unknown';

        const secretKey = env.TURNSTILE_SECRET_KEY;
        if (!secretKey) {
            console.error('❌ [Turnstile] TURNSTILE_SECRET_KEY not found in environment');
            return new Response(JSON.stringify({
                success: false,
                error: 'Server configuration error'
            }), {
                status: 500,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            });
        }

        const isValid = await verifyTurnstile(token, clientIP, secretKey);

        if (isValid) {
            return new Response(JSON.stringify({
                success: true
            }), {
                status: 200,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            });
        } else {
            return new Response(JSON.stringify({
                success: false,
                error: 'Turnstile verification failed'
            }), {
                status: 403,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            });
        }
    } catch (error) {
        console.error('❌ [Turnstile] Error in handleVerifyTurnstile:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Internal server error'
        }), {
            status: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
    }
}

/**
 * Main worker handler
 */
export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const pathname = url.pathname;
        const method = request.method;

        // Handle CORS preflight
        if (method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Max-Age': '86400'
                }
            });
        }

        // Handle /api/verify-turnstile endpoint
        if (pathname === '/api/verify-turnstile' && method === 'POST') {
            console.log('🔵 Handling /api/verify-turnstile endpoint');
            return await handleVerifyTurnstile(request, env);
        }

        // Handle root path or unknown paths
        return new Response(JSON.stringify({
            success: false,
            error: 'Not found'
        }), {
            status: 404,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
};

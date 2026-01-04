/**
 * URL Safety Check Utility
 * 
 * This module provides a function to check URL safety using the Cloudflare Worker
 * that interfaces with Google Safe Browsing API.
 * 
 * Environment Variable Required:
 * - VITE_SAFETY_CHECK_WORKER_URL: The URL of your Cloudflare Worker endpoint
 */

/**
 * Check if a URL is safe using the Cloudflare Worker
 * 
 * @param {string} url - The URL to check
 * @returns {Promise<{isSafe: boolean, threatType: string | null, error?: string}>}
 */
export async function checkUrlSafety(url) {
  const workerUrl = import.meta.env.VITE_SAFETY_CHECK_WORKER_URL;

  console.log('🔍 Safety Check Debug:', {
    workerUrl: workerUrl || 'NOT SET',
    url: url,
    envVars: Object.keys(import.meta.env).filter(k => k.includes('SAFETY') || k.includes('WORKER')),
  });

  if (!workerUrl) {
    console.error('❌ VITE_SAFETY_CHECK_WORKER_URL not configured. Please add it to Vercel environment variables.');
    // Fail open - if worker URL not configured, assume safe
    return {
      isSafe: true,
      threatType: null,
      error: 'Safety check service not configured',
    };
  }

  // Validate URL format first
  try {
    new URL(url);
  } catch (error) {
    return {
      isSafe: false,
      threatType: null,
      error: 'Invalid URL format',
    };
  }

  try {
    console.log('📤 Sending safety check request to:', workerUrl);
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    console.log('📥 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Worker error response:', errorText);
      throw new Error(`Worker responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Safety check result:', data);

    // Handle error responses from worker
    if (data.error) {
      console.warn('Safety check worker returned error:', data.error);
      // Fail open - if worker has error, assume safe
      return {
        isSafe: true,
        threatType: null,
        error: data.error,
      };
    }

    return {
      isSafe: data.isSafe ?? true,
      threatType: data.threatType || null,
    };
  } catch (error) {
    console.error('Error calling safety check worker:', error);
    
    // Fail open - if we can't check, assume safe
    return {
      isSafe: true,
      threatType: null,
      error: error.message || 'Network error',
    };
  }
}


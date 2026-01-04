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

  if (!workerUrl) {
    console.warn('VITE_SAFETY_CHECK_WORKER_URL not configured. Skipping safety check.');
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
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`Worker responded with status ${response.status}`);
    }

    const data = await response.json();

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


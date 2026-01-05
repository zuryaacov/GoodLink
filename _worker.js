/**
 * Cloudflare Worker for SPA routing
 * Serves static assets, and falls back to index.html for client-side routes
 */
export default {
  async fetch(request, env) {
    try {
      // Try to fetch the requested asset
      const response = await env.ASSETS.fetch(request);
      
      // If asset exists (200-299 status), return it
      if (response.status >= 200 && response.status < 300) {
        return response;
      }
    } catch (e) {
      // If fetch fails, continue to fallback
    }
    
    // For any non-existent routes, serve index.html
    // This allows React Router to handle client-side routing
    const indexUrl = new URL(request.url);
    indexUrl.pathname = '/index.html';
    
    try {
      const indexRequest = new Request(indexUrl.toString(), request);
      const indexResponse = await env.ASSETS.fetch(indexRequest);
      return indexResponse;
    } catch (e) {
      // Fallback error response
      return new Response('Not Found', { status: 404 });
    }
  },
};


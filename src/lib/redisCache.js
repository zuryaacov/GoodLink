/**
 * Update Redis cache for a link with all its related data
 * This function is called when a link is created, updated, or when UTM presets/pixels are associated
 * 
 * @param {Object} linkData - The link data to cache
 * @param {Object} supabase - Supabase client
 * @param {string} oldDomain - (optional) Old domain before update, for key cleanup
 * @param {string} oldSlug - (optional) Old slug before update, for key cleanup
 */
export async function updateLinkInRedis(linkData, supabase, oldDomain = null, oldSlug = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Fetch UTM presets data if they exist
    let utmPresetsData = [];
    if (linkData.utm_presets && Array.isArray(linkData.utm_presets) && linkData.utm_presets.length > 0) {
      const { data: presets, error: presetsError } = await supabase
        .from('utm_presets')
        .select('*')
        .in('id', linkData.utm_presets)
        .eq('user_id', user.id);

      if (!presetsError && presets) {
        utmPresetsData = presets;
      }
    }

    // Pixels are already stored as an array in linkData.pixels
    // No need to fetch them separately

    // Build the cache object
    const cacheData = {
      id: linkData.id,
      user_id: linkData.user_id || user.id,
      name: linkData.name,
      target_url: linkData.target_url,
      domain: linkData.domain,
      slug: linkData.slug,
      short_url: linkData.short_url,
      status: linkData.status || 'active',
      parameter_pass_through: linkData.parameter_pass_through !== undefined ? linkData.parameter_pass_through : true,
      utm_source: linkData.utm_source || null,
      utm_medium: linkData.utm_medium || null,
      utm_campaign: linkData.utm_campaign || null,
      utm_content: linkData.utm_content || null,
      utm_term: linkData.utm_term || null,
      utm_presets: utmPresetsData, // Full preset data, not just IDs
      pixels: linkData.pixels || [],
      server_side_tracking: linkData.server_side_tracking || false,
      custom_script: linkData.custom_script || null,
      fraud_shield: linkData.fraud_shield || 'none',
      bot_action: linkData.bot_action || 'block',
      geo_rules: linkData.geo_rules || [],
      created_at: linkData.created_at,
      updated_at: linkData.updated_at || new Date().toISOString(),
    };

    // Call the worker endpoint to update Redis
    // This endpoint should be created in goodlink-backend worker
    // Try to get worker URL from env, otherwise try to construct it
    let workerUrl = import.meta.env.VITE_WORKER_URL;
    
    if (!workerUrl) {
      // If no env var, try to construct from current origin
      // This assumes the worker is on the same domain
      workerUrl = window.location.origin.replace(/:\d+$/, '');
      
      // Check if we're on a custom domain that might have a different worker URL
      // For Cloudflare Workers, the URL is usually: https://<worker-name>.<account>.workers.dev
      // Or if it's on a custom domain, it might be the same domain
      console.warn('⚠️ [RedisCache] VITE_WORKER_URL not set, using:', workerUrl);
    }
    
    console.log('🔄 [RedisCache] Updating Redis cache...');
    console.log('🔄 [RedisCache] Worker URL:', workerUrl);
    console.log('🔄 [RedisCache] Domain:', linkData.domain);
    console.log('🔄 [RedisCache] Slug:', linkData.slug);
    if (oldDomain || oldSlug) {
      console.log('🔄 [RedisCache] Old Domain:', oldDomain);
      console.log('🔄 [RedisCache] Old Slug:', oldSlug);
    }
    
    const response = await fetch(`${workerUrl}/api/update-redis-cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: linkData.domain,
        slug: linkData.slug,
        oldDomain: oldDomain || null,
        oldSlug: oldSlug || null,
        cacheData: cacheData,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [RedisCache] Failed to update Redis cache:', response.status, errorText);
      // Don't throw - cache update is not critical
      return false;
    }

    const result = await response.json();
    console.log('✅ [RedisCache] Redis cache updated successfully:', result);
    return true;
  } catch (error) {
    console.error('Error updating Redis cache:', error);
    // Don't throw - cache update is not critical
    return false;
  }
}

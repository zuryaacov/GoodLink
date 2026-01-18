/**
 * Update Redis cache for a link with all its related data
 * This function is called when a link is created, updated, or when UTM presets/pixels are associated
 */
export async function updateLinkInRedis(linkData, supabase) {
  try {
    // Get Upstash Redis credentials from environment
    // Note: In a client-side app, we'll need to create an API endpoint or use a serverless function
    // For now, we'll use a Cloudflare Worker endpoint or similar
    
    // Check if we have the Redis URL and token (these should be available in the worker)
    // Since this is client-side, we'll need to create an API endpoint in the worker
    
    // For now, let's create a function that prepares the data structure
    // and will be sent to the worker endpoint
    
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
    const workerUrl = import.meta.env.VITE_WORKER_URL || window.location.origin.replace(/:\d+$/, '');
    const response = await fetch(`${workerUrl}/api/update-redis-cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: linkData.domain,
        slug: linkData.slug,
        cacheData: cacheData,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to update Redis cache:', errorText);
      // Don't throw - cache update is not critical
      return false;
    }

    console.log('✅ Redis cache updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating Redis cache:', error);
    // Don't throw - cache update is not critical
    return false;
  }
}

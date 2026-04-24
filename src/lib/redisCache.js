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

    const userId = linkData.user_id || user.id;

    // Fetch plan_type (subscription) from profiles
    let planType = 'free';
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan_type')
      .eq('user_id', userId)
      .single();
    if (profile?.plan_type) {
      planType = profile.plan_type;
    }

    // Fetch UTM presets data if they exist
    let utmPresetsData = [];
    if (linkData.utm_presets && Array.isArray(linkData.utm_presets) && linkData.utm_presets.length > 0) {
      const { data: presets, error: presetsError } = await supabase
        .from('utm_presets')
        .select('*')
        .in('id', linkData.utm_presets)
        .eq('user_id', userId);

      if (!presetsError && presets) {
        utmPresetsData = presets;
      }
    }

    // Fetch full pixel/CAPI records by IDs (linkData.pixels is array of UUIDs)
    let pixelsData = [];
    const pixelIds = Array.isArray(linkData.pixels)
      ? linkData.pixels.map((p) => (typeof p === 'string' ? p : p?.id)).filter(Boolean)
      : [];
    if (pixelIds.length > 0) {
      const { data: pixels, error: pixelsError } = await supabase
        .from('pixels')
        .select('*')
        .in('id', pixelIds)
        .eq('user_id', userId);

      if (!pixelsError && pixels && pixels.length > 0) {
        pixelsData = pixels;
      }
    }

    // Build the cache object (full pixel/CAPI details so backend can run them)
    const cacheData = {
      id: linkData.id,
      user_id: userId,
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
      utm_presets: utmPresetsData,
      pixels: pixelsData,
      tracking_mode: linkData.tracking_mode || 'capi',
      server_side_tracking: linkData.server_side_tracking || false,
      custom_script: linkData.custom_script || null,
      fraud_shield: linkData.fraud_shield || 'none',
      bot_action: linkData.bot_action || 'block',
      fallback_url: linkData.fallback_url || null,
      space_id: linkData.space_id || null,
      geo_rules: linkData.geo_rules || [],
      access_mode: linkData.access_mode || 'direct',
      enable_password_protection: Boolean(linkData.enable_password_protection),
      access_password: linkData.access_password || null,
      enable_anti_brute_force: Boolean(linkData.enable_anti_brute_force),
      max_login_attempts:
        linkData.max_login_attempts === undefined ? null : linkData.max_login_attempts,
      lockout_duration_minutes:
        linkData.lockout_duration_minutes === undefined ? null : linkData.lockout_duration_minutes,
      enable_time_limit: Boolean(linkData.enable_time_limit),
      expiration_datetime: linkData.expiration_datetime || null,
      expiration_timezone: linkData.expiration_timezone || null,
      enable_click_limit: Boolean(linkData.enable_click_limit),
      max_clicks_allowed:
        linkData.max_clicks_allowed === undefined ? null : linkData.max_clicks_allowed,
      plan_type: planType,
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

/**
 * Refresh Redis cache for every link that uses the given pixel ID.
 * Call after adding/updating/cancelling a pixel so Upstash has current pixel details.
 *
 * @param {string} pixelId - UUID of the pixel
 * @param {Object} supabase - Supabase client
 */
export async function refreshRedisForLinksUsingPixel(pixelId, supabase) {
  if (!pixelId || !supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: links, error } = await supabase
      .from('links')
      .select('id, domain, slug, user_id, pixels')
      .eq('user_id', user.id)
      .neq('status', 'deleted');

    if (error || !links?.length) return;

    const linksUsingPixel = links.filter((link) => {
      const pixels = link.pixels;
      if (!Array.isArray(pixels)) return false;
      return pixels.some((p) => (typeof p === 'string' ? p : p?.id) === pixelId);
    });

    if (linksUsingPixel.length === 0) return;

    const { data: fullLinks } = await supabase
      .from('links')
      .select('*')
      .in('id', linksUsingPixel.map((l) => l.id));

    if (!fullLinks?.length) return;

    for (const link of fullLinks) {
      await updateLinkInRedis(link, supabase);
    }
  } catch (err) {
    console.warn('[RedisCache] refreshRedisForLinksUsingPixel:', err);
  }
}

/**
 * Delete a link from Redis cache
 * This function is called when a link is deleted
 *
 * @param {string} domain - The domain of the link
 * @param {string} slug - The slug of the link
 */
export async function deleteLinkFromRedis(domain, slug) {
  try {
    let workerUrl = import.meta.env.VITE_WORKER_URL;

    if (!workerUrl) {
      workerUrl = window.location.origin.replace(/:\d+$/, '');
      console.warn('⚠️ [RedisCache] VITE_WORKER_URL not set, using:', workerUrl);
    }

    console.log('🗑️ [RedisCache] Deleting from Redis cache...');
    console.log('🗑️ [RedisCache] Domain:', domain);
    console.log('🗑️ [RedisCache] Slug:', slug);

    const response = await fetch(`${workerUrl}/api/delete-redis-cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: domain,
        slug: slug,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [RedisCache] Failed to delete from Redis cache:', response.status, errorText);
      return false;
    }

    const result = await response.json();
    console.log('✅ [RedisCache] Redis cache deleted successfully:', result);
    return true;
  } catch (error) {
    console.error('Error deleting from Redis cache:', error);
    return false;
  }
}

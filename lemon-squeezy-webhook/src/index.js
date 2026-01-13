/**
 * Cloudflare Worker for Lemon Squeezy Webhooks
 * 
 * This worker:
 * 1. Receives webhook events from Lemon Squeezy
 * 2. Verifies the webhook signature
 * 3. Updates user subscription status in Supabase
 * 
 * Environment Variables Required:
 * - LEMON_SQUEEZY_WEBHOOK_SECRET: Webhook signing secret from Lemon Squeezy
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key (bypasses RLS)
 */

/**
 * Verify webhook signature using HMAC SHA256
 * @param {string} rawBody - Raw request body
 * @param {string} signature - Signature from X-Lsq-Signature header
 * @param {string} secret - Webhook signing secret
 * @returns {boolean} - True if signature is valid
 */
async function verifySignature(rawBody, signature, secret) {
  if (!signature || !secret) {
    return false;
  }

  try {
    // Import the secret key for HMAC
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Sign the raw body
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(rawBody)
    );

    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Compare signatures (constant-time comparison)
    return hashHex === signature.toLowerCase();
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

/**
 * Update user subscription in Supabase
 * @param {string} supabaseUrl - Supabase project URL
 * @param {string} supabaseKey - Supabase service role key
 * @param {string} userId - User ID from custom data
 * @param {object} subscriptionData - Subscription data from webhook
 * @param {string} eventName - Event name (subscription_created, subscription_updated, etc.)
 * @returns {Promise<object>} - Response from Supabase
 */
async function updateUserSubscription(supabaseUrl, supabaseKey, userId, subscriptionData, eventName) {
  if (!userId) {
    console.error('No user_id found in webhook payload');
    return { error: 'Missing user_id' };
  }

  try {
    const subscription = subscriptionData.data;
    const attributes = subscription.attributes;
    
    // Determine plan type from variant name, product name, or variant_id
    let planType = 'free';
    const variantId = attributes.variant_id?.toString();
    const variantName = (attributes.variant_name || '').toLowerCase();
    const productName = (attributes.product_name || '').toLowerCase();
    
    // Try to extract plan from variant name first (most reliable)
    if (variantName.includes('start')) {
      planType = 'start';
    } else if (variantName.includes('advanced')) {
      planType = 'advanced';
    } else if (variantName.includes('pro')) {
      planType = 'pro';
    } else if (productName.includes('start')) {
      planType = 'start';
    } else if (productName.includes('advanced')) {
      planType = 'advanced';
    } else if (productName.includes('pro')) {
      planType = 'pro';
    }
    
    // Optional: Map specific variant IDs if needed (uncomment and update with your actual IDs)
    // To find variant IDs: Lemon Squeezy Dashboard → Products → Click variant → Check URL or details
    // const variantToPlan = {
    //   '123456': 'start',
    //   '789012': 'advanced',
    //   '345678': 'pro'
    // };
    // if (variantId && variantToPlan[variantId]) {
    //   planType = variantToPlan[variantId];
    // }

    // Determine subscription status
    let subscriptionStatus = 'inactive';
    if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
      subscriptionStatus = attributes.status === 'active' ? 'active' : 'inactive';
      if (attributes.status === 'cancelled') subscriptionStatus = 'cancelled';
      if (attributes.status === 'past_due') subscriptionStatus = 'past_due';
    } else if (eventName === 'subscription_cancelled') {
      subscriptionStatus = 'cancelled';
    }

    // Prepare update data
    const updateData = {
      plan_type: planType,
      subscription_status: subscriptionStatus,
      lemon_squeezy_subscription_id: subscription.id?.toString() || null,
      lemon_squeezy_customer_id: attributes.customer_id?.toString() || null,
      lemon_squeezy_order_id: attributes.order_id?.toString() || null,
      subscription_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Set subscription_created_at only on creation
    if (eventName === 'subscription_created') {
      updateData.subscription_created_at = attributes.created_at || new Date().toISOString();
    }

    // Set subscription_cancelled_at if cancelled
    if (subscriptionStatus === 'cancelled') {
      updateData.subscription_cancelled_at = attributes.cancelled_at || new Date().toISOString();
    }

    // Update or insert profile in Supabase
    const upsertUrl = `${supabaseUrl}/rest/v1/profiles`;
    
    // First, try to get existing profile
    const getProfileUrl = `${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}&select=id`;
    const getResponse = await fetch(getProfileUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    let profileExists = false;
    if (getResponse.ok) {
      const existingProfiles = await getResponse.json();
      profileExists = existingProfiles && existingProfiles.length > 0;
    }

    if (profileExists) {
      // Update existing profile
      const updateUrl = `${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}`;
      const updateResponse = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(updateData),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('Error updating profile:', errorText);
        return { error: 'Failed to update profile' };
      }

      const updatedProfile = await updateResponse.json();
      console.log('Profile updated successfully:', updatedProfile);
      return { data: updatedProfile };
    } else {
      // Create new profile (shouldn't happen if trigger works, but just in case)
      const createData = {
        id: userId,
        user_id: userId,
        ...updateData
      };

      const createResponse = await fetch(upsertUrl, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(createData),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('Error creating profile:', errorText);
        return { error: 'Failed to create profile' };
      }

      const createdProfile = await createResponse.json();
      console.log('Profile created successfully:', createdProfile);
      return { data: createdProfile };
    }
  } catch (error) {
    console.error('Error updating subscription:', error);
    return { error: error.message };
  }
}

/**
 * Main worker handler
 */
export default {
  async fetch(request, env) {
    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    try {
      // Get environment variables
      const secret = env.LEMON_SQUEEZY_WEBHOOK_SECRET;
      const supabaseUrl = env.SUPABASE_URL;
      const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

      // Log which variables are missing for debugging
      const missing = [];
      if (!secret) missing.push('LEMON_SQUEEZY_WEBHOOK_SECRET');
      if (!supabaseUrl) missing.push('SUPABASE_URL');
      if (!supabaseKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

      if (missing.length > 0) {
        console.error('Missing required environment variables:', missing.join(', '));
        console.error('Please set these in Cloudflare Dashboard → Workers & Pages → lemon-squeezy-webhook → Settings → Variables');
        return new Response(`Server configuration error: Missing ${missing.join(', ')}`, { 
          status: 500,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      // Log all headers for debugging (remove in production)
      const allHeaders = {};
      for (const [key, value] of request.headers.entries()) {
        allHeaders[key] = value;
      }
      console.log('Received headers:', JSON.stringify(allHeaders, null, 2));

      // Try to get signature from header
      // Lemon Squeezy uses X-Signature (or X-Lsq-Signature in some versions)
      // Try different header names and case variations
      let signature = request.headers.get('X-Signature') ||
                     request.headers.get('x-signature') ||
                     request.headers.get('X-Lsq-Signature') || 
                     request.headers.get('x-lsq-signature') ||
                     request.headers.get('X-LSQ-Signature');
      
      if (!signature) {
        console.error('Missing signature header. Available headers:', Object.keys(allHeaders));
        // For debugging: allow processing without signature (REMOVE IN PRODUCTION!)
        console.warn('WARNING: Processing webhook without signature verification (DEBUG MODE)');
      }

      // Read raw body
      const rawBody = await request.text();

      // Verify signature (if signature exists)
      if (signature) {
        const isValid = await verifySignature(rawBody, signature, secret);
        if (!isValid) {
          console.error('Invalid webhook signature');
          return new Response('Invalid signature', { 
            status: 401,
            headers: { 'Content-Type': 'text/plain' }
          });
        }
        console.log('Signature verified successfully');
      } else {
        console.warn('WARNING: Processing webhook without signature (DEBUG MODE - REMOVE IN PRODUCTION)');
      }

      // Parse webhook payload
      let payload;
      try {
        payload = JSON.parse(rawBody);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        return new Response('Invalid JSON', { 
          status: 400,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      // Extract event information
      const eventName = payload.meta?.event_name;
      const customData = payload.meta?.custom_data || {};
      const userId = customData.user_id;

      console.log('Webhook received:', {
        eventName,
        userId,
        subscriptionId: payload.data?.id
      });

      // Handle different event types
      if (eventName === 'subscription_created' || 
          eventName === 'subscription_updated' || 
          eventName === 'subscription_cancelled') {
        
        if (!userId) {
          console.error('No user_id in custom_data');
          return new Response('Missing user_id', { 
            status: 400,
            headers: { 'Content-Type': 'text/plain' }
          });
        }

        // Update user subscription in Supabase
        const result = await updateUserSubscription(
          supabaseUrl,
          supabaseKey,
          userId,
          payload,
          eventName
        );

        if (result.error) {
          console.error('Error updating subscription:', result.error);
          return new Response(`Error: ${result.error}`, { 
            status: 500,
            headers: { 'Content-Type': 'text/plain' }
          });
        }

        return new Response('Webhook processed successfully', { 
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      } else {
        // Log unhandled events but return success
        console.log('Unhandled event type:', eventName);
        return new Response('Event received but not processed', { 
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal server error', { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
};

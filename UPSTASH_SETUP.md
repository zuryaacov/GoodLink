# Upstash Redis & QStash Setup

## Required Environment Variables

Add these secrets to your Cloudflare Worker:

### Upstash Redis
1. **UPSTASH_REDIS_REST_URL** - Your Upstash Redis REST API URL
   - Format: `https://<redis-name>-<region>.upstash.io`
   - Find it in: Upstash Console → Your Redis Database → REST API → Endpoint

2. **UPSTASH_REDIS_REST_TOKEN** - Your Upstash Redis Token
   - Find it in: Upstash Console → Your Redis Database → REST API → Token

### QStash (Upstash Queue)
1. **QSTASH_URL** - Your QStash REST API URL
   - Format: `https://qstash.upstash.io/v2`
   - Or: `https://<region>.qstash.sh`
   - Find it in: Upstash Console → QStash → REST API → Endpoint

2. **QSTASH_TOKEN** - Your QStash Token
   - Find it in: Upstash Console → QStash → REST API → Token

## How to Set Secrets in Cloudflare

```bash
# From the goodlink-backend directory
cd goodlink-backend

# Set Redis secrets
wrangler secret put UPSTASH_REDIS_REST_URL
wrangler secret put UPSTASH_REDIS_REST_TOKEN

# Set QStash secrets
wrangler secret put QSTASH_URL
wrangler secret put QSTASH_TOKEN
```

## Redis Cache Key Format

Links are cached in Redis with the following key format:
- Key: `link:{domain}:{slug}`
- Example: `link:glynk.to:abc123`

The value is a JSON string containing the full link data from the `links` table.

## Queue Message Format

Click data is sent to the queue as JSON with all click tracking fields:
- `link_id`, `user_id`, `slug`, `domain`, `target_url`
- `telemetry_id`, `visitor_id`, `verdict`, `fraud_score`
- `ip_address`, `country`, `city`, `is_vpn`, `is_proxy`
- `browser`, `os`, `device_type`, `user_agent`, `referer`
- `turnstile_verified`, `clicked_at`
- And all other click tracking fields

## Fallback Behavior

- If Redis is not configured or cache miss → Falls back to Supabase direct query
- If Queue is not configured → Falls back to direct Supabase insert

This ensures the system continues to work even if Upstash is not fully configured.

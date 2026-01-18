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

## Redis Cache Structure

Upstash Redis is a **key-value store** (not a relational database), so there are no tables to create. Data is stored as simple key-value pairs.

### Key Format

- **Key Pattern**: `link:{domain}:{slug}`
- **Example**: `link:glynk.to:abc123`

### Value Format

The value is a **JSON string** containing the complete link data:

```json
{
  "id": "uuid-of-link",
  "user_id": "uuid-of-user",
  "name": "Link Name",
  "target_url": "https://example.com",
  "domain": "glynk.to",
  "slug": "abc123",
  "short_url": "https://glynk.to/abc123",
  "status": "active",
  "parameter_pass_through": true,
  "utm_source": "facebook",
  "utm_medium": "cpc",
  "utm_campaign": "{{campaign.name}}",
  "utm_content": null,
  "utm_term": null,
  "utm_presets": [
    {
      "id": "preset-id",
      "name": "Preset Name",
      "platform": "meta",
      "utm_source": "facebook_ads",
      "utm_medium": "cpm",
      "utm_campaign": "...",
      "utm_content": "...",
      "utm_term": "..."
    }
  ],
  "pixels": [
    {
      "id": "pixel-id",
      "name": "Pixel Name",
      "platform": "meta",
      "code": "..."
    }
  ],
  "server_side_tracking": false,
  "custom_script": null,
  "fraud_shield": "none",
  "bot_action": "block",
  "geo_rules": [],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### How It Works

1. **No Setup Required**: Redis doesn't need any schema or table creation. Just create the Redis database in Upstash console.

2. **Automatic Storage**: When a link is created/updated, the system automatically:
   - Creates the key: `link:{domain}:{slug}`
   - Stores the JSON object as the value

3. **Automatic Retrieval**: When a link is requested:
   - Worker tries to get from Redis using key: `link:{domain}:{slug}`
   - If found, returns cached data
   - If not found (cache miss), falls back to Supabase

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

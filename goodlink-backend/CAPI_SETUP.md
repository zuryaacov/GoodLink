# CAPI (Conversions API) Setup

## Flow

1. **User clicks link** → Worker receives request.
2. If link is valid, user is **PRO**, and `tracking_mode` is `capi` or `pixel_and_capi`:
   - Worker builds CAPI payload (event_id, event_time, event_source_url, user_data, pixels).
   - Worker sends payload to **QStash** with destination = **CAPI Relay URL**.
3. **QStash** POSTs the payload to your **CAPI Relay** (`/api/capi-relay`).
4. **Relay** forwards each pixel to the platform API (Meta or TikTok) and logs result in **capi_logs**.

## Secrets (Cloudflare)

From `goodlink-backend`:

```powershell
# Required: full URL where QStash should POST (your worker + /api/capi-relay)
npx wrangler secret put CAPI_RELAY_URL
# Example: https://goodlink-backend.<account>.workers.dev/api/capi-relay

# Optional: for testing, send CAPI requests to this URL instead of Meta
npx wrangler secret put CAPI_TEST_ENDPOINT
# Example: https://webhook.site/14ef81a2-b744-4e42-a508-b03e462fdf46
```

- **CAPI_RELAY_URL** – Must be the full URL of your worker’s relay (e.g. `https://<worker-domain>/api/capi-relay`). Required for CAPI to work.
- **CAPI_TEST_ENDPOINT** – If set, the relay sends requests here instead of Meta/TikTok (for debugging). Leave unset for production.

## Supabase

1. Run **supabase-capi-logs-table.sql** in Supabase SQL Editor (creates `capi_logs`).
2. If your `pixels` table has no `capi_token` column, run **supabase-add-capi-token-to-pixels.sql**.

## Meta payload (reference)

- `event_name` = `custom_event_name` from pixels table (or standard e.g. PageView).
- `event_time` = Unix timestamp in seconds (`Math.floor(Date.now() / 1000)`).
- `event_source_url` = URL the user clicked (entry URL).
- `user_data.fbc` = `fb.1.{event_time}.{fbclid}` (from URL param `fbclid`).
- `user_data.client_ip_address` = from request (e.g. `cf-connecting-ip`).
- `user_data.client_user_agent` = from request `user-agent`.

## TikTok payload (reference)

- **Endpoint:** `https://business-api.tiktok.com/open_api/v1.3/event/track/` (token in header `Access-Token`).
- `pixel_code` = pixel_id from table.
- `event` = custom_event_name or PageView.
- `event_id` = UUID for dedup.
- `timestamp` = ISO string (e.g. `2024-01-29T10:00:00.000Z`).
- `context.ad.callback` = ttclid from URL param `ttclid` (only when present).
- `context.user.ip` = client IP.
- `context.user.user_agent` = user-agent.
- `context.page.url` = event_source_url (entry URL).

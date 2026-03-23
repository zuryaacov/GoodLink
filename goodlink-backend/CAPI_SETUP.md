# CAPI (Conversions API) Setup

## Flow

1. **User clicks link** → Worker receives request.
2. If link is valid, user is **PRO**, and `tracking_mode` is `capi` or `pixel_and_capi`:
   - Worker builds CAPI payload (event_id, event_time, event_source_url, user_data, pixels).
   - Worker sends payload to **QStash** with destination = **CAPI Relay URL**.
3. **QStash** POSTs the payload to your **CAPI Relay** (`/api/capi-relay`).
4. **Relay** forwards each pixel to the platform API (Meta or TikTok) and logs result in **capi_logs**.

**`event_time` (Meta / TikTok):** The relay sets this to **`currentTime = Math.floor(Date.now() / 1000)` as soon as the relay handler runs** (not from the QStash payload), so clocks stay correct in production.

**Duplicate TikTok (or any platform) in logs:** The relay sends **one HTTP request per item** in the `pixels` array. If you see TikTok twice, you likely had **two pixel rows** (same or duplicate config). The Worker now **dedupes by `platform` + `pixel_id`** before QStash and again in the relay, so the same pixel only fires once.

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
- **CAPI_TEST_ENDPOINT** – If set, the relay sends **Meta/TikTok/Snapchat** traffic to this URL instead of the real APIs (debug only). **Leave unset for production.**
  - To turn off without deleting the secret: set value to `off` or `false`.
  - **Webhook.site 404** (`Token "…" not found`): the unique path expired or was deleted — create a new URL on webhook.site and update the secret, **or** remove the secret / set `off` to use `graph.facebook.com` again.
- **TIKTOK_CAPI_TEST_EVENT_CODE** (optional) – Sent as `test_event_code` on TikTok Events API for Test Events. Default in code: `TEST07082`. Set to `off` or `false` to omit in production.

## Supabase

1. Run **supabase-capi-logs-table.sql** in Supabase SQL Editor (creates `capi_logs`).
2. If your `pixels` table has no `capi_token` column, run **supabase-add-capi-token-to-pixels.sql**.

## Meta payload (reference)

- Body is `{ data: [ { ... } ] }` only (no `test_event_code`).
- `event_name` = `custom_event_name` from pixels table (or standard e.g. PageView).
- `event_time` = Unix timestamp in seconds (`Math.floor(Date.now() / 1000)`).
- `event_source_url` = URL the user clicked (entry URL).
- `user_data.fbc` = `fb.1.{event_time}.{fbclid}` (from URL param `fbclid`).
- `user_data.client_ip_address` = from request (e.g. `cf-connecting-ip`).
- `user_data.client_user_agent` = from request `user-agent`.

## TikTok payload (reference)

- **Endpoint:** `https://business-api.tiktok.com/open_api/v1.3/event/track/` (token in header `Access-Token`).
- Root: `event_source` = `web`, `event_source_id` = pixel id (string only — no `pixel_code` at root).
- `data` = array of events (same idea as Meta’s `data` array).
- Each item: `event`, `event_id`, `event_time` (**Unix seconds, integer** — not ISO), `context` with `ad.callback` (ttclid), `page.url`, `user.client_ip_address`, `user.user_agent`.
- `test_event_code` = optional at root (default `TEST07082` unless `TIKTOK_CAPI_TEST_EVENT_CODE=off`).

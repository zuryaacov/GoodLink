# Pixel & CAPI Implementation – Backend (Worker)

## Overview

When a request hits the worker with a **valid link + slug** and the **user has PRO plan**, the worker handles pixel (client-side) and CAPI (server-side) according to `tracking_mode`:

| tracking_mode      | Behavior                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------- |
| **pixel**          | Return a **bridge page** (~1.5s), fire client-side pixels, then redirect via JavaScript. |
| **pixel_and_capi** | Same bridge page + in parallel send CAPI events via **QStash** to the relay.             |
| **capi**           | No bridge page: **immediate 302 redirect**; CAPI is sent via QStash in the background.   |

---

## 1. Why a Bridge Page for Pixel?

A **server-side 301/302** redirect does not let the browser run any JavaScript. So the pixel (Meta, TikTok, Google, etc.) never loads and never fires.

**Solution:** Return an **HTML “bridge” page** (HTTP 200) that:

1. Loads for about **1.5 seconds** (“Redirecting…”).
2. Injects and runs the **client-side pixel code** (fbq, ttq, gtag, etc.) with the correct **event name** and **event_id** (for deduplication with CAPI).
3. Then redirects with **`window.location.replace(destinationUrl)`**.

Same **event_id** is used in both pixel and CAPI so platforms (e.g. Meta) can deduplicate.

---

## 2. The Fork (Two Paths)

When the request is valid and PRO + pixels are configured:

- **Path 1 – CAPI (if tracking_mode is capi or pixel_and_capi)**  
  Worker sends a **single message to QStash** with:
  - Pixels that have `capi_token` (and are active).
  - `event_data`: IP, User-Agent, click IDs (fbc, gclid, ttclid, etc.).
  - `event_id`, `event_name`, `user_id`, `link_id`, `destination`.

  QStash then **POSTs to our relay** (`/api/capi-relay`). The relay calls each platform’s CAPI (Meta, TikTok, Google, Snapchat, etc.), then writes the result to **capi_logs** in Supabase.

- **Path 2 – Pixel (if tracking_mode is pixel or pixel_and_capi)**  
  Worker **returns the bridge page** (200) so the browser can load and run the pixel scripts, then redirect after ~1.5s.

---

## 3. Click ID Mapping (URL → JSON)

Used for both pixel (when available in URL) and CAPI:

| Platform | URL parameter | JSON field / usage                   |
| -------- | ------------- | ------------------------------------ |
| Meta     | `fbclid`      | `fbc` (format: `fb.1.<ts>.<fbclid>`) |
| Google   | `gclid`       | `gclid`                              |
| TikTok   | `ttclid`      | `callback` (under `ad`)              |
| Snapchat | `sc_cid`      | `click_id`                           |
| Taboola  | `tblci`       | `click_id`                           |
| Outbrain | `dicledid`    | `obid`                               |

These are read from the incoming request URL and passed to the bridge page (for client-side) and to the CAPI payload (for server-side).

---

## 4. Event Name (Same for Pixel and CAPI)

The **event name** is taken from the link’s pixel config:

- If pixel has `event_type === 'custom'` → use **`custom_event_name`**.
- Otherwise use **`event_type`** (e.g. PageView, Lead, Purchase).
- Default: **PageView**.

This **same** name is used in:

- Client-side pixel (`fbq('track', eventName, {}, eventId)` etc.).
- CAPI payload (`event_name` in the relay and in platform APIs).

---

## 5. CAPI Relay (`/api/capi-relay`)

- **Called by:** QStash (POST).
- **Body:**  
  `pixels`, `event_data` (ip, ua, click_ids), `event_id`, `event_name`, `user_id`, `link_id`, `destination`.

For each pixel that has `capi_token` and is active:

1. Call the platform CAPI endpoint (Meta, TikTok, Google, Snapchat, etc.).
2. Insert a row into **capi_logs** (platform, event_name, event_id, click_id, status_code, payload, response_body, user_id, link_id, pixel_id).

So we have full **audit**: what we sent and what the platform returned (success/error).

---

## 6. CAPI Endpoints (Platforms)

| Platform   | Endpoint                                                            | Auth                     | Notes                                              |
| ---------- | ------------------------------------------------------------------- | ------------------------ | -------------------------------------------------- |
| Meta       | `POST https://graph.facebook.com/v19.0/{pixel_id}/events`           | `access_token` in body   | event_time in **seconds** (Unix).                  |
| TikTok     | `POST https://business-api.tiktok.com/open_api/v1.3/event/track/`   | `Access-Token` header    | callback = ttclid under `ad`.                      |
| Google Ads | `POST .../v15/customers/{customer_id}:uploadClickConversions`       | Bearer + developer-token | customer_id from pixel_id; may need extra mapping. |
| Snapchat   | `POST https://tr.snapchat.com/v2/conversion`                        | Bearer token             | click_id = sc_cid.                                 |
| Outbrain   | `POST/GET https://tr.outbrain.com/pixel/events`                     | URL/body params          | obid = dicledid.                                   |
| Taboola    | `GET/POST https://trc.taboola.com/actions-handler/log/3/s2s-action` | Query/body               | click-id = tblci.                                  |

Meta and TikTok are implemented in the relay; Google/Snapchat/Outbrain/Taboola are stubbed or partial and can be completed using the same pattern (call API → log to capi_logs).

---

## 7. QStash Usage

- Worker **does not** call Meta/TikTok/etc. directly during the redirect (to avoid blocking the user).
- Worker sends **one message to QStash** with:
  - **Destination URL:** `https://<worker-origin>/api/capi-relay`
  - **Body:** the CAPI payload (pixels, event_data, event_id, event_name, user_id, link_id, destination).

QStash:

- Delivers the POST to our relay (with retries).
- Decouples redirect latency from CAPI latency.

---

## 8. capi_logs Table (Supabase)

Used for auditing and proving to affiliates that CAPI was sent.

| Column        | Type        | Purpose                           |
| ------------- | ----------- | --------------------------------- |
| id            | uuid        | PK                                |
| created_at    | timestamptz | When the log was written          |
| user_id       | uuid        | Link owner                        |
| link_id       | uuid        | Link                              |
| platform      | text        | meta, tiktok, google, snapchat, … |
| event_name    | text        | PageView, Lead, etc.              |
| event_id      | text        | Dedup id (same as pixel)          |
| click_id      | text        | fbclid/gclid/ttclid/…             |
| status_code   | int         | HTTP status from platform API     |
| payload       | jsonb       | What we sent                      |
| response_body | jsonb       | Full response from platform       |
| pixel_id      | text        | Pixel identifier                  |

Migration: **supabase-capi-logs-table.sql** (run in Supabase SQL Editor).

---

## 9. Flow Summary

1. **Request** → Worker resolves link from Redis/Supabase; checks slug, domain, status, bot, blacklist.
2. **Log click** → Click record sent to Supabase (e.g. via QStash) as today.
3. **PRO + pixels?**
   - If **plan_type !== 'pro'** or no pixels → **302 redirect** to target URL (current behavior).
   - If **plan_type === 'pro'** and pixels exist:
     - **tracking_mode === 'capi'**:
       - Send CAPI payload to QStash (relay URL).
       - **302 redirect** to target URL.
     - **tracking_mode === 'pixel'**:
       - Return **bridge page** (200); after ~1.5s, JS redirect to target URL.
     - **tracking_mode === 'pixel_and_capi'**:
       - Send CAPI payload to QStash.
       - Return **bridge page**; after ~1.5s, JS redirect.
4. **QStash** → POSTs to `/api/capi-relay` with the payload.
5. **Relay** → For each pixel with CAPI: call platform API, insert row into **capi_logs**, return 200.

---

## 10. Environment / Secrets

- **QSTASH_TOKEN** – Used to publish CAPI jobs to QStash (worker already uses it for click logging).
- **SUPABASE_SERVICE_ROLE_KEY** – Used by the relay to insert into **capi_logs**.
- Worker **origin** – Derived from `request.url` so the relay URL is `origin + '/api/capi-relay'`.

---

## 11. Files Touched

- **goodlink-backend/src/index.js**
  - `getClickIdsFromUrl(searchParams)` – URL params → fbc, gclid, ttclid, etc.
  - `getBridgePageHtml(opts)` – HTML bridge page with pixel scripts and redirect after 1.5s.
  - `sendCapiToQStash(env, relayUrl, payload)` – Publish CAPI job to QStash.
  - Redirect logic: if PRO + pixels, branch by tracking_mode (capi vs pixel vs pixel_and_capi).
  - **POST /api/capi-relay** – Receives QStash POST, calls platform CAPIs, writes **capi_logs**.
  - Parse `linkData` from Redis when it is a JSON string.
- **supabase-capi-logs-table.sql** – Creates **capi_logs** table and RLS policies.

---

## 12. Deduplication

- **event_id** is generated once per click (UUID) in the worker.
- Same **event_id** is used in:
  - Bridge page pixel calls (e.g. `fbq('track', eventName, {}, eventId)`).
  - CAPI payload sent to QStash and then to the relay.
- Platforms (e.g. Meta) use **event_id** (and optionally event_name) to deduplicate pixel and CAPI events.

# Abuse Report – Setup

## 1. Supabase table

Run the migration in Supabase (SQL Editor or CLI):

- File: `supabase/migrations/abuse_reports_table.sql`

This creates `public.abuse_reports` with:

| Column                 | Type        | Description                                               |
| ---------------------- | ----------- | --------------------------------------------------------- |
| id                     | uuid        | PK, default `gen_random_uuid()`                           |
| reported_url           | text        | The reported link (required)                              |
| category               | text        | One of: `phishing`, `spam`, `adult`, `copyright`, `other` |
| description            | text        | Optional free text                                        |
| reporter_email         | text        | Reporter email (required)                                 |
| safe_browsing_response | jsonb       | Google Safe Browsing API result                           |
| turnstile_verified     | boolean     | Whether Turnstile was verified                            |
| created_at             | timestamptz | Default `now()`                                           |

RLS is enabled; only the backend (service role) can insert. No direct client access.

## 2. Worker env vars (goodlink-backend)

- **TURNSTILE_SECRET_KEY** – Cloudflare Turnstile secret key (so the backend can verify the token). If omitted, the report is still saved but Turnstile is not verified server-side.
- **GOOGLE_SAFE_BROWSING_API_KEY** – (Optional) Google Safe Browsing API key. If set, the reported URL is checked and the result is stored in `safe_browsing_response`.

Existing worker vars (Supabase, etc.) are unchanged.

## 3. Frontend env

- **VITE_TURNSTILE_SITE_KEY** – Turnstile site key (same as for login/signup).
- **VITE_WORKER_URL** – Backend base URL (e.g. `https://glynk.to`).
- **VITE_TURNSTILE_WORKER_URL** – (Optional) Turnstile verify worker; default is used if not set.

## 4. Links

- Public report page: **/abuse**
- Footer on homepage: **Abuse / DMCA** links to `/abuse`.

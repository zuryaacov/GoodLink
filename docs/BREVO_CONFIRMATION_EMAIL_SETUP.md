# Signup Confirmation Email via Brevo

Instead of Supabase's default confirmation email, the app sends the signup confirmation through **Brevo** (with your templates). The flow:

1. User signs up on the site (email + password).
2. Frontend calls the Worker: `POST /api/send-confirmation-email` with `{ email, redirect_to }`.
3. Worker uses **Supabase Admin API** to generate a confirmation link (`generate_link` type `signup`).
4. Worker sends the email via **Brevo API**, with that link in the template or body.

## Worker (Cloudflare) environment variables

Set these in your Worker (e.g. **Workers & Pages → your worker → Settings → Variables and Secrets**):

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (Project Settings → API) |
| `SUPABASE_SEND_EMAIL_HOOK_SECRET` | Yes (for hook) | Secret from Supabase **Auth → Hooks** (format `v1,whsec_xxxxx`). Must match the value you set in the Send Email Hook. |
| `BREVO_API_KEY` | Yes | Brevo API key (SMTP/Transactional) from [Brevo → Settings → API Keys](https://app.brevo.com/settings/keys/api) |
| `BREVO_SENDER_EMAIL` | No | Sender email (default: `noreply@goodlink.ai`) |
| `BREVO_SENDER_NAME` | No | Sender name (default: `Goodlink`) |
| `BREVO_CONFIRMATION_SUBJECT` | No | Subject line (default: `Confirm your email - Goodlink`) |
| `BREVO_CONFIRMATION_TEMPLATE_ID` | No | Brevo **template ID** for the confirmation email. If set, the template is used and must include the variables below. |
| `BREVO_CONFIRMATION_HTML` | No | Raw HTML body (used only if no template). Placeholders: `{{CONFIRMATION_LINK}}`, `{{EMAIL}}`. |
| `BREVO_RECOVERY_SUBJECT` | No | Subject for password-reset email (default: `Reset your password - Goodlink`). Used when the Send Email Hook sends recovery via Brevo. |

### Using a Brevo template

1. In Brevo: **Campaigns → Templates** (or **Transactional → Templates**), create a template.
2. In the template body, add a button or link and use the variable: **`{{ params.CONFIRMATION_LINK }}`** (or the name your template language uses for params).
3. Copy the template ID from the template URL or template settings.
4. Set **`BREVO_CONFIRMATION_TEMPLATE_ID`** in the Worker to that ID.
5. The Worker sends `params: { CONFIRMATION_LINK: "<url>", EMAIL: "<user email>" }`; ensure your template uses these param names.

## Avoiding duplicate emails: use the Send Email Hook (required)

So that **only** Brevo sends the confirmation email (and it looks like your Brevo template, not Supabase’s), Supabase must not send its own email. Use the **Send Email Hook**:

1. In **[Supabase Dashboard](https://app.supabase.com)** go to **Authentication → Hooks**.
2. Click **Add hook** and choose **Send Email**.
3. Choose **HTTP** (not Postgres).
4. Set the hook URL to your Worker endpoint:
   ```text
   https://glynk.to/api/supabase-send-email-hook
   ```
   (Replace `glynk.to` with your Worker domain if different.)
5. **Secret:** Supabase will show or let you generate a secret (format `v1,whsec_xxxxx`). Copy it.
6. In your **Worker** (Cloudflare → Workers & Pages → your worker → Settings → Variables and Secrets), add a secret:
   - **Name:** `SUPABASE_SEND_EMAIL_HOOK_SECRET`
   - **Value:** the same secret you copied from Supabase (the full string, e.g. `v1,whsec_xxxxx`).
7. Save in Supabase. Ensure the **Email** provider is still enabled under **Authentication → Providers → Email**.

**If Supabase reports "Unexpected status code returned from hook: 403"**  
The Worker itself does not return 403; that usually comes from **Cloudflare** (WAF, Bot Management, or Firewall) blocking Supabase’s server request. Fix it by:

- In **Cloudflare Dashboard** → your domain → **Security** → **WAF** (or **Firewall rules**): add a rule that **skips** or **allows** requests when the URI path is exactly `/api/supabase-send-email-hook` (or "contains" that path), so Supabase’s outbound requests to the hook are not blocked.
- Alternatively, under **Security** → **Settings**, temporarily relax **Bot Fight Mode** or **Security Level** for testing; if the hook then works, add a skip rule for the hook path as above.

What the Worker does:

- For **signup**: returns 200 without sending. The confirmation email is sent only by the frontend → Worker → Brevo flow (your template).
- For **recovery** (password reset): the Worker sends the reset email via Brevo (simple HTML; optional `BREVO_RECOVERY_SUBJECT` in the Worker env).
- Other auth email types: returns 200 without sending (you can extend later).

After this, users will receive only the Brevo-styled confirmation (and recovery) emails.

## Frontend

The frontend uses **`VITE_WORKER_URL`** (e.g. `https://glynk.to`) to call the Worker. If not set, it defaults to `https://glynk.to`. Set in `.env`:

```env
VITE_WORKER_URL=https://glynk.to
```

(Use your real Worker URL if different.)

## API: `POST /api/send-confirmation-email`

- **Body:** `{ "email": "user@example.com", "redirect_to": "https://yoursite.com/login" }`
- **redirect_to:** Optional. Where to send the user after they click the confirmation link (e.g. `/login?plan=pro`).
- **Response:** `200 { "success": true }` or `4xx/5xx { "error": "..." }`.

The confirmation link is generated by Supabase Auth (`admin/generate_link` type `signup`) and then included in the Brevo email (template or HTML).

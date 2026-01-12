# Cloudflare Custom Domain Setup

## Overview

When a user adds a custom domain in the Dashboard, the backend (Cloudflare Worker) automatically registers it with Cloudflare using the Cloudflare API.

## Required Environment Variables

Add these secrets to your Cloudflare Worker:

```bash
npx wrangler secret put CLOUDFLARE_ZONE_ID
npx wrangler secret put CLOUDFLARE_GLOBAL_KEY
npx wrangler secret put CLOUDFLARE_EMAIL
```

### Getting Cloudflare Global API Key and Email

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click on your profile icon (top right)
3. Go to **My Profile** → **API Tokens**
4. Scroll down to **API Keys** section
5. Find **Global API Key**
6. Click **View** next to "Global API Key"
7. Enter your Cloudflare password to reveal the key
8. **Copy the Global API Key**
9. **Note your Cloudflare account email** (the email you use to login)

### Getting Zone ID

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your zone (e.g., `glynk.to`)
3. Scroll down in the **Overview** page
4. Find **Zone ID** in the **API** section
5. Copy the Zone ID

## Flow

1. User adds domain in Dashboard → `AddDomainModal`
2. Frontend calls Worker endpoint: `POST /api/add-custom-domain`
3. Worker calls Cloudflare API to register the domain
4. Worker saves Cloudflare response to Supabase (including `cloudflare_hostname_id`)
5. Worker returns verification records to frontend
6. Frontend displays DNS records for user to configure

## Frontend Environment Variable

The frontend needs to know the Worker URL. Add this environment variable:

- **Name**: `VITE_WORKER_URL`
- **Value**: Your Worker URL (e.g., `https://glynk.to` or `https://goodlink-backend.YOUR-ACCOUNT.workers.dev`)
- **Note**: If not set, defaults to `https://glynk.to`

## API Endpoint

**URL**: `https://YOUR-WORKER-URL.workers.dev/api/add-custom-domain`

**Method**: POST

**Headers**:
```
Content-Type: application/json
Authorization: Bearer <SUPABASE_ACCESS_TOKEN> (optional - handled via RLS)
```

**Body**:
```json
{
  "domain": "links.mybrand.com",
  "user_id": "uuid-of-user"
}
```

**Response** (Success):
```json
{
  "success": true,
  "cloudflare_hostname_id": "abc123...",
  "verification": {
    "ownership_verification": {
      "name": "_cf-custom-hostname",
      "type": "TXT",
      "value": "verification-value"
    },
    "ssl": {
      "name": "_cf-custom-hostname",
      "type": "TXT",
      "value": "ssl-verification-value"
    }
  },
  "domain_id": "uuid-of-saved-domain"
}
```

**Response** (Error):
```json
{
  "success": false,
  "error": "Error message"
}
```

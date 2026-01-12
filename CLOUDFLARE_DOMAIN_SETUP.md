# Cloudflare Custom Domain Setup

## Overview

When a user adds a custom domain in the Dashboard, the backend (Cloudflare Worker) automatically registers it with Cloudflare using the Cloudflare API.

## Required Environment Variables

Add these secrets to your Cloudflare Worker:

```bash
npx wrangler secret put CLOUDFLARE_ZONE_ID
npx wrangler secret put CLOUDFLARE_API_TOKEN
```

### Getting Cloudflare API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click on your profile icon (top right)
3. Go to **My Profile** → **API Tokens**
4. Click **Create Token**
5. Use the **Edit zone DNS** template or create a custom token with these permissions:
   - **Zone** → **Zone** → **Read**
   - **Zone** → **Zone Settings** → **Edit**
   - **Zone** → **DNS** → **Edit**
6. Copy the token

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
4. Worker saves Cloudflare response to Supabase
5. Worker returns verification records to frontend
6. Frontend displays DNS records for user to configure

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

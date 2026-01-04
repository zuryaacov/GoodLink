# Quick Start Guide

## Step 1: Update Wrangler (if needed)

If you see a warning about outdated Wrangler, update it:

```bash
npm install --save-dev wrangler@4
```

Or if you're in the url-safety-check directory:

```bash
cd url-safety-check
npm install
```

## Step 2: Login to Cloudflare

```bash
npx wrangler login
```

This will open your browser to authenticate with Cloudflare.

## Step 3: Set Your API Key

```bash
npx wrangler secret put GOOGLE_SAFE_BROWSING_API_KEY
```

**Note:** If you see a warning about multiple environments, you can ignore it or use:
```bash
npx wrangler secret put GOOGLE_SAFE_BROWSING_API_KEY --env=""
```

When prompted, paste your Google Safe Browsing API key and press Enter.

**To get a Google Safe Browsing API Key:**
1. Go to https://console.cloud.google.com/
2. Create or select a project
3. Enable "Safe Browsing API"
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy the key and paste it when prompted

## Step 4: Deploy

```bash
npx wrangler deploy
```

After deployment, you'll see your worker URL. It will look like:
```
https://url-safety-check.your-subdomain.workers.dev
```

## Step 5: Add to Frontend

Add this to your Vercel environment variables:

**Name:** `VITE_SAFETY_CHECK_WORKER_URL`  
**Value:** `https://url-safety-check.your-subdomain.workers.dev`

Then redeploy your Vercel app.

## Testing

Test your worker with:

```bash
curl -X POST https://your-worker-url.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

Expected response:
```json
{
  "isSafe": true,
  "threatType": null
}
```


# Cloudflare Worker Setup Guide

This guide explains how to deploy the URL Safety Check Cloudflare Worker.

## Prerequisites

1. A Cloudflare account
2. A Google Safe Browsing API key
   - Get one at: https://console.cloud.google.com/apis/api/safebrowsing.googleapis.com
   - Enable the "Safe Browsing API" in your Google Cloud project

## Deployment Steps

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

Or use npx:
```bash
npx wrangler --version
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Create a New Worker Project

```bash
wrangler init url-safety-check
cd url-safety-check
```

### 4. Copy the Worker Script

Copy the contents of `cloudflare-worker.js` to `src/index.js` in your worker project.

### 5. Configure Environment Variables

Add your Google Safe Browsing API key as a secret:

```bash
wrangler secret put GOOGLE_SAFE_BROWSING_API_KEY
```

When prompted, paste your API key.

### 6. Deploy the Worker

```bash
wrangler deploy
```

### 7. Get Your Worker URL

After deployment, Wrangler will output your worker URL. It will look like:
```
https://url-safety-check.your-subdomain.workers.dev
```

### 8. Configure Frontend

Add the worker URL to your Vercel environment variables:

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add a new variable:
   - **Name**: `VITE_SAFETY_CHECK_WORKER_URL`
   - **Value**: Your Cloudflare Worker URL (e.g., `https://url-safety-check.your-subdomain.workers.dev`)
4. Redeploy your Vercel app

## Testing the Worker

You can test the worker using curl:

```bash
curl -X POST https://your-worker-url.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

Expected response for a safe URL:
```json
{
  "isSafe": true,
  "threatType": null
}
```

Expected response for an unsafe URL:
```json
{
  "isSafe": false,
  "threatType": "malicious"
}
```

## Worker Features

- **CORS Support**: Properly configured for cross-origin requests from Vercel
- **Error Handling**: Fails open (returns safe) if API is unavailable
- **URL Validation**: Validates URL format before checking
- **Threat Types**: Detects malware, social engineering, unwanted software, and potentially harmful applications

## Troubleshooting

### Worker returns "API configuration issue"

- Check that `GOOGLE_SAFE_BROWSING_API_KEY` is set correctly
- Verify your API key is valid and has the Safe Browsing API enabled
- Check your Google Cloud project quota

### CORS errors in browser

- Ensure the worker URL is correctly set in `VITE_SAFETY_CHECK_WORKER_URL`
- Check that the worker's CORS headers are being returned (use browser DevTools Network tab)

### Worker not responding

- Check Cloudflare dashboard for worker logs
- Verify the worker is deployed and active
- Test with curl to isolate frontend vs backend issues

## Cost Considerations

- Cloudflare Workers: Free tier includes 100,000 requests/day
- Google Safe Browsing API: Free tier includes 10,000 requests/day
- Monitor usage in both dashboards to avoid unexpected charges


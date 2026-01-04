# Troubleshooting Guide

## Issue: "Safety check service not configured"

If you're getting this error, follow these steps:

### Step 1: Verify the Secret is Set

Check if the secret exists:
```bash
npx wrangler secret list
```

You should see `GOOGLE_SAFE_BROWSING_API_KEY` in the list.

### Step 2: Set the Secret Again (if missing)

If it's not there, set it:
```bash
npx wrangler secret put GOOGLE_SAFE_BROWSING_API_KEY
```

When prompted, paste your API key: `AIzaSyB_Zac3DqTmHRG1P7_3vtuJL2cchn5udGM`

### Step 3: Redeploy the Worker

After setting the secret, you MUST redeploy:
```bash
npx wrangler deploy
```

### Step 4: Verify in Cloudflare Dashboard

1. Go to https://dash.cloudflare.com/
2. Navigate to Workers & Pages
3. Click on `url-safety-check`
4. Go to Settings → Variables
5. Check that `GOOGLE_SAFE_BROWSING_API_KEY` is listed under "Secrets"

### Step 5: Test Again

```bash
curl -k -X POST https://url-safety-check.yaacov-zur.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.saasaipartners.com"}'
```

## Common Issues

### Secret set but still not working
- **Solution**: Redeploy the worker after setting the secret
- Secrets are only available after deployment

### API Key Invalid
- Verify the key is correct in Google Cloud Console
- Make sure Safe Browsing API is enabled
- Check API quotas/limits

### Still getting errors
- Check Cloudflare Worker logs: `npx wrangler tail`
- Verify the API key works by testing directly with Google's API


# URL Safety Check Cloudflare Worker

A Cloudflare Worker that checks URLs against Google Safe Browsing API to detect malicious, socially engineered, or unsafe links.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Login to Cloudflare

```bash
npx wrangler login
```

### 3. Set Your Google Safe Browsing API Key

```bash
npx wrangler secret put GOOGLE_SAFE_BROWSING_API_KEY
```

When prompted, paste your Google Safe Browsing API key.

### 4. Deploy

```bash
npm run deploy
```

Or:

```bash
npx wrangler deploy
```

### 5. Get Your Worker URL

After deployment, you'll see your worker URL in the output. It will look like:
```
https://url-safety-check.your-subdomain.workers.dev
```

## Testing Locally

```bash
npm run dev
```

This will start a local development server. You can test it with:

```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

## API Usage

### Endpoint
`POST /`

### Request Body
```json
{
  "url": "https://example.com"
}
```

### Response (Safe URL)
```json
{
  "isSafe": true,
  "threatType": null
}
```

### Response (Unsafe URL)
```json
{
  "isSafe": false,
  "threatType": "malicious"
}
```

## Threat Types

The worker detects the following threat types:
- `malicious` - Malware detected
- `socially engineered` - Phishing or social engineering
- `unwanted software` - Potentially unwanted software
- `potentially harmful` - Potentially harmful application

## Environment Variables

- `GOOGLE_SAFE_BROWSING_API_KEY` - Your Google Safe Browsing API key (required)

## Getting a Google Safe Browsing API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Safe Browsing API"
4. Go to "Credentials" and create an API key
5. Restrict the API key to "Safe Browsing API" for security

## Frontend Integration

Add the worker URL to your frontend environment variables:

```env
VITE_SAFETY_CHECK_WORKER_URL=https://url-safety-check.your-subdomain.workers.dev
```

## Troubleshooting

### "API configuration issue" error
- Verify your API key is correct
- Check that Safe Browsing API is enabled in Google Cloud Console
- Verify your API quota hasn't been exceeded

### CORS errors
- The worker includes CORS headers by default
- Make sure you're using the correct worker URL
- Check browser console for specific CORS error messages

### Worker not responding
- Check Cloudflare dashboard for worker logs
- Verify the worker is deployed and active
- Test with curl to isolate frontend vs backend issues


# Testing Your Cloudflare Worker

Here are several ways to verify your URL Safety Check Worker is working correctly.

## Method 1: Test with curl (Quick Test)

This is the fastest way to test if the worker is deployed and responding.

### Windows PowerShell:
```powershell
curl -X POST https://url-safety-check.YOUR-SUBDOMAIN.workers.dev -H "Content-Type: application/json" -d '{\"url\": \"https://example.com\"}'
```

### Windows Command Prompt (CMD):
```cmd
curl -X POST https://url-safety-check.YOUR-SUBDOMAIN.workers.dev -H "Content-Type: application/json" -d "{\"url\": \"https://example.com\"}"
```

### If curl doesn't work, use PowerShell's Invoke-WebRequest:
```powershell
$body = @{url = "https://example.com"} | ConvertTo-Json
Invoke-WebRequest -Uri "https://url-safety-check.YOUR-SUBDOMAIN.workers.dev" -Method POST -Body $body -ContentType "application/json"
```

**Expected Response:**
```json
{
  "isSafe": true,
  "threatType": null
}
```

Replace `YOUR-SUBDOMAIN` with your actual Cloudflare subdomain (e.g., if your worker URL is `https://url-safety-check.abc123.workers.dev`, use `abc123`).

## Method 2: Test in Browser (Simple)

1. Open your browser
2. Go to your worker URL: `https://url-safety-check.YOUR-SUBDOMAIN.workers.dev`
3. You should see an error like "Method not allowed" or "405" - this is **normal and expected** because the worker only accepts POST requests
4. If you see this, it means the worker is deployed and running!

## Method 3: Check Worker Logs

View real-time logs from your worker:

```powershell
cd url-safety-check
npx wrangler tail
```

This will show you all requests and responses in real-time. Make a test request (using Method 1 or Method 4) and you'll see the logs appear.

Press `Ctrl+C` to stop watching logs.

## Method 4: Test in Your Application

### Step 1: Make sure the environment variable is set

**For local development:**
- Check that `.env.local` has: `VITE_SAFETY_CHECK_WORKER_URL=https://url-safety-check.YOUR-SUBDOMAIN.workers.dev`
- Restart your dev server: `npm run dev`

**For production (Vercel/Cloudflare Pages):**
- Verify the environment variable is set in your deployment platform
- Make sure you've redeployed after setting the variable

### Step 2: Test in the Application

1. Open your application in the browser
2. Open Developer Tools (Press `F12` or `Ctrl+Shift+I`)
3. Go to the **Console** tab
4. Try to create a new link in your application
5. You should see console logs like:

```
🔍 Safety Check Debug: { workerUrl: "https://url-safety-check...", url: "..." }
📤 Sending safety check request to: https://url-safety-check...
📥 Response status: 200 OK
✅ Safety check result: { isSafe: true, threatType: null }
```

### Step 3: Check Network Tab

1. In Developer Tools, go to the **Network** tab
2. Try creating a link
3. Look for a request to your worker URL
4. Check that:
   - Status is `200 OK`
   - Response contains `{"isSafe": true, ...}`

## Method 5: Test with a Known Safe URL

Test with a known safe URL:
```powershell
curl -X POST https://url-safety-check.YOUR-SUBDOMAIN.workers.dev -H "Content-Type: application/json" -d '{\"url\": \"https://www.google.com\"}'
```

## Method 6: Check Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages**
3. Find your `url-safety-check` worker
4. Click on it to see:
   - Deployment status
   - Request metrics
   - Logs
   - Configuration

## Common Issues and Solutions

### ❌ Error: "Worker not found" or 404
- **Solution**: Make sure the worker is deployed. Run `npx wrangler deploy` in the `url-safety-check` directory
- Check that you're using the correct URL (copy it from the deployment output)

### ❌ Error: "API configuration issue" or 500 error
- **Solution**: The Google Safe Browsing API key might be missing or incorrect
- Run `npx wrangler secret put GOOGLE_SAFE_BROWSING_API_KEY` to set it again
- Verify the API key is correct in Google Cloud Console

### ❌ CORS errors in browser console
- **Solution**: The worker includes CORS headers. If you still see CORS errors:
  - Verify you're using the correct worker URL
  - Check that the worker code includes CORS headers (it should)
  - Make sure you're testing from the correct origin

### ❌ No logs in browser console
- **Solution**: 
  - Check that `VITE_SAFETY_CHECK_WORKER_URL` is set correctly
  - Verify the environment variable is loaded (check console for the debug log)
  - Make sure you've restarted your dev server after updating `.env.local`

### ❌ "VITE_SAFETY_CHECK_WORKER_URL not configured" error
- **Solution**:
  - For local: Make sure `.env.local` exists and has the variable
  - For production: Check environment variables in Vercel/Cloudflare Pages
  - Redeploy after updating environment variables

## Quick Test Checklist

- [ ] Worker URL responds (even with 405 error in browser = good sign)
- [ ] curl/PowerShell request returns JSON with `isSafe: true`
- [ ] Browser console shows debug logs when creating a link
- [ ] Network tab shows successful request to worker (200 status)
- [ ] Worker logs (`wrangler tail`) show incoming requests
- [ ] Application creates links successfully without errors

## Need Help?

If the worker isn't working:
1. Check the worker logs: `npx wrangler tail`
2. Verify the API key is set: `npx wrangler secret list`
3. Check Cloudflare Dashboard for errors
4. Verify the worker URL is correct in your environment variables


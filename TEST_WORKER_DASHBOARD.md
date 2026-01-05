# How to Test Your Cloudflare Worker

After creating the worker in Cloudflare Dashboard, here are several ways to test if it's working:

## Method 1: Test in Browser (Quick Check)

1. Open your browser
2. Go to your worker URL: `https://url-safety-check.fancy-sky-7888.workers.dev`
   (Replace with your actual worker URL from Cloudflare Dashboard)

3. You should see an error like:
   - "Method not allowed" or "405 Error"
   - This is **normal and expected** - the worker only accepts POST requests
   - If you see this, it means the worker is deployed and running! ✅

## Method 2: Test with PowerShell (Recommended)

Open PowerShell and run:

```powershell
$body = @{url = "https://example.com"} | ConvertTo-Json
Invoke-WebRequest -Uri "https://url-safety-check.fancy-sky-7888.workers.dev" -Method POST -Body $body -ContentType "application/json"
```

Replace `fancy-sky-7888` with your actual subdomain.

**Expected Response:**
```
StatusCode        : 200
Content           : {"isSafe":true,"threatType":null}
```

To see just the JSON response:
```powershell
$body = @{url = "https://example.com"} | ConvertTo-Json
$response = Invoke-WebRequest -Uri "https://url-safety-check.fancy-sky-7888.workers.dev" -Method POST -Body $body -ContentType "application/json"
$response.Content
```

## Method 3: Test with curl (If you have curl)

```bash
curl -X POST https://url-safety-check.fancy-sky-7888.workers.dev \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"https://example.com\"}"
```

**Expected Response:**
```json
{"isSafe":true,"threatType":null}
```

## Method 4: Test in Cloudflare Dashboard (Built-in Testing)

1. Go to your worker in Cloudflare Dashboard
2. Click on the worker name (`url-safety-check`)
3. You might see a **"Test"** or **"Send test request"** button
4. Or use the **Logs** tab to see incoming requests

## Method 5: Test with Browser Developer Tools

1. Open your browser
2. Press `F12` to open Developer Tools
3. Go to the **Console** tab
4. Run this JavaScript:

```javascript
fetch('https://url-safety-check.fancy-sky-7888.workers.dev', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ url: 'https://example.com' })
})
  .then(response => response.json())
  .then(data => console.log('Result:', data))
  .catch(error => console.error('Error:', error));
```

**Expected Output:**
```
Result: {isSafe: true, threatType: null}
```

## Method 6: Check Worker Logs

1. Go to Cloudflare Dashboard
2. Click on your `url-safety-check` worker
3. Go to **Logs** tab (or **Real-time Logs**)
4. Make a test request (using Method 2 or 3)
5. You should see the request appear in the logs

## Method 7: Test in Your Application

1. Make sure `VITE_SAFETY_CHECK_WORKER_URL` is set in your `.env.local`:
   ```env
   VITE_SAFETY_CHECK_WORKER_URL=https://url-safety-check.fancy-sky-7888.workers.dev
   ```

2. Start your app:
   ```powershell
   npm run dev
   ```

3. Open browser console (F12 → Console)
4. Try creating a new link in your application
5. You should see logs like:
   ```
   🔍 Safety Check Debug: { workerUrl: "https://...", url: "..." }
   📤 Sending safety check request to: https://...
   📥 Response status: 200 OK
   ✅ Safety check result: { isSafe: true, threatType: null }
   ```

## Expected Responses

### ✅ Successful Response (Safe URL):
```json
{
  "isSafe": true,
  "threatType": null
}
```

### ✅ Successful Response (Unsafe URL - if testing with a known malicious URL):
```json
{
  "isSafe": false,
  "threatType": "malicious"
}
```

### ❌ Error Response (Missing API Key):
```json
{
  "isSafe": true,
  "threatType": null,
  "error": "Safety check service not configured"
}
```

### ❌ Error Response (Wrong Method):
```json
{
  "error": "Method not allowed. Use POST."
}
```

## Troubleshooting

### Getting 405 Error in Browser
- ✅ **This is normal!** The worker only accepts POST requests
- Use Method 2, 3, or 5 to test with POST

### Getting "Safety check service not configured" Error
- The `GOOGLE_SAFE_BROWSING_API_KEY` environment variable is not set
- Go to Worker Settings → Variables and Secrets
- Add the variable: `GOOGLE_SAFE_BROWSING_API_KEY`
- Value: `AIzaSyC115jFfH72O_zbZ1Z0ac_QfzhJurSzXLU`
- **Redeploy** the worker after adding the variable

### Getting CORS Errors
- The worker includes CORS headers, so this shouldn't happen
- Verify you're using the correct worker URL
- Check browser console for specific error messages

### Worker Not Responding
- Check Cloudflare Dashboard → Worker Logs for errors
- Verify the worker is deployed and active
- Make sure you're using the correct worker URL

## Quick Test Checklist

- [ ] Worker URL responds (even with 405 error = good sign)
- [ ] PowerShell/curl POST request returns JSON with `isSafe: true`
- [ ] Browser console shows successful request (Method 5)
- [ ] Worker logs show incoming requests (Method 6)
- [ ] Application creates links successfully (Method 7)
- [ ] No errors in browser console

## Get Your Worker URL

If you don't know your worker URL:

1. Go to Cloudflare Dashboard → Workers & Pages
2. Click on `url-safety-check`
3. The URL is shown at the top, like:
   ```
   https://url-safety-check.fancy-sky-7888.workers.dev
   ```

Copy this URL and use it in the tests above!


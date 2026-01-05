# Setup URL Safety Check Worker in Cloudflare Dashboard

This guide shows you how to create and configure the URL Safety Check Worker directly in the Cloudflare Dashboard, without using command line.

## Step 1: Create a New Worker

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Make sure you're in the correct account: **Hello@goodlink.ai's Account**
3. In the left sidebar, click **Workers & Pages**
4. Click **Create** → **Create Worker**
5. You'll see the Cloudflare Worker editor

## Step 2: Configure the Worker

1. **Worker Name**: Change it to `url-safety-check`
   - Click on the worker name at the top (might say "untitled-worker")
   - Type: `url-safety-check`
   - Click **Save**

2. **Remove the default code** and paste this code (copy from `cloudflare-worker.js` file in your project):

Copy the entire contents of the `cloudflare-worker.js` file from your project root directory and paste it into the Cloudflare Worker editor.

**OR** you can copy it directly from the file - it's located at: `C:\Users\User\Desktop\goodlink-prod\cloudflare-worker.js`

3. Click **Save and deploy**

## Step 3: Add Environment Variable (API Key)

1. After the worker is deployed, go to the worker settings:
   - Click on your `url-safety-check` worker in the list
   - Click **Settings** tab
   - Scroll down to **Variables and Secrets**

2. Under **Encrypted Variables**, click **Add variable**

3. Fill in:
   - **Variable name**: `GOOGLE_SAFE_BROWSING_API_KEY`
   - **Value**: `AIzaSyC115jFfH72O_zbZ1Z0ac_QfzhJurSzXLU`
   - Click **Encrypt** (it should encrypt automatically)
   - Click **Save**

4. **Important**: After adding the variable, you need to redeploy:
   - Go back to the worker (click **url-safety-check** in the list)
   - Click **Quick edit** or go to the **Triggers** tab
   - Click **Save and deploy** again (or the code will auto-save and you'll see a deploy button)

## Step 4: Get Your Worker URL

1. In your worker page, look at the top
2. You'll see the worker URL, something like:
   ```
   https://url-safety-check.fancy-sky-7888.workers.dev
   ```
3. **Copy this URL** - you'll need it for your application

## Step 5: Update Your Application

Update your `VITE_SAFETY_CHECK_WORKER_URL` environment variable:

### For Local Development:
Update `.env.local`:
```env
VITE_SAFETY_CHECK_WORKER_URL=https://url-safety-check.fancy-sky-7888.workers.dev
```

### For Production (Vercel/Cloudflare Pages):
1. Go to your deployment platform (Vercel or Cloudflare Pages)
2. Go to **Settings** → **Environment Variables**
3. Update or add:
   - **Name**: `VITE_SAFETY_CHECK_WORKER_URL`
   - **Value**: `https://url-safety-check.fancy-sky-7888.workers.dev` (use your actual URL)
4. Save and redeploy your application

## Step 6: Test the Worker

Test your worker using curl or PowerShell:

**PowerShell:**
```powershell
$body = @{url = "https://example.com"} | ConvertTo-Json
Invoke-WebRequest -Uri "https://url-safety-check.fancy-sky-7888.workers.dev" -Method POST -Body $body -ContentType "application/json"
```

**Bash/curl:**
```bash
curl -X POST https://url-safety-check.fancy-sky-7888.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

**Expected response:**
```json
{
  "isSafe": true,
  "threatType": null
}
```

## Summary Checklist

- [ ] Created worker in Cloudflare Dashboard
- [ ] Named it `url-safety-check`
- [ ] Pasted the worker code
- [ ] Saved and deployed the worker
- [ ] Added `GOOGLE_SAFE_BROWSING_API_KEY` environment variable
- [ ] Redeployed after adding the variable
- [ ] Copied the worker URL
- [ ] Updated `VITE_SAFETY_CHECK_WORKER_URL` in your application
- [ ] Tested the worker with curl/PowerShell
- [ ] Verified it works in your application

## Troubleshooting

### Worker URL not working
- Make sure you saved and deployed the worker
- Check that the worker is active in the dashboard
- Verify the worker name is correct

### API key errors
- Make sure the variable name is exactly: `GOOGLE_SAFE_BROWSING_API_KEY`
- Verify the API key value is correct
- Make sure you redeployed after adding the variable

### CORS errors
- The code includes CORS headers, so this should work
- Verify you're using the correct worker URL
- Check browser console for specific error messages


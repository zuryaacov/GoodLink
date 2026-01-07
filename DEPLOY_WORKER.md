# Deploy the URL Safety Check Worker

## Important: Two Different Deployments

You have **two separate things** to deploy:

1. **Main Application (`goodlink`)** - This is your React app (already deployed ✅)

   - URL: `https://goodlink.fancy-sky-7888.workers.dev`
   - This is what you just deployed

2. **URL Safety Check Worker (`url-safety-check`)** - This is a separate worker for checking URLs
   - Needs to be deployed separately
   - This is what we need to deploy now

## Deploy the URL Safety Check Worker

### Step 1: Navigate to the Worker Directory

Open a terminal/command prompt and navigate to the worker directory:

```powershell
cd C:\Users\User\Desktop\goodlink-prod\url-safety-check
```

### Step 2: Login to Cloudflare (if not already logged in)

```powershell
npx wrangler login
```

Make sure you're logged into the **same Cloudflare account** (the one you just deployed `goodlink` to).

### Step 3: Set Your Google Safe Browsing API Key

```powershell
npx wrangler secret put GOOGLE_SAFE_BROWSING_API_KEY
```

When prompted, paste:

```
AIzaSyC115jFfH72O_zbZ1Z0ac_QfzhJurSzXLU
```

### Step 4: Deploy the Worker

```powershell
npx wrangler deploy
```

### Step 5: Copy the Worker URL

After deployment, you'll see output like:

```
✨  Successfully published your Worker to the following routes:
  - https://url-safety-check.YOUR-SUBDOMAIN.workers.dev
```

**Copy this URL** - you'll need it in the next step!

### Step 6: Update Your Application Configuration

Update the `VITE_SAFETY_CHECK_WORKER_URL` environment variable with the new worker URL:

**For local development:**

- Update `.env.local`:
  ```
  VITE_SAFETY_CHECK_WORKER_URL=https://url-safety-check.YOUR-SUBDOMAIN.workers.dev
  ```

**For production (if using Vercel/Cloudflare Pages):**

- Go to your deployment platform settings
- Update `VITE_SAFETY_CHECK_WORKER_URL` with the new worker URL
- Redeploy your application

## Summary

- ✅ **Main app (`goodlink`)**: Already deployed at `https://goodlink.fancy-sky-7888.workers.dev`
- ⏳ **URL Safety Check Worker (`url-safety-check`)**: Needs to be deployed separately (follow steps above)

Both workers will appear in your Cloudflare Dashboard under **Workers & Pages**, but they serve different purposes:

- `goodlink` = Your main React application
- `url-safety-check` = Service that checks URLs for safety

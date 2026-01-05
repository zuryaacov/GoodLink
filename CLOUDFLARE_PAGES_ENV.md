# Add Environment Variable to Cloudflare Pages

Since you're deploying to Cloudflare Pages, you need to add the environment variable in Cloudflare Pages settings.

## Step 1: Get Your Worker URL

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages**
3. Click on your `url-safety-check` worker
4. Copy the URL shown at the top (e.g., `https://url-safety-check.fancy-sky-7888.workers.dev`)

**If you don't have the worker yet:**
- Create it first (see `CLOUDFLARE_DASHBOARD_SETUP.md`)
- Or deploy it using command line

## Step 2: Add Environment Variable in Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Pages** (in the left sidebar)
3. Click on your project (probably named `goodlink` or similar)
4. Go to **Settings** tab (at the top)
5. Scroll down to **Environment Variables** section
6. Click **Add variable** button

7. Fill in the details:
   - **Variable name**: `VITE_SAFETY_CHECK_WORKER_URL`
   - **Value**: `https://url-safety-check.fancy-sky-7888.workers.dev` (your actual worker URL)
   - **Environment**: Select **All environments** (Production, Preview, Development)
   
8. Click **Save**

## Step 3: Redeploy Your Application

**IMPORTANT:** After adding the environment variable, you MUST redeploy:

1. Go to **Deployments** tab
2. Find your latest deployment
3. Click the **three dots (⋯)** menu next to it
4. Select **Retry deployment** or **Redeploy**

Or if you're deploying via Git:
- Make a small change and push to trigger a new deployment
- Or manually trigger a redeploy from the dashboard

## Step 4: Verify It's Working

After redeploying:

1. Open your deployed application
2. Open Browser Developer Console (F12 → Console)
3. Try creating a new link
4. You should see logs like:
   ```
   🔍 Safety Check Debug: { workerUrl: "https://...", url: "..." }
   📤 Sending safety check request to: https://...
   📥 Response status: 200 OK
   ✅ Safety check result: { isSafe: true, threatType: null }
   ```

The error `VITE_SAFETY_CHECK_WORKER_URL not configured` should be gone!

## Alternative: Set During Build

If you're using Cloudflare Pages with a build process, you can also set environment variables that are available during the build. Make sure to select **All environments** so it's available in production builds.

## Summary

Since you're using Cloudflare Pages (not local development):
- ✅ Add `VITE_SAFETY_CHECK_WORKER_URL` in Cloudflare Pages → Settings → Environment Variables
- ✅ Redeploy your application after adding the variable
- ❌ Don't need `.env.local` (that's only for local development)

The variable needs to be set in Cloudflare Pages settings for it to be available in your deployed application!


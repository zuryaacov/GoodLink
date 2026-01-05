# Cloudflare Worker Migration Guide

This guide will help you deploy the URL Safety Check Worker to your new Cloudflare account.

## Step 1: Login to Your New Cloudflare Account

1. Open a terminal in the `url-safety-check` directory:
   ```bash
   cd url-safety-check
   ```

2. Login to Cloudflare with Wrangler:
   ```bash
   npx wrangler login
   ```
   
   This will open your browser. Make sure you're logged into your **new Cloudflare account** (the same one you're using for your main deployment).

## Step 2: Set Your Google Safe Browsing API Key

You need to add your Google Safe Browsing API key as a secret to the worker:

```bash
npx wrangler secret put GOOGLE_SAFE_BROWSING_API_KEY
```

When prompted, paste your Google Safe Browsing API key and press Enter.

**If you don't have a Google Safe Browsing API key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable "Safe Browsing API"
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy the key and use it in the command above

## Step 3: Deploy the Worker

Deploy the worker to your new Cloudflare account:

```bash
npx wrangler deploy
```

After deployment, Wrangler will output your new worker URL. It will look like:
```
https://url-safety-check.YOUR-SUBDOMAIN.workers.dev
```

**📝 Copy this URL** - you'll need it in the next step!

## Step 4: Update Environment Variables

After deploying, you need to update the worker URL in your application:

### For Local Development

Update your `.env.local` file:
```env
VITE_SAFETY_CHECK_WORKER_URL=https://url-safety-check.YOUR-SUBDOMAIN.workers.dev
```

Replace `YOUR-SUBDOMAIN` with your actual subdomain from Step 3.

### For Vercel Deployment

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Find `VITE_SAFETY_CHECK_WORKER_URL` and update it with your new worker URL
5. Or add it if it doesn't exist:
   - **Name**: `VITE_SAFETY_CHECK_WORKER_URL`
   - **Value**: `https://url-safety-check.YOUR-SUBDOMAIN.workers.dev`
   - **Environment**: All (Production, Preview, Development)
6. Click **Save**
7. **Important**: Redeploy your application after updating the variable

### For Cloudflare Pages Deployment

1. Go to Cloudflare Dashboard → Pages
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Update or add `VITE_SAFETY_CHECK_WORKER_URL` with your new worker URL
5. Save and redeploy

## Step 5: Test the Worker

Test your new worker with curl:

```bash
curl -X POST https://url-safety-check.YOUR-SUBDOMAIN.workers.dev \
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

## Step 6: Verify in Your Application

1. Start your development server (if testing locally):
   ```bash
   npm run dev
   ```

2. Open your application in the browser

3. Open the browser console (F12 → Console)

4. Try creating a new link - you should see:
   ```
   🔍 Safety Check Debug: { workerUrl: "https://url-safety-check...", url: "..." }
   📤 Sending safety check request to: https://url-safety-check...
   📥 Response status: 200 OK
   ✅ Safety check result: { isSafe: true, threatType: null }
   ```

## Troubleshooting

### Error: "Account ID is required"
- Make sure you're logged into the correct Cloudflare account
- Run `npx wrangler login` again and select the correct account

### Error: "permission denied"
- Make sure you're using the correct Cloudflare account
- Check that you have permission to create workers in that account

### Worker URL not working
- Verify the worker is deployed in Cloudflare Dashboard → Workers & Pages
- Check the worker logs: `npx wrangler tail`
- Make sure the Google Safe Browsing API key secret is set correctly

### Old worker URL still being used
- Clear your browser cache
- Make sure you updated the environment variable in your deployment platform
- Redeploy your application after updating the environment variable

## Summary Checklist

- [ ] Logged into new Cloudflare account with `npx wrangler login`
- [ ] Set Google Safe Browsing API key secret
- [ ] Deployed worker with `npx wrangler deploy`
- [ ] Copied new worker URL
- [ ] Updated `.env.local` (for local development)
- [ ] Updated environment variable in Vercel/Cloudflare Pages
- [ ] Redeployed application (if using Vercel/Cloudflare Pages)
- [ ] Tested worker with curl
- [ ] Verified in application browser console


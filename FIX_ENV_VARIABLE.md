# Fix: VITE_SAFETY_CHECK_WORKER_URL not configured

You're seeing this error because the environment variable is not set. Here's how to fix it:

## Step 1: Get Your Worker URL

First, you need your Cloudflare Worker URL:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages**
3. Click on your `url-safety-check` worker
4. Copy the URL shown at the top (e.g., `https://url-safety-check.fancy-sky-7888.workers.dev`)

## Step 2: Set Up for Local Development

### Create/Update `.env.local` file

1. In your project root directory (`C:\Users\User\Desktop\goodlink-prod`), create or edit `.env.local`

2. Add this line (replace with your actual worker URL):

```env
VITE_SAFETY_CHECK_WORKER_URL=https://url-safety-check.fancy-sky-7888.workers.dev
```

**Important:** Replace `fancy-sky-7888` with your actual subdomain!

3. Save the file

4. **Restart your development server:**
   - Stop your current `npm run dev` (Ctrl+C)
   - Start it again: `npm run dev`

## Step 3: Set Up for Production (Vercel/Cloudflare Pages)

### For Vercel:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Fill in:
   - **Name**: `VITE_SAFETY_CHECK_WORKER_URL`
   - **Value**: `https://url-safety-check.fancy-sky-7888.workers.dev` (your actual worker URL)
   - **Environment**: Select all (Production, Preview, Development)
6. Click **Save**
7. **Redeploy your application** after adding the variable

### For Cloudflare Pages:

1. Go to Cloudflare Dashboard → **Pages**
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add variable**
5. Fill in:
   - **Variable name**: `VITE_SAFETY_CHECK_WORKER_URL`
   - **Value**: `https://url-safety-check.fancy-sky-7888.workers.dev` (your actual worker URL)
   - **Environment**: All environments
6. Click **Save**
7. **Redeploy** your application

## Step 4: Verify It's Working

After setting the variable and restarting your dev server:

1. Open your application in the browser
2. Open Developer Console (F12 → Console tab)
3. Try creating a new link
4. You should see logs like:
   ```
   🔍 Safety Check Debug: { workerUrl: "https://...", url: "..." }
   📤 Sending safety check request to: https://...
   📥 Response status: 200 OK
   ✅ Safety check result: { isSafe: true, threatType: null }
   ```

## Quick Checklist

- [ ] Got worker URL from Cloudflare Dashboard
- [ ] Created/updated `.env.local` file with the variable
- [ ] Restarted development server (npm run dev)
- [ ] Verified in browser console (no more error)
- [ ] Set variable in deployment platform (Vercel/Cloudflare Pages) if deploying
- [ ] Redeployed application after setting variable (if deploying)

## Troubleshooting

### Still seeing the error after setting `.env.local`?
- Make sure you **restarted** the dev server (`npm run dev`)
- Check that the file is named exactly `.env.local` (not `.env` or `.env.local.txt`)
- Verify the file is in the **root directory** of your project
- Check for typos in the variable name: `VITE_SAFETY_CHECK_WORKER_URL`

### File location:
The `.env.local` file should be in:
```
C:\Users\User\Desktop\goodlink-prod\.env.local
```

### File format:
```env
VITE_SAFETY_CHECK_WORKER_URL=https://url-safety-check.fancy-sky-7888.workers.dev
```

No quotes needed, no spaces around the `=` sign.

### Don't have a worker URL yet?
If you haven't created the worker yet, you need to:
1. Create the worker in Cloudflare Dashboard first
2. Get the worker URL
3. Then set this environment variable

See `CLOUDFLARE_DASHBOARD_SETUP.md` for instructions on creating the worker.


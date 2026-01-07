# Fix: VITE_SAFETY_CHECK_WORKER_URL not configured

This error means the environment variable is not set. Here's how to fix it:

## Step 1: Find Your Cloudflare Worker URL

You need to get your `url-safety-check` worker URL. Choose one method:

### Method A: From Cloudflare Dashboard (Easiest)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click **Workers & Pages** in the left sidebar
3. Click on your `url-safety-check` worker
4. At the top of the page, you'll see the worker URL:
   - Example: `https://url-safety-check.fancy-sky-7888.workers.dev`
5. **Copy this URL** - you'll need it in the next step

### Method B: From Command Line

```powershell
cd url-safety-check
npx wrangler deployments list
```

The worker URL format is: `https://url-safety-check.YOUR-SUBDOMAIN.workers.dev`

## Step 2: Set Up for Local Development

Create a `.env.local` file in your project root:

1. **Create the file** `.env.local` in the root directory (same level as `package.json`)

2. **Add this line** (replace with your actual worker URL):

```env
VITE_SAFETY_CHECK_WORKER_URL=https://url-safety-check.YOUR-SUBDOMAIN.workers.dev
```

**Example:**
```env
VITE_SAFETY_CHECK_WORKER_URL=https://url-safety-check.fancy-sky-7888.workers.dev
```

3. **Save the file**

4. **Restart your development server:**
   - Stop your current server (Ctrl+C)
   - Run `npm run dev` again

## Step 3: Set Up for Vercel (Production)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Fill in:
   - **Name**: `VITE_SAFETY_CHECK_WORKER_URL`
   - **Value**: Your Cloudflare Worker URL (e.g., `https://url-safety-check.fancy-sky-7888.workers.dev`)
   - **Environment**: Select all (Production, Preview, Development)
6. Click **Save**
7. **Important:** Redeploy your application after adding the variable:
   - Go to **Deployments**
   - Click the three dots (⋯) next to the latest deployment
   - Click **Redeploy**

## Step 4: Verify It's Working

1. **Open your browser console** (F12 → Console)
2. **Try creating a link** in your app
3. **Look for these messages:**
   ```
   🔍 Safety Check Debug: { workerUrl: "https://...", url: "..." }
   📤 Sending safety check request to: https://...
   📥 Response status: 200 OK
   ✅ Safety check result: { isSafe: true, threatType: null }
   ```

If you see these messages, it's working! ✅

## Troubleshooting

### Still seeing the error?

1. **Check the file name:** Must be exactly `.env.local` (not `.env` or `.env.local.txt`)
2. **Check the variable name:** Must be exactly `VITE_SAFETY_CHECK_WORKER_URL`
3. **Restart the dev server:** Environment variables are loaded when Vite starts
4. **Check for typos:** Make sure the URL is correct and starts with `https://`

### Worker URL not working?

Test your worker directly:
```powershell
$body = @{url = "https://example.com"} | ConvertTo-Json
Invoke-WebRequest -Uri "https://url-safety-check.YOUR-SUBDOMAIN.workers.dev" -Method POST -Body $body -ContentType "application/json"
```

If this fails, your worker might not be deployed. See `url-safety-check/README.md` for deployment instructions.

### File not found?

Make sure `.env.local` is in the **root directory** (same folder as `package.json`), not in `src/` or any subfolder.


# Add Worker URL to .env.local

Your `.env.local` file exists but is missing the `VITE_SAFETY_CHECK_WORKER_URL` variable.

## Step 1: Get Your Worker URL

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages**
3. Click on your `url-safety-check` worker
4. Copy the URL shown at the top (e.g., `https://url-safety-check.fancy-sky-7888.workers.dev`)

**If you don't have a worker yet:**
- Create it first using the Cloudflare Dashboard (see `CLOUDFLARE_DASHBOARD_SETUP.md`)
- Or deploy it using command line (see `DEPLOY_WORKER.md`)

## Step 2: Add the Variable to .env.local

Open your `.env.local` file and add this line:

```env
VITE_SUPABASE_URL=https://magnblpbhyxicrqpmrjw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hZ25ibHBiaHl4aWNycXBtcmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTU4NTAsImV4cCI6MjA4MzE5MTg1MH0.jTMFFUqlQ9jXUxIEYoXL2fHsmhfkdYw5A7SampQmbOo
VITE_SAFETY_CHECK_WORKER_URL=https://url-safety-check.fancy-sky-7888.workers.dev
```

**Replace `fancy-sky-7888` with your actual worker subdomain!**

## Step 3: Save the File

Save `.env.local` after adding the variable.

## Step 4: Restart Your Dev Server

**IMPORTANT:** You MUST restart your development server for the change to take effect:

1. Stop your current server (press `Ctrl+C` in the terminal running `npm run dev`)
2. Start it again:
   ```powershell
   npm run dev
   ```

## Step 5: Verify It's Working

1. Open your application in the browser
2. Open Developer Console (F12 → Console tab)
3. Try creating a new link
4. You should now see:
   ```
   🔍 Safety Check Debug: { workerUrl: "https://...", url: "..." }
   📤 Sending safety check request to: https://...
   📥 Response status: 200 OK
   ✅ Safety check result: { isSafe: true, threatType: null }
   ```

The error `VITE_SAFETY_CHECK_WORKER_URL not configured` should be gone!

## File Location

Your `.env.local` file is located at:
```
C:\Users\User\Desktop\goodlink-prod\.env.local
```

## Complete .env.local Example

Your file should look like this (replace worker URL with your actual one):

```env
VITE_SUPABASE_URL=https://magnblpbhyxicrqpmrjw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hZ25ibHBiaHl4aWNycXBtcmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTU4NTAsImV4cCI6MjA4MzE5MTg1MH0.jTMFFUqlQ9jXUxIEYoXL2fHsmhfkdYw5A7SampQmbOo
VITE_SAFETY_CHECK_WORKER_URL=https://url-safety-check.fancy-sky-7888.workers.dev
```

**Notes:**
- No quotes around the values
- No spaces around the `=` sign
- One variable per line
- Replace `fancy-sky-7888` with your actual worker subdomain


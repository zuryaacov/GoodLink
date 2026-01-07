# Switch to Cloudflare Pages - Complete Guide

## Why Switch?

Your React SPA is getting 404 errors on page reload because **Cloudflare Workers doesn't handle SPA routing well**. **Cloudflare Pages** is designed for this and handles it automatically.

## Step-by-Step Migration

### 1. Create `public/_redirects` File

✅ **Done!** I've created `public/_redirects` with:
```
/*    /index.html   200
```

This tells Cloudflare Pages to serve `index.html` for all routes, allowing React Router to handle routing.

### 2. Set Up Cloudflare Pages

1. **Go to Cloudflare Dashboard**: https://dash.cloudflare.com
2. **Navigate to**: Workers & Pages → **Pages**
3. **Click**: "Create a project"
4. **Choose**: "Connect to Git"
5. **Select**: GitHub
6. **Repository**: `zuryaacov/GoodLink`
7. **Branch**: `main` (or your default branch)

### 3. Configure Build Settings

- **Framework preset**: `Vite`
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/` (leave empty)

### 4. Add Environment Variables

Go to **Settings** → **Environment Variables** and add:

**Production:**
- `VITE_SUPABASE_URL` = `https://magnblpbhyxicrqpmrjw.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hZ25ibHBiaHl4aWNycXBtcmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTU4NTAsImV4cCI6MjA4MzE5MTg1MH0.jTMFFUqlQ9jXUxIEYoXL2fHsmhfkdYw5A7SampQmbOo`
- `VITE_SAFETY_CHECK_WORKER_URL` = `https://url-safety-check.fancy-sky-7888.workers.dev`

**Also add to Preview and Development** (select all environments)

### 5. Custom Domain (Optional)

- Go to **Custom domains**
- Add: `www.goodlink.ai`
- Cloudflare will automatically configure DNS

### 6. Deploy

Click **"Save and Deploy"** - Cloudflare Pages will:
1. Clone your repo
2. Run `npm install`
3. Run `npm run build` with your environment variables
4. Deploy to `*.pages.dev` domain
5. Your `_redirects` file will work automatically!

### 7. Test

After deployment:
- Visit your Pages URL: `https://your-project.pages.dev`
- Try navigating to `/dashboard/links`
- **Reload the page** - it should work! ✅

## What Happens to Your Worker?

You can keep your Worker deployment as a backup, or delete it after Pages is working. The Worker won't interfere with Pages.

## Benefits of Pages

✅ **SPA routing works automatically** - no worker script needed  
✅ **Environment variables during build** - Vite variables work perfectly  
✅ **Automatic deployments** - every Git push triggers a deploy  
✅ **Preview deployments** - test PRs before merging  
✅ **Better performance** - optimized for static sites  
✅ **Free SSL** - automatic HTTPS  
✅ **Global CDN** - fast everywhere  

## Summary

✅ Created `public/_redirects` file  
✅ Removed worker script (not needed with Pages)  
⏳ Next: Set up Cloudflare Pages in dashboard  
⏳ Add environment variables  
⏳ Deploy!  

The `_redirects` file will be copied to `dist/` during build and Cloudflare Pages will use it automatically!


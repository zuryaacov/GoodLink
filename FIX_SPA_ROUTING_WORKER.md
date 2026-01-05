# Fix: SPA Routing for Cloudflare Workers (Static Assets)

Since you're using Cloudflare Workers with static assets (not Cloudflare Pages), the `_redirects` file won't work. We need to add a worker script to handle routing.

## The Problem

Cloudflare Workers with static assets don't automatically handle SPA routing. When you reload `/dashboard/links`, it tries to find a file that doesn't exist.

## The Solution: Add a Worker Script

We need to create a worker that serves `index.html` for all routes that don't match actual files.

### Option 1: Use Cloudflare Pages (Recommended - Easier)

**Switch to Cloudflare Pages instead of Workers for static assets:**

1. Go to Cloudflare Dashboard → **Pages**
2. Create a new project or connect your Git repository
3. Configure:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/`
4. The `_redirects` file will work with Cloudflare Pages

### Option 2: Add Worker Script (For Workers with Static Assets)

If you want to keep using Workers, you need to add a worker script that handles routing.

Create a file: `functions/_middleware.js` (for Pages Functions) OR modify your worker configuration.

Actually, for Workers with static assets only, you need to use **Cloudflare Pages Functions** or switch to Cloudflare Pages.

## Recommended: Switch to Cloudflare Pages

Since you're deploying a React SPA, **Cloudflare Pages** is the better choice:

✅ Built-in SPA routing support  
✅ Automatic `_redirects` file handling  
✅ Better for static sites  
✅ Free SSL and CDN  
✅ Git integration  

### Steps to Switch:

1. **Don't delete your current Worker deployment** (you can keep both)

2. **Create a Cloudflare Pages project:**
   - Go to Cloudflare Dashboard → **Pages**
   - Click **Create a project**
   - Connect your Git repository (GitHub/GitLab/Bitbucket)
   - Or upload the `dist` folder directly

3. **Configure build settings:**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`

4. **Add environment variables** (in Pages settings):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SAFETY_CHECK_WORKER_URL`

5. **The `_redirects` file will work automatically!**

## Alternative: Use a Worker with Routing Logic

If you must use Workers, you'd need to create a worker script that:
1. Checks if the requested path exists as a file
2. If not, serves `index.html`
3. But this is more complex

**This is why Cloudflare Pages is recommended for SPAs.**

## Quick Fix for Now

Try this in Cloudflare Dashboard:

1. Go to your Worker settings
2. Look for **Routes** or **Triggers**
3. Add a catch-all route: `*goodlink.ai/*` → serve from worker
4. The worker needs logic to handle routing

But honestly, **switch to Cloudflare Pages** - it's much easier for React SPAs!


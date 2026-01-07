# Vercel Deployment Guide

This guide explains how to deploy your GoodLink application to Vercel while keeping the URL Safety Check Worker on Cloudflare.

## Architecture Overview

- **Main Application**: Deployed on Vercel
- **URL Safety Check Worker**: Remains on Cloudflare Workers (separate deployment)

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. The URL Safety Check Worker already deployed on Cloudflare
   - Worker URL: `https://url-safety-check.YOUR-SUBDOMAIN.workers.dev`
   - See `url-safety-check/README.md` for worker deployment instructions

## Step 1: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Connect Your Repository**

   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click **"Add New..."** → **"Project"**
   - Import your Git repository (GitHub, GitLab, or Bitbucket)

2. **Configure Project Settings**

   - **Framework Preset**: Vercel will auto-detect Vite
   - **Root Directory**: Leave as default (`.`)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

3. **Add Environment Variables**

   - Click **"Environment Variables"** section
   - Add the following variable:
     - **Name**: `VITE_SAFETY_CHECK_WORKER_URL`
     - **Value**: `https://url-safety-check.YOUR-SUBDOMAIN.workers.dev`
       (Replace with your actual Cloudflare Worker URL)
   - Select **All environments** (Production, Preview, Development)
   - Click **"Save"**

4. **Deploy**
   - Click **"Deploy"**
   - Vercel will build and deploy your application
   - You'll get a deployment URL like: `https://your-project.vercel.app`

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**

   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**

   ```bash
   vercel login
   ```

3. **Deploy**

   ```bash
   vercel
   ```

   Follow the prompts:

   - Link to existing project or create new
   - Confirm settings
   - Add environment variables when prompted

4. **Set Environment Variables**

   ```bash
   vercel env add VITE_SAFETY_CHECK_WORKER_URL
   ```

   Enter your Cloudflare Worker URL when prompted.

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Step 2: Verify Deployment

1. **Check SPA Routing**

   - Visit your Vercel deployment URL
   - Navigate to different routes (e.g., `/dashboard/links`)
   - Refresh the page - it should work without 404 errors
   - The `vercel.json` file handles SPA routing automatically

2. **Test URL Safety Check**
   - Go to your dashboard
   - Try creating a new link
   - The URL safety check should work using the Cloudflare Worker

## Step 3: Custom Domain (Optional)

1. **Add Custom Domain in Vercel**

   - Go to your project settings
   - Click **"Domains"**
   - Add your custom domain
   - Follow DNS configuration instructions

2. **Update Environment Variables**
   - If your Cloudflare Worker needs to allow your new domain, update CORS settings in the worker

## Environment Variables

### Required for Production

- `VITE_SAFETY_CHECK_WORKER_URL`: Your Cloudflare Worker URL
  - Example: `https://url-safety-check.fancy-sky-7888.workers.dev`

### Optional (if using Supabase)

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## File Structure

```
goodlink-p/
├── vercel.json              # Vercel configuration (SPA routing)
├── package.json            # Dependencies and build scripts
├── vite.config.js          # Vite configuration
├── src/                    # Source code
├── dist/                   # Build output (generated)
└── url-safety-check/       # Cloudflare Worker (separate deployment)
    ├── wrangler.toml       # Cloudflare Worker config
    └── src/index.js        # Worker code
```

## Troubleshooting

### SPA Routing Issues

If you get 404 errors on page refresh:

- Verify `vercel.json` exists and has the correct rewrite rules
- Check that the build output includes `index.html` in the `dist` folder

### Environment Variables Not Working

- Make sure environment variables are set in Vercel dashboard
- Redeploy after adding/changing environment variables
- Variables starting with `VITE_` are exposed to the client-side code

### Worker Connection Issues

- Verify the Cloudflare Worker URL is correct
- Check that the worker is deployed and accessible
- Test the worker directly: `curl -X POST https://your-worker-url.workers.dev -H "Content-Type: application/json" -d '{"url":"https://example.com"}'`

## Continuous Deployment

Vercel automatically deploys when you push to your connected Git repository:

- **Production**: Deploys from your main branch
- **Preview**: Creates preview deployments for pull requests

## Notes

- The `url-safety-check` Cloudflare Worker is deployed separately and remains on Cloudflare
- The main application is now hosted on Vercel
- Both services work together: Vercel app calls Cloudflare Worker for URL safety checks

# Cloudflare Deployment Guide - Environment Variables

## The Issue

When deploying a Vite React app to Cloudflare with static assets only, you cannot add environment variables at runtime. However, Vite embeds `VITE_` prefixed environment variables **at build time** into your JavaScript bundle.

## Solution: Set Environment Variables During Build

You have two options:

### Option 1: Use Cloudflare Pages (Recommended)

Cloudflare Pages supports environment variables that are available during the build process:

1. **Go to Cloudflare Dashboard** → **Pages**
2. **Create a new project** or select your existing project
3. **Connect your Git repository** (GitHub/GitLab/Bitbucket)
4. **Configure build settings:**
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (or your project root)

5. **Add Environment Variables:**
   - Go to **Settings** → **Environment Variables**
   - Add:
     - `VITE_SUPABASE_URL` = `https://magnblpbhyxicrqpmrjw.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hZ25ibHBiaHl4aWNycXBtcmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTU4NTAsImV4cCI6MjA4MzE5MTg1MH0.jTMFFUqlQ9jXUxIEYoXL2fHsmhfkdYw5A7SampQmbOo`
     - `VITE_SAFETY_CHECK_WORKER_URL` = (your worker URL if needed)
   - Select **All environments** (Production, Preview, Development)

6. **Save and deploy** - Cloudflare Pages will automatically rebuild with the environment variables

### Option 2: Build Locally and Deploy (Alternative)

If you prefer to build locally and deploy the static files:

1. **Set environment variables in your terminal** (before building):

   **Windows PowerShell:**
   ```powershell
   $env:VITE_SUPABASE_URL="https://magnblpbhyxicrqpmrjw.supabase.co"
   $env:VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hZ25ibHBiaHl4aWNycXBtcmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTU4NTAsImV4cCI6MjA4MzE5MTg1MH0.jTMFFUqlQ9jXUxIEYoXL2fHsmhfkdYw5A7SampQmbOo"
   npm run build
   ```

   **Windows CMD:**
   ```cmd
   set VITE_SUPABASE_URL=https://magnblpbhyxicrqpmrjw.supabase.co
   set VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hZ25ibHBiaHl4aWNycXBtcmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTU4NTAsImV4cCI6MjA4MzE5MTg1MH0.jTMFFUqlQ9jXUxIEYoXL2fHsmhfkdYw5A7SampQmbOo
   npm run build
   ```

   **Linux/Mac:**
   ```bash
   export VITE_SUPABASE_URL=https://magnblpbhyxicrqpmrjw.supabase.co
   export VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hZ25ibHBiaHl4aWNycXBtcmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTU4NTAsImV4cCI6MjA4MzE5MTg1MH0.jTMFFUqlQ9jXUxIEYoXL2fHsmhfkdYw5A7SampQmbOo
   npm run build
   ```

2. **Deploy the built files:**
   ```bash
   npx wrangler deploy
   ```

## Why This Happens

- **Vite** embeds `VITE_*` environment variables into your JavaScript bundle during the build process
- **Static assets** don't have access to runtime environment variables
- The variables become part of your compiled code, so they need to be available **when you run `npm run build`**

## Recommended Approach

**Use Cloudflare Pages** - it's designed for static site hosting and handles environment variables during the build process automatically. It also provides:
- Automatic deployments from Git
- Preview deployments for pull requests
- Better integration with environment variables
- Free SSL and CDN

## Verification

After deployment, check your browser's developer console (F12) and look for:
- No errors about missing Supabase credentials
- Your app should connect to Supabase successfully

If you see "Supabase credentials missing", the environment variables weren't embedded during the build. Make sure they're set before running `npm run build`.


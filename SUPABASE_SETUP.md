# Supabase Account Migration Guide

This guide will help you switch to a new Supabase account and set up your database tables.

## What You Need

To migrate to a new Supabase account, you'll need:

1. **Supabase Project URL** - Found in: Supabase Dashboard → Settings → API → Project URL
   - Format: `https://xxxxxxxxxxxxx.supabase.co`

2. **Supabase Anon Key** - Found in: Supabase Dashboard → Settings → API → Project API keys → `anon` `public`
   - Format: Starts with `eyJ...` (a long JWT token)

## Step 1: Get Your New Supabase Credentials

1. Go to your new Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys" → `anon` `public`)

## Step 2: Set Up Database Tables

You need to create the `links` table in your new Supabase project.

### Option A: Clean Setup (Recommended for new projects)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the contents of `supabase-migrations-clean.sql` and paste it into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)

⚠️ **Note**: This will create a fresh `links` table. If you already have data, use Option B instead.

### Option B: Safe Migration (If you have existing data)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the contents of `supabase-migrations-fix.sql` and paste it into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)

This script will safely add missing columns without deleting existing data.

### Verify Tables Were Created

After running the migration:

1. Go to **Table Editor** in Supabase
2. You should see a `links` table with these columns:
   - `id` (UUID)
   - `user_id` (UUID)
   - `name` (TEXT)
   - `target_url` (TEXT)
   - `domain` (TEXT)
   - `slug` (TEXT)
   - `short_url` (TEXT)
   - `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` (TEXT)
   - `parameter_pass_through` (BOOLEAN)
   - `pixels` (JSONB)
   - `server_side_tracking` (BOOLEAN)
   - `custom_script` (TEXT)
   - `fraud_shield`, `bot_action` (TEXT)
   - `geo_rules` (JSONB)
   - `created_at`, `updated_at` (TIMESTAMPTZ)

## Step 3: Update Environment Variables

### For Local Development

1. Create or update `.env.local` in your project root:
   ```env
   VITE_SUPABASE_URL=https://your-new-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-new-anon-key-here
   ```

2. Restart your development server:
   ```bash
   npm run dev
   ```

### For Vercel Deployment (if using Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Update or add these variables:
   - **Name**: `VITE_SUPABASE_URL`
     - **Value**: Your new Supabase Project URL
     - **Environment**: All (Production, Preview, Development)
   
   - **Name**: `VITE_SUPABASE_ANON_KEY`
     - **Value**: Your new Supabase Anon Key
     - **Environment**: All (Production, Preview, Development)
5. Click **Save**
6. **Important**: Redeploy your application after updating variables:
   - Go to **Deployments**
   - Click the three dots (⋯) next to your latest deployment
   - Select **Redeploy**

### For Cloudflare Pages (if using Cloudflare)

If you're deploying to Cloudflare Pages:

1. Go to Cloudflare Dashboard → Pages
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add or update:
   - `VITE_SUPABASE_URL` = Your new Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = Your new Supabase Anon Key
5. Save and redeploy

## Step 4: Test the Connection

1. Start your development server (if testing locally):
   ```bash
   npm run dev
   ```

2. Open your application in the browser

3. Check the browser console (F12) for any errors

4. Try to:
   - Sign up/Sign in (if authentication is set up)
   - Create a new link
   - Verify data is saved to your new Supabase database

## Troubleshooting

### Error: "Supabase credentials missing"
- Verify `.env.local` exists in your project root
- Check that variable names are exactly: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart your development server after creating/updating `.env.local`

### Error: "relation 'links' does not exist"
- You haven't run the SQL migration yet
- Go to Step 2 and run the migration script

### Error: "permission denied"
- Make sure you're logged in as the project owner in Supabase
- Check that Row Level Security (RLS) policies were created (they're included in the migration scripts)

### Data not appearing
- Verify you're connected to the correct Supabase project
- Check the Supabase dashboard to see if data is being created
- Check browser console for error messages

## Summary Checklist

- [ ] Got new Supabase Project URL and Anon Key
- [ ] Ran SQL migration script in new Supabase project
- [ ] Verified `links` table exists with all columns
- [ ] Updated `.env.local` for local development
- [ ] Updated environment variables in Vercel/Cloudflare (if applicable)
- [ ] Redeployed application (if applicable)
- [ ] Tested connection and created a test link


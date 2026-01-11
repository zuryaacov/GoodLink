# Quick Fix: 401 Unauthorized Error

The error shows that the Supabase API key is incorrect. Here's how to fix it:

## Step 1: Get Your Service Role Key from Supabase

1. Go to https://app.supabase.com/
2. Select your project
3. Go to **Settings** → **API**
4. Scroll to **Project API keys**
5. Find **`service_role`** (NOT `anon`)
6. Click "Reveal" or copy it

**Important**: The key should start with `eyJ...` and be very long (JWT token)

## Step 2: Update the Secret in Cloudflare

```powershell
cd goodlink-backend
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

**When prompted:**
- Paste your **service_role** key (the long JWT token)
- Press Enter

## Step 3: Redeploy

```powershell
npx wrangler deploy
```

## Step 4: Test

Try again: https://glynk.to/leumit

Watch the logs:
```powershell
npx wrangler tail
```

You should see "Supabase returned 1 result(s)" instead of "401 Unauthorized".

## Common Issue: Using Anon Key Instead of Service Role

**If you see 401 error:**
- ❌ You might be using the `anon` key
- ✅ You need the `service_role` key

The `service_role` key:
- Bypasses RLS (Row Level Security)
- Allows server-side access to all data
- Required for the redirect worker

The `anon` key:
- Respects RLS policies
- Only works for authenticated users
- ❌ Will NOT work for the redirect worker


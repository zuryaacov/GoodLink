# Fix "401 Unauthorized" Error - Supabase API Key Issue

You're getting this error because the Supabase service role key is missing or incorrect in the Cloudflare Worker.

## Fix the API Key

### Step 1: Get Your Supabase Service Role Key

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Settings** → **API**
4. Scroll down to **Project API keys**
5. Find **`service_role`** key (NOT the `anon` key!)
6. Click the eye icon to reveal it, or click "Reveal" / "Copy"

**Important**: 
- ✅ Use **service_role** key
- ❌ Do NOT use **anon** key
- The service_role key bypasses RLS (Row Level Security)

### Step 2: Update the Worker Secret

```powershell
cd goodlink-backend
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

When prompted:
1. Paste your **service_role** key (the long JWT token)
2. Press Enter

### Step 3: Verify the Secret Was Set

```powershell
npx wrangler secret list
```

You should see:
```
🔑 SUPABASE_SERVICE_ROLE_KEY
🔑 SUPABASE_URL
```

### Step 4: Redeploy the Worker

After setting the secret, you need to redeploy:

```powershell
npx wrangler deploy
```

### Step 5: Test Again

Try accessing: `https://glynk.to/leumit`

Check the logs:
```powershell
npx wrangler tail
```

You should now see:
```
Supabase returned 1 result(s)
Found link: { target_url: "...", ... }
Redirecting to: ...
```

Instead of the 401 error.

## Why Service Role Key?

The worker uses **service_role** key because:
- It bypasses RLS (Row Level Security) policies
- The worker runs server-side without user authentication
- It needs to read links for any user, not just authenticated users

## Common Mistakes

### ❌ Using Anon Key
**Symptom**: 401 Unauthorized
**Fix**: Use service_role key instead

### ❌ Key with Extra Spaces
**Symptom**: 401 Unauthorized
**Fix**: Make sure there are no extra spaces when copying/pasting

### ❌ Wrong Project Key
**Symptom**: 401 Unauthorized
**Fix**: Make sure you're using the key from the correct Supabase project

### ❌ Not Redeploying After Setting Secret
**Symptom**: Still getting 401
**Fix**: Run `npx wrangler deploy` after setting the secret

## Verify Your Supabase URL

Also make sure `SUPABASE_URL` is correct:

```powershell
npx wrangler secret put SUPABASE_URL
```

Paste your Supabase project URL:
```
https://rmhuczsimvckgheedutk.supabase.co
```

(No trailing slash!)

## Test the API Key Manually

You can test if your service_role key works by running this in Supabase SQL Editor or using curl:

```bash
curl 'https://rmhuczsimvckgheedutk.supabase.co/rest/v1/links?slug=eq.leumit&domain=eq.glynk.to&select=target_url' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

Replace `YOUR_SERVICE_ROLE_KEY` with your actual service_role key.

If you get a 401, the key is wrong.
If you get data back, the key is correct and the issue is with the worker configuration.


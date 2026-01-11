# Troubleshooting "Link not found" 404 Error

If you're getting 404 "Link not found" when accessing `https://glynk.to/leumit`, follow these steps:

## Step 1: Verify the Link in Supabase

1. Go to Supabase Dashboard → Table Editor → `links`
2. Find the link with name "https://glynk.to/leumit"
3. **Check the following fields:**

### ✅ Domain Field
- **Should be**: `glynk.to` (exactly, no https://, no www.)
- **NOT**: `https://glynk.to` or `www.glynk.to` or `goodlink.ai`

### ✅ Slug Field  
- **Should be**: `leumit` (exactly, no slashes, no domain)
- **NOT**: `https://glynk.to/leumit` or `/leumit` or `https://glynk.to/leumit`

### ✅ Status Field (if exists)
- **Should be**: `true` (checked/enabled)
- **NOT**: `false` or `null`

## Step 2: Fix Incorrect Data

If the domain or slug is incorrect, run this SQL in Supabase SQL Editor:

```sql
-- Find the link
SELECT id, name, domain, slug, status, target_url 
FROM links 
WHERE name LIKE '%leumit%' OR slug LIKE '%leumit%';

-- Update if needed (replace the ID and values)
UPDATE links 
SET 
  domain = 'glynk.to',
  slug = 'leumit'
WHERE slug = 'leumit' OR name LIKE '%leumit%';

-- Verify the update
SELECT id, name, domain, slug, status, target_url 
FROM links 
WHERE slug = 'leumit' AND domain = 'glynk.to';
```

## Step 3: Verify Worker is Deployed

1. Check if worker is deployed:
   ```powershell
   cd goodlink-backend
   npx wrangler deployments list
   ```

2. If not deployed, deploy it:
   ```powershell
   npx wrangler deploy
   ```

## Step 4: Check Worker Logs

View real-time logs to see what the worker is doing:

```powershell
cd goodlink-backend
npx wrangler tail
```

Then try accessing `https://glynk.to/leumit` and watch the logs.

You should see:
```
Request URL: https://glynk.to/leumit
Hostname: glynk.to, Pathname: /leumit
Extracted slug: leumit
Looking up link: slug="leumit", domain="glynk.to"
Querying Supabase: ...
```

## Step 5: Verify Environment Variables

Make sure the worker has the correct secrets:

```powershell
cd goodlink-backend
npx wrangler secret list
```

You should see:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If missing, set them:
```powershell
npx wrangler secret put SUPABASE_URL
# Paste: https://magnblpbhyxicrqpmrjw.supabase.co

npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Paste: your-service-role-key from Supabase Dashboard → Settings → API
```

## Step 6: Verify Domain Routing

The worker needs to be attached to `glynk.to` domain:

1. Go to Cloudflare Dashboard → Workers & Pages
2. Click on `goodlink-backend` worker
3. Go to Settings → Triggers
4. Check if `glynk.to` is listed under Routes or Custom Domains

If not, add it:
- **For Custom Domain**: Add `glynk.to` as a custom domain
- **For Route**: Make sure `glynk.to/*` route pattern exists

## Step 7: Check Supabase RLS Policy

Even though service role key bypasses RLS, make sure the public policy exists:

Run this SQL in Supabase:
```sql
-- Check if policy exists
SELECT * FROM pg_policies WHERE tablename = 'links' AND policyname = 'Public can read active links';

-- If not exists, create it
DROP POLICY IF EXISTS "Public can read active links" ON links;
CREATE POLICY "Public can read active links"
  ON links FOR SELECT
  USING (true);
```

## Common Issues

### Issue 1: Domain mismatch
**Symptom**: Worker logs show domain different from DB
**Fix**: Update domain field in Supabase to match exactly

### Issue 2: Slug mismatch  
**Symptom**: Worker logs show slug different from DB
**Fix**: Update slug field in Supabase to match exactly

### Issue 3: Status is false
**Symptom**: Link exists but status is false
**Fix**: Update status to true or remove status check

### Issue 4: Worker not on domain
**Symptom**: Getting 404 from Cloudflare, not from worker
**Fix**: Attach worker to `glynk.to` domain in Cloudflare Dashboard

### Issue 5: Wrong API key
**Symptom**: Worker logs show "401 Unauthorized" or "403 Forbidden"
**Fix**: Use service_role key, not anon key

## Quick Test Query

Test if the link exists in Supabase with this query:

```sql
SELECT 
  id,
  name,
  domain,
  slug,
  target_url,
  status,
  CASE 
    WHEN domain = 'glynk.to' THEN '✅ Domain correct'
    ELSE '❌ Domain incorrect: ' || domain
  END as domain_check,
  CASE 
    WHEN slug = 'leumit' THEN '✅ Slug correct'
    ELSE '❌ Slug incorrect: ' || slug
  END as slug_check
FROM links 
WHERE slug = 'leumit' OR domain LIKE '%glynk%' OR name LIKE '%leumit%';
```

This will show you exactly what's wrong with the data.


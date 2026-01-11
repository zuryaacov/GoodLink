# Checklist: Why Click Tracking Isn't Working

## Step 1: Check if Worker is Deployed

```powershell
cd goodlink-backend
npx wrangler deploy
```

**Watch for:**
- ✅ `Uploaded goodlink-backend (X.X seconds)`
- ✅ `Published goodlink-backend (X.X seconds)`

## Step 2: Check Environment Variables

The worker needs these secrets configured:

```powershell
cd goodlink-backend
npx wrangler secret list
```

**Should see:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**If missing, add them:**
```powershell
npx wrangler secret put SUPABASE_URL
# Paste your Supabase URL when prompted

npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Paste your Supabase service_role key when prompted
```

**To get your Supabase credentials:**
1. Go to Supabase Dashboard
2. Settings → API
3. Copy:
   - **Project URL** → This is `SUPABASE_URL`
   - **service_role key** (NOT anon key!) → This is `SUPABASE_SERVICE_ROLE_KEY`

## Step 3: Check if Clicks Table Exists

Run this in Supabase SQL Editor:

```sql
-- Check if clicks table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'clicks';

-- If it doesn't exist, run this:
-- (Copy from supabase-create-clicks-table.sql)
```

**If table doesn't exist:**
1. Open `supabase-create-clicks-table.sql`
2. Copy all SQL
3. Paste in Supabase SQL Editor
4. Click "Run"

## Step 4: Test Worker with Tail Logs

```powershell
cd goodlink-backend
npx wrangler tail
```

**Then in another browser tab:**
1. Go to: `https://glynk.to/leumit` (or any link you have)

**Look for these logs:**
- `🔵 Worker started - Request received`
- `🔵 Request URL: ...`
- `✅ Environment variables OK`
- `Extracted slug: ...`
- `✅ Link found! ID: ... User ID: ...`
- `🚀 Preparing to track click...`
- `📝 Starting click tracking...`
- `✅ Click tracked successfully!`

**If you DON'T see these logs:**
- Worker might not be deployed correctly
- Route might not be configured correctly
- Worker might not be getting requests

## Step 5: Check Worker Route Configuration

In Cloudflare Dashboard:
1. Go to Workers & Pages
2. Click on `goodlink-backend`
3. Go to Settings → Triggers
4. Check if route `glynk.to/*` is configured

**If route is missing:**
1. Click "Add route"
2. Route: `glynk.to/*`
3. Zone: `glynk.to` (or your zone)
4. Save

## Step 6: Verify Link Has ID and User ID

Run this in Supabase SQL Editor:

```sql
-- Check if your link has id and user_id
SELECT id, user_id, slug, domain, target_url 
FROM links 
WHERE slug = 'leumit' AND domain = 'glynk.to';
```

**Should return 1 row with:**
- `id` (UUID) - NOT NULL
- `user_id` (UUID) - NOT NULL
- `slug` = 'leumit'
- `domain` = 'glynk.to'

**If `id` or `user_id` is NULL:**
- The link was created incorrectly
- Need to recreate the link

## Step 7: Test Manual Insert to Clicks Table

Run this in Supabase SQL Editor (replace IDs with actual values from Step 6):

```sql
-- Get link details first
SELECT id, user_id FROM links WHERE slug = 'leumit' AND domain = 'glynk.to';

-- Then insert test click (replace with actual IDs)
INSERT INTO clicks (
  link_id, 
  user_id, 
  slug, 
  domain, 
  target_url,
  ip_address
) VALUES (
  'YOUR-LINK-ID-HERE',
  'YOUR-USER-ID-HERE',
  'test',
  'glynk.to',
  'https://example.com',
  '127.0.0.1'
);

-- Check if it was inserted
SELECT * FROM clicks WHERE slug = 'test';
```

**If this fails:**
- Table structure issue
- Permission issue
- Fix the error

**If this succeeds:**
- Table is fine
- Issue is in worker code or worker not being called

## Step 8: Check Cloudflare Dashboard Logs

1. Go to Cloudflare Dashboard
2. Workers & Pages → `goodlink-backend`
3. Go to "Logs" tab
4. Check for recent requests and errors

## Common Issues

### Issue: "No logs at all"
**Possible causes:**
- Worker not deployed
- Route not configured
- Worker not receiving requests
- Check Cloudflare Dashboard → Workers & Pages → Logs

### Issue: "Environment variables missing"
**Fix:**
```powershell
cd goodlink-backend
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler deploy  # Redeploy after adding secrets
```

### Issue: "Link found but no tracking"
**Check:**
- Does link have `id` and `user_id`? (Step 6)
- Check worker logs for tracking errors (Step 4)
- Check if `ctx.waitUntil` is being called

### Issue: "Table doesn't exist"
**Fix:**
- Run `supabase-create-clicks-table.sql` in Supabase SQL Editor

### Issue: "401 Unauthorized"
**Fix:**
- Make sure you're using `service_role` key, NOT `anon` key
- Verify key is set correctly: `npx wrangler secret list`


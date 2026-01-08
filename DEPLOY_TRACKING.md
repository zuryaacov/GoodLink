# Deploy Click Tracking Feature

This guide helps you deploy the updated worker with click tracking functionality.

## Step 1: Create the Clicks Table

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the SQL from `supabase-create-clicks-table.sql`
3. Click "Run"
4. Verify the table was created in Table Editor

## Step 2: Fix Git Warning (Optional)

If you see a Git ownership warning, run:

```powershell
git config --global --add safe.directory "C:/Users/User/Desktop/‏‏goodlink-p/goodlink-backend"
```

## Step 3: Deploy the Worker

The warning about "override remote configuration" is normal. It means:
- Your local `wrangler.toml` will be used for deployment
- Any custom routes set in Cloudflare Dashboard might be updated

**This is fine** - the routes in `wrangler.toml` are correct.

```powershell
cd goodlink-backend
npx wrangler deploy
```

When prompted about overriding remote configuration, type **`y`** (yes) to continue.

## Step 4: Verify Deployment

After deployment:

1. **Test a link:**
   ```
   https://glynk.to/leumit
   ```

2. **Check the logs:**
   ```powershell
   npx wrangler tail
   ```

   You should see:
   ```
   ✅ Click tracked successfully: <uuid>
   ```

3. **Check Supabase:**
   - Go to Supabase Dashboard → Table Editor → `clicks`
   - You should see a new row with the click data

## What Gets Tracked

Every click records:
- Link ID and User ID
- IP address
- User-Agent (browser/device)
- Referer (where they came from)
- Country & City (from Cloudflare)
- Device type (mobile/desktop/tablet)
- Browser (chrome/firefox/safari/etc)
- OS (windows/macos/linux/android/ios)
- Query parameters
- Bot detection
- Session ID
- Timestamp

## Troubleshooting

### If deployment fails:
- Make sure you're in the correct directory: `cd goodlink-backend`
- Make sure you're logged in: `npx wrangler login`
- Check that secrets are set: `npx wrangler secret list`

### If clicks aren't being recorded:
- Check worker logs: `npx wrangler tail`
- Verify the `clicks` table exists in Supabase
- Check that the service_role key is correct
- Look for errors in the logs about inserting to `clicks` table

### If you see "table clicks does not exist":
- Make sure you ran the SQL from `supabase-create-clicks-table.sql`
- Check the table name is exactly `clicks` (lowercase)


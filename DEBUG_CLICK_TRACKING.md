# Debug Click Tracking - Why it's not writing to Supabase

## Check 1: Is the clicks table created?

Run this SQL in Supabase to check:

```sql
-- Check if clicks table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'clicks';

-- If it exists, check structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clicks';
```

If the table doesn't exist, run `supabase-create-clicks-table.sql`.

## Check 2: Check Worker Logs

Run this command and watch the logs while accessing a link:

```powershell
cd goodlink-backend
npx wrangler tail
```

Then access: `https://glynk.to/leumit`

**Look for these log messages:**
- `🚀 Preparing to track click...` - Should appear
- `📝 Starting click tracking...` - Should appear
- `📝 Click data: {...}` - Should show the data being sent
- `📥 Click tracking response status: ...` - Should show 201 (Created) or an error
- `✅ Click tracked successfully!` - Should appear if successful
- `❌ Failed to track click:` - Should appear if there's an error

## Check 3: Common Issues

### Issue: "relation clicks does not exist"
**Solution**: Run `supabase-create-clicks-table.sql` in Supabase SQL Editor

### Issue: "permission denied for table clicks"
**Solution**: The policy might not be set. Run:
```sql
DROP POLICY IF EXISTS "Service role can insert clicks" ON clicks;
CREATE POLICY "Service role can insert clicks"
  ON clicks FOR INSERT
  WITH CHECK (true);
```

### Issue: "null value in column link_id violates not-null constraint"
**Solution**: Check that `linkData.id` exists. The query should include `id` in the select.

### Issue: "null value in column user_id violates not-null constraint"
**Solution**: Check that `linkData.user_id` exists. The query should include `user_id` in the select.

## Check 4: Test the Insert Manually

Test if you can insert manually to clicks table:

```sql
-- Get a link ID first
SELECT id, user_id, slug, domain FROM links LIMIT 1;

-- Then try to insert (replace with actual IDs)
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
```

If this works, the table is fine and the issue is in the worker code.
If this fails, there's an issue with the table structure or permissions.

## Check 5: Verify Link Data Has ID

Make sure the query returns `id` and `user_id`:

Check in worker logs:
- Should see: `Found link: {... "id": "...", "user_id": "..." ...}`

If `id` or `user_id` are missing, the query needs to be fixed.


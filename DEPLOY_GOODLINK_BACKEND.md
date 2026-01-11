# Deploy GoodLink Backend Worker

This worker handles link redirects from `glynk.to` domain.

## Step 1: Navigate to Worker Directory

```powershell
cd goodlink-backend
```

## Step 2: Install Dependencies

```powershell
npm install
```

## Step 3: Login to Cloudflare

```powershell
npx wrangler login
```

Make sure you're logged into the Cloudflare account that manages `glynk.to` domain.

## Step 4: Set Environment Variables (Secrets)

You need to set two secrets for the worker:

### Set Supabase URL:
```powershell
npx wrangler secret put SUPABASE_URL
```
When prompted, paste your Supabase project URL:
```
https://magnblpbhyxicrqpmrjw.supabase.co
```

### Set Supabase Service Role Key:
```powershell
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```
When prompted, paste your Supabase service role key (get it from Supabase Dashboard → Settings → API → service_role key)

**Important**: Use the **service_role** key, NOT the anon key!

## Step 5: Configure Domain Route

The worker needs to be attached to `glynk.to` domain. You have two options:

### Option A: Custom Domain (Recommended for production)

1. Go to Cloudflare Dashboard → Workers & Pages
2. Find `goodlink-backend` worker
3. Go to Settings → Triggers
4. Add a Custom Domain: `glynk.to`

This requires:
- `glynk.to` domain to be in your Cloudflare account
- DNS configured properly

### Option B: Route Pattern (Current configuration)

The `wrangler.toml` is already configured with:
```toml
[env.production]
routes = [
  { pattern = "glynk.to/*", zone_name = "glynk.to" }
]
```

But for this to work:
- `glynk.to` must be in your Cloudflare account
- You must have the zone configured

## Step 6: Deploy the Worker

```powershell
npx wrangler deploy
```

## Step 7: Verify Deployment

After deployment, you should see output like:
```
✨  Compiled Worker successfully
📦  Built Worker successfully
✨  Successfully published your Worker to the following routes:
   - glynk.to/*
```

## Troubleshooting

### If you get "zone not found" error:
- Make sure `glynk.to` domain is added to your Cloudflare account
- Make sure you're using the correct Cloudflare account

### If you get 404 on links:
1. **Check the link in Supabase:**
   - Open Supabase Dashboard → Table Editor → `links`
   - Find your link (e.g., slug = "leumit")
   - Verify:
     - `domain` field = `glynk.to` (exactly, no https://)
     - `slug` field = `leumit` (exactly)
     - `status` field = `true` (if status column exists)

2. **Check worker logs:**
   ```powershell
   npx wrangler tail
   ```
   This will show real-time logs from the worker

3. **Test the worker directly:**
   - Go to Cloudflare Dashboard → Workers & Pages → goodlink-backend
   - Click "Quick Edit" or "View Logs"
   - Look for the logs showing the request

### If the worker returns "Link not found":
- Check Supabase data: domain and slug must match exactly
- Check RLS policies: Make sure the public policy is set (see `supabase-public-link-policy-simple.sql`)
- Verify service role key is correct
- Check worker logs for detailed error messages

## Testing

After deployment, test with:
```
https://glynk.to/leumit
```

You should see logs in `wrangler tail` showing:
```
Looking up link: slug="leumit", domain="glynk.to"
```

## Important Notes

1. **Service Role Key**: The worker uses service role key which bypasses RLS, but it's still good practice to have the public policy set.

2. **Domain Matching**: The domain and slug must match EXACTLY:
   - Domain: `glynk.to` (not `https://glynk.to` or `www.glynk.to`)
   - Slug: `leumit` (not `/leumit` or `https://glynk.to/leumit`)

3. **Status Column**: If your links table has a `status` column, make sure it's `true` for active links.


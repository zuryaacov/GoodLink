# Setup Click Tracking

This guide explains how to set up click tracking for your GoodLink backend worker.

## Step 1: Create the Clicks Table in Supabase

1. Go to Supabase Dashboard → SQL Editor
2. Open the file `supabase-create-clicks-table.sql`
3. Copy and paste the SQL into the editor
4. Click "Run"

This will create a `clicks` table that stores:
- Link ID and User ID (from the links table)
- IP address, User-Agent, Referer
- Location (Country, City) - from Cloudflare headers
- Device info (Device type, Browser, OS)
- Query parameters
- Bot detection
- Session ID
- Timestamp

## Step 2: Verify the Table Was Created

1. Go to Supabase Dashboard → Table Editor
2. You should see a `clicks` table
3. Verify it has all the columns from the SQL file

## Step 3: Deploy the Updated Worker

The worker code has already been updated to track clicks. Deploy it:

```powershell
cd goodlink-backend
npx wrangler deploy
```

## How It Works

Every time someone clicks a link (e.g., `https://glynk.to/leumit`):

1. **Worker extracts information:**
   - Link ID and User ID from the database
   - IP address (from Cloudflare headers)
   - User-Agent (browser/device info)
   - Referer (where they came from)
   - Country/City (from Cloudflare geo headers)
   - Device type, Browser, OS (parsed from User-Agent)
   - Query parameters
   - Bot detection

2. **Writes to Supabase:**
   - Inserts a new row in the `clicks` table
   - Uses `ctx.waitUntil()` so tracking doesn't slow down redirects
   - If tracking fails, redirect still works (fail-safe)

3. **Performs redirect:**
   - Redirects to the target URL
   - Adds UTM parameters if configured
   - Passes through query parameters if enabled

## Viewing Click Data

You can query the clicks table in Supabase:

```sql
-- Get all clicks for a specific link
SELECT * FROM clicks 
WHERE link_id = 'YOUR-LINK-ID'
ORDER BY clicked_at DESC;

-- Get clicks count by link
SELECT 
  l.name,
  l.slug,
  COUNT(c.id) as click_count
FROM links l
LEFT JOIN clicks c ON l.id = c.link_id
GROUP BY l.id, l.name, l.slug
ORDER BY click_count DESC;

-- Get clicks by country
SELECT 
  country,
  COUNT(*) as clicks
FROM clicks
WHERE country IS NOT NULL
GROUP BY country
ORDER BY clicks DESC;

-- Get device breakdown
SELECT 
  device_type,
  browser,
  os,
  COUNT(*) as clicks
FROM clicks
GROUP BY device_type, browser, os
ORDER BY clicks DESC;
```

## Features

✅ **Non-blocking**: Tracking runs in background, doesn't slow redirects
✅ **Fail-safe**: If tracking fails, redirect still works
✅ **Bot detection**: Identifies bots/crawlers
✅ **Geolocation**: Gets country/city from Cloudflare
✅ **Device detection**: Parses device type, browser, OS from User-Agent
✅ **Session tracking**: Generates session IDs for analytics
✅ **Referer tracking**: Tracks where users came from

## Privacy Note

The tracking collects:
- IP addresses (can be anonymized if needed)
- User-Agent strings
- Geographic location (country/city)
- Referrer information

Make sure you comply with privacy regulations (GDPR, CCPA, etc.) and inform users about data collection.


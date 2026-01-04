# Database Setup Instructions

The application requires a `links` table in your Supabase database. Follow these steps to set it up:

## Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

## Step 2: Choose Your Migration Strategy

You have two options depending on your situation:

### Option A: Safe Migration (Recommended)
Use `supabase-migrations-fix.sql` if:
- You already have a `links` table but it's missing columns
- You want to preserve existing data
- You're not sure if the table exists

This script will:
- Check if the table exists
- Add missing columns if the table already exists
- Create the table if it doesn't exist
- Update policies and triggers safely

### Option B: Clean Migration (Use with Caution!)
Use `supabase-migrations-clean.sql` if:
- You don't have any data in the links table yet
- You want to start fresh
- You're getting errors and want to reset everything

⚠️ **WARNING**: This will DELETE all existing data in the links table!

## Step 3: Run the Migration

1. Copy the contents of your chosen migration file
2. Paste it into the SQL Editor
3. Click **Run** (or press Ctrl+Enter)

## Step 4: Verify the Table Was Created

After running the migration, check:

1. Go to **Table Editor** in Supabase
2. You should see a `links` table
3. Verify it has all these columns:
   - `id` (UUID)
   - `user_id` (UUID)
   - `name` (TEXT)
   - `target_url` (TEXT)
   - `domain` (TEXT) ← **This is the one that was missing!**
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

## Troubleshooting

### Error: "column 'domain' does not exist"
- This means the table exists but is missing the `domain` column
- Use **Option A** (`supabase-migrations-fix.sql`) to add missing columns

### Error: "relation 'links' already exists"
- Use **Option A** if you want to keep data
- Use **Option B** if you want to start fresh (deletes all data!)

### Error: "permission denied"
- Make sure you're logged in as the project owner
- Check that RLS policies are set up correctly

### Still having issues?
1. Check the browser console (F12) for detailed error messages
2. Check the Supabase logs for database errors
3. Verify your `.env.local` file has the correct Supabase credentials

After setting up the table correctly, try creating a link again in the application!

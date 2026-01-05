# Database Schema Explanation

## Tables in Your Supabase Database

### 1. `auth.users` (Automatic - Managed by Supabase)

- **Created by**: Supabase Auth automatically
- **Purpose**: Stores user authentication information (email, password hashes, etc.)
- **You don't need to create this** - it's automatically provided by Supabase
- **Location**: In the `auth` schema (not visible in Table Editor under "public" schema)

### 2. `links` (Custom Table - You Create This)

- **Created by**: Running the migration SQL script
- **Purpose**: Stores all shortened links created by users
- **Columns**:
  - `id` (UUID) - Primary key
  - `user_id` (UUID) - References `auth.users(id)`
  - `name` (TEXT) - Link name/description
  - `target_url` (TEXT) - The original URL being shortened
  - `domain` (TEXT) - Domain for the short link (e.g., "goodlink.ai")
  - `slug` (TEXT) - The short code (e.g., "abc123")
  - `short_url` (TEXT) - Full short URL
  - `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` (TEXT) - UTM parameters
  - `parameter_pass_through` (BOOLEAN) - Whether to pass through URL parameters
  - `pixels` (JSONB) - Tracking pixels configuration
  - `server_side_tracking` (BOOLEAN) - Server-side tracking enabled
  - `custom_script` (TEXT) - Custom JavaScript code
  - `fraud_shield` (TEXT) - Fraud protection settings
  - `bot_action` (TEXT) - Bot handling action
  - `geo_rules` (JSONB) - Geographic targeting rules
  - `status` (BOOLEAN) - Link status (true = active, false = inactive)
  - `created_at` (TIMESTAMPTZ) - Creation timestamp
  - `updated_at` (TIMESTAMPTZ) - Last update timestamp

### 3. `domains` (Optional - Not Created Yet)

- **Status**: Referenced in code but optional
- **Purpose**: Would store custom domains for users
- **Current behavior**: Code gracefully handles if this table doesn't exist by checking domains in the `links` table instead
- **Note**: This table is not required for the app to work. It's a future feature.

## Summary

**Required Tables:**

- ✅ `auth.users` - Automatically created by Supabase (you don't create this)
- ✅ `links` - Created by running the migration script

**Optional Tables:**

- ⚪ `domains` - Not created, but code handles its absence gracefully

## Why You Only See `links` Table

When you look at your Supabase Table Editor, you only see the `links` table because:

1. `auth.users` is in a different schema (`auth` schema, not `public` schema)
2. `domains` table doesn't exist yet (and isn't required)
3. `links` is the only custom table your application currently uses

This is normal and correct! Your database setup is fine with just the `links` table.

## Adding the Status Column

The `links` table should include a `status` column. The migration file has been updated to include it. If you've already created the table without it, you can run:

```sql
ALTER TABLE links ADD COLUMN IF NOT EXISTS status BOOLEAN DEFAULT true;
```

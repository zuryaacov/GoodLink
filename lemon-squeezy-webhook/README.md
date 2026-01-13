# Lemon Squeezy Webhook Worker

Cloudflare Worker for handling webhook events from Lemon Squeezy and updating user subscriptions in Supabase.

## Setup

### 1. Create the profiles table in Supabase

Run the SQL script `supabase-create-profiles-table.sql` in your Supabase SQL Editor.

### 2. Get your Lemon Squeezy Webhook Secret

1. Go to your Lemon Squeezy dashboard
2. Navigate to Settings → Webhooks
3. Create a new webhook endpoint pointing to your Cloudflare Worker URL
4. Copy the "Signing Secret" - you'll need this for the environment variable

### 3. Deploy the Worker

```bash
cd lemon-squeezy-webhook
npm install
npx wrangler deploy
```

### 4. Set Environment Variables

In Cloudflare Dashboard → Workers & Pages → lemon-squeezy-webhook → Settings → Variables:

- `LEMON_SQUEEZY_WEBHOOK_SECRET`: Your webhook signing secret from Lemon Squeezy
- `SUPABASE_URL`: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (bypasses RLS)

### 5. Configure Webhook URL in Lemon Squeezy

1. Go to Lemon Squeezy Dashboard → Settings → Webhooks
2. Add a new webhook with the URL: `https://lemon-squeezy-webhook.YOUR_SUBDOMAIN.workers.dev`
3. Select the events you want to receive:
   - `subscription_created`
   - `subscription_updated`
   - `subscription_cancelled`
4. Save the webhook

### 6. Update Variant IDs

Edit `lemon-squeezy-webhook/src/index.js` and update the `variantToPlan` mapping with your actual variant IDs from Lemon Squeezy:

```javascript
const variantToPlan = {
  'YOUR_START_VARIANT_ID': 'start',
  'YOUR_ADVANCED_VARIANT_ID': 'advanced',
  'YOUR_PRO_VARIANT_ID': 'pro'
};
```

To find your variant IDs:
1. Go to Lemon Squeezy Dashboard → Products
2. Click on each product
3. The variant ID is shown in the URL or product details

## How It Works

1. User clicks "Get Started" on a pricing plan
2. If not logged in, user is redirected to `/login?plan=...`
3. After login, Lemon Squeezy checkout opens with `user_id` in custom data
4. User completes payment
5. Lemon Squeezy sends webhook to this worker
6. Worker verifies signature and updates Supabase `profiles` table
7. Frontend can query user's subscription status from Supabase

## Testing

You can test the webhook locally:

```bash
npx wrangler dev
```

Then use a tool like ngrok to expose your local worker, or use the Cloudflare Dashboard logs to see webhook events.

## Monitoring

View logs in real-time:

```bash
npx wrangler tail
```

Or in Cloudflare Dashboard → Workers & Pages → lemon-squeezy-webhook → Logs

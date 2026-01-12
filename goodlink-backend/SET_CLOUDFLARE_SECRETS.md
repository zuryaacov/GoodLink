# Set Cloudflare Secrets for Custom Domain API

## Step 1: Navigate to Worker Directory

```powershell
cd goodlink-backend
```

## Step 2: Get Cloudflare Zone ID

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your zone (e.g., `glynk.to`)
3. Scroll down in the **Overview** page
4. Find **Zone ID** in the **API** section (right sidebar)
5. Copy the Zone ID (it looks like: `abc123def456...`)

## Step 3: Get Cloudflare Global API Key and Email

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click on your profile icon (top right)
3. Go to **My Profile** → **API Tokens**
4. Scroll down to **API Keys** section
5. Find **Global API Key**
6. Click **View** next to "Global API Key"
7. Enter your Cloudflare password to reveal the key
8. **Copy the Global API Key** (you'll need this)
9. **Copy your Cloudflare account email** (the email you use to login)

## Step 4: Set the Secrets

Run these commands from the `goodlink-backend` directory:

```powershell
npx wrangler secret put CLOUDFLARE_ZONE_ID
```
When prompted, paste your Zone ID.

```powershell
npx wrangler secret put CLOUDFLARE_GLOBAL_KEY
```
When prompted, paste your Global API Key.

```powershell
npx wrangler secret put CLOUDFLARE_EMAIL
```
When prompted, paste your Cloudflare account email.

## Step 5: Verify Secrets are Set

```powershell
npx wrangler secret list
```

You should see:
- `CLOUDFLARE_ZONE_ID`
- `CLOUDFLARE_GLOBAL_KEY`
- `CLOUDFLARE_EMAIL`
- `SUPABASE_URL` (already set)
- `SUPABASE_SERVICE_ROLE_KEY` (already set)

## Step 6: Deploy the Worker

After setting the secrets, deploy the worker:

```powershell
npx wrangler deploy
```

## Troubleshooting

### Error: "Required Worker name missing"
- Make sure you're in the `goodlink-backend` directory
- Run `cd goodlink-backend` first

### Error: "Invalid credentials"
- Make sure the Global API Key is correct
- Make sure the email matches your Cloudflare account email
- Try viewing the Global API Key again from Cloudflare Dashboard

### Error: "Zone not found"
- Make sure you're using the correct Zone ID
- The Zone ID should be for the zone where you want to add custom hostnames (usually `glynk.to`)

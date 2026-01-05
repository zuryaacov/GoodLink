# Troubleshooting: Setting Cloudflare Worker Secrets

If `npx wrangler secret put GOOGLE_SAFE_BROWSING_API_KEY` is not working, try these solutions:

## Issue 1: Worker Not Deployed Yet

Some versions of Wrangler require the worker to be deployed at least once before you can set secrets.

**Solution:** Deploy the worker first (even without the secret), then set the secret:

```powershell
# Deploy first (this might fail, but that's okay)
npx wrangler deploy

# Then set the secret
npx wrangler secret put GOOGLE_SAFE_BROWSING_API_KEY
```

## Issue 2: Not in the Correct Directory

Make sure you're in the `url-safety-check` directory:

```powershell
cd C:\Users\User\Desktop\goodlink-prod\url-safety-check
```

Verify you're in the right place:
```powershell
Get-Location
# Should show: C:\Users\User\Desktop\goodlink-prod\url-safety-check

# Check if wrangler.toml exists
Test-Path wrangler.toml
# Should return: True
```

## Issue 3: Not Logged In

Make sure you're logged into Cloudflare:

```powershell
npx wrangler whoami
```

If it shows an error or the wrong account, login again:

```powershell
npx wrangler login
```

## Issue 4: PowerShell Execution Policy

If you get PowerShell execution errors, try using Command Prompt (CMD) instead:

1. Open Command Prompt (cmd.exe)
2. Navigate to the directory:
   ```cmd
   cd C:\Users\User\Desktop\goodlink-prod\url-safety-check
   ```
3. Run the commands:
   ```cmd
   npx wrangler secret put GOOGLE_SAFE_BROWSING_API_KEY
   ```

## Issue 5: Wrong Account or No Permissions

Make sure you're logged into the correct Cloudflare account and have permissions:

1. Check which account you're using:
   ```powershell
   npx wrangler whoami
   ```

2. If it's the wrong account, logout and login:
   ```powershell
   npx wrangler logout
   npx wrangler login
   ```

## Issue 6: Alternative Method - Set Secret via Dashboard

If the command line isn't working, you can set the secret via Cloudflare Dashboard:

1. **Deploy the worker first** (even if it fails without the secret):
   ```powershell
   npx wrangler deploy
   ```

2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. Navigate to **Workers & Pages**
4. Click on your `url-safety-check` worker (or create it if it doesn't exist)
5. Go to **Settings** → **Variables and Secrets**
6. Under **Encrypted Variables**, click **Add variable**
7. Variable name: `GOOGLE_SAFE_BROWSING_API_KEY`
8. Value: `AIzaSyC115jFfH72O_zbZ1Z0ac_QfzhJurSzXLU`
9. Click **Save**

## Issue 7: Deploy First, Then Set Secret

Sometimes you need to deploy the worker first, then set the secret:

```powershell
# Step 1: Deploy (might show errors about missing secret, that's okay)
npx wrangler deploy

# Step 2: Set the secret
npx wrangler secret put GOOGLE_SAFE_BROWSING_API_KEY

# Step 3: Redeploy to use the secret
npx wrangler deploy
```

## What Error Are You Seeing?

Please share the exact error message you're getting. Common errors:

- **"Worker not found"** → Deploy the worker first
- **"Authentication error"** → Run `npx wrangler login`
- **"Permission denied"** → Check account permissions
- **PowerShell execution errors** → Use Command Prompt instead

## Quick Test

Try these commands in order:

```powershell
# 1. Make sure you're in the right directory
cd C:\Users\User\Desktop\goodlink-prod\url-safety-check
Get-Location

# 2. Check if you're logged in
npx wrangler whoami

# 3. Try deploying first (creates the worker)
npx wrangler deploy

# 4. Then set the secret
npx wrangler secret put GOOGLE_SAFE_BROWSING_API_KEY

# 5. Redeploy
npx wrangler deploy
```


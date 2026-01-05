# Set Google Safe Browsing API Key

## Step 1: Navigate to the Worker Directory

Open PowerShell or Command Prompt and navigate to the worker directory:

```powershell
cd url-safety-check
```

## Step 2: Login to Cloudflare (if not already logged in)

Make sure you're logged into your new Cloudflare account:

```powershell
npx wrangler login
```

This will open your browser to authenticate. Make sure you're logged into the **new Cloudflare account** (the same one you're using for your main deployment).

## Step 3: Set the API Key Secret

Run this command to set your Google Safe Browsing API key:

```powershell
npx wrangler secret put GOOGLE_SAFE_BROWSING_API_KEY
```

When prompted, paste this API key:
```
AIzaSyC115jFfH72O_zbZ1Z0ac_QfzhJurSzXLU
```

Press Enter after pasting the key.

## Step 4: Deploy the Worker

After setting the secret, deploy the worker:

```powershell
npx wrangler deploy
```

After deployment, you'll see your worker URL. Copy it and update your `VITE_SAFETY_CHECK_WORKER_URL` environment variable.

## Alternative: If you get PowerShell errors

If you encounter PowerShell execution policy errors, you can:

1. **Use Command Prompt (CMD) instead of PowerShell:**
   - Open Command Prompt (cmd.exe)
   - Navigate to the directory: `cd url-safety-check`
   - Run the commands above

2. **Or bypass PowerShell execution policy for this session:**
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   ```
   Then run the wrangler commands.

## Verify the Secret is Set

You can verify the secret is set by checking the worker configuration:

```powershell
npx wrangler secret list
```

You should see `GOOGLE_SAFE_BROWSING_API_KEY` in the list.


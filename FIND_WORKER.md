# Finding Your Worker in Cloudflare Dashboard

If you don't see your worker in Cloudflare, here's how to find it or deploy it.

## Where to Look in Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. In the left sidebar, look for:
   - **Workers & Pages** (most common location)
   - Or **Workers** (older interface)
3. Click on **Workers & Pages**
4. You should see a list of all your workers

## If You Don't See the Worker

### Option 1: The Worker Was Never Deployed

If you haven't deployed the worker yet, you need to deploy it first:

1. **Navigate to the worker directory:**
   ```powershell
   cd url-safety-check
   ```

2. **Make sure you're logged in:**
   ```powershell
   npx wrangler login
   ```
   This will open your browser - make sure you're logged into the **correct Cloudflare account**

3. **Set your API key (if not done yet):**
   ```powershell
   npx wrangler secret put GOOGLE_SAFE_BROWSING_API_KEY
   ```
   Paste: `AIzaSyC115jFfH72O_zbZ1Z0ac_QfzhJurSzXLU`

4. **Deploy the worker:**
   ```powershell
   npx wrangler deploy
   ```

5. **After deployment**, you should see output like:
   ```
   ✨  Compiled Worker successfully
   📦  Built Worker successfully
   ✨  Successfully published your Worker to the following routes:
     - https://url-safety-check.YOUR-SUBDOMAIN.workers.dev
   ```

6. **Now check the Cloudflare Dashboard** - the worker should appear in **Workers & Pages**

### Option 2: Wrong Cloudflare Account

Make sure you're logged into the correct Cloudflare account:

1. Check which account you're logged into:
   ```powershell
   cd url-safety-check
   npx wrangler whoami
   ```

2. If it shows the wrong account, log out and log back in:
   ```powershell
   npx wrangler logout
   npx wrangler login
   ```

3. Make sure you select the **same Cloudflare account** you're using for your main deployment

### Option 3: Check All Accounts

If you have multiple Cloudflare accounts:

1. In the Cloudflare Dashboard, check the account selector at the top
2. Make sure you're viewing the correct account
3. The worker might be in a different account than you're currently viewing

### Option 4: Worker is There But Named Differently

Sometimes workers can have different names:

1. In **Workers & Pages**, look for any worker named:
   - `url-safety-check`
   - Or check if there are any workers at all
2. If you see workers but not `url-safety-check`, you might need to deploy it

## Verify Deployment Status

To check if the worker was deployed, run:

```powershell
cd url-safety-check
npx wrangler deployments list
```

This will show you all deployments for this worker. If you see deployments, the worker exists but might be in a different account.

## Quick Deployment Checklist

If you need to deploy from scratch:

- [ ] Navigate to `url-safety-check` directory
- [ ] Run `npx wrangler login` (make sure it's the right account)
- [ ] Run `npx wrangler secret put GOOGLE_SAFE_BROWSING_API_KEY` (paste the API key)
- [ ] Run `npx wrangler deploy`
- [ ] Copy the worker URL from the output
- [ ] Check Cloudflare Dashboard → Workers & Pages
- [ ] Update `VITE_SAFETY_CHECK_WORKER_URL` with the new URL

## Still Can't Find It?

If you still don't see the worker after deploying:

1. **Check for errors during deployment** - did `npx wrangler deploy` complete successfully?
2. **Check the account** - run `npx wrangler whoami` to verify which account you're using
3. **Try deploying again** - sometimes the first deployment can take a moment to appear
4. **Check Cloudflare Dashboard in a different browser/incognito** - sometimes caching issues
5. **Look for any error messages** in the Cloudflare Dashboard


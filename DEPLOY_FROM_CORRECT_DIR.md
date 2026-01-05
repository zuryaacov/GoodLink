# Deploy from Correct Directory

## If Using PowerShell (Recommended on Windows)

You're on Windows, so use PowerShell commands:

```powershell
cd url-safety-check
npx wrangler deploy
```

Or the full path:
```powershell
cd C:\Users\User\Desktop\goodlink-prod\url-safety-check
npx wrangler deploy
```

## If Using Git Bash

If you're using Git Bash, use forward slashes:

```bash
cd /c/Users/User/Desktop/goodlink-prod/url-safety-check
npx wrangler deploy
```

Or use the Windows path format:
```bash
cd "C:\Users\User\Desktop\goodlink-prod\url-safety-check"
npx wrangler deploy
```

## Quick Check - Verify Your Current Directory

### PowerShell:
```powershell
Get-Location
```

### Git Bash:
```bash
pwd
```

## Then Verify You're in the Right Place

### PowerShell:
```powershell
Get-Content wrangler.toml
# Should show: name = "url-safety-check"
```

### Git Bash:
```bash
cat wrangler.toml
# Should show: name = "url-safety-check"
```

## Deploy the Worker

Once you're in the `url-safety-check` directory:

### PowerShell:
```powershell
npx wrangler deploy
```

### Git Bash:
```bash
npx wrangler deploy
```

The output should show:
```
✨  Successfully published your Worker to the following routes:
  - https://url-safety-check.fancy-sky-7888.workers.dev
```

Notice it says `url-safety-check`, NOT `goodlink`!


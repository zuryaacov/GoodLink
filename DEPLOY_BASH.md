# Deploy Worker Using Bash (Git Bash)

Since you're using Bash/Git Bash, use these commands:

## Step 1: Navigate to the Directory

```bash
cd url-safety-check
```

Or if you need the full path:
```bash
cd /c/Users/User/Desktop/goodlink-prod/url-safety-check
```

## Step 2: Verify You're in the Right Place

```bash
cat wrangler.toml
```

This should show:
```
name = "url-safety-check"
main = "src/index.js"
compatibility_date = "2024-01-01"
```

## Step 3: Deploy the Worker

```bash
npx wrangler deploy
```

## Step 4: Set the API Key Secret (if not done yet)

```bash
npx wrangler secret put GOOGLE_SAFE_BROWSING_API_KEY
```

When prompted, paste: `AIzaSyC115jFfH72O_zbZ1Z0ac_QfzhJurSzXLU`

## Step 5: Redeploy After Setting Secret

```bash
npx wrangler deploy
```

## Bash Commands Reference

- `pwd` - Print working directory (like `Get-Location` in PowerShell)
- `cat filename` - View file contents (like `Get-Content` in PowerShell)
- `ls` - List files (like `Get-ChildItem` in PowerShell)
- `cd directory` - Change directory


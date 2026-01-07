# How to Upload to GitHub

This guide shows you how to upload your project to GitHub.

## Prerequisites

1. A GitHub account (sign up at https://github.com)
2. Git installed on your computer (already installed ✅)

## Step 1: Create a GitHub Repository

1. **Go to GitHub**
   - Visit https://github.com
   - Sign in to your account

2. **Create a New Repository**
   - Click the **"+"** icon in the top right
   - Select **"New repository"**
   - Fill in:
     - **Repository name**: `goodlink-p` (or your preferred name)
     - **Description**: (optional) "GoodLink - URL shortener and link management platform"
     - **Visibility**: Choose Public or Private
     - **DO NOT** initialize with README, .gitignore, or license (you already have these)
   - Click **"Create repository"**

3. **Copy the Repository URL**
   - GitHub will show you the repository URL
   - It will look like: `https://github.com/your-username/goodlink-p.git`
   - Copy this URL - you'll need it in the next step

## Step 2: Check Current Git Status

Your project already has Git initialized. Check what needs to be committed:

```powershell
git status
```

You should see:
- Modified files
- Deleted files (wrangler.jsonc, _worker.js)
- New files (VERCEL_DEPLOYMENT.md, etc.)

## Step 3: Stage Your Changes

Add all changes to staging:

```powershell
git add .
```

Or add specific files:
```powershell
git add VERCEL_DEPLOYMENT.md
git add -u  # This adds deleted files
```

## Step 4: Commit Your Changes

Create a commit with a descriptive message:

```powershell
git commit -m "Migrate from Cloudflare to Vercel, keep url-safety-check worker on Cloudflare"
```

## Step 5: Connect to GitHub (If Not Already Connected)

If you haven't connected to a remote repository yet:

```powershell
git remote add origin https://github.com/your-username/goodlink-p.git
```

Replace `your-username` and `goodlink-p` with your actual GitHub username and repository name.

**If you already have a remote**, check it:
```powershell
git remote -v
```

If the URL is wrong, update it:
```powershell
git remote set-url origin https://github.com/your-username/goodlink-p.git
```

## Step 6: Push to GitHub

Upload your code to GitHub:

```powershell
git push -u origin main
```

If you're using a different branch name (like `master`), use:
```powershell
git push -u origin master
```

**First time pushing?** GitHub may ask for authentication:
- Use a **Personal Access Token** (recommended)
- Or use GitHub CLI for easier authentication

### Setting Up Authentication

**Option A: Personal Access Token (Recommended)**

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click **"Generate new token (classic)"**
3. Give it a name and select scopes: `repo` (full control of private repositories)
4. Copy the token
5. When Git asks for password, paste the token instead

**Option B: GitHub CLI**

```powershell
# Install GitHub CLI (if not installed)
winget install --id GitHub.cli

# Login
gh auth login

# Then push
git push -u origin main
```

## Step 7: Verify Upload

1. Go to your GitHub repository page
2. You should see all your files
3. Check that:
   - ✅ `vercel.json` is present
   - ✅ `url-safety-check/` directory is present
   - ✅ `wrangler.jsonc` is removed (deleted)
   - ✅ `public/_redirects` is removed (deleted)

## Future Updates

After making changes, upload them with:

```powershell
git add .
git commit -m "Your commit message describing the changes"
git push
```

## Quick Reference Commands

```powershell
# Check status
git status

# Stage all changes
git add .

# Commit changes
git commit -m "Your message here"

# Push to GitHub
git push

# Pull latest changes
git pull

# Check remote URL
git remote -v

# Update remote URL
git remote set-url origin https://github.com/your-username/repo-name.git
```

## Troubleshooting

### "Repository not found" Error

- Check that the repository exists on GitHub
- Verify the repository URL is correct
- Make sure you have access to the repository

### Authentication Failed

- Use a Personal Access Token instead of password
- Or use GitHub CLI: `gh auth login`

### "Updates were rejected"

If someone else pushed changes:
```powershell
git pull
# Resolve any conflicts
git push
```

### Large Files

If you have large files (like `node_modules`), make sure they're in `.gitignore`:
- `node_modules/` should be ignored
- `dist/` might be ignored (Vercel builds it automatically)

## What Gets Uploaded

✅ **Uploaded to GitHub:**
- Source code (`src/`)
- Configuration files (`package.json`, `vite.config.js`, `vercel.json`)
- Documentation (`.md` files)
- `url-safety-check/` worker code

❌ **NOT Uploaded (in .gitignore):**
- `node_modules/` (dependencies)
- `.env` files (environment variables)
- Build output (`dist/`) - usually ignored
- OS files (`.DS_Store`, `Thumbs.db`)

## Next Steps After Upload

1. **Connect to Vercel:**
   - Go to Vercel Dashboard
   - Import your GitHub repository
   - Vercel will automatically deploy from GitHub

2. **Set Environment Variables:**
   - In Vercel, add `VITE_SAFETY_CHECK_WORKER_URL`
   - Add any other required environment variables

3. **Enable Auto-Deploy:**
   - Vercel will automatically deploy when you push to GitHub
   - Production deploys from `main` branch
   - Preview deploys for pull requests


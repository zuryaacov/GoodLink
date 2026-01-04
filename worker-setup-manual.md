# Manual Cloudflare Worker Setup (Windows Fix)

Since `wrangler init` is having issues on Windows, here's how to set it up manually.

## Option 1: Manual Project Creation (Recommended)

### Step 1: Create the project directory

```bash
mkdir url-safety-check
cd url-safety-check
```

### Step 2: Initialize npm

```bash
npm init -y
```

### Step 3: Install Wrangler

```bash
npm install -D wrangler
```

### Step 4: Create the worker file

Create `src/index.js` and copy the contents from `cloudflare-worker.js` in the root directory.

### Step 5: Create wrangler.toml

Create `wrangler.toml` in the root of the project:

```toml
name = "url-safety-check"
main = "src/index.js"
compatibility_date = "2024-01-01"

[env.production]
name = "url-safety-check"
```

### Step 6: Login and Deploy

```bash
npx wrangler login
npx wrangler secret put GOOGLE_SAFE_BROWSING_API_KEY
npx wrangler deploy
```

## Option 2: Use the Files I'll Create

I'll create a ready-to-use worker project structure for you.


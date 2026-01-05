# What Type of Worker to Create?

When creating a worker in Cloudflare Dashboard, you'll see different options. Here's which one to choose:

## ✅ Choose: "Create Worker" (Standard Worker)

When you click **Create** in Workers & Pages, you'll see options like:

1. **Create Worker** ← **Choose this one!**
2. Create Application (Pages + Worker)
3. Create from template
4. etc.

**Select "Create Worker"** - this is the standard, simple worker type that handles HTTP requests.

## What This Worker Does

This is a **simple HTTP Worker** that:
- Receives POST requests
- Checks URLs against Google Safe Browsing API
- Returns JSON responses
- Handles CORS

It's **NOT**:
- ❌ A Pages site
- ❌ An Application
- ❌ A scheduled worker (cron)
- ❌ A queue worker

It's just a **standard HTTP Worker** that responds to HTTP requests.

## Step-by-Step:

1. Go to Cloudflare Dashboard → **Workers & Pages**
2. Click **Create** button
3. Select **"Create Worker"** (the first/basic option)
4. You'll see the code editor
5. Name it `url-safety-check`
6. Paste your code
7. Deploy

That's it! No special configuration needed - just a standard HTTP Worker.


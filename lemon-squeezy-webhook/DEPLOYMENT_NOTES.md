# Deployment Notes

## Environment Variables Setup

### Option 1: Cloudflare Dashboard (Recommended for Production)

Environment variables are already set in Cloudflare Dashboard:
- Go to Cloudflare Dashboard → Workers & Pages → lemon-squeezy-webhook → Settings → Variables
- Variables are managed there and will be used in production

**When deploying:**
```bash
npx wrangler deploy
```

If you see a warning about configuration differences, you can:
- **Option A**: Ignore it and deploy (Dashboard variables will be used)
- **Option B**: Use `--remote` flag to use remote configuration:
  ```bash
  npx wrangler deploy --remote
  ```

### Option 2: Local Development

For local development, create a `.dev.vars` file (copy from `.dev.vars.example`):

```bash
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your values
```

Then run:
```bash
npx wrangler dev
```

**Important**: 
- `.dev.vars` is for local development only
- Add `.dev.vars` to `.gitignore` (never commit secrets!)
- Production uses variables from Cloudflare Dashboard

### Option 3: Command Line (Not Recommended)

You can also set secrets via command line:
```bash
npx wrangler secret put LEMON_SQUEEZY_WEBHOOK_SECRET
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

But Dashboard is easier to manage.

## Resolving the Warning

If you see:
```
▲ [WARNING] The local configuration being used differs from the remote configuration
```

This means:
- Variables are set in Cloudflare Dashboard (remote)
- You also have them locally (in `.dev.vars` or command line)

**Solution:**
1. **For production deployment**: Use `--remote` flag or just deploy (Dashboard vars will be used)
2. **For local development**: Use `.dev.vars` file (it won't affect production)

## Recommended Setup

1. **Production**: Variables in Cloudflare Dashboard
2. **Local Dev**: `.dev.vars` file (gitignored)
3. **Deploy**: Use `npx wrangler deploy` (Dashboard vars are used automatically)

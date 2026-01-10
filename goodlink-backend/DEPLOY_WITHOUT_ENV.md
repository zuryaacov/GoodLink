# Deploy Without --env production

עדכנתי את `wrangler.toml` להסיר את `[env.production]`. עכשיו פרסם בלי `--env production`:

## Step 1: פרסם את ה-Worker

```cmd
cd goodlink-backend
npx wrangler deploy
```

**לא** `npx wrangler deploy --env production` - רק `npx wrangler deploy`

## Step 2: בדוק שה-Secrets מוגדרים

```cmd
npx wrangler secret list
```

**צריך לראות:**
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

**אם חסרים:**
```cmd
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

## Step 3: נסה את ה-Worker

```
https://goodlink-backend.fancy-sky-7888.workers.dev/leumit
```

**או:**
```
https://glynk.to/leumit
```

## Step 4: בדוק את הלוגים

```cmd
npx wrangler tail
```

**לא** `npx wrangler tail --env production` - רק `npx wrangler tail`

## Step 5: בדוק ב-Supabase

1. **Supabase Dashboard** → **Table Editor** → **clicks**
2. **בדוק אם יש clicks חדשים**


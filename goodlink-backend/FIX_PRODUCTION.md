# Fix: Click Tracking Works on Localhost but Not on Production

אם זה עובד ב-localhost אבל לא ב-`glynk.to`, הבעיה היא שה-worker ב-production לא מוגדר נכון.

## Step 1: בדוק שה-Worker מפורסם ל-Production

```cmd
cd goodlink-backend
npx wrangler deploy --env production
```

**צריך לראות:**
```
✨  Compiled Worker successfully
📦  Built Worker successfully
✨  Successfully published your Worker to the following routes:
   - glynk.to/*
```

**אם אתה רואה שגיאה:**
- בדוק שאתה מחובר: `npx wrangler login`
- בדוק שה-account נכון

## Step 2: בדוק שה-Secrets מוגדרים ב-Production

ה-`.dev.vars` עובד רק ב-localhost! ב-production צריך secrets.

**בדוק אם יש secrets:**
```cmd
cd goodlink-backend
npx wrangler secret list --env production
```

**צריך לראות:**
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

**אם חסרים, הוסף אותם:**
```cmd
npx wrangler secret put SUPABASE_URL --env production
# הדבק: https://magnblpbhyxicrqpmrjw.supabase.co

npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
# הדבק את ה-service_role key שלך
```

**חשוב:** אחרי הוספת secrets, צריך לפרסם שוב:
```cmd
npx wrangler deploy --env production
```

## Step 3: בדוק שה-Route מוגדר ב-Cloudflare Dashboard

1. **פתח Cloudflare Dashboard**: https://dash.cloudflare.com
2. **עבור ל**: Workers & Pages → **Workers**
3. **מצא את**: `goodlink-backend`
4. **לחץ עליו** → **Settings** → **Triggers**

**צריך לראות:**
- Route: `glynk.to/*`
- או Custom Domain: `glynk.to`

**אם אין route:**
1. לחץ **"Add route"** או **"Add custom domain"**
2. הוסף: `glynk.to/*` (route) או `glynk.to` (custom domain)
3. שמור

## Step 4: בדוק את ה-Logs ב-Production

1. **Cloudflare Dashboard** → **Workers & Pages** → **goodlink-backend**
2. **לחץ על**: **"Logs"** tab
3. **נסה לגשת ל**: `https://glynk.to/leumit`
4. **בדוק אם יש requests ב-logs**

**אם יש requests אבל אין click tracking:**
- בדוק אם יש errors ב-logs
- בדוק אם ה-secrets מוגדרים נכון

## Step 5: בדוק עם Tail Logs

```cmd
cd goodlink-backend
npx wrangler tail --env production
```

**אז נסה לגשת ל**: `https://glynk.to/leumit`

**צריך לראות את אותם לוגים כמו ב-localhost:**
```
🔵 Worker started - Request received
...
🚀 Preparing to track click...
📝 Starting click tracking...
✅ Click tracked successfully!
```

**אם אתה רואה "Missing Supabase configuration":**
- ה-secrets לא מוגדרים ב-production
- חזור ל-Step 2

## Step 6: בדוק שה-Domain בחשבון Cloudflare

1. **Cloudflare Dashboard** → **Websites**
2. **חפש**: `glynk.to`
3. **אם אין** - צריך להוסיף את ה-domain לחשבון

## Checklist

- [ ] Worker מפורסם (`npx wrangler deploy --env production`)
- [ ] Secrets מוגדרים (`npx wrangler secret list --env production`)
- [ ] Route מוגדר ב-Cloudflare Dashboard (Settings → Triggers)
- [ ] Domain `glynk.to` בחשבון Cloudflare
- [ ] Worker רץ (בודק ב-Logs או Tail)

## הבדל בין Localhost ל-Production

| מקום | Environment Variables | Route |
|------|----------------------|-------|
| **Localhost** | `.dev.vars` file | `http://localhost:8787` |
| **Production** | `wrangler secret put` | `https://glynk.to` |

**חשוב:** 
- `.dev.vars` עובד רק ב-localhost!
- ב-production צריך `wrangler secret put`
- אחרי הוספת secrets, צריך לפרסם שוב (`npx wrangler deploy --env production`)

## אם עדיין לא עובד

שלח:
1. הפלט של `npx wrangler secret list --env production`
2. הפלט של `npx wrangler tail --env production` (אחרי שאתה גש ל-`glynk.to/leumit`)
3. Screenshot מ-Cloudflare Dashboard → Workers & Pages → goodlink-backend → Settings → Triggers


# Fix: No Logs from Worker

אם אין לוגים בכלל, זה אומר שה-worker לא מקבל requests. הנה מה לבדוק:

## Step 1: בדוק שה-Worker מפורסם

```powershell
cd goodlink-backend
npx wrangler deploy
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

## Step 2: בדוק שה-Route מוגדר ב-Cloudflare Dashboard

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

## Step 3: בדוק שה-Domain בחשבון Cloudflare שלך

1. **ב-Cloudflare Dashboard** → **Websites**
2. **חפש**: `glynk.to`
3. **אם אין** - צריך להוסיף את ה-domain לחשבון

**להוסיף domain:**

1. לחץ **"Add a site"**
2. הכנס: `glynk.to`
3. עקוב אחר ההוראות (שינוי nameservers)

## Step 4: בדוק שה-DNS מוגדר נכון

1. **ב-Cloudflare Dashboard** → **Websites** → **glynk.to** → **DNS**
2. **ודא שיש A record או CNAME** שמצביע ל-worker

**אם אין:**

- צריך להוסיף DNS record
- או להשתמש ב-Custom Domain ב-worker (זה עושה את זה אוטומטית)

## Step 5: בדוק שה-Worker רץ (Test עם dev mode)

```powershell
cd goodlink-backend
npx wrangler dev
```

**זה יפתח local server:**

```
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8787
```

**אז נסה:**

- פתח דפדפן: `http://localhost:8787/leumit`
- **צריך לראות לוגים בטרמינל!**

**אם זה עובד ב-dev אבל לא ב-production:**

- הבעיה היא ב-route configuration
- חזור ל-Step 2

## Step 6: בדוק ב-Cloudflare Dashboard Logs

1. **Cloudflare Dashboard** → **Workers & Pages** → **goodlink-backend**
2. **לחץ על**: **"Logs"** tab
3. **נסה לגשת ל**: `https://glynk.to/leumit`
4. **בדוק אם יש requests ב-logs**

**אם יש requests אבל אין לוגים ב-`wrangler tail`:**

- `wrangler tail` אולי לא עובד נכון
- השתמש ב-Cloudflare Dashboard Logs במקום

## Step 7: בדוק שה-Worker לא מוגבל

1. **Cloudflare Dashboard** → **Workers & Pages** → **goodlink-backend**
2. **Settings** → **Usage**
3. **בדוק**: האם יש הגבלות או errors

## Step 8: נסה Custom Domain במקום Route

אם route לא עובד, נסה custom domain:

1. **Cloudflare Dashboard** → **Workers & Pages** → **goodlink-backend**
2. **Settings** → **Triggers**
3. **לחץ**: **"Add custom domain"**
4. **הכנס**: `glynk.to`
5. **שמור**

**זה דורש:**

- שה-domain `glynk.to` בחשבון Cloudflare שלך
- שה-DNS מוגדר נכון

## Step 9: בדוק שה-Worker לא מוגדר רק ב-env.production

ה-`wrangler.toml` שלך:

```toml
[env.production]
routes = ["glynk.to/*"]
```

**זה אומר שה-route רק ב-production!**

**אם אתה מפרסם בלי env:**

```powershell
npx wrangler deploy --env production
```

**או שנה את `wrangler.toml`:**

```toml
routes = ["glynk.to/*"]
```

## Step 10: בדוק שה-Worker לא מוגדר ב-zone אחר

אם יש לך כמה zones ב-Cloudflare:

- ודא שה-route מוגדר ב-zone הנכון (`glynk.to`)
- לא ב-zone אחר

## Quick Test: נסה לגשת ישירות ל-Worker URL

אם ה-worker מפורסם, יש לו URL כמו:

```
https://goodlink-backend.YOUR-ACCOUNT.workers.dev
```

**נסה:**

```
https://goodlink-backend.YOUR-ACCOUNT.workers.dev/leumit
```

**אם זה עובד:**

- ה-worker רץ, אבל ה-route לא מוגדר נכון
- חזור ל-Step 2

**אם זה לא עובד:**

- ה-worker לא רץ בכלל
- בדוק deployment (Step 1)

## Summary Checklist

- [ ] Worker מפורסם (`npx wrangler deploy`)
- [ ] Route מוגדר ב-Cloudflare Dashboard (Settings → Triggers)
- [ ] Domain `glynk.to` בחשבון Cloudflare
- [ ] DNS מוגדר נכון
- [ ] Worker רץ ב-dev mode (`npx wrangler dev`)
- [ ] אין errors ב-Cloudflare Dashboard → Logs
- [ ] מפרסם עם `--env production` אם צריך

## אם כל זה לא עוזר

שלח:

1. הפלט של `npx wrangler deploy`
2. Screenshot מ-Cloudflare Dashboard → Workers & Pages → goodlink-backend → Settings → Triggers
3. הפלט של `npx wrangler dev` (אם זה עובד)

# Debug: No Logs in Production

אם אין לוגים ב-`glynk.to`, זה אומר שה-worker לא מקבל requests. בואו נבדוק מה הבעיה.

## Step 1: בדוק שה-Worker מפורסם

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

**אם אתה לא רואה route:**
- ה-route לא מוגדר
- צריך להגדיר ב-Cloudflare Dashboard

## Step 2: בדוק ב-Cloudflare Dashboard שה-Route מוגדר

1. **פתח**: https://dash.cloudflare.com
2. **עבור ל**: Workers & Pages → **Workers**
3. **מצא את**: `goodlink-backend`
4. **לחץ עליו** → **Settings** → **Triggers**

**צריך לראות:**
- Route: `glynk.to/*`
- או Custom Domain: `glynk.to`

**אם אין route:**
1. לחץ **"Add route"**
2. הוסף: `glynk.to/*`
3. שמור

## Step 3: בדוק שה-Worker רץ (Cloudflare Dashboard Logs)

1. **Cloudflare Dashboard** → **Workers & Pages** → **goodlink-backend**
2. **לחץ על**: **"Logs"** tab
3. **נסה לגשת ל**: `https://glynk.to/leumit`
4. **בדוק אם יש requests ב-logs**

**אם יש requests:**
- ה-worker רץ, אבל אולי יש שגיאות
- בדוק מה השגיאות

**אם אין requests בכלל:**
- ה-worker לא מקבל requests
- בדוק שה-route מוגדר (Step 2)
- בדוק שה-domain `glynk.to` בחשבון Cloudflare שלך

## Step 4: בדוק עם Tail Logs (Production)

```cmd
cd goodlink-backend
npx wrangler tail --env production
```

**אז נסה לגשת ל**: `https://glynk.to/leumit`

**אם אתה לא רואה כלום:**
- ה-worker לא מקבל requests
- חזור ל-Step 2 (route configuration)

**אם אתה רואה לוגים:**
- מעולה! ה-worker רץ
- אם אין click tracking, בדוק את השגיאות

## Step 5: בדוק שה-Domain בחשבון Cloudflare

1. **Cloudflare Dashboard** → **Websites**
2. **חפש**: `glynk.to`
3. **אם אין** - צריך להוסיף את ה-domain לחשבון

**להוסיף domain:**
1. לחץ **"Add a site"**
2. הכנס: `glynk.to`
3. עקוב אחר ההוראות (שינוי nameservers)

## Step 6: בדוק שה-Worker לא מוגדר רק ב-env.production

אם אתה מפרסם בלי `--env production`, ה-route לא יעבוד!

**נכון:**
```cmd
npx wrangler deploy --env production
```

**לא נכון:**
```cmd
npx wrangler deploy
```

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

## Checklist

- [ ] Worker מפורסם (`npx wrangler deploy --env production`)
- [ ] Route מוגדר ב-Cloudflare Dashboard (Settings → Triggers)
- [ ] Domain `glynk.to` בחשבון Cloudflare
- [ ] יש requests ב-Cloudflare Dashboard Logs
- [ ] Tail logs מראה משהו (`npx wrangler tail --env production`)

## מה לשלוח

אם עדיין לא עובד, שלח:
1. הפלט של `npx wrangler deploy --env production`
2. Screenshot מ-Cloudflare Dashboard → Workers & Pages → goodlink-backend → Settings → Triggers
3. מה אתה רואה ב-Cloudflare Dashboard → Logs (אחרי שאתה גש ל-`glynk.to/leumit`)
4. מה אתה רואה ב-`npx wrangler tail --env production` (אם יש משהו)


# איך למצוא Triggers/Routes ב-Cloudflare Dashboard

אם אתה לא מוצא "Settings → Triggers", זה יכול להיות כי ה-UI השתנה או שזה במקום אחר.

## Method 1: חפש ישירות ב-Worker

1. **פתח**: https://dash.cloudflare.com
2. **עבור ל**: Workers & Pages → **Workers**
3. **לחץ על**: `goodlink-backend` (לחץ על השם עצמו)
4. **עכשיו תראה כמה tabs/לשוניות:**
   - Overview / סקירה
   - **Triggers** (או **Routes**)
   - Settings / הגדרות
   - Logs
   - Deployments

**חפש את הלשונית "Triggers" או "Routes"** - לחץ עליה!

## Method 2: דרך ה-Settings

1. **Workers & Pages** → **goodlink-backend**
2. **Settings** (או **הגדרות**)
3. **חפש בתוך Settings:**
   - **Triggers** / **Routes**
   - **Custom Domains**
   - **Routes Configuration**

## Method 3: הוסף Route ישירות מה-wrangler.toml

אם אתה לא מוצא את זה ב-Dashboard, נסה להגדיר ב-`wrangler.toml`:

```toml
name = "goodlink-backend"
main = "src/index.js"
compatibility_date = "2024-01-01"

# Routes for production
[env.production]
routes = [
  { pattern = "glynk.to/*", zone_name = "glynk.to" }
]
```

**אבל** - זה דורש שה-domain `glynk.to` יהיה בחשבון Cloudflare שלך.

## Method 4: Custom Domain במקום Route

אם יש לך את ה-domain בחשבון Cloudflare, נסה Custom Domain:

1. **Workers & Pages** → **goodlink-backend**
2. **חפש**: "Custom Domains" או "Domains"
3. **לחץ**: "Add Custom Domain" או "Connect Domain"
4. **הכנס**: `glynk.to`

## Method 5: דרך ה-DNS (אם יש לך את ה-Domain)

אם `glynk.to` בחשבון Cloudflare שלך:

1. **Websites** → **glynk.to**
2. **Workers Routes** (או **Workers**)
3. **לחץ**: "Add route"
4. **Route**: `glynk.to/*`
5. **Worker**: `goodlink-backend`

## Method 6: בדוק דרך wrangler CLI

נסה לראות מה ה-routes הקיימים:

```cmd
cd goodlink-backend
npx wrangler routes list
```

או:

```cmd
npx wrangler deployments list
```

## מה לשלוח

אם אתה עדיין לא מוצא, שלח:
1. **Screenshot** של מה אתה רואה ב-Workers & Pages → goodlink-backend
2. **איזה tabs/לשוניות** אתה רואה (למשל: Overview, Settings, Logs, וכו')
3. **האם `glynk.to` בחשבון Cloudflare שלך?** (Websites → רשימת domains)

## Quick Test: נסה Worker URL ישירות

אם ה-worker מפורסם, יש לו URL כמו:
```
https://goodlink-backend.YOUR-ACCOUNT.workers.dev
```

**נסה:**
```
https://goodlink-backend.YOUR-ACCOUNT.workers.dev/leumit
```

**אם זה עובד:**
- ה-worker רץ, אבל צריך לחבר אותו ל-`glynk.to`
- זה אומר שהבעיה היא רק ב-route configuration

**מה ה-URL של ה-worker שלך?** (מה יצא מ-`npx wrangler deploy --env production`?)


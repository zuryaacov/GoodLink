# Connect Worker to glynk.to Domain

ה-worker עובד מצוין! ✅ אבל הוא רץ רק ב-`goodlink-backend.fancy-sky-7888.workers.dev`.

עכשיו צריך לחבר אותו ל-`glynk.to`.

## Method 1: דרך Cloudflare Dashboard - Custom Domain

1. **Cloudflare Dashboard** → **Workers & Pages** → **goodlink-backend**
2. **Settings** (או לחץ על השם)
3. **חפש**: "Custom Domains" או "Domains" או "Connect Domain"
4. **לחץ**: "Add Custom Domain" או "Connect Domain"
5. **הכנס**: `glynk.to`
6. **שמור**

**זה דורש:**
- שה-domain `glynk.to` בחשבון Cloudflare שלך

## Method 2: דרך DNS - Workers Routes

אם `glynk.to` בחשבון Cloudflare שלך:

1. **Cloudflare Dashboard** → **Websites** → **glynk.to**
2. **Workers Routes** (או **Workers** או **Triggers**)
3. **לחץ**: "Add route" או "Create route"
4. **Route**: `glynk.to/*`
5. **Service**: בחר `goodlink-backend`
6. **שמור**

## Method 3: דרך wrangler.toml (אם ה-domain בחשבון)

אם `glynk.to` בחשבון Cloudflare, ה-`wrangler.toml` כבר מוגדר נכון:

```toml
[env.production]
routes = [
  { pattern = "glynk.to/*", zone_name = "glynk.to" }
]
```

**נסה לפרסם שוב:**
```cmd
cd goodlink-backend
npx wrangler deploy --env production
```

**אם יש שגיאה על zone:**
- ה-domain לא בחשבון Cloudflare
- צריך להוסיף אותו (Method 1 או 2)

## מה לבדוק:

1. **האם `glynk.to` בחשבון Cloudflare שלך?**
   - Dashboard → Websites → רשימת domains

2. **אם כן:**
   - נסה Method 1 או 2
   - או Method 3 (אם wrangler תומך)

3. **אם לא:**
   - צריך להוסיף את ה-domain לחשבון Cloudflare
   - Dashboard → Websites → Add a site → `glynk.to`

## אחרי החיבור:

אחרי שתחבר את ה-worker ל-`glynk.to`:
- `https://glynk.to/leumit` יעבוד
- Click tracking יעבוד
- הכל יעבוד! ✅

## מה לשלוח:

1. **האם `glynk.to` בחשבון Cloudflare שלך?**
2. **מה יצא מ-`npx wrangler deploy --env production`?** (יש שגיאה על zone?)
3. **מה אתה רואה ב-Cloudflare Dashboard** כשאתה מחפש "Custom Domain" או "Workers Routes"?


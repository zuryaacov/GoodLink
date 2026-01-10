# Test Worker Directly

אם אין לוגים, ה-worker לא מקבל requests. בואו נבדוק:

## Step 1: נסה Worker URL ישירות

נסה לגשת ישירות ל-worker URL (לא דרך `glynk.to`):

```
https://goodlink-backend.fancy-sky-7888.workers.dev/leumit
```

**מה אתה רואה בדפדפן?**
- Redirect ל-`https://www.leumit.co.il/`? ✅ ה-worker רץ
- Error? ❌ יש בעיה
- אין כלום? ❌ ה-worker לא רץ

## Step 2: בדוק את הלוגים

```cmd
cd goodlink-backend
npx wrangler tail
```

**ואז נסה לגשת ל:**
```
https://goodlink-backend.fancy-sky-7888.workers.dev/leumit
```

**מה אתה רואה ב-logs?**
- לוגים? ✅ ה-worker רץ
- אין כלום? ❌ ה-worker לא מקבל requests

## Step 3: בדוק ב-Cloudflare Dashboard

1. **Cloudflare Dashboard** → **Workers & Pages** → **goodlink-backend**
2. **לחץ על**: **"Logs"** tab
3. **נסה לגשת ל**: `https://goodlink-backend.fancy-sky-7888.workers.dev/leumit`
4. **בדוק אם יש requests**

**אם יש requests:**
- ה-worker רץ! ✅
- השתמש ב-Cloudflare Dashboard Logs

**אם אין requests:**
- ה-worker לא מקבל requests
- בדוק deployment

## מה לשלוח:

1. **מה אתה רואה בדפדפן** כשלך גש ל-`https://goodlink-backend.fancy-sky-7888.workers.dev/leumit`?
2. **מה אתה רואה ב-`npx wrangler tail`?** (יש לוגים?)
3. **מה אתה רואה ב-Cloudflare Dashboard → Logs?** (יש requests?)


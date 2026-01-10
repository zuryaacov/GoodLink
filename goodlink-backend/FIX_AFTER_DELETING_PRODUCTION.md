# Fix After Deleting goodlink-backend-production

אם מחקת את `goodlink-backend-production`, צריך להגדיר את ה-secrets ב-`goodlink-backend` הרגיל.

## Step 1: בדוק אם יש Secrets ב-goodlink-backend

```cmd
cd goodlink-backend
npx wrangler secret list
```

**אם אתה רואה:**
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```
✅ ה-secrets מוגדרים

**אם אתה לא רואה אותם:**
❌ צריך להוסיף אותם

## Step 2: הוסף Secrets ל-goodlink-backend

```cmd
cd goodlink-backend
npx wrangler secret put SUPABASE_URL
# הדבק: https://magnblpbhyxicrqpmrjw.supabase.co

npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# הדבק את ה-service_role key שלך
```

## Step 3: פרסם את ה-Worker

```cmd
npx wrangler deploy
```

## Step 4: בדוק שה-Worker עובד

```
https://goodlink-backend.fancy-sky-7888.workers.dev/leumit
```

או:
```
https://glynk.to/leumit
```

## Step 5: בדוק ב-Supabase

1. **Supabase Dashboard** → **Table Editor** → **clicks**
2. **בדוק אם יש clicks חדשים**


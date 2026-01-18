# הגדרת VITE_WORKER_URL ב-Vercel

## 🔍 הבעיה

האתר על **Vercel** (`goodlink.ai`) מנסה לשלוח בקשות ל-`goodlink.ai` במקום ל-**Worker** על `glynk.to`.

התוצאה: **405 Method Not Allowed** כי Vercel לא יודע לטפל ב-POST ל-`/api/update-redis-cache`.

## ✅ הפתרון

### 1. עדכן את VITE_WORKER_URL ב-Vercel

**1.1 לך ל-Vercel Dashboard:**
- פרויקט → Settings → Environment Variables

**1.2 הוסף/עדכן משתנה:**
- **Key:** `VITE_WORKER_URL`
- **Value:** `https://glynk.to`
- **Environment:** Production, Preview, Development (כל הסביבות)

**1.3 שמור:**

### 2. Redeploy את האתר ב-Vercel

**חשוב!** אחרת Vercel לא ימשוך את המשתנה החדש.

**דרך 1 - דרך Dashboard:**
- Deployments → לחץ על 3 נקודות → Redeploy

**דרך 2 - דרך Git:**
- עשה commit קטן (למשל שינוי ב-README)
- Push ל-git
- Vercel יבצע deploy אוטומטית

### 3. Deploy את ה-Worker עם הקוד החדש

**ב-Cloudflare Worker:**
```bash
cd goodlink-backend
wrangler deploy
```

**זה יעלה את הקוד עם:**
- ✅ CORS headers נכונים (מותר מ-`goodlink.ai` ל-`glynk.to`)
- ✅ POST handler ל-`/api/update-redis-cache`
- ✅ Upstash Redis SDK

### 4. בדוק שה-Route מוגדר ב-Cloudflare

**1. לך ל-Cloudflare Dashboard:**
- Workers & Pages → goodlink-backend
- Settings → Triggers → Routes

**2. ודא שיש route:**
- `https://glynk.to/*`
- Zone: `glynk.to`
- Worker: `goodlink-backend`

### 5. בדוק שזה עובד

**1. צור לינק חדש באתר**
**2. בדוק ב-Console (F12):**
```
🔄 [RedisCache] Worker URL: https://glynk.to
🔄 [RedisCache] Updating Redis cache...
✅ [RedisCache] Redis cache updated successfully
```

**3. בדוק ב-Network tab:**
- חפש: `/api/update-redis-cache`
- **Request URL:** `https://glynk.to/api/update-redis-cache` (לא `goodlink.ai`!)
- **Status:** 200 ✅

**4. בדוק ב-Upstash Console:**
- Redis Database → Data Browser
- חפש: `link:glynk.to:YOUR_SLUG`

## 🔍 איך לבדוק שה-MV מוגדר נכון ב-Vercel:

**1. ב-Vercel Dashboard:**
- Deployments → בחר deployment אחרון → Logs
- חפש: `VITE_WORKER_URL`

**2. או דרך DevTools:**
- F12 → Console
- הרץ: `console.log(import.meta.env.VITE_WORKER_URL)`
- צריך להציג: `https://glynk.to`

## 📝 סיכום:

1. ✅ **Vercel:** עדכן `VITE_WORKER_URL` ל-`https://glynk.to`
2. ✅ **Vercel:** Redeploy את האתר
3. ✅ **Cloudflare:** Deploy את ה-worker: `wrangler deploy`
4. ✅ **Cloudflare:** ודא route: `glynk.to/*`
5. ✅ **בדוק:** צור לינק חדש ובדוק שה-Console מראה הצלחה

אחרי זה, הבקשות יישלחו מ-`goodlink.ai` ל-`glynk.to` והכל יעבוד! 🚀

## ⚠️ חשוב:

- **CORS:** הקוד ב-worker כבר מוגדר לאפשר בקשות מ-`goodlink.ai`
- **Redeploy חובה:** אחרי עדכון משתני סביבה ב-Vercel, צריך redeploy
- **Route:** צריך route ב-Cloudflare ל-`glynk.to/*`

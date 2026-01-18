# הגדרת VITE_WORKER_URL - פתרון 405

## 🔍 הבעיה

אתה מקבל שגיאה `405 Method Not Allowed` כי `VITE_WORKER_URL` לא מוגדר.

הקוד משתמש ב-`https://www.goodlink.ai` במקום ב-worker URL האמיתי.

## ✅ פתרון מהיר

### 1. מצא את ה-Worker URL שלך

**דרך Cloudflare Dashboard:**
1. לך ל-Cloudflare Dashboard
2. Workers & Pages → goodlink-backend
3. לחץ על "View" או "Preview"  
4. העתק את ה-URL (לדוגמה: `https://goodlink-backend.xxxxx.workers.dev`)

**או דרך CLI:**
```bash
cd goodlink-backend
wrangler deployments list
```

### 2. צור/עדכן `.env.local`

**צור קובץ `.env.local` בתיקייה הראשית של הפרויקט** (אותו מקום שיש את `package.json`):

```env
# Worker URL - הוסף את ה-URL שמצאת
VITE_WORKER_URL=https://goodlink-backend.YOUR_ACCOUNT.workers.dev
```

**או אם ה-worker על domain מותאם:**
```env
VITE_WORKER_URL=https://api.goodlink.ai
```

### 3. Restart את ה-dev server

```bash
# Stop את ה-server (Ctrl+C)
# ואז:
npm run dev
```

### 4. בדוק

כשתצור לינק חדש, תראה ב-console:
```
🔄 [RedisCache] Worker URL: https://goodlink-backend.xxxxx.workers.dev
✅ [RedisCache] Redis cache updated successfully
```

**אם אתה עדיין רואה:**
```
⚠️ [RedisCache] VITE_WORKER_URL not set, using: https://www.goodlink.ai
```

זה אומר שה-`.env.local` לא נטען. ודא:
- הקובץ נקרא `.env.local` (לא `.env` או `.env.local.txt`)
- הקובץ בתיקייה הראשית (אותו מקום שיש `package.json`)
- אתה restart את ה-dev server

## 🔧 אם ה-worker על `goodlink.ai`

אם ה-worker שלך מופנה ל-`https://www.goodlink.ai` דרך Cloudflare Routes, אז:

1. **ודא שה-route מוגדר נכון:**
   - Workers & Pages → goodlink-backend → Settings → Triggers
   - Routes: `https://www.goodlink.ai/*`

2. **ודא שה-worker deployed:**
   ```bash
   cd goodlink-backend
   wrangler deploy
   ```

3. **ודא שה-endpoint `/api/update-redis-cache` קיים:**
   - פתח את `goodlink-backend/src/index.js`
   - בדוק שיש את הקוד:
   ```javascript
   if (pathname === '/api/update-redis-cache' && request.method === 'POST') {
       return await handleUpdateRedisCache(request, env);
   }
   ```

## 🧪 בדיקה מהירה

נסה לגשת ישירות ל-endpoint:

```bash
curl -X POST https://YOUR_WORKER_URL/api/update-redis-cache \
  -H "Content-Type: application/json" \
  -d '{"domain":"test","slug":"test","cacheData":{}}'
```

**אם אתה מקבל 405:**
- ה-worker לא deployed עם הקוד החדש
- Deploy: `cd goodlink-backend && wrangler deploy`

**אם אתה מקבל 500:**
- יש שגיאה ב-worker
- בדוק logs: `wrangler tail`

## 📝 דוגמה לקובץ `.env.local` מלא:

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxx

# Worker URL (הוסף את זה!)
VITE_WORKER_URL=https://goodlink-backend.xxxxx.workers.dev
```

## ⚠️ חשוב:

- `.env.local` לא commit ל-git (כבר ב-`.gitignore`)
- Restart את ה-dev server אחרי שינוי ב-`.env.local`
- ודא שה-worker deployed עם הקוד החדש

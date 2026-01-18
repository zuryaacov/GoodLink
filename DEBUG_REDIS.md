# דיבוג - נתונים לא מופיעים ב-Upstash Redis

## 🔍 שלבי בדיקה

### 1. בדוק את ה-Console בדפדפן

פתח את ה-Developer Tools (F12) ובדוק ב-Console אם יש הודעות:

**אם אתה רואה:**
- `🔄 [RedisCache] Updating Redis cache...` - הקוד ניסה לעדכן
- `✅ [RedisCache] Redis cache updated successfully` - העדכון הצליח
- `❌ [RedisCache] Failed to update Redis cache` - יש בעיה

**אם אתה לא רואה כלום:**
- הפונקציה `updateLinkInRedis` לא נקראת
- בדוק אם הלינק נשמר בהצלחה ב-Supabase

### 2. בדוק את ה-Worker URL

בקוד `src/lib/redisCache.js`, ה-URL של ה-worker נקבע כך:

```javascript
const workerUrl = import.meta.env.VITE_WORKER_URL || window.location.origin.replace(/:\d+$/, '');
```

**בדוק:**
- האם `VITE_WORKER_URL` מוגדר ב-`.env`?
- האם ה-URL שנוצר נכון?
- האם ה-worker זמין ב-URL הזה?

**דוגמה:**
אם האתר שלך ב-`http://localhost:3000`, ה-worker URL יהיה `http://localhost`
אם ה-worker שלך ב-`http://localhost:8787`, תצטרך להגדיר:
```
VITE_WORKER_URL=http://localhost:8787
```

### 3. בדוק את ה-Worker Endpoint

נסה לגשת ישירות ל-endpoint:

```bash
# בדוק אם ה-endpoint קיים
curl -X POST http://YOUR_WORKER_URL/api/update-redis-cache \
  -H "Content-Type: application/json" \
  -d '{"domain":"glynk.to","slug":"test","cacheData":{}}'
```

**אם אתה מקבל 404:**
- ה-endpoint לא קיים
- בדוק אם ה-worker deployed עם הקוד החדש

**אם אתה מקבל 500:**
- יש שגיאה ב-worker
- בדוק את ה-logs של ה-worker

### 4. בדוק את משתני הסביבה ב-Worker

ה-worker צריך את המשתנים הבאים:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

**בדוק ב-Cloudflare Dashboard:**
1. לך ל-Workers & Pages → goodlink-backend → Settings → Variables
2. בדוק אם המשתנים מוגדרים

**או דרך CLI:**
```bash
cd goodlink-backend
wrangler secret list
```

### 5. בדוק את ה-Redis ב-Upstash Console

1. לך ל-Upstash Console → Redis Database
2. לחץ על "Data Browser"
3. נסה לחפש key: `link:YOUR_DOMAIN:YOUR_SLUG`

**אם אין key:**
- הנתונים לא נשמרו
- בדוק את ה-logs

**אם יש key אבל הוא ריק:**
- יש בעיה בשמירה
- בדוק את ה-logs

### 6. בדוק את ה-Logs של ה-Worker

**דרך Cloudflare Dashboard:**
1. לך ל-Workers & Pages → goodlink-backend
2. לחץ על "Logs"
3. חפש הודעות עם `[RedisCache]`

**דרך CLI:**
```bash
cd goodlink-backend
wrangler tail
```

**אם אתה רואה:**
- `🔵 [RedisCache] Updating cache for: ...` - הבקשה הגיעה
- `❌ [RedisCache] Missing Redis configuration` - משתני הסביבה חסרים
- `❌ [RedisCache] Error updating cache` - יש שגיאה בקריאה ל-Redis

### 7. בדוק ידנית את הקריאה ל-Redis

נסה לבדוק אם אתה יכול לקרוא/לכתוב ל-Redis:

```bash
# GET
curl -X POST "https://YOUR_REDIS_URL" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '["GET", "link:glynk.to:test"]'

# SET
curl -X POST "https://YOUR_REDIS_URL" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '["SET", "link:glynk.to:test", "{\"test\":\"data\"}"]'
```

## 🛠️ פתרונות נפוצים

### בעיה: Worker URL לא נכון

**פתרון:**
הוסף ל-`.env.local`:
```
VITE_WORKER_URL=https://your-worker.workers.dev
```

### בעיה: משתני סביבה לא מוגדרים ב-Worker

**פתרון:**
```bash
cd goodlink-backend
wrangler secret put UPSTASH_REDIS_REST_URL
wrangler secret put UPSTASH_REDIS_REST_TOKEN
```

### בעיה: CORS errors

**פתרון:**
ה-worker כבר מוגדר עם CORS headers, אבל אם יש בעיות:
- בדוק שה-worker endpoint מחזיר `Access-Control-Allow-Origin: *`

### בעיה: ה-endpoint לא קיים

**פתרון:**
- ודא שה-worker deployed עם הקוד החדש
- בדוק את `goodlink-backend/src/index.js` שיש את הפונקציה `handleUpdateRedisCache`

## 📝 דוגמת Debugging

פתח את ה-Console בדפדפן ותראה:

```javascript
// הוסף ל-console כדי לבדוק
console.log('Worker URL:', import.meta.env.VITE_WORKER_URL || window.location.origin.replace(/:\d+$/, ''));
```

אז כשאתה יוצר לינק, תראה:
```
🔄 [RedisCache] Updating Redis cache...
🔄 [RedisCache] Worker URL: http://localhost:8787
🔄 [RedisCache] Domain: glynk.to
🔄 [RedisCache] Slug: abc123
✅ [RedisCache] Redis cache updated successfully
```

אם אתה לא רואה את ההודעות האלה, הבעיה היא שהפונקציה לא נקראת.

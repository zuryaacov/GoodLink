# Quick Setup: Environment Variables

אם אתה מקבל שגיאה "Missing required environment variables", המשך עם ההוראות הבאות:

## דרך 1: דרך Cloudflare Dashboard (מומלץ)

1. לך ל-Cloudflare Dashboard: https://dash.cloudflare.com
2. Workers & Pages → lemon-squeezy-webhook
3. Settings → Variables
4. הוסף את המשתנים הבאים:

### LEMON_SQUEEZY_WEBHOOK_SECRET
- ערך: ה-Signing Secret מ-Lemon Squeezy Dashboard → Settings → Webhooks

### SUPABASE_URL
- ערך: ה-Project URL מ-Supabase Dashboard → Settings → API
- דוגמה: `https://xxxxx.supabase.co`

### SUPABASE_SERVICE_ROLE_KEY
- ערך: ה-Service Role Key מ-Supabase Dashboard → Settings → API
- ⚠️ חשוב: זה ה-Service Role Key (לא ה-anon key!)
- זה מפתח ארוך (JWT token)

5. לחץ Save על כל משתנה
6. Deploy שוב את ה-worker:
   ```bash
   cd lemon-squeezy-webhook
   npx wrangler deploy
   ```

## דרך 2: דרך Command Line (wrangler secret put)

```bash
cd lemon-squeezy-webhook

# הגדר LEMON_SQUEEZY_WEBHOOK_SECRET
npx wrangler secret put LEMON_SQUEEZY_WEBHOOK_SECRET
# כשתשאל, הדבק את ה-Signing Secret מ-Lemon Squeezy

# הגדר SUPABASE_URL
npx wrangler secret put SUPABASE_URL
# כשתשאל, הדבק את ה-URL מ-Supabase (למשל: https://xxxxx.supabase.co)

# הגדר SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# כשתשאל, הדבק את ה-Service Role Key מ-Supabase
```

אחרי הגדרת כל ה-secrets, deploy שוב:
```bash
npx wrangler deploy
```

## איך לבדוק שה-variables מוגדרים

```bash
npx wrangler secret list
```

אמור להציג:
```
LEMON_SQUEEZY_WEBHOOK_SECRET
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

## אם עדיין לא עובד

1. ודא ששמרת את כל ה-variables ב-Cloudflare Dashboard
2. ודא שעשית deploy אחרי הגדרת ה-variables
3. בדוק את הלוגים ב-Cloudflare Dashboard → Workers & Pages → lemon-squeezy-webhook → Logs
4. בדוק שהשגיאה השתנתה (אמורה להיות שגיאה אחרת, לא "Missing required environment variables")

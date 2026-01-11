# הגדרת Turnstile Secret Key

כדי שבדיקת Turnstile תעבוד, צריך להגדיר את ה-SECRET KEY.

## שלב 1: קבל את ה-Secret Key

1. **פתח Cloudflare Dashboard**: https://dash.cloudflare.com
2. **עבור ל**: **Turnstile** → **Sites**
3. **מצא את ה-site שלך** (או צור חדש עם SITE-KEY: `0x4AAAAAACL1UvTFIr6R2-Xe`)
4. **העתק את ה-Secret Key**

## שלב 2: הגדר את ה-Secret Key ב-Worker

```powershell
cd goodlink-backend
npx wrangler secret put TURNSTILE_SECRET_KEY
# הדבק את ה-Secret Key ולחץ Enter
```

## שלב 3: פרסם מחדש

```powershell
npx wrangler deploy
```

## בדיקה

אחרי הפרסום, בדוק את הלוגים:

```powershell
npx wrangler tail
```

צריך לראות:
- `🔵 [Turnstile] Token from URL: Present` - אם יש token
- `✅ [Turnstile] Verification successful!` - אם הבדיקה הצליחה

## הערות

- **SITE-KEY**: `0x4AAAAAACL1UvTFIr6R2-Xe` (כבר בקוד)
- **SECRET KEY**: צריך להגדיר כ-environment variable
- Turnstile widget נוסף לדף הגישור (נסתר)
- ה-token נשלח אוטומטית ל-`/verify` endpoint

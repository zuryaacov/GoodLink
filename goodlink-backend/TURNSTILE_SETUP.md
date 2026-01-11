# Cloudflare Turnstile Setup

הוספת בדיקת Cloudflare Turnstile לפני הקריאה ל-Stytch.

## מה נוסף

1. **פונקציית `verifyTurnstile`** - בודקת את ה-token מול Cloudflare Turnstile API
2. **בדיקה ב-`/verify` endpoint** - בודקת את ה-token לפני הקריאה ל-Stytch

## מה צריך להגדיר

### 1. SECRET KEY של Turnstile

צריך להגדיר את ה-SECRET KEY של Turnstile כ-environment variable:

```powershell
cd goodlink-backend
npx wrangler secret put TURNSTILE_SECRET_KEY
# הדבק את ה-Secret Key של Turnstile ולחץ Enter
```

**איך לקבל SECRET KEY:**
1. פתח Cloudflare Dashboard: https://dash.cloudflare.com
2. עבור ל: **Turnstile** → **Sites**
3. מצא את ה-site שלך (או צור חדש)
4. העתק את ה-**Secret Key**

### 2. SITE-KEY

ה-SITE-KEY כבר מוגדר בקוד: `0x4AAAAAACL1UvTFIr6R2-Xe`

### 3. הוספת Turnstile Widget לדף הגישור (אופציונלי)

אם אתה רוצה שהבדיקה תעבוד end-to-end, צריך להוסיף את Turnstile widget לדף הגישור (`getBridgingPage`).

**הוספה לדף הגישור:**
```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<div class="cf-turnstile" data-sitekey="0x4AAAAAACL1UvTFIr6R2-Xe"></div>
```

וה-token יישלח ב-query parameter `cf-turnstile-response` ל-`/verify` endpoint.

## איך זה עובד

1. המשתמש מגיע לדף הגישור (bridging page)
2. Turnstile widget (אם נוסף) יוצר token
3. ה-token נשלח ל-`/verify` endpoint ב-query parameter `cf-turnstile-response`
4. ה-`/verify` endpoint בודק את ה-token מול Cloudflare Turnstile API
5. אם ה-verification עבר, ממשיכים ל-Stytch tracking
6. אם ה-verification נכשל, מחזירים 403

## הערות

- אם אין token (`cf-turnstile-response`), הקוד ממשיך ללא בדיקה (log warning)
- אם יש token אבל ה-verification נכשל, מחזירים 403
- צריך SECRET KEY לאימות server-side (SITE-KEY זה רק ל-client-side)

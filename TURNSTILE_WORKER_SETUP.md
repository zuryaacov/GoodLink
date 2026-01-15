# Turnstile Verification Worker Setup

Worker חדש לאימות Cloudflare Turnstile עבור הרשמה במייל.

## התקנה

1. **התקן dependencies:**
```bash
cd turnstile-verification
npm install
```

2. **הגדר Turnstile Secret Key:**
```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
# הדבק את ה-Secret Key של Turnstile ולחץ Enter
```

3. **Deploy את ה-Worker:**
```bash
npm run deploy
```

## Environment Variables

### ב-Cloudflare Worker:
- `TURNSTILE_SECRET_KEY` - Secret Key של Turnstile (מוגדר כ-secret)

### ב-Vercel (Frontend):
- `VITE_TURNSTILE_SITE_KEY` - Site Key של Turnstile (לצפייה ב-frontend)
- `VITE_TURNSTILE_WORKER_URL` - כתובת ה-Worker (לדוגמה: `https://turnstile-verification.your-subdomain.workers.dev`)

## איך לקבל את המפתחות:

1. **Site Key ו-Secret Key:**
   - פתח [Cloudflare Dashboard](https://dash.cloudflare.com)
   - עבור ל: **Turnstile** → **Sites**
   - מצא את ה-site שלך (או צור חדש)
   - העתק את ה-**Site Key** (ל-`VITE_TURNSTILE_SITE_KEY`)
   - העתק את ה-**Secret Key** (ל-`TURNSTILE_SECRET_KEY` ב-Worker)

2. **Worker URL:**
   - אחרי deploy, תקבל URL מהצורה: `https://turnstile-verification.fancy-sky-7888.workers.dev`
   - העתק אותו ל-`VITE_TURNSTILE_WORKER_URL` ב-Vercel
   - **או** - הקוד כבר כולל את ה-URL הזה כברירת מחדל, אז זה יעבוד גם בלי להגדיר

## בדיקת העבודה:

1. פתח את דף ההרשמה
2. Turnstile widget אמור להופיע אוטומטית
3. מלא את הפרטים
4. הכפתור "Create Account" ייפתח רק אחרי שהאימות הצליח

## Troubleshooting:

- **Widget לא מופיע:** בדוק ש-`VITE_TURNSTILE_SITE_KEY` מוגדר ב-Vercel
- **Verification נכשל:** בדוק ש-`TURNSTILE_SECRET_KEY` מוגדר ב-Worker
- **CORS errors:** ה-Worker כבר כולל CORS headers

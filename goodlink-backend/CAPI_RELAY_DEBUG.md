# CAPI Relay – איך לבדוק ולאבחן

## למה אין רשומה ב-Supabase / לא רואים ב-webhook.site?

### 1. Webhook.site

**במצב production** הבקשות לא נשלחות ל-webhook.site.  
ה-relay הוא `https://glynk.to/api/capi-relay` – QStash שולח **שם**, לא ל-webhook.

- **אם רוצים לראות את ה-body ב-webhook.site:**  
  להגדיר זמנית Secret:  
  `CAPI_RELAY_URL` = `https://webhook.site/YOUR-TOKEN`  
  אז QStash ישלח ל-webhook.site ותראה את ה-POST.  
  (במצב כזה ה-Worker לא מעבד את הבקשה ולכן לא תהיה רשומה ב-`capi_logs`.)

### 2. רשומה ב-`capi_logs` (Supabase)

כדי שיהיו רשומות:

1. **להריץ את המיגרציה**  
   ב-Supabase SQL Editor להריץ את:  
   `supabase-capi-logs-table.sql`  
   (פעם אחת).

2. **לוודא שה-relay מגיע ל-Worker**  
   ב-Cloudflare: Routes של ה-Worker על `glynk.to` צריכים לכלול גם את ה-path של ה-relay, למשל:
   - Route: `glynk.to/*` (כל path), או
   - לפחות: `glynk.to/api/*`  
     כך ש-`POST https://glynk.to/api/capi-relay` יגיע ל-goodlink-backend.

3. **להשאיר Tail פתוח**  
   QStash קורא ל-relay **אחרי** הקליק (שניות אחרי).  
   להריץ:  
   `npx wrangler tail`  
   ולהשאיר פתוח. אחרי קליק, לחכות כמה שניות – אם ה-relay מגיע תראה:
   - `CAPI Relay: received POST`
   - `CAPI Relay: done, inserted N rows into capi_logs`  
     אם אין שום לוג של "CAPI Relay" – הבקשה לא מגיעה ל-Worker (ראוטינג / דומיין).

4. **לינק עם פיקסל CAPI**  
   הלינק חייב לכלול פיקסל עם **CAPI Token** (ולא רק Pixel ID).  
   אם אין פיקסל עם `capi_token` – לא נשלח CAPI ולא תהיה רשומה ב-`capi_logs`.

### 3. סדר פעולות מומלץ

1. להריץ את המיגרציה של `capi_logs` (אם עוד לא).
2. לבדוק Routes ב-Cloudflare: ש-`glynk.to/*` (או `glynk.to/api/*`) מפנה ל-goodlink-backend.
3. להריץ `npx wrangler tail`, לעשות קליק על לינק PRO עם פיקסל CAPI, ולחכות 5–10 שניות.
4. אם מופיע "CAPI Relay: received" אבל "inserted 0" – לבדוק ב-Supabase שהטבלה `capi_logs` קיימת ושהשדות תואמים את הקוד (ולוג "CAPI log insert failed" אם יש).

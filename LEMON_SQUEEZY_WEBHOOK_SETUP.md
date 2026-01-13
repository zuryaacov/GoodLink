# Lemon Squeezy Webhook Setup Guide

מדריך מפורט להקמת webhook handler עבור Lemon Squeezy.

## שלב 1: יצירת טבלת profiles ב-Supabase

1. פתח את Supabase Dashboard
2. לך ל-SQL Editor
3. העתק והדבק את התוכן של `supabase-create-profiles-table.sql`
4. לחץ על Run

זה ייצור:

- טבלת `profiles` עם כל השדות הנדרשים
- Trigger אוטומטי ליצירת profile כשמשתמש נרשם
- Indexes לביצועים טובים יותר

## שלב 2: מציאת Variant IDs

1. לך ל-Lemon Squeezy Dashboard → Products
2. עבור כל תוכנית (START, ADVANCED, PRO):
   - לחץ על התוכנית
   - לחץ על Variant
   - ה-Variant ID מופיע ב-URL או בפרטי המוצר
   - רשם את ה-IDs

**אופציונלי**: אם תרצה להשתמש ב-variant IDs במקום שמות, עדכן את `variantToPlan` ב-`lemon-squeezy-webhook/src/index.js`

## שלב 3: קבלת Webhook Secret

**⚠️ חשוב מאוד:** Lemon Squeezy **לא שולח את ה-signature header** אלא אם הגדרת Signing Secret!

1. לך ל-Lemon Squeezy Dashboard → Settings → Webhooks
2. **אם אתה יוצר webhook חדש:**
   - לחץ על "Create Webhook"
   - **חובה**: הגדר "Signing Secret" - לחץ על "Generate Secret" או "Create Secret"
   - העתק את ה-Secret מיידית (לא תוכל לראות אותו שוב!)
3. **אם יש לך webhook קיים:**
   - לחץ על ה-webhook
   - בדוק אם יש "Signing Secret" מוגדר
   - אם לא - לחץ על "Generate Secret" או "Update Secret"
   - העתק את ה-Secret
4. שמור את ה-Secret במקום בטוח - תצטרך אותו לשלב הבא

## שלב 4: Deployment של ה-Worker

```bash
cd lemon-squeezy-webhook
npm install
npx wrangler login
npx wrangler deploy
```

לאחר ה-deployment, תקבל URL כמו:

```
https://lemon-squeezy-webhook.YOUR_SUBDOMAIN.workers.dev
```

## שלב 5: הגדרת Environment Variables

1. לך ל-Cloudflare Dashboard → Workers & Pages → lemon-squeezy-webhook
2. לך ל-Settings → Variables
3. הוסף את המשתנים הבאים:

### LEMON_SQUEEZY_WEBHOOK_SECRET

- העתק את ה-Signing Secret מ-Lemon Squeezy (שלב 3)

### SUPABASE_URL

- מצא ב-Supabase Dashboard → Settings → API
- העתק את ה-Project URL (למשל: `https://xxxxx.supabase.co`)

### SUPABASE_SERVICE_ROLE_KEY

- מצא ב-Supabase Dashboard → Settings → API
- העתק את ה-Service Role Key (לא ה-anon key!)
- ⚠️ זה מפתח סודי - אל תחלוק אותו

## שלב 6: הגדרת Webhook ב-Lemon Squeezy

1. לך ל-Lemon Squeezy Dashboard → Settings → Webhooks
2. לחץ על "Create Webhook"
3. מלא את הפרטים:
   - **URL**: `https://lemon-squeezy-webhook.YOUR_SUBDOMAIN.workers.dev`
   - **Events**: בחר:
     - ✅ `subscription_created`
     - ✅ `subscription_updated`
     - ✅ `subscription_cancelled`
4. שמור את ה-webhook

## שלב 7: בדיקה

### בדיקת ה-Worker

1. לך ל-Cloudflare Dashboard → Workers & Pages → lemon-squeezy-webhook → Logs
2. בצע רכישה בדיקה ב-Lemon Squeezy
3. בדוק שהלוגים מציגים:
   - "Webhook received"
   - "Profile updated successfully"

### בדיקת Supabase

1. לך ל-Supabase Dashboard → Table Editor → profiles
2. חפש את המשתמש שביצע את הרכישה
3. ודא ש:
   - `plan_type` מעודכן (start/advanced/pro)
   - `subscription_status` הוא "active"
   - `lemon_squeezy_subscription_id` מופיע

## Troubleshooting

### Webhook לא מתקבל

1. בדוק שה-URL נכון ב-Lemon Squeezy
2. בדוק את הלוגים ב-Cloudflare Dashboard
3. ודא שה-environment variables מוגדרים נכון

### "Missing X-Lsq-Signature header" error

**זה הבעיה הנפוצה ביותר!**

Lemon Squeezy לא שולח את ה-header `X-Lsq-Signature` **אלא אם הגדרת Signing Secret**.

**פתרון:**

1. לך ל-Lemon Squeezy Dashboard → Settings → Webhooks
2. לחץ על ה-webhook שלך (או צור חדש)
3. **חשוב מאוד**: ודא שיש לך "Signing Secret" מוגדר
4. אם אין - לחץ על "Generate Secret" או "Create Secret"
5. העתק את ה-Secret
6. עדכן את ה-`LEMON_SQUEEZY_WEBHOOK_SECRET` ב-Cloudflare Dashboard
7. שמור את ה-webhook ב-Lemon Squeezy

**איך לבדוק:**

- אחרי ה-deployment של הקוד החדש, בדוק את הלוגים ב-Cloudflare Dashboard
- אתה אמור לראות את כל ה-headers שמגיעים
- חפש את `X-Lsq-Signature` ברשימה

**אם עדיין אין header:**

- ודא שיצרת/עדכנת את ה-webhook **אחרי** שיצרת את ה-Signing Secret
- נסה למחוק את ה-webhook וליצור אחד חדש

### "Invalid signature" error

1. ודא שה-`LEMON_SQUEEZY_WEBHOOK_SECRET` תואם ל-Signing Secret ב-Lemon Squeezy
2. ודא שהערך לא כולל רווחים או תווים מיותרים
3. ודא שהעתקת את כל ה-Secret כולל כל התווים

### "Missing user_id" error

1. ודא שב-CTASection.jsx ה-user_id נשלח ב-URL:
   ```javascript
   `${plan.checkoutUrl}&checkout[custom][user_id]=${user.id}`;
   ```
2. בדוק שהמשתמש מחובר לפני הרכישה

### Profile לא מתעדכן

1. בדוק שה-`SUPABASE_SERVICE_ROLE_KEY` נכון (Service Role, לא Anon)
2. בדוק שהטבלה `profiles` קיימת ב-Supabase
3. בדוק את הלוגים ב-Cloudflare לפרטים על שגיאות

## זרימת המידע המלאה

1. **משתמש לוחץ על "Get Started"**

   - אם לא מחובר → מועבר ל-`/login?plan=start/advanced/pro`
   - אחרי התחברות → נפתח Lemon Squeezy checkout עם `user_id` ב-custom data

2. **משתמש משלם**

   - Lemon Squeezy מעבד את התשלום
   - Lemon Squeezy שולח webhook ל-Cloudflare Worker

3. **Worker מקבל webhook**

   - מאמת חתימה
   - מפרסר את הנתונים
   - מעדכן את Supabase

4. **Frontend מזהה שינוי**
   - יכול לשאול את Supabase על סטטוס המנוי
   - פותח features בהתאם ל-plan

## Security Best Practices

✅ **תמיד** השתמש ב-Service Role Key (לא Anon Key) ב-Worker
✅ **תמיד** אמת את החתימה לפני עיבוד webhook
✅ **אל תחשוף** את ה-Webhook Secret או Service Role Key בפרונט-אנד
✅ **השתמש ב-RLS** ב-Supabase כדי להגביל גישה לטבלת profiles

## Next Steps

לאחר שה-webhook עובד, תוכל:

1. להוסיף לוגיקה נוספת (למשל, שליחת email אישור)
2. לטפל ב-events נוספים (למשל, `subscription_payment_success`)
3. להוסיף retry logic במקרה של שגיאות
4. ליצור dashboard לניטור subscriptions

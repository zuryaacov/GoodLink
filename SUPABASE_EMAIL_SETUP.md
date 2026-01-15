# Supabase Email Configuration Guide

אם אתה מקבל שגיאה "Error sending confirmation email" (500 Internal Server Error), זה אומר ש-SMTP לא מוגדר או לא תקין ב-Supabase.

## פתרון מהיר: כבה Email Confirmation זמנית

אם אתה צריך שההרשמה תעבוד מיד (ל-testing בלבד):

1. עבור ל: **Authentication** → **Settings** → **Auth**
2. כבה **Enable email confirmations**
3. עכשיו משתמשים יכולים להתחבר מיד בלי אישור אימייל

**⚠️ אזהרה:** זה לא מומלץ ל-production! זה רק ל-testing.

---

## הגדרת Email ב-Supabase (ל-production)

1. פתח [Supabase Dashboard](https://app.supabase.com)
2. בחר את הפרויקט שלך
3. עבור ל: **Authentication** → **Settings** → **Email Templates**
4. ודא ש-**Confirm signup** template קיים

### 2. הגדר Email Provider

Supabase משתמש ב-SMTP לשליחת אימיילים. יש לך שתי אפשרויות:

#### אפשרות א': Supabase Email (מוגבל - רק ל-development)

1. עבור ל: **Authentication** → **Settings** → **SMTP Settings**
2. Supabase מספק SMTP מוגבל בחינם (10 אימיילים/שעה)
3. זה עובד רק ל-development ובדיקות

#### אפשרות ב': SMTP חיצוני (מומלץ ל-production)

**דוגמה עם Gmail:**
1. עבור ל: **Authentication** → **Settings** → **SMTP Settings**
2. הפעל **Enable Custom SMTP**
3. מלא את הפרטים:
   - **Host**: `smtp.gmail.com`
   - **Port**: `587`
   - **Username**: כתובת Gmail שלך
   - **Password**: App Password (לא הסיסמה הרגילה!)
   - **Sender email**: כתובת Gmail שלך
   - **Sender name**: GoodLink

**איך ליצור App Password ב-Gmail:**
1. פתח [Google Account Settings](https://myaccount.google.com/)
2. עבור ל: **Security** → **2-Step Verification** (חייב להיות מופעל)
3. גלול למטה ל-**App passwords**
4. צור App Password חדש בשם "Supabase"
5. העתק את ה-password (16 תווים)
6. הדבק ב-Supabase SMTP settings

**אופציות אחרות:**
- **SendGrid**: חינם עד 100 אימיילים/יום
- **Mailgun**: חינם עד 5,000 אימיילים/חודש
- **AWS SES**: זול מאוד, דורש הגדרה

### 3. בדוק את Site URL

1. עבור ל: **Authentication** → **Settings** → **URL Configuration**
2. ודא ש-**Site URL** מוגדר לכתובת ה-production שלך (לא localhost!)
   - לדוגמה: `https://yourdomain.com` או `https://your-app.vercel.app`
3. הוסף **Redirect URLs**:
   - `https://yourdomain.com/login`
   - `https://your-app.vercel.app/login`
   - `http://localhost:5173/login` (ל-development)

### 4. בדוק את Email Confirmation Settings

1. עבור ל: **Authentication** → **Settings** → **Auth**
2. בדוק את **Enable email confirmations**
   - אם זה **מופעל**: משתמשים חייבים לאשר את האימייל לפני התחברות
   - אם זה **כבוי**: משתמשים יכולים להתחבר מיד (לא מומלץ ל-production)

### 5. בדוק את Email Templates

1. עבור ל: **Authentication** → **Settings** → **Email Templates**
2. בחר **Confirm signup**
3. ודא שה-template כולל:
   - `{{ .ConfirmationURL }}` - זה הלינק לאישור
   - `{{ .Email }}` - כתובת האימייל

**דוגמה ל-template:**
```
Click the link below to confirm your email:

{{ .ConfirmationURL }}

If you didn't sign up, you can ignore this email.
```

### 6. בדוק את ה-Logs

אם עדיין לא מקבלים אימיילים:

1. עבור ל: **Logs** → **Auth Logs**
2. חפש את ה-signup event
3. בדוק אם יש שגיאות

### 7. בדוק את Spam Folder

- לפעמים האימיילים מגיעים ל-Spam
- נסה להוסיף את `noreply@mail.app.supabase.io` ל-contacts

### 8. Test Email (אופציונלי)

1. עבור ל: **Authentication** → **Settings** → **SMTP Settings**
2. לחץ על **Send test email**
3. אם זה לא עובד, יש בעיה ב-SMTP configuration

## Troubleshooting

**בעיה: "Email not sent"**
- בדוק את SMTP settings
- ודא שה-App Password נכון (לא הסיסמה הרגילה)
- בדוק את ה-Logs ב-Supabase

**בעיה: "Invalid redirect URL"**
- ודא שה-Redirect URL מופיע ב-**Redirect URLs** ב-Supabase
- הוסף את כל ה-domains (production, preview, localhost)

**בעיה: "Email confirmation required" אבל אין אימייל**
- בדוק את Spam folder
- ודא ש-SMTP מוגדר נכון
- בדוק את ה-Logs

## Quick Fix: Disable Email Confirmation (רק ל-testing!)

אם אתה רק בודק את המערכת:

1. עבור ל: **Authentication** → **Settings** → **Auth**
2. כבה **Enable email confirmations**
3. עכשיו משתמשים יכולים להתחבר מיד בלי אישור אימייל

**⚠️ אזהרה:** זה לא מומלץ ל-production! תמיד הפעל email confirmation ב-production.

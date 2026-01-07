# הגדרת Google Perspective API

## מה זה Perspective API?

Perspective API הוא כלי של Google Jigsaw לזיהוי תוכן פוגעני, רעיל או לא הולם. הוא חינמי עד 1,000 בקשות ביום.

## שלב 1: קבלת Perspective API Key

1. **היכנס ל-Perspective API:**
   - לך ל: https://developers.perspectiveapi.com/
   - לחץ על **"Get Started"** או **"Request API Access"**

2. **מלא את הטופס:**
   - שם הפרויקט
   - מטרת השימוש (Content Moderation)
   - פרטי קשר

3. **אשר את הבקשה:**
   - Google יאשר את הבקשה (יכול לקחת כמה ימים)
   - תקבל אימייל עם הוראות

4. **קבל את ה-API Key:**
   - לך ל: https://console.cloud.google.com/
   - בחר את הפרויקט שלך
   - לך ל: **APIs & Services** → **Credentials**
   - לחץ על **"Create Credentials"** → **"API Key"**
   - העתק את המפתח

## שלב 2: הוספת המפתח לפרויקט

### עבור פיתוח מקומי (Local Development):

1. **צור/עדכן קובץ `.env.local`** בתיקיית השורש:
   ```
   C:\Users\User\Desktop\goodlink-p\.env.local
   ```

2. **הוסף את השורה הבאה:**
   ```env
   VITE_PERSPECTIVE_API_KEY=your-api-key-here
   ```
   
   **החלף `your-api-key-here` במפתח האמיתי!**

3. **שמור את הקובץ**

4. **הפעל מחדש את שרת הפיתוח:**
   - עצור את השרת (Ctrl+C)
   - הפעל שוב: `npm run dev`

### עבור Vercel (Production):

1. **לך ל-Vercel Dashboard:**
   - https://vercel.com/dashboard
   - בחר את הפרויקט שלך

2. **הוסף Environment Variable:**
   - לך ל: **Settings** → **Environment Variables**
   - לחץ על **"Add New"**
   - מלא:
     - **Name**: `VITE_PERSPECTIVE_API_KEY`
     - **Value**: המפתח שלך
     - **Environment**: בחר את כל הסביבות (Production, Preview, Development)
   - לחץ **"Save"**

3. **Redeploy את האפליקציה:**
   - לך ל: **Deployments**
   - לחץ על ה-3 נקודות (⋯) ליד ה-deployment האחרון
   - בחר **"Redeploy"**

## שלב 3: בדיקה

1. **פתח את ה-Console בדפדפן** (F12 → Console)

2. **הקלד slug ולחץ על "Check"**

3. **בדוק את ההודעות בקונסול:**
   - ✅ אם תראה: `📤 Sending request to Google Perspective API...` - זה עובד!
   - ✅ אם תראה: `✅ Slug passed Perspective API check` - ה-slug בטוח
   - ❌ אם תראה: `🚫 Slug flagged by Perspective API` - ה-slug פוגעני

## איך זה עובד?

Perspective API בודק את ה-slug עבור:
- **TOXICITY** - רעילות כללית
- **SEVERE_TOXICITY** - רעילות חמורה
- **IDENTITY_ATTACK** - התקפה על זהות
- **INSULT** - עלבונות
- **PROFANITY** - קללות
- **THREAT** - איומים

כל קטגוריה מקבלת ציון בין 0-1. אם ציון כלשהו עולה על 0.7 (70%), ה-slug נחשב פוגעני.

## מגבלות

- **חינמי**: עד 1,000 בקשות ביום
- **Rate Limit**: 1 בקשה לשנייה
- **Quota**: אם תגיע למגבלה, תקבל שגיאת 429

## פתרון בעיות

### המפתח לא עובד?

1. **ודא שהמפתח נכון:**
   - המפתח צריך להיות מפתח API מ-Google Cloud Console
   - ודא ש-Perspective API מופעל בפרויקט שלך

2. **ודא שהקובץ `.env.local` נכון:**
   - הקובץ צריך להיות בתיקיית השורש (איפה ש-`package.json`)
   - השם צריך להיות בדיוק `.env.local` (לא `.env.local.txt`)

3. **ודא שהשרת הופעל מחדש:**
   - משתני סביבה נטענים רק כשהשרת מתחיל
   - עצור והפעל מחדש: `npm run dev`

4. **בדוק ב-Console:**
   - פתח F12 → Console
   - חפש: `hasApiKey: true` - זה אומר שהמפתח נמצא

### שגיאת 403 (Forbidden)?

- ודא ש-Perspective API מופעל בפרויקט שלך ב-Google Cloud Console
- לך ל: **APIs & Services** → **Library** → חפש "Perspective API" → לחץ **"Enable"**

### שגיאת 429 (Rate Limit)?

- Perspective API מוגבל ל-1,000 בקשות ביום
- אם הגעת למגבלה, תצטרך לחכות עד למחר
- הקוד משתמש ב-caching כדי למנוע בקשות חוזרות

## דוגמה לקובץ `.env.local` מלא:

```env
# Supabase
VITE_SUPABASE_URL=https://magnblpbhyxicrqpmrjw.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-key-here

# Cloudflare Worker
VITE_SAFETY_CHECK_WORKER_URL=https://url-safety-check.fancy-sky-7888.workers.dev

# Google Perspective API
VITE_PERSPECTIVE_API_KEY=your-perspective-api-key-here
```

## הערות חשובות

- ⚠️ **אל תעלה את `.env.local` ל-Git!** הקובץ כבר ב-`.gitignore`
- 🔒 **שמור על המפתח בסוד** - אל תחלוק אותו
- 💰 Perspective API חינמי עד 1,000 בקשות ביום
- 🚀 **יותר יציב מ-OpenAI** - פחות בעיות rate limiting


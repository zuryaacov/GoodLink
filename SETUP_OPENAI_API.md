# הגדרת OpenAI Moderation API

## למה צריך את זה?

OpenAI Moderation API בודקת את תוכן ה-SLUG כדי למנוע שימוש בתוכן פוגעני או לא הולם.

## שלב 1: קבלת OpenAI API Key

1. **היכנס ל-OpenAI Platform:**
   - לך ל: https://platform.openai.com/api-keys
   - התחבר או צור חשבון

2. **צור API Key חדש:**
   - לחץ על **"Create new secret key"**
   - תן שם למפתח (למשל: "GoodLink Moderation")
   - **העתק את המפתח** - הוא יופיע רק פעם אחת!

## שלב 2: הוספת המפתח לפרויקט

### עבור פיתוח מקומי (Local Development):

1. **צור/עדכן קובץ `.env.local`** בתיקיית השורש של הפרויקט:
   ```
   C:\Users\User\Desktop\goodlink-p\.env.local
   ```

2. **הוסף את השורה הבאה:**
   ```env
   VITE_OPENAI_API_KEY=sk-your-api-key-here
   ```
   
   **החלף `sk-your-api-key-here` במפתח האמיתי שהעתקת!**

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
     - **Name**: `VITE_OPENAI_API_KEY`
     - **Value**: המפתח שלך (sk-...)
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
   - ✅ אם תראה: `📤 Sending request to OpenAI Moderation API...` - זה עובד!
   - ❌ אם תראה: `⚠️ OpenAI API key not configured` - המפתח לא הוגדר נכון

## פתרון בעיות

### המפתח לא עובד?

1. **ודא שהמפתח נכון:**
   - המפתח צריך להתחיל ב-`sk-`
   - אין רווחים לפני או אחרי המפתח

2. **ודא שהקובץ `.env.local` נכון:**
   - הקובץ צריך להיות בתיקיית השורש (איפה ש-`package.json`)
   - השם צריך להיות בדיוק `.env.local` (לא `.env.local.txt`)

3. **ודא שהשרת הופעל מחדש:**
   - משתני סביבה נטענים רק כשהשרת מתחיל
   - עצור והפעל מחדש: `npm run dev`

4. **בדוק ב-Console:**
   - פתח F12 → Console
   - חפש: `hasApiKey: true` - זה אומר שהמפתח נמצא
   - אם רואה `hasApiKey: false` - המפתח לא הוגדר

### עלויות

- OpenAI Moderation API **חינמית** עד 1 מיליון בקשות בחודש
- אין צורך לדאוג מעלויות עבור שימוש רגיל

## דוגמה לקובץ `.env.local` מלא:

```env
# Supabase
VITE_SUPABASE_URL=https://magnblpbhyxicrqpmrjw.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-key-here

# Cloudflare Worker
VITE_SAFETY_CHECK_WORKER_URL=https://url-safety-check.fancy-sky-7888.workers.dev

# OpenAI Moderation API
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here
```

## הערות חשובות

- ⚠️ **אל תעלה את `.env.local` ל-Git!** הקובץ כבר ב-`.gitignore`
- 🔒 **שמור על המפתח בסוד** - אל תחלוק אותו
- 💰 OpenAI Moderation API חינמית עד 1M בקשות/חודש


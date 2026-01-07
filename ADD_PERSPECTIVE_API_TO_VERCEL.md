# הוספת Perspective API Key ל-Vercel

## הבעיה

המפתח `VITE_PERSPECTIVE_API_KEY` לא מוגדר ב-Vercel, אז הבדיקה לא עובדת ב-production.

## פתרון: הוסף את המפתח ב-Vercel

### שלב 1: קבל את ה-API Key

אם עדיין לא יש לך:
1. לך ל: https://developers.perspectiveapi.com/
2. בקשת גישה (יכול לקחת כמה ימים)
3. קבל את המפתח מ-Google Cloud Console

### שלב 2: הוסף ל-Vercel

1. **לך ל-Vercel Dashboard:**
   - https://vercel.com/dashboard
   - התחבר לחשבון שלך

2. **בחר את הפרויקט:**
   - לחץ על הפרויקט שלך (goodlink-p או השם שלך)

3. **לך ל-Settings:**
   - בתפריט העליון, לחץ על **"Settings"**

4. **לך ל-Environment Variables:**
   - בתפריט השמאלי, לחץ על **"Environment Variables"**

5. **הוסף משתנה חדש:**
   - לחץ על **"Add New"** (כפתור כחול)
   - מלא את הפרטים:
     - **Key**: `VITE_PERSPECTIVE_API_KEY`
     - **Value**: המפתח שלך מ-Google Cloud Console
     - **Environment**: בחר את כל הסביבות:
       - ✅ Production
       - ✅ Preview  
       - ✅ Development
   - לחץ **"Save"**

6. **Redeploy את האפליקציה:**
   - לך ל: **Deployments** (בתפריט העליון)
   - לחץ על ה-3 נקודות (⋯) ליד ה-deployment האחרון
   - בחר **"Redeploy"**
   - או פשוט לחץ על **"Redeploy"** אם יש כפתור

### שלב 3: בדיקה

1. **חכה שהדיפלוי יסתיים** (1-2 דקות)

2. **רענן את האתר** (F5)

3. **נסה לבדוק slug:**
   - הקלד slug ולחץ על "Check"
   - פתח Console (F12)
   - תראה: `📤 Sending request to Google Perspective API...`
   - אם זה עובד, תראה: `✅ Slug passed Perspective API check`

## איך לבדוק שהמפתח נוסף

1. **ב-Vercel Dashboard:**
   - לך ל: Settings → Environment Variables
   - תראה את `VITE_PERSPECTIVE_API_KEY` ברשימה

2. **ב-Console של הדפדפן:**
   - פתח F12 → Console
   - תראה: `hasApiKey: true` (במקום `false`)

## פתרון בעיות

### המפתח לא עובד אחרי הוספה?

1. **ודא ש-Redeploy-ת:**
   - משתני סביבה נטענים רק ב-build time
   - צריך ל-redeploy אחרי הוספת משתנה חדש

2. **ודא שהמפתח נכון:**
   - העתק-הדבק את המפתח בזהירות
   - אין רווחים לפני או אחרי

3. **בדוק ב-Console:**
   - אם עדיין רואה `hasApiKey: false`, המפתח לא נטען
   - נסה ל-redeploy שוב

### איך לראות את המפתח ב-Vercel?

- **לא ניתן לראות את הערך** מטעמי אבטחה
- אבל תראה את השם: `VITE_PERSPECTIVE_API_KEY`
- אם אתה רוצה לראות את הערך, תצטרך להסיר ולהוסיף מחדש

## הערות חשובות

- ⚠️ **משתני סביבה נטענים רק ב-build time** - צריך ל-redeploy
- 🔒 **המפתח מוצפן ב-Vercel** - לא ניתן לראות את הערך
- 🚀 **עובד בכל הסביבות** - Production, Preview, Development

## דוגמה למסך Vercel:

```
Environment Variables
┌─────────────────────────────────────┬──────────────┬──────────────┐
│ Key                                │ Value        │ Environment  │
├─────────────────────────────────────┼──────────────┼──────────────┤
│ VITE_SUPABASE_URL                  │ [Encrypted]  │ All          │
│ VITE_SUPABASE_ANON_KEY             │ [Encrypted]  │ All          │
│ VITE_SAFETY_CHECK_WORKER_URL       │ [Encrypted]  │ All          │
│ VITE_PERSPECTIVE_API_KEY           │ [Encrypted]  │ All          │ ← הוסף את זה
└─────────────────────────────────────┴──────────────┴──────────────┘
```

לאחר הוספת המפתח ו-redeploy, הבדיקה אמורה לעבוד! ✅


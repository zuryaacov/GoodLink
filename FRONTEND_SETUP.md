# Frontend Setup - URL Safety Check

## הבעיה: ה-Worker לא נקרא מהאתר

אם ה-worker עובד עם curl אבל לא מהאתר, הבעיה היא שה-environment variable לא מוגדר ב-Vercel.

## פתרון: הוסף Environment Variable ב-Vercel

### שלב 1: לך ל-Vercel Dashboard

1. לך ל-[Vercel Dashboard](https://vercel.com/dashboard)
2. בחר את הפרויקט שלך (`goodlink2`)
3. לך ל-**Settings** → **Environment Variables**

### שלב 2: הוסף את ה-Variable

1. לחץ על **Add New**
2. מלא את הפרטים:
   - **Name**: `VITE_SAFETY_CHECK_WORKER_URL`
   - **Value**: `https://url-safety-check.yaacov-zur.workers.dev`
   - **Environment**: בחר את כל הסביבות (Production, Preview, Development)
3. לחץ **Save**

### שלב 3: Redeploy את האפליקציה

**חשוב!** אחרי הוספת environment variable, צריך ל-redeploy:

1. לך ל-**Deployments**
2. לחץ על ה-3 נקודות ליד ה-deployment האחרון
3. בחר **Redeploy**

או דרך CLI:
```bash
vercel --prod
```

## בדיקה

### 1. פתח את Browser Console

לחץ F12 → Console

### 2. כתוב URL ב-Link Wizard

כשתכתוב URL, תראה בקונסול:
```
🔍 Safety Check Debug: { workerUrl: "...", url: "..." }
📤 Sending safety check request to: ...
📥 Response status: 200 OK
✅ Safety check result: { isSafe: true, threatType: null }
```

### 3. אם רואה שגיאה

**אם רואה:**
```
❌ VITE_SAFETY_CHECK_WORKER_URL not configured
```

זה אומר שה-environment variable לא מוגדר. ודא ש:
- הוספת את ה-variable ב-Vercel
- Redeploy-ת את האפליקציה
- ה-variable נקרא בדיוק: `VITE_SAFETY_CHECK_WORKER_URL`

## בדיקה מקומית (Local Development)

אם אתה מריץ את האפליקציה מקומית, צור קובץ `.env.local`:

```env
VITE_SAFETY_CHECK_WORKER_URL=https://url-safety-check.yaacov-zur.workers.dev
```

**חשוב:** הוסף את `.env.local` ל-`.gitignore` כדי לא לפרסם את ה-URL.

## Troubleshooting

### Worker לא נקרא
- ✅ ודא שה-environment variable מוגדר ב-Vercel
- ✅ ודא ש-redeploy-ת אחרי הוספת ה-variable
- ✅ בדוק את ה-Console בדפדפן לראות שגיאות

### CORS errors
- ה-worker כבר מוגדר עם CORS headers
- אם עדיין יש בעיה, בדוק את ה-Console

### Network errors
- בדוק שה-worker URL נכון
- נסה לפתוח את ה-worker URL בדפדפן (אמור להחזיר error 405 - זה תקין)


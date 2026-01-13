# פתרון: OAuth מחזיר ל-localhost במקום ל-Production

הבעיה היא שה-**Site URL** ב-Supabase Dashboard מוגדר ל-localhost.

## פתרון: עדכן את ה-URL Configuration ב-Supabase

### שלב 1: לך ל-Supabase Dashboard

1. פתח את [Supabase Dashboard](https://supabase.com/dashboard)
2. בחר את הפרויקט שלך
3. לך ל-**Settings** (⚙️) → **Authentication** → **URL Configuration**

### שלב 2: עדכן את ה-Site URL

**Site URL** - זה ה-URL הראשי של האפליקציה:

- **במקום**: `http://localhost:5173`
- **השתמש ב**:
  - אם יש לך domain ייצור: `https://yourdomain.com` (לדוגמה: `https://goodlink.ai`)
  - אם עדיין לא, השתמש ב-Vercel/Cloudflare Pages domain: `https://your-project.vercel.app` או `https://your-project.pages.dev`

### שלב 3: הוסף Redirect URLs

ב-**Redirect URLs**, הוסף את כל ה-URLs שאתה צריך:

```
http://localhost:5173/**
https://yourdomain.com/**
https://your-project.vercel.app/**
https://your-project.pages.dev/**
```

**חשוב:** הוסף את כל ה-domains (local + production) כדי שיעבוד גם בפתח וגם בייצור.

### שלב 4: שמור

לחץ על **Save** בתחתית הדף.

## מה זה עושה?

- **Site URL**: ה-URL הראשי ש-Supabase משתמש בו כ-default redirect
- **Redirect URLs**: רשימה של URLs מותרים - OAuth יעבוד רק עם URLs ברשימה הזו
- **Wildcards (`/**`)**: מאפשרים כל path בתוך ה-domain הזה

## בדיקה

אחרי השמירה, נסה שוב Google OAuth:
- ב-localhost: צריך לעבוד
- ב-production: צריך לעבוד עם ה-domain שלך

## הערה על הקוד

הקוד משתמש ב-`window.location.origin` - זה בסדר! זה אוטומטי ומשתמש ב-URL הנוכחי. הבעיה הייתה ב-Supabase Configuration בלבד.

# הגדרת Google Natural Language API

## מה זה Natural Language API?

Google Natural Language API מספק ניתוח סנטימנט (Sentiment Analysis) שמזהה אם טקסט הוא חיובי, שלילי או ניטרלי. זה משלים את Perspective API לבדיקה מקיפה יותר.

## שלב 1: הפעלת Natural Language API

1. **לך ל-Google Cloud Console:**
   - https://console.cloud.google.com/
   - בחר את הפרויקט שלך (אותו פרויקט של Perspective API)

2. **הפעל את ה-API:**
   - לך ל: **APIs & Services** → **Library**
   - חפש: "Natural Language API"
   - לחץ על **"Enable"**

3. **קבל את ה-API Key:**
   - אם יש לך כבר API Key מ-Perspective API, אפשר להשתמש באותו מפתח
   - או צור מפתח חדש: **APIs & Services** → **Credentials** → **Create Credentials** → **API Key**

## שלב 2: הוספת המפתח לפרויקט

### אפשרות 1: שימוש באותו מפתח של Perspective API

אם אתה משתמש באותו Google Cloud project, אפשר להשתמש באותו API key:
- הקוד ינסה להשתמש ב-`VITE_GOOGLE_NATURAL_LANGUAGE_API_KEY` תחילה
- אם לא קיים, ישתמש ב-`VITE_PERSPECTIVE_API_KEY`

### אפשרות 2: מפתח נפרד

אם אתה רוצה מפתח נפרד:

**עבור פיתוח מקומי:**
```env
VITE_GOOGLE_NATURAL_LANGUAGE_API_KEY=your-api-key-here
```

**עבור Vercel:**
- לך ל: **Settings** → **Environment Variables**
- הוסף: `VITE_GOOGLE_NATURAL_LANGUAGE_API_KEY`
- Value: המפתח שלך
- Environment: All

## איך זה עובד?

1. **Perspective API** בודק רעילות, עלבונות, איומים וכו'
2. **Natural Language API** בודק סנטימנט (חיובי/שלילי)
3. אם **שניהם** עוברים - ה-slug מאושר
4. אם **אחד מהם** נכשל - ה-slug נחסם

## Thresholds

- **Sentiment Score**: -1.0 (שלילי מאוד) עד 1.0 (חיובי מאוד)
- **Sentiment Magnitude**: 0.0 עד אינסוף (עוצמת הרגש)
- **Threshold**: אם score ≤ -0.5 **וגם** magnitude ≥ 0.5 → נחסם

## עלויות

- **חינמי**: עד 5,000 בקשות בחודש
- **שילם**: $1.00 לכל 1,000 בקשות נוספות

## פתרון בעיות

### CORS Error ב-localhost?

- כמו Perspective API, Natural Language API חוסם localhost
- הפתרון: הגדר API key restrictions ב-Google Cloud Console
- או: הקוד ידלג על הבדיקה ב-localhost אוטומטית

### API לא עובד?

1. ודא שהפעלת את Natural Language API בפרויקט
2. ודא שהמפתח נכון
3. בדוק את ה-quota ב-Google Cloud Console

## הערות

- ✅ **משלים את Perspective API** - בדיקה כפולה
- ✅ **חינמי עד 5,000 בקשות/חודש**
- ✅ **אותו API key** - אפשר להשתמש במפתח של Perspective API


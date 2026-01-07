# פתרון בעיית CORS ב-Perspective API

## הבעיה

אם אתה מקבל שגיאת 403 עם הודעה על "localhost blocked", זה אומר ש-Perspective API חוסם בקשות מ-localhost.

## פתרון 1: הגדרת API Key Restrictions (מומלץ)

1. **לך ל-Google Cloud Console:**
   - https://console.cloud.google.com/
   - בחר את הפרויקט שלך

2. **לך ל-API Keys:**
   - **APIs & Services** → **Credentials**
   - לחץ על ה-API Key שלך

3. **הגדר Application Restrictions:**
   - תחת **"Application restrictions"**, בחר **"HTTP referrers (web sites)"**
   - לחץ על **"Add an item"**
   - הוסף:
     - `http://localhost:5173/*`
     - `http://localhost:3000/*` (אם אתה משתמש בפורט אחר)
     - `https://your-domain.com/*` (עבור production)

4. **שמור:**
   - לחץ **"Save"**
   - חכה 1-2 דקות עד שהשינויים ייכנסו לתוקף

## פתרון 2: שימוש ב-Proxy (אלטרנטיבה)

אם אתה לא יכול לשנות את ההגדרות, אפשר להשתמש ב-proxy. אבל זה יותר מסובך ולא מומלץ.

## פתרון 3: בדיקה רק ב-Production

אפשר להשבית את הבדיקה ב-localhost ולהפעיל אותה רק ב-production:

```javascript
// In slugValidation.js
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

if (isLocalhost) {
  console.log('⏭️ Skipping moderation check on localhost');
  return { isSafe: true };
}
```

## איך לבדוק שהפתרון עובד

1. **שנה את ההגדרות ב-Google Cloud Console** (פתרון 1)
2. **חכה 1-2 דקות**
3. **רענן את הדף** (F5)
4. **נסה שוב לבדוק slug**

אם זה עדיין לא עובד, בדוק:
- שהמפתח נכון
- ש-Perspective API מופעל בפרויקט
- שהמגבלות הוגדרו נכון

## הערות

- **CORS** = Cross-Origin Resource Sharing
- Perspective API חוסם localhost כברירת מחדל מטעמי אבטחה
- צריך להגדיר במפורש אילו domains מורשים


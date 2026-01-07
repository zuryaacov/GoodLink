# פתרון שגיאת 400 ב-moderateText

## הבעיה

מקבלים שגיאת 400 (Bad Request) כשקוראים ל-`moderateText` endpoint של Google Natural Language API.

## סיבות אפשריות

1. **moderateText לא זמין ב-API key שלך**
   - `moderateText` הוא feature חדש יותר
   - ייתכן שצריך להפעיל אותו במפורש

2. **API לא מופעל**
   - ודא ש-Natural Language API מופעל בפרויקט

3. **פורמט הבקשה לא נכון**
   - הפורמט הנכון: `{ document: { type: "PLAIN_TEXT", content: "text" } }`

## פתרונות

### פתרון 1: בדוק שהפורמט נכון

הפורמט הנכון:
```json
{
  "document": {
    "type": "PLAIN_TEXT",
    "content": "your text here"
  }
}
```

**אין צורך ב-`encodingType`** - זה גורם לשגיאה!

### פתרון 2: ודא ש-API מופעל

1. לך ל-Google Cloud Console
2. APIs & Services → Library
3. חפש: "Natural Language API"
4. ודא שהוא מופעל (Enabled)

### פתרון 3: בדוק את ה-API Key

1. ודא שהמפתח נכון
2. ודא שיש לו הרשאות ל-Natural Language API
3. נסה ליצור מפתח חדש

### פתרון 4: נסה גרסה אחרת של ה-API

אם `moderateText` לא עובד, אפשר להשתמש ב-`analyzeSentiment` כחלופה:

```javascript
// במקום moderateText, אפשר להשתמש ב-analyzeSentiment
const apiUrl = `https://language.googleapis.com/v1/documents:analyzeSentiment?key=${apiKey}`;
```

אבל זה פחות מדויק למודרציה.

## בדיקה

1. פתח Console (F12)
2. בדוק את השגיאה המדויקת
3. חפש הודעות כמו:
   - "Invalid field" - פורמט לא נכון
   - "not found" - endpoint לא קיים
   - "not available" - feature לא זמין

## הערות

- `moderateText` הוא feature חדש יותר
- ייתכן שצריך להמתין עד שהוא יהיה זמין בפרויקט שלך
- בינתיים, הקוד "fail open" - לא חוסם את המשתמש


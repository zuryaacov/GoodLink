# Quick Test - Step by Step

## ה-Dev Server רץ! ✅

אתה רואה:
```
Ready on http://127.0.0.1:8787
```

## עכשיו:

1. **פתח דפדפן חדש** (Chrome, Firefox, Edge - לא את ה-PowerShell)

2. **גש ל-URL הזה:**
   ```
   http://127.0.0.1:8787/leumit
   ```
   
   **או:**
   ```
   http://localhost:8787/leumit
   ```
   
   (שניהם אמורים לעבוד)

3. **בדוק את ה-PowerShell** - צריך לראות לוגים מיד!

4. **אם אתה רואה redirect** - זה טוב! זה אומר שה-worker עובד.

5. **בדוק את הלוגים ב-PowerShell** - צריך לראות:
   ```
   🔵 Worker started - Request received
   🔵 Request URL: http://127.0.0.1:8787/leumit
   ...
   ```

## אם עדיין אין לוגים:

**נסה:**
1. **לחץ `[b]`** ב-PowerShell כדי לפתוח דפדפן אוטומטית
2. **או נסה URL אחר:**
   ```
   http://127.0.0.1:8787/test
   ```

## מה אתה רואה בדפדפן?

- **301 Redirect** → ה-worker עובד! (אבל אולי אין לוגים)
- **404 Not Found** → ה-worker עובד אבל אין link עם ה-slug הזה
- **500 Error** → יש בעיה ב-worker
- **דף ריק** → יש בעיה

**שלח מה אתה רואה בדפדפן!**


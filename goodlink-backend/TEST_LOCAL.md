# Test Worker Locally - Step by Step

## Step 1: ודא שה-Dev Server רץ

פתח PowerShell ורוץ:

```powershell
cd goodlink-backend
npx wrangler dev
```

**צריך לראות:**
```
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8787
```

**אם אתה רואה שגיאה:**
- בדוק שה-`.dev.vars` קיים ויש בו ערכים
- בדוק שאין שגיאות syntax

## Step 2: פתח דפדפן

פתח דפדפן חדש (לא את ה-PowerShell) וגש ל:

```
http://localhost:8787/leumit
```

**או כל slug אחר שיש לך ב-Supabase**

## Step 3: בדוק את הלוגים ב-PowerShell

**צריך לראות ב-PowerShell:**
```
🔵 Worker started - Request received
🔵 Request URL: http://localhost:8787/leumit
🔵 Request method: GET
🔵 Checking environment variables...
🔵 SUPABASE_URL exists: true
🔵 SUPABASE_SERVICE_ROLE_KEY exists: true
✅ Environment variables OK
Request URL: http://localhost:8787/leumit
Hostname: localhost, Pathname: /leumit
Extracted slug: leumit
Looking up link: slug="leumit", domain="localhost"
...
✅ Link found! ID: ... User ID: ...
🚀 Preparing to track click...
📝 Starting click tracking...
✅ Click tracked successfully!
```

## Step 4: בדוק ב-Supabase

1. פתח Supabase Dashboard
2. Table Editor → **clicks**
3. בדוק אם יש שורה חדשה עם ה-click

## Troubleshooting

### אין לוגים בכלל
- **ודא שה-dev server רץ** - צריך לראות `Ready on http://localhost:8787`
- **ודא שאתה גש ל-URL הנכון** - `http://localhost:8787/leumit` (לא `https://`)
- **נסה לרענן** את הדף (F5)

### רואה "MISSING" ב-environment variables
- **ודא ש-`.dev.vars` קיים** ב-`goodlink-backend/` directory
- **ודא שהערכים נכונים** (לא placeholders)
- **עצור את ה-server** (Ctrl+C) ו**הרץ שוב** `npx wrangler dev`

### רואה "No link found"
- **ודא שיש link ב-Supabase** עם ה-slug הזה
- **בדוק שה-domain נכון** - ב-localhost זה יעבוד עם fallback

### רואה "Cannot track click: Missing link ID or user ID"
- זה אומר שה-query לא החזיר `id` או `user_id`
- **ודא שהקוד המעודכן רץ** - עצור את ה-server והרץ שוב

### ה-Dev Server לא מתחיל
- **בדוק שה-`.dev.vars` קיים**
- **בדוק שאין שגיאות syntax** ב-`.dev.vars`
- **נסה להריץ**: `npx wrangler --version` (לוודא ש-wrangler מותקן)

## Quick Test

אם אתה רוצה לבדוק שהכל עובד:

1. **פתח 2 חלונות PowerShell:**
   - **חלון 1**: `cd goodlink-backend && npx wrangler dev`
   - **חלון 2**: (לבדיקות נוספות)

2. **פתח דפדפן** וגש ל: `http://localhost:8787/leumit`

3. **בדוק את הלוגים** בחלון 1

4. **בדוק ב-Supabase** אם יש click חדש

## אם עדיין לא עובד

שלח:
1. הפלט המלא מ-`npx wrangler dev`
2. מה אתה רואה בדפדפן (status code, error message)
3. האם יש לוגים ב-PowerShell (אפילו חלקיים)


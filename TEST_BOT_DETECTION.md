# איך לבדוק שזיהוי בוטים עובד ו-redirect ל-Google.com

## שיטות בדיקה

### שיטה 1: בדיקה עם curl (הכי פשוט)

פתח PowerShell או Command Prompt והרץ:

```powershell
# בדיקה עם User-Agent של בוט (curl מזוהה כבוט)
# השתמש ב-v כדי לראות את ה-headers (לא -I כי זה HEAD request!)
curl.exe --ssl-no-revoke -v -H "User-Agent: curl/7.68.0" "https://glynk.to/leumit" 2>&1 | Select-String "Location:"

# או בדיקה יותר ברורה עם User-Agent מפורש של בוט
curl.exe --ssl-no-revoke -v -H "User-Agent: Googlebot/2.1 (+http://www.google.com/bot.html)" "https://glynk.to/leumit" 2>&1 | Select-String "Location:"
```

**מה לבדוק:**

- אם זה בוט, אתה צריך לראות `Location: https://www.google.com` בתוצאה
- **⚠️ חשוב:** אל תשתמש ב-`-I` (HEAD request) - המערכת תומכת רק ב-GET requests!
- השתמש ב-`-v` (verbose) כדי לראות את ה-headers ב-curl

### שיטה 2: בדיקה עם PowerShell (מפורט יותר)

```powershell
# בדיקה עם User-Agent של בוט
$headers = @{
    "User-Agent" = "Googlebot/2.1"
}
$response = Invoke-WebRequest -Uri "https://YOUR-DOMAIN.com/YOUR-SLUG" -Headers $headers -MaximumRedirection 0 -ErrorAction SilentlyContinue

# בדוק את ה-Location header
if ($response.Headers.Location -eq "https://www.google.com") {
    Write-Host "✅ Bot detection works! Redirecting to Google.com" -ForegroundColor Green
} else {
    Write-Host "❌ Bot detection failed. Location: $($response.Headers.Location)" -ForegroundColor Red
}
```

### שיטה 3: בדיקה בדפדפן עם Developer Tools

1. פתח את הדפדפן שלך
2. לחץ `F12` כדי לפתוח Developer Tools
3. לך ל-Tab **Network**
4. לחץ על כפתור **Edit and Resend** (או `Ctrl+R` כדי לעשות refresh)
5. שנה את ה-User-Agent header:
   - לחץ על ה-request
   - לחץ על "Edit and Resend"
   - הוסף header: `User-Agent: Googlebot/2.1`
6. שלח את הבקשה
7. בדוק את ה-response headers - אתה אמור לראות `Location: https://www.google.com`

**או שימוש ב-Console:**

```javascript
fetch("https://YOUR-DOMAIN.com/YOUR-SLUG", {
  headers: {
    "User-Agent": "Googlebot/2.1",
  },
  redirect: "manual",
}).then((r) => {
  console.log("Location:", r.headers.get("Location"));
  // אמור להדפיס: https://www.google.com
});
```

### שיטה 4: בדיקה בלוגים של Worker (הכי מדויק)

1. פתח Terminal ב-`goodlink-backend`:

```powershell
cd goodlink-backend
npx wrangler tail
```

2. בחלון נפרד, שלח בקשה עם User-Agent של בוט (GET request, לא HEAD!):

```powershell
curl.exe --ssl-no-revoke -H "User-Agent: curl/7.68.0" "https://glynk.to/leumit"

# או עם Googlebot:
curl.exe --ssl-no-revoke -H "User-Agent: Googlebot/2.1 (+http://www.google.com/bot.html)" "https://glynk.to/leumit"
```

3. בלוגים תראה:

```
🔍 [Bot Detection] Checking for bot signals...
🔍 [Bot Detection] User-Agent: curl/7.68.0
🔍 [Bot Detection] Stytch Verdict: none
🔍 [Bot Detection] Stytch Fraud Score: none
🚫 [Bot Detection] Bot detected via User-Agent pattern
🚫 [Bot Detection] Bot detected - redirecting to www.google.com
🔵 ========== WORKER FINISHED ==========
```

### User-Agent patterns שמזוהים כבוטים

הקוד מזהה את הדפים הבאים כבוטים:

- `bot` - כל User-Agent שמכיל "bot"
- `crawler` - כל User-Agent שמכיל "crawler"
- `spider` - כל User-Agent שמכיל "spider"
- `scraper` - כל User-Agent שמכיל "scraper"
- `curl` - כל User-Agent שמכיל "curl"
- `wget` - כל User-Agent שמכיל "wget"
- `facebookexternalhit` - Facebook bot
- `whatsapp` - WhatsApp bot

### דוגמאות לבדיקה

**⚠️ חשוב: השתמש ב-GET request (לא HEAD) - המערכת תומכת רק ב-GET requests!**

```powershell
# דוגמה 1: curl (מזוהה כבוט) - עם -v כדי לראות headers
curl -v -H "User-Agent: curl/7.68.0" "https://glynk.to/leumit" 2>&1 | Select-String "Location:"

# דוגמה 2: Googlebot - עם -v כדי לראות headers
curl.exe --ssl-no-revoke -v -H "User-Agent: Googlebot/2.1 (+http://www.google.com/bot.html)" "https://glynk.to/leumit" 2>&1 | Select-String "Location:"

# דוגמה 3: Facebook bot
curl -v -H "User-Agent: facebookexternalhit/1.1" "https://glynk.to/leumit" 2>&1 | Select-String "Location:"

# דוגמה 4: User-Agent רגיל (לא בוט) - אמור לעבור ל-target URL
curl -v -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "https://glynk.to/leumit" 2>&1 | Select-String "Location:"

# או עם PowerShell (יותר נקי):
$response = Invoke-WebRequest -Uri "https://glynk.to/leumit" -Headers @{"User-Agent"="Googlebot/2.1"} -MaximumRedirection 0 -ErrorAction SilentlyContinue
$response.Headers.Location
```

### מה לבדוק בתשובה

**אם זה בוט (אמור להיות):**

```
HTTP/1.1 302 Found
Location: https://www.google.com
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
```

**אם זה לא בוט (אמור להיות):**

```
HTTP/1.1 302 Found
Location: https://YOUR-TARGET-URL.com
```

### בדיקה עם Stytch Data

אם Stytch מחזיר verdict או fraud_score:

- Verdict שמכיל: `bad`, `bot`, `fraud` → מזוהה כבוט
- Fraud Score > 80 → מזוהה כבוט

אפשר לבדוק את זה רק עם נתונים אמיתיים מ-Stytch API (לא ניתן לבדוק ידנית).

## סיכום

הדרך הקלה ביותר לבדוק:

1. פתח `wrangler tail` בחלון אחד
2. שלח בקשה עם User-Agent של בוט (כמו `curl`)
3. בדוק בלוגים שאתה רואה `🚫 [Bot Detection] Bot detected`
4. בדוק שה-Location header הוא `https://www.google.com`

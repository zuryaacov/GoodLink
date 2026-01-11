# בדיקה מהירה של זיהוי בוטים

## ⚠️ חשוב: השתמש ב-GET request (לא HEAD)!

המערכת תומכת רק ב-GET requests. `curl -I` שולח HEAD request ולא יעבוד.

## פקודות לבדיקה (PowerShell)

### בדיקה 1: עם Googlebot (מזוהה כבוט)

```powershell
curl.exe --ssl-no-revoke -v -H "User-Agent: Googlebot/2.1 (+http://www.google.com/bot.html)" "https://glynk.to/leumit" 2>&1 | Select-String "Location:"
```

**תוצאה צפויה:** `Location: https://www.google.com`

### בדיקה 2: עם User-Agent רגיל (לא בוט)

```powershell
curl.exe --ssl-no-revoke -v -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "https://glynk.to/leumit" 2>&1 | Select-String "Location:"
```

**תוצאה צפויה:** `Location: https://www.leumit.co.il/` (או ה-target URL שלך)

### בדיקה 3: עם PowerShell (הכי קל לקריאה)

```powershell
$response = Invoke-WebRequest -Uri "https://glynk.to/leumit" -Headers @{"User-Agent"="Googlebot/2.1"} -MaximumRedirection 0 -ErrorAction SilentlyContinue
Write-Host "Location: $($response.Headers.Location)"
```

**אם זה בוט:** `Location: https://www.google.com`  
**אם זה לא בוט:** `Location: https://www.leumit.co.il/`

### בדיקה 4: עם wrangler tail (לראות את הלוגים)

**חלון 1:**
```powershell
cd goodlink-backend
npx wrangler tail
```

**חלון 2:**
```powershell
curl.exe --ssl-no-revoke -H "User-Agent: Googlebot/2.1" "https://glynk.to/leumit"
```

**בלוגים תראה:**
```
🔍 [Bot Detection] Checking for bot signals...
🔍 [Bot Detection] User-Agent: Googlebot/2.1
🚫 [Bot Detection] Bot detected via User-Agent pattern
🚫 [Bot Detection] Bot detected - redirecting to www.google.com
```

## User-Agent patterns שמזוהים כבוטים

- `bot` - כל User-Agent שמכיל "bot"
- `crawler`, `spider`, `scraper`
- `curl`, `wget`
- `facebookexternalhit`, `whatsapp`

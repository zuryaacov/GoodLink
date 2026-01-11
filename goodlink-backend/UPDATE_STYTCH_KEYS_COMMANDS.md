# פקודות לעדכון מפתחות Stytch ל-Production

## שלב 1: קבל את מפתחות ה-Production

1. פתח Stytch Dashboard: https://stytch.com/dashboard
2. עבור ל: API Keys או Settings → API Keys  
3. העתק:
   - **Project ID** (Production) → `STYTCH_PROJECT_ID`
   - **Secret** (Production) → `STYTCH_SECRET`

## שלב 2: עדכן את ה-Secrets

פתח PowerShell והרץ:

```powershell
cd goodlink-backend

# עדכון STYTCH_PROJECT_ID
npx wrangler secret put STYTCH_PROJECT_ID
# הדבק את ה-Project ID של Production ולחץ Enter

# עדכון STYTCH_SECRET  
npx wrangler secret put STYTCH_SECRET
# הדבק את ה-Secret של Production ולחץ Enter
```

## שלב 3: פרסם מחדש

```powershell
npx wrangler deploy
```

## שלב 4: בדוק שהכל עובד

```powershell
npx wrangler tail
```

ואז נסה לגשת ל-link - חפש בלוגים:
- ✅ `✅ [Stytch] Response received` - עובד!
- ❌ `❌ [Stytch] API error: 401` - מפתחות לא נכונים
- ❌ `❌ [Stytch] API error: 404` - צריך לבדוק endpoint

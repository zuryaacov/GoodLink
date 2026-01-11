# עדכון מפתחות Stytch ל-Production

כדי לשנות את מפתחות Stytch מ-test ל-production keys:

## שלב 1: קבל את מפתחות ה-Production מ-Stytch

1. **פתח Stytch Dashboard**: https://stytch.com/dashboard
2. **עבור ל**: API Keys או Settings → API Keys
3. **העתק**:
   - **Project ID** (Production) → זה ה-`STYTCH_PROJECT_ID`
   - **Secret** (Production) → זה ה-`STYTCH_SECRET`

## שלב 2: עדכן את ה-Secrets ב-Cloudflare Workers

### אופציה 1: דרך Command Line (מומלץ)

```powershell
cd goodlink-backend

# עדכון STYTCH_PROJECT_ID
npx wrangler secret put STYTCH_PROJECT_ID
# הדבק את ה-Project ID של Production ולחץ Enter

# עדכון STYTCH_SECRET
npx wrangler secret put STYTCH_SECRET
# הדבק את ה-Secret של Production ולחץ Enter
```

**חשוב:** אחרי עדכון ה-secrets, צריך לפרסם מחדש:
```powershell
npx wrangler deploy
```

### אופציה 2: דרך Cloudflare Dashboard

1. **פתח Cloudflare Dashboard**: https://dash.cloudflare.com
2. **עבור ל**: Workers & Pages → **goodlink-backend**
3. **לחץ על**: Settings → **Variables**
4. **מצא**:
   - `STYTCH_PROJECT_ID` → לחץ על "Edit" והדבק את ה-Project ID החדש
   - `STYTCH_SECRET` → לחץ על "Edit" והדבק את ה-Secret החדש
5. **שמור**

## שלב 3: בדוק שהמפתחות עודכנו

```powershell
cd goodlink-backend
npx wrangler secret list
```

**צריך לראות:**
```
STYTCH_PROJECT_ID
STYTCH_SECRET
```

## שלב 4: פרסם מחדש

```powershell
cd goodlink-backend
npx wrangler deploy
```

## שלב 5: בדוק שה-API עובד

1. **פתח את הלוגים:**
```powershell
cd goodlink-backend
npx wrangler tail
```

2. **נסה לגשת ל-link** (למשל: `https://glynk.to/leumit`)

3. **בדוק את הלוגים:**
   - ✅ אם אתה רואה: `✅ [Stytch] Response received` - המפתחות עובדים!
   - ❌ אם אתה רואה: `❌ [Stytch] API error: 401` - המפתחות לא נכונים
   - ❌ אם אתה רואה: `❌ [Stytch] API error: 404` - צריך לבדוק את ה-API endpoint

## הערות חשובות

- **Test vs Production**: וודא שאתה משתמש במפתחות של Production (לא Test/Development)
- **לא לשתף**: לעולם אל תחלוק את ה-Secret keys שלך
- **אחרי עדכון**: תמיד צריך לעשות `wrangler deploy` אחרי עדכון secrets
- **Local Development**: אם אתה רוצה לבדוק ב-local, עדכן גם את `.dev.vars`:

```bash
# goodlink-backend/.dev.vars
STYTCH_PROJECT_ID=your-production-project-id
STYTCH_SECRET=your-production-secret
```

## פתרון בעיות

### המפתחות לא עובדים?

1. **ודא שהמפתחות נכונים:**
   - בדוק ב-Stytch Dashboard שההעתקת נכון
   - ודא שאתה משתמש במפתחות של Production (לא Test)

2. **ודא שעדכנת נכון:**
   ```powershell
   npx wrangler secret list
   ```
   צריך לראות את שני המפתחות

3. **ודא שפרסמת מחדש:**
   ```powershell
   npx wrangler deploy
   ```

4. **בדוק את הלוגים:**
   ```powershell
   npx wrangler tail
   ```
   חפש שגיאות 401 (Unauthorized) - זה אומר שהמפתחות לא נכונים

# Setup .dev.vars for Local Development

כדי שה-worker יעבוד ב-dev mode (`npx wrangler dev`), צריך להגדיר environment variables ב-`.dev.vars` file.

## Step 1: פתח את הקובץ `.dev.vars`

הקובץ נמצא ב: `goodlink-backend/.dev.vars`

## Step 2: הוסף את ה-Values שלך

1. **פתח Supabase Dashboard**: https://supabase.com/dashboard
2. **עבור ל**: Settings → **API**
3. **העתק**:
   - **Project URL** → זה ה-`SUPABASE_URL`
   - **service_role key** (לא anon key!) → זה ה-`SUPABASE_SERVICE_ROLE_KEY`

4. **פתח** `goodlink-backend/.dev.vars`
5. **החלף**:
   ```
   SUPABASE_URL=https://YOUR-SUPABASE-PROJECT-URL.supabase.co
   ```
   עם ה-URL האמיתי שלך:
   ```
   SUPABASE_URL=https://rmhuczsimvckgheedutk.supabase.co
   ```

6. **החלף**:
   ```
   SUPABASE_SERVICE_ROLE_KEY=YOUR-SUPABASE-SERVICE-ROLE-KEY-HERE
   ```
   עם ה-service_role key האמיתי שלך

## Step 3: שמור את הקובץ

שמור את `.dev.vars` (Ctrl+S)

## Step 4: הרץ שוב את ה-Dev Server

```powershell
cd goodlink-backend
npx wrangler dev
```

עכשיו צריך לראות:
```
🔵 SUPABASE_URL exists: true
🔵 SUPABASE_SERVICE_ROLE_KEY exists: true
✅ Environment variables OK
```

## חשוב: אל תעלה את `.dev.vars` ל-Git!

הקובץ `.dev.vars` כבר ב-`.gitignore`, אז הוא לא יועלה ל-Git.

אבל **ודא** שהוא לא ב-Git:
```powershell
git status
```

אם אתה רואה `.dev.vars` ב-untracked files, זה בסדר (זה אומר שהוא לא ב-Git).

## Production vs Development

- **`.dev.vars`** - רק ל-local development (`npx wrangler dev`)
- **`wrangler secret put`** - ל-production (`npx wrangler deploy`)

אם אתה מפרסם ל-production, צריך גם להגדיר secrets:
```powershell
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

## Troubleshooting

### עדיין רואה "MISSING"
1. ודא שהקובץ `.dev.vars` ב-`goodlink-backend/` directory
2. ודא שהשמות של ה-variables נכונים (בדיוק כמו ב-`wrangler.toml`)
3. ודא שאין רווחים מיותרים או שגיאות כתיב
4. נסה לעצור את ה-dev server (Ctrl+C) ולהריץ שוב

### רואה שגיאה "Invalid API key"
- ודא שאתה משתמש ב-**service_role key**, לא ב-anon key
- service_role key מתחיל בדרך כלל עם `eyJ...` (JWT token)

### רואה שגיאה "401 Unauthorized"
- זה אומר שה-key לא נכון
- ודא שהעתקת את כל ה-key (יכול להיות ארוך מאוד)
- נסה להעתיק שוב מ-Supabase Dashboard


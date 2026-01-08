# Check Link in Supabase

אם אתה רואה "Link not found", צריך לבדוק מה יש ב-Supabase.

## Step 1: בדוק ב-Supabase מה יש ב-links table

פתח Supabase Dashboard → SQL Editor והרץ:

```sql
-- בדוק את כל ה-links עם slug "leumit"
SELECT id, user_id, slug, domain, target_url, status 
FROM links 
WHERE slug = 'leumit';
```

**צריך לראות:**
- `slug` = 'leumit'
- `domain` = 'glynk.to' (או 'localhost' או משהו אחר)
- `target_url` = 'https://www.leumit.co.il/'
- `status` = true

## Step 2: בדוק מה ה-domain ב-link

אם אתה רואה שהדומיין הוא לא `glynk.to`, צריך לעדכן:

```sql
-- עדכן את ה-domain ל-glynk.to
UPDATE links 
SET domain = 'glynk.to' 
WHERE slug = 'leumit';
```

## Step 3: בדוק אם יש link עם domain הנכון

```sql
-- בדוק אם יש link עם slug ו-domain
SELECT id, user_id, slug, domain, target_url, status 
FROM links 
WHERE slug = 'leumit' AND domain = 'glynk.to';
```

**אם אין שורה:**
- צריך לעדכן את ה-domain (Step 2)

**אם יש שורה:**
- הבעיה היא בזה שה-worker לא מוצא את זה
- צריך לבדוק את הלוגים

## Step 4: בדוק את הלוגים ב-Tail

ב-CMD עם `npx wrangler tail --env production`, צריך לראות:

```
Looking up link: slug="leumit", domain="glynk.to"
Querying Supabase: https://magnblpbhyxicrqpmrjw.supabase.co/rest/v1/links?slug=eq.leumit&domain=eq.glynk.to&...
Supabase returned 0 result(s)
```

**אם אתה רואה `Supabase returned 0 result(s)`:**
- ה-query לא מוצא את ה-link
- יכול להיות שה-domain לא נכון
- יכול להיות שיש בעיה עם ה-query

**אם אתה רואה שגיאה אחרת:**
- יכול להיות שה-secrets לא מוגדרים
- יכול להיות שיש בעיה עם ה-Supabase API

## Step 5: עדכן את כל ה-Links ל-domain הנכון

אם יש לך links עם domain לא נכון, עדכן אותם:

```sql
-- עדכן את כל ה-links עם domain לא נכון
UPDATE links 
SET domain = 'glynk.to' 
WHERE domain = 'localhost' OR domain = 'goodlink.ai' OR domain = 'glynk.io';
```

**או עדכן רק את ה-link הספציפי:**

```sql
UPDATE links 
SET domain = 'glynk.to' 
WHERE slug = 'leumit';
```

## מה לשלוח

שלח:
1. מה אתה רואה ב-SQL query (Step 1) - מה ה-domain של ה-link?
2. מה אתה רואה ב-tail logs (Step 4) - מה ה-query ואיך ה-response?
3. האם אתה רואה `Supabase returned 0 result(s)` או שגיאה אחרת?


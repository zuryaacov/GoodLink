# מפת בדיקות שדות קלט באתר (Input Validation Map)

מסמך זה מתאר לכל דף ולכל שדה קלט אילו בדיקות מתבצעות. כשהבדיקות משתנות לפי בחירה בשדה אחר, מפורטות כל האפשרויות.

---

## 1. דף התחברות / הרשמה (AuthPage)

**נתיב:** `src/pages/AuthPage.jsx`

### 1.1 מצב Sign In (התחברות)

| שדה               | חובה            | בדיקות                      |
| ----------------- | --------------- | --------------------------- |
| **Email Address** | כן (`required`) | פורמט email (דפדפן), לא ריק |
| **Password**      | כן (`required`) | לא ריק                      |

**הערות:** אין בדיקת אורך סיסמה בהתחברות. אימות מול Supabase.

---

### 1.2 מצב Sign Up (הרשמה)

| שדה                         | חובה            | בדיקות                                                                                                                                           |
| --------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Full Name**               | כן (`required`) | לא ריק (trim), **מינימום 2 תווים**, **מקסימום 20 תווים**. נשמר כ־`full_name` ב־user metadata.                                                    |
| **Email Address**           | כן (`required`) | פורמט email (דפדפן) + **regex נוסף:** `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$` – חייב @ ו־TLD בן 2+ תווים.                                                |
| **Password**                | כן (`required`) | **אורך:** מינימום 8, **מקסימום 15** תווים. **תוכן:** לפחות אות גדולה (A-Z), לפחות אות קטנה (a-z), לפחות ספרה (0-9). הודעת שגיאה ספציפית לכל חסר. |
| **Confirm Password**        | כן (`required`) | חייב להיות זהה ל־Password. הודעת שגיאה: "Passwords do not match".                                                                                |
| **Website (honeypot)**      | לא (שדה נסתר)   | אם יש תוכן – הרשמה נחסמת בשקט (זיהוי בוט). אין הודעת שגיאה למשתמש.                                                                               |
| **Turnstile (אימות אנושי)** | כן בהרשמה       | חייב token תקף. אם חסר: "Please complete the security verification". אימות דרך Worker; כישלון: "Security verification failed. Please try again." |

**סדר בדיקות בהרשמה:**  
שם מלא (אורך 2–20) → email (regex) → אורך סיסמה (8–15) → אות גדולה/קטנה/ספרה → התאמת סיסמאות → honeypot → Turnstile → שליחה ל־Supabase.

---

### 1.3 מצב Forgot Password (שכחתי סיסמה)

| שדה               | חובה            | בדיקות                                                              |
| ----------------- | --------------- | ------------------------------------------------------------------- |
| **Email Address** | כן (`required`) | פורמט email, לא ריק. שליחה ל־`supabase.auth.resetPasswordForEmail`. |

---

## 2. הוספת דומיין (Add Domain)

**נתיבים:**

- `src/pages/dashboard/AddDomainPage.jsx`
- `src/components/dashboard/DomainWizardOnePerPage.jsx`
- `src/components/dashboard/AddDomainModal.jsx`

**ספריות:** `domainValidation.js`, `urlValidation.js`.

### 2.1 שדה: Domain (שם הדומיין)

| בדיקה      | תיאור                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------- |
| לא ריק     | אחרי trim – "Domain must be a non-empty string" / "Domain is empty after sanitization".     |
| אורך       | מקסימום 253 תווים.                                                                          |
| ניקוי      | הסרת פרוטוקול (http/https), הסרת `www.`, הסרת path/query/fragment ו־port. המרה ל־lowercase. |
| localhost  | לא מאושר (אלא אם `allowLocalhost: true`).                                                   |
| IP         | לא מאושר (אלא אם `allowIP: true`).                                                          |
| תווים      | רק a-z, 0-9, מקף, נקודה; Punycode רק אם `allowPunycode`.                                    |
| TLD        | חובה לפחות 2 חלקים (domain.tld); TLD לפחות 2 תווים, רק אותיות.                              |
| Labels     | כל label עד 63 תווים; לא להתחיל/להסתיים במקף.                                               |
| רשימת TLDs | תמיכה ב־TLD דו־חלקי (co.il, co.uk, com.au וכו') לפי `domainValidation.js`.                  |

**אפשרויות קריאה:** `validateDomain(name, { allowSubdomains: true, allowPunycode: true, requireTLD: true, allowLocalhost: false, allowIP: false })`.  
בהצלחה מחזיר `sanitized` לשימוש בשמירה.

---

### 2.2 שדה: Root Redirect (הפניה משורש – אופציונלי)

**מתי נבדק:** רק אם המשתמש מזין ערך (לא ריק אחרי trim).

| בדיקה       | תיאור                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| פורמט URL   | אותן בדיקות כמו ב־`validateUrl()` (ראו סעיף "בדיקות URL כלליות" למטה).                                                                |
| אורך דומיין | אחרי פירוק ה־URL, שם הדומיין (ללא www) חייב להיות לפחות 3 תווים (או "www"). הודעת שגיאה: "Domain name must be at least 3 characters". |

**אם השדה ריק:** נחשב תקין (שדה אופציונלי).  
**מקום הבדיקה:** `AddDomainPage` – `validateRootRedirectUrl`; `AddDomainModal` – `validateRootRedirectUrl` (כולל רשימת two-part TLDs לזיהוי שם הדומיין).

---

## 3. יצירת / עריכת לינק (Link Builder / Link Wizard)

**נתיבים:**

- `src/pages/dashboard/LinkBuilderPage.jsx`
- `src/components/dashboard/LinkWizardOnePerPage.jsx`
- `src/components/dashboard/wizard/Step1FastTrack.jsx`
- `src/components/dashboard/wizard/Step3Security.jsx`

**ספריות:** `urlValidation.js`, `slugValidation.js`.

### 3.1 Step 1 – פרטי לינק (URL, Name, Slug)

הסדר בבדיקה לפני "Check" / שליחה: **קודם URL, אחר כך Name, אחר כך Slug.**

#### 3.1.1 שדה: Target URL (כתובת יעד)

| בדיקה           | תיאור                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------ | --- |
| לא ריק          | "URL cannot be empty" / "URL is required".                                                       |
| רווחים          | אסורים בתוך ה־URL.                                                                               |
| תווים אסורים    | אסור: `<>"{}                                                                                     | \^` |
| פרוטוקול        | מותר: http, https, ftp, ftps, ws, wss. אחרת – הודעת שגיאה.                                       |
| פורמט URL       | ניתוח עם `new URL()`; hostname תקין (domain / IPv4 / IPv6 / localhost).                          |
| דומיין          | פורמט דומיין, ללא `--`, חלקי דומיין לא מתחילים/מסתיימים במקף.                                    |
| TLD             | לפחות 2 חלקים; TLD לפחות 2 אותיות; TLD מתוך רשימת TLDs מוכרים.                                   |
| דומיינים חשודים | subdomain קצר על דומיין מוכר (google, facebook וכו') – חסימה אלא אם ברשימת subdomains לגיטימיים. |
| FQDN            | בדיקה עם validator (isFQDN).                                                                     |
| Port            | אם קיים: 1–65535.                                                                                |
| נורמליזציה      | אם לא הוזן פרוטוקול – מוסיפים `https://`. המחרוזת המנורמלת מוחזרת ונשמרת.                        |

**בדיקות נוספות (API):**

- **Safety check** – שירות חיצוני (למשל Safe Browsing).
- **גlynk.to** – אם ה־URL מפנה ל־glynk.to – נכשל.
- **קיום URL** – בדיקה שה־URL נגיש (לפי הלוגיקה בפרויקט).

---

#### 3.1.2 שדה: Link Name (שם הלינק)

| בדיקה               | תיאור                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------- |
| לא ריק              | "Name is required" (אחרי trim).                                                              |
| כפילות (אם רלוונטי) | בדיקה מול בסיס הנתונים – שם זהה לאותו משתמש (case-insensitive). אם קיים – הודעת שגיאה בהתאם. |

---

#### 3.1.3 שדה: Slug (נתיב קצר)

| בדיקה          | תיאור                                                                                                                                                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| לא ריק         | "Slug cannot be empty".                                                                                                                                                                                                                                                               |
| אורך           | 3–30 תווים (אחרי lowercase).                                                                                                                                                                                                                                                          |
| תווים מותרים   | רק a-z, 0-9, מקף (-). אותיות אנגליות בלבד (לא Cyrillic/Greek lookalike).                                                                                                                                                                                                              |
| מקפים          | אסור `--`; אסור להתחיל או לסיים במקף.                                                                                                                                                                                                                                                 |
| נורמליזציה     | המרה אוטומטית ל־lowercase.                                                                                                                                                                                                                                                            |
| זמינות         | בדיקה ב־DB: לפי domain – ב־glynk.to בדיקה גלובלית, בדומיין מותאם רק אצל המשתמש. תמיכה ב־excludeLinkId בעריכה.                                                                                                                                                                         |
| תוכן (מודרציה) | רשימת מילים חסומות (BLOCKED_WORDS) – **התאמה מדויקת לפי מילה** (לא substring). ביטויים מרובי-מילים נבדקים כ-phrase מלא. אם ה־slug מכיל מילה/ביטוי מהרשימה – "This slug contains inappropriate content and cannot be used." בנוסף ייתכן שימוש ב־API חיצוני (Perspective API) למודרציה. |

**פונקציות:** `validateSlugFormat(slug)` לבדיקות פורמט; `validateSlug(slug, domain, userId, supabase, excludeLinkId)` לבדיקה מלאה כולל זמינות ומודרציה.

---

### 3.2 Step 3 – אבטחה (Bot Fallback, כללי גיאו)

#### 3.2.1 שדה: Bot Fallback URL (כתובת הפניה לבוטים)

**מתי נבדק:** רק כאשר **Bot Action = "Redirect"** (הפניה לבוטים ל־URL אחר).

| בדיקה      | תיאור                                                                                   |
| ---------- | --------------------------------------------------------------------------------------- |
| לא ריק     | "Please enter a redirect URL for bots".                                                 |
| פורמט URL  | אותן בדיקות כמו ב־`validateUrl()` (ראו "בדיקות URL כלליות").                            |
| glynk.to   | אם ה־URL הוא ל־glynk.to – "Redirect cannot be to glynk.to. Please use a different URL." |
| נורמליזציה | אם התקבל – העדכון עם `normalizedUrl`.                                                   |

**אם Bot Action שונה מ־Redirect:** השדה לא נדרש ולא נבדק.

---

#### 3.2.2 כללי גיאו (Geo Rules) – Country + URL

כל regel = מדינה + כתובת.

| שדה         | חובה | בדיקות                                                                                                                                                                 |
| ----------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Country** | כן   | "Please select a country" אם ריק. ערך נבחר מרשימת countries (`countries.json`). **בדיקת כפילות** – "A rule for this country already exists" אם כבר קיים כלל למדינה זו. |
| **URL**     | כן   | לא ריק – "Please enter a URL". פורמט – `validateUrl()`; **חסימת glynk.to** – "Redirect cannot be to glynk.to."; שמירה עם `normalizedUrl`.                              |

---

### 3.3 שליחת טופס הלינק (Submit)

| בדיקה        | תיאור                                                             |
| ------------ | ----------------------------------------------------------------- |
| Target URL   | חובה; הודעת שגיאה: "Target URL is required".                      |
| Link Name    | חובה; "Link name is required. Please enter a name for your link." |
| Fallback URL | אם Bot Action = Redirect – חובה ועובר את כל בדיקות 3.2.1.         |

בנוסף נקרא `validateBeforeSubmit()` (למשל מ־Step3Security) כדי לוודא fallback כש־botAction === 'redirect'.

---

## 4. בדיקות URL כלליות (validateUrl – urlValidation.js)

משמש: Target URL, Root Redirect, Bot Fallback, Geo Rule URL.

| #   | בדיקה                                      | הודעת שגיאה / תיאור                                                                                         |
| --- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 0   | null / undefined / לא string               | "URL cannot be empty" (guard חדש)                                                                           |
| 1   | לא ריק (אחרי trim)                         | "URL cannot be empty"                                                                                       |
| 2   | ללא רווחים                                 | "URL cannot contain spaces"                                                                                 |
| 3   | ללא תווים: `<>"{}                          | \^`                                                                                                         | "URL contains invalid characters" |
| 4   | פרוטוקול תקף (אם הוזן)                     | "Invalid protocol: ... Only http, https, ftp, ftps, ws, and wss are allowed."                               |
| 5   | ניתן לפרסור כ־URL                          | "Invalid URL format"                                                                                        |
| 6   | יש hostname                                | "URL must contain a domain"                                                                                 |
| 7   | פורמט דומיין (regex + IPv4/IPv6/localhost) | "Invalid domain format"                                                                                     |
| 8   | ללא `--` בדומיין                           | "Domain cannot contain consecutive hyphens (--)."                                                           |
| 9   | חלקי דומיין לא מתחילים/מסתיימים במקף       | "Domain parts cannot start or end with a hyphen"                                                            |
| 10  | לפחות 2 חלקים (domain + TLD)               | "Invalid domain format. Domain must include a top-level domain (TLD)."                                      |
| 11  | TLD לפחות 2 תווים, רק אותיות               | "Invalid domain format. Top-level domain (TLD) must be at least 2 characters" / "must contain only letters" |
| 12  | TLD מתוך רשימה מוכרת (כש־2 חלקים)          | "... is not a recognized top-level domain (TLD)."                                                           |
| 13  | דפוסי TLD כפול (למשל .com.co)              | רשימת double TLDs לגיטימיים; אחרת – "Invalid domain format. ... is not a recognized domain extension."      |
| 14  | FQDN (validator)                           | "Domain must be a fully qualified domain name (FQDN) with a valid TLD."                                     |
| 15  | Port (אם קיים)                             | 1–65535                                                                                                     |
| 14b | **localhost / private IP חסום**            | "Localhost and private IP addresses are not allowed" (127.x, 10.x, 192.168.x, 172.16-31.x, 169.254.x)       |
| 15  | FQDN (validator)                           | "Domain must be a fully qualified domain name (FQDN) with a valid TLD."                                     |
| 16  | Port (אם קיים)                             | 1–65535                                                                                                     |
| 17  | subdomain חשוד על דומיין מוכר              | "Suspicious subdomain detected. ... may be a typo or phishing attempt."                                     |
| 18  | דומיין קצר מדי (חלק ראשון ≤1 תו)           | "Domain name is too short."                                                                                 |

החזרה בהצלחה: `{ isValid: true, normalizedUrl }` (כולל הוספת https אם לא הוזן).

---

## 5. פיקסלים (Pixel Builder / Pixel Modal)

**נתיבים:**

- `src/pages/dashboard/PixelBuilderPage.jsx`
- `src/components/dashboard/PixelModal.jsx`
- `src/components/dashboard/PixelWizardOnePerPage.jsx`

**ספריית ולידציה משותפת:** `src/lib/pixelValidation.js` – כל לוגיקת הבדיקות מרוכזת בקובץ אחד.

בדיקות ה־Pixel ID ו־CAPI Token **תלויות בפלטפורמה הנבחרת**.

### 5.1 שדה: Platform (פלטפורמה)

בחירה מתוך: Meta (Facebook), Instagram, TikTok, Google Ads, Snapchat, Outbrain, Taboola.  
קובע אילו כללי פורמט חלים על Pixel ID ו־CAPI Token.

---

### 5.2 שדה: Friendly Name (שם הפיקסל)

| בדיקה    | תיאור                                                                                              |
| -------- | -------------------------------------------------------------------------------------------------- |
| לא ריק   | "Friendly name is required" (אחרי trim).                                                           |
| **אורך** | **מקסימום 100 תווים** – "Friendly name cannot exceed 100 characters".                              |
| כפילות   | בדיקה ב־DB: אותו משתמש, שם זהה (case-insensitive). הודעה: "A pixel with this name already exists." |

---

### 5.3 שדה: Pixel ID / Measurement_Id / Account Id

התווית משתנה לפי פלטפורמה (למשל "Pixel ID", "Measurement_Id", "Account Id").  
כל הבדיקות על ערך אחרי trim.

| פלטפורמה      | חובה | פורמט / בדיקה                                                                                                                  |
| ------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Meta**      | כן   | בדיוק 15 או 16 ספרות: `^\d{15,16}$`. הודעת שגיאה: "Must be exactly 15 or 16 digits."                                           |
| **Instagram** | כן   | כמו Meta – 15 או 16 ספרות.                                                                                                     |
| **TikTok**    | כן   | בדיוק 18 תווים: A–Z, 0–9 (אותיות גדולות). "Must be exactly 18 characters (uppercase A-Z and 0-9)."                             |
| **Google**    | כן   | מתחיל ב־G- ואחריו 8–15 תווים alphanumeric: `^G-[a-zA-Z0-9]{8,15}$`. "Must start with G- followed by 8–15 letters and numbers." |
| **Snapchat**  | כן   | UUID: 8-4-4-4-12 (hex). "Must be a valid UUID (36 characters)."                                                                |
| **Outbrain**  | כן   | בדיוק 32 תווים hex (0-9, a-f). "Must be exactly 32 lowercase hex characters."                                                  |
| **Taboola**   | כן   | 6–8 ספרות. "Must be between 6 and 8 digits."                                                                                   |

אם הפורמט לא תואם – "Invalid [Platform] [Label] format. [הודעה ספציפית]."

---

### 5.4 שדה: CAPI Access Token (אופציונלי)

אם השדה **ריק** – לא מתבצעות בדיקות (השדה אופציונלי).  
אם יש תוכן – הבדיקות לפי פלטפורמה (על ערך אחרי trim):

| פלטפורמה             | אורך           | תווים מותרים         | הודעת שגיאה                                                                                          |
| -------------------- | -------------- | -------------------- | ---------------------------------------------------------------------------------------------------- |
| **Meta / Instagram** | 180–250        | רק A-Z, a-z, 0-9     | "Access Token must be 180-250 characters" / "must contain only letters and numbers"                  |
| **TikTok**           | בדיוק 64       | רק A-Z, a-z, 0-9     | "TikTok Access Token must be 64 characters" / "only letters and numbers"                             |
| **Google**           | בדיוק 22       | A-Z, a-z, 0-9, \_, - | "Google Api_Secret must be exactly 22 characters" / "only letters, numbers, underscores and hyphens" |
| **Snapchat**         | ללא מגבלת אורך | A-Z, a-z, 0-9, \_, - | "Snapchat Access Token must contain only letters, numbers, underscores and hyphens"                  |
| **Outbrain**         | 30–40          | רק A-Z, a-z, 0-9     | "Outbrain Access Token must be 30-40 characters" / "only letters and numbers"                        |
| **Taboola**          | 30–45          | רק A-Z, a-z, 0-9     | "Taboola Client Secret must be 30-45 characters" / "only letters and numbers"                        |

---

### 5.5 שדות תלויים באירוע (Events)

**מתי נבדקים:** לפי סוג האירוע שנבחר (eventType).

| תנאי                       | שדה נבדק          | בדיקה                                   |
| -------------------------- | ----------------- | --------------------------------------- |
| **Taboola**                | Event Type (Name) | "Name is required" אם ריק.              |
| **Outbrain**               | Conversion Name   | "Conversion Name is required" אם ריק.   |
| **eventType === 'custom'** | Custom event name | "Custom event name is required" אם ריק. |

---

## 6. UTM Presets (UtmPresetBuilder / UtmPresetBuilderPage)

**נתיבים:**

- `src/pages/dashboard/UtmPresetBuilderPage.jsx`
- `src/components/dashboard/UtmPresetBuilder.jsx`
- `src/components/dashboard/UtmPresetWizardOnePerPage.jsx`

### 6.1 שדה: Preset Name (שם הפריסט)

| בדיקה    | תיאור                                                                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| לא ריק   | "Preset name is required" (אחרי trim).                                                                                                                                                |
| **אורך** | **מקסימום 100 תווים** – "Preset name cannot exceed 100 characters".                                                                                                                   |
| כפילות   | בדיקה ב־DB: אותו משתמש, שם זהה (case-insensitive, ilike). בעריכה – מתעלמים מהפריסט הנוכחי. הודעת שגיאה: "A UTM preset with this name already exists. Please choose a different name." |

---

### 6.2 שדות UTM (utm_source, utm_medium, utm_campaign, utm_content, utm_term)

השדות אופציונליים ונשמרים כ־string או null.  
**אורך מקסימלי:** כל שדה UTM מוגבל ל־**250 תווים** (מגבלת GA/דפדפן). הודעת שגיאה: "UTM [field] cannot exceed 250 characters".  
אם יש ערכי ברירת מחדל לפי פלטפורמה (למשל ב־Step2UTMParameters) – אלה רק מילוי ראשוני, לא ולידציה.

---

## 7. דפים ללא בדיקות קלט מיוחדות

- **Link Manager** – אין טופסי קלט; רק תצוגה, העתקה, טוגל סטטוס.
- **Analytics** – רק תצוגת נתונים.
- **Custom Domains Manager** – רשימת דומיינים; כפתור "Add Domain" פותח את ה־wizard/מודל שתואר בסעיף 2.
- **Utm Preset Manager** – רשימה וניהול; יצירה/עריכה דרך UtmPresetBuilder/UtmPresetBuilderPage.
- **Dashboard Overview, Sidebar, DNSRecordsDisplay** – ללא שדות קלט למשתמש.

---

## 8. סיכום תלויות בין שדות

| דף / תהליך     | שדה                      | מתי נבדק / הערות                                            |
| -------------- | ------------------------ | ----------------------------------------------------------- |
| Auth – Sign Up | Confirm Password         | רק אחרי בדיקות הסיסמה; חייב להתאים ל־Password.              |
| Auth – Sign Up | Turnstile                | רק בהרשמה; חובה לפני שליחה.                                 |
| Add Domain     | Root Redirect            | רק אם הוזן ערך; אחרת דילוג.                                 |
| Link Wizard    | Bot Fallback URL         | רק אם Bot Action = Redirect.                                |
| Link Wizard    | Slug                     | אחרי ש־URL ו־Name עברו; תלוי ב־domain (glynk.to vs custom). |
| Pixel          | Pixel ID                 | כללי פורמט לפי Platform.                                    |
| Pixel          | CAPI Token               | אופציונלי; אם מוזן – אורך ותווים לפי Platform.              |
| Pixel          | Event Name / Custom Name | לפי Platform (Taboola/Outbrain) ו־eventType (custom).       |
| Geo Rule       | Country + URL            | שניהם חובה כשמוסיפים כלל.                                   |

---

## 9. הגנה מפני קוד זדוני (XSS / Injection Protection)

**ספריית Client-side:** `src/lib/inputSanitization.js`  
**הגנת Database:** `supabase-xss-protection.sql`

### 9.1 בדיקות בצד הלקוח (Client-side)

כל שדה טקסט חופשי עובר בדיקה מפני תבניות מסוכנות **לפני שמירה**:

| שדה                                             | קובץ                       | פונקציה                    |
| ----------------------------------------------- | -------------------------- | -------------------------- |
| Full Name                                       | `AuthPage.jsx`             | `checkForMaliciousInput()` |
| Link Name                                       | `LinkWizardOnePerPage.jsx` | `sanitizeInput()`          |
| Pixel Friendly Name                             | `pixelValidation.js`       | `checkForMaliciousInput()` |
| Custom Event Name                               | `pixelValidation.js`       | `checkForMaliciousInput()` |
| Event Type (Taboola/Outbrain)                   | `pixelValidation.js`       | `checkForMaliciousInput()` |
| UTM Preset Name                                 | `UtmPresetBuilder.jsx`     | `sanitizeInput()`          |
| utm_source / medium / campaign / content / term | `UtmPresetBuilder.jsx`     | `sanitizeInput()`          |

**תבניות שנחסמות:**

- `<script>` tags
- `javascript:` / `vbscript:` protocols
- Event handlers (`onclick=`, `onerror=`, `onload=` וכו')
- HTML tags מסוכנים (`<iframe>`, `<object>`, `<embed>`, `<form>`, `<meta>`, `<base>`)
- SVG/img/body/video/audio עם event handlers
- CSS injection (`expression()`, `-moz-binding`)
- Encoded XSS (hex entities, unicode escapes)
- Null bytes ותווי בקרה

**שדות שלא צריכים בדיקה (כבר מוגנים):**

- URLs – עוברים `validateUrl()` שחוסם פרוטוקולים לא מורשים
- Slugs – מוגבלים ל-a-z, 0-9, מקפים בלבד
- Domains – עוברים `validateDomain()` עם charset מחמיר
- Pixel IDs – regex מחמיר לכל פלטפורמה
- CAPI Tokens – בדיקת תווים מותרים

### 9.2 הגנה בצד ה-Database (Supabase Triggers)

**קובץ:** `supabase-xss-protection.sql` – להרצה ידנית ב-SQL Editor של Supabase.

| טבלה          | עמודות מוגנות                                                                 | טריגר                       |
| ------------- | ----------------------------------------------------------------------------- | --------------------------- |
| `links`       | `name`                                                                        | `trg_links_xss_check`       |
| `pixels`      | `name`, `custom_event_name`, `event_type`                                     | `trg_pixels_xss_check`      |
| `utm_presets` | `name`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` | `trg_utm_presets_xss_check` |
| `profiles`    | `full_name`                                                                   | `trg_profiles_xss_check`    |

הטריגרים פועלים על כל INSERT ו-UPDATE, בודקים עם `is_safe_text()` ומנקים עם `sanitize_text()`.

---

_מסמך זה עודכן לאחר תיקון כל בעיות הולידציה והוספת הגנת XSS (ינואר 2026). שינויים בלוגיקה או בספריות יש לעדכן כאן._

תיקונים שבוצעו:

1. slugValidation.js – תיקון קריטי:
   BLOCKED_WORDS – הסרתי את כל מילות ה-SPAM/Marketing (~130 מילים כמו "ad", "cash", "offer", "trial") שחסמו slugs לגיטימיים
   checkBlockedWords() – שיניתי מ-substring matching (שתפס "assets" בגלל "ass") ל-exact word matching בלבד. ביטויים מרובי-מילים נבדקים כ-phrase מלא
   הסרת ~40 console.log/warn שנשארו בקוד production
2. urlValidation.js – תיקונים מרובים:
   Null guard – הוספת בדיקה ל-null/undefined/non-string בכניסה ל-validateUrl()
   חסימת localhost/private IP – הפעלתי את הקוד שהיה ב-comment (127.x, 10.x, 192.168.x, 172.16-31.x)
   הרחבת TLDs – הוספת ~80 TLDs נוספים (me, cc, tv, ly, pro, live, money, health, travel...)
   הרחבת double TLDs – הוספת ~50 צירופים (co.il, org.il, co.th, co.id, com.tr, com.ua...)
   הסרת dead code – commonTypos שלא היה בשימוש, isURL import מיותר
3. AuthPage.jsx – בדיקות חדשות:
   Full Name – מינימום 2 תווים, מקסימום 100 תווים
   Email – regex נוסף ^[^\s@]+@[^\s@]+\.[^\s@]{2,}$ מעבר לבדיקת הדפדפן
   Password – מקסימום 128 תווים (מניעת DoS דרך סיסמה ארוכה מאוד)
4. pixelValidation.js – קובץ ולידציה משותף חדש:
   ריכוז כל לוגיקת הבדיקות של Pixel ID, CAPI Token ב-מקום אחד
   הוספת אורך מקסימלי לשם פיקסל (100 תווים)
   PixelBuilderPage.jsx, PixelModal.jsx, PixelWizardOnePerPage.jsx – מייבאים מהקובץ המשותף (הסרת ~200 שורות כפולות)
5. LinkWizardOnePerPage.jsx – Geo Rules:
   בדיקת כפילות מדינה – "A rule for this country already exists"
   חסימת glynk.to ב-URL של כלל גיאו (לא היה קודם)
6. UtmPresetBuilder.jsx – UTM:
   אורך שם preset – מקסימום 100 תווים
   אורך שדות UTM – מקסימום 250 תווים לכל שדה (utm_source, utm_medium וכו')
   הסרת console.log מ-handleSave
7. INPUT-VALIDATION-MAP.md – עדכון:
   עודכן עם כל השינויים החדשים

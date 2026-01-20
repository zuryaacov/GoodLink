# Upstash Redis - מבנה הנתונים

## 📌 הערות חשובות

**Upstash Redis זה לא database עם טבלאות** - זה **key-value store**!

- אין צורך ליצור טבלאות
- אין צורך להגדיר סכמה (schema)
- פשוט יוצרים Redis database ב-Upstash Console והכל מוכן

## 🔑 מבנה ה-Key-Value

### Key Format

```
link:{domain}:{slug}
```

**דוגמאות:**

- `link:glynk.to:ooo9`
- `link:mydomain.com:test-link`
- `link:example.co:promo-2024`

### Value Format (JSON String)

כל ערך הוא JSON string שמכיל את כל נתוני הלינק:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "שם הלינק",
  "target_url": "https://example.com/destination",
  "domain": "glynk.to",
  "slug": "abc123",
  "short_url": "https://glynk.to/abc123",
  "status": "active",
  "parameter_pass_through": true,

  // UTM Parameters
  "utm_source": "facebook",
  "utm_medium": "cpc",
  "utm_campaign": "{{campaign.name}}",
  "utm_content": null,
  "utm_term": null,

  // UTM Presets (full objects, not just IDs)
  "utm_presets": [
    {
      "id": "preset-uuid-1",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Facebook Ads Preset",
      "platform": "meta",
      "utm_source": "facebook_ads",
      "utm_medium": "cpm",
      "utm_campaign": "{{campaign.name}}",
      "utm_content": "{{ad.id}}",
      "utm_term": "{{adset.name}}",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],

  // Pixels (full objects, not just IDs)
  "pixels": [
    {
      "id": "pixel-uuid-1",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Facebook Pixel",
      "platform": "meta",
      "code": "<script>...</script>",
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],

  // Additional Settings
  "server_side_tracking": false,
  "custom_script": null,
  "fraud_shield": "none",
  "bot_action": "block",
  "geo_rules": [],

  // Timestamps
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T12:00:00Z"
}
```

## 🔄 איך זה עובד?

### 1. יצירת/עדכון לינק (אסטרטגיית "מחק והחלף")

**נקודה קריטית:** כי המפתח מורכב מ-domain ו-slug, שינוי של אחד מהם = ישות חדשה ב-Redis!

כשיוזר יוצר או מעדכן לינק:

1. הנתונים נשמרים ב-Supabase (כרגיל)
2. הנתונים נשלחים ל-worker endpoint: `/api/update-redis-cache` **כולל oldDomain ו-oldSlug**
3. ה-worker בודק אם domain/slug השתנו:
   - **אם השתנו** → מוחק את המפתח הישן (`link:{oldDomain}:{oldSlug}`)
   - כותב את הנתונים למפתח החדש (`link:{domain}:{slug}`)

```javascript
// דוגמה מהפרונטאנד
await updateLinkInRedis(updatedLink, supabase, oldDomain, oldSlug);

// ה-worker מבצע:
const oldKey = `link:${oldDomain}:${oldSlug}`;
const newKey = `link:${domain}:${slug}`;

// אם המפתח השתנה - מוחקים את הישן!
if (oldKey !== newKey) {
  await redis.del(oldKey);
}

// כותבים את הנתונים למפתח החדש (או דורסים אם לא השתנה)
await redis.set(newKey, JSON.stringify(cacheData));
```

**למה זה חשוב?**
- ❌ בלי זה: המפתח הישן נשאר "יתום" ב-Redis
- ❌ בלי זה: הלינק הישן עדיין עובד (cache לא מסונכרן)
- ✅ עם זה: רק המפתח הנכון קיים, cache מסונכרן

### 2. קריאת לינק

כשמגיע בקשת HTTP ל-worker:

1. ה-worker מנסה לקרוא מ-Redis עם המפתח `link:{domain}:{slug}`
2. אם נמצא → מחזיר את הנתונים מה-Redis (מהיר!)
3. אם לא נמצא → קורא מ-Supabase (fallback)

### 3. מחיקת לינק

כשיוזר מוחק לינק:

- **לא מוחקים** מ-Redis
- רק מעדכנים `status` ל-`"deleted"` (כמו בסופבייס)
- ה-worker מחזיר לינק רק אם `status === "active"`, אז לינק "deleted" לא יעבוד

## 📝 אין צורך בהגדרות!

- ✅ **אין צורך ליצור טבלאות**
- ✅ **אין צורך להגדיר סכמה**
- ✅ **אין צורך לבצע migrations**

פשוט:

1. יוצרים Redis database ב-Upstash Console
2. לוקחים את ה-URL וה-Token
3. מגדירים אותם כ-secrets ב-worker
4. הכל עובד!

## 🔍 דוגמה לשימוש ידני (לבדיקה)

אם תרצה לבדוק ידנית ב-Redis, תוכל להשתמש ב-Upstash Console:

1. לך ל-Upstash Console → Redis Database → Data Browser
2. נסה לקרוא key: `link:glynk.to:abc123`
3. אם יש data, תראה את ה-JSON object

או דרך REST API:

```bash
# GET value
curl -X POST "https://your-redis.upstash.io" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '["GET", "link:glynk.to:abc123"]'

# SET value
curl -X POST "https://your-redis.upstash.io" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '["SET", "link:glynk.to:abc123", "{\"id\":\"...\",\"name\":\"...\"}"]'
```

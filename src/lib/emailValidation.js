/**
 * בדיקת תקינות אימייל מקצועית
 * @param {string} email - כתובת המייל לבדיקה
 * @returns {boolean} - האם המייל תקין
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;

  // 1. ניקוי רווחים מיותרים (Sanitization)
  email = email.trim();

  // 2. בדיקת אורך (מגבלות טכניות של SMTP)
  // המקסימום המותר הוא 254 תווים
  if (email.length > 254) return false;

  // 3. ה-Regex המדויק ביותר לתקן (Standard)
  // בודק שאין נקודות בתחילה/סוף, אין תווים אסורים, והדומיין תקין
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(email)) return false;

  // 4. בדיקות לוגיות נוספות (Edge Cases)
  const parts = email.split('@');
  const account = parts[0];
  const address = parts[1];

  // החלק של החשבון לא יכול להיות ארוך מ-64 תווים
  if (account.length > 64) return false;

  // אסור שיהיו שתי נקודות רצופות בדומיין (למשל gmail..com)
  if (address.includes('..')) return false;

  // הדומיין חייב להכיל לפחות נקודה אחת (למשל localhost לא יעבור כאן)
  if (!address.includes('.')) return false;

  // החלק האחרון בדומיין (TLD) חייב להיות לפחות 2 תווים (למשל .co ולא .c)
  const domainParts = address.split('.');
  if (domainParts[domainParts.length - 1].length < 2) return false;

  return true;
}

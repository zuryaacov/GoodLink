# Slug Validation Implementation

## Overview

Comprehensive slug validation has been implemented with all the requested requirements.

## Features Implemented

### 1. ✅ Availability Check (זמינות)

- **System-wide check for default domains**: 
  - For `glynk.io` or `goodlink.ai`: Checks against ALL users in the system
  - For custom domains: Checks only against the current user's links
  
- **Implementation**: `checkSlugAvailability()` function in `src/lib/slugValidation.js`

### 2. ✅ Character Validation (תווים מותרים)

- **Allowed characters only**:
  - English letters (a-z, A-Z) - automatically converted to lowercase
  - Numbers (0-9)
  - Hyphens (-)
  - No other characters allowed

- **Lookalike character prevention**:
  - Detects Cyrillic letters that look like English letters (e.g., а, о, е, р, с, у, х)
  - Detects Greek letters that might look similar
  - Prevents use of characters from other languages that resemble English letters

- **Implementation**: `validateSlugFormat()` function with `isLookalikeCharacter()` helper

### 3. ✅ Auto Lowercase Conversion

- All input is automatically converted to lowercase
- Works in real-time as user types
- Normalized slug is stored in the database

### 4. ✅ Length Validation (אורך)

- **Minimum**: 3 characters
- **Maximum**: 30 characters
- Validated in real-time

### 5. ✅ Additional Format Rules

- No consecutive hyphens (`--`)
- Cannot start or end with hyphen (`-`)
- All validation happens in real-time as user types

### 6. ✅ Google Perspective API Integration

- Checks slug content for offensive/inappropriate content
- Uses Google Perspective API: `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze`
- Environment variable required: `VITE_PERSPECTIVE_API_KEY`
- Checks for: TOXICITY, SEVERE_TOXICITY, IDENTITY_ATTACK, INSULT, PROFANITY, THREAT
- Threshold: 0.7 (70%) - if any attribute exceeds this, slug is flagged
- If API key not configured, validation fails open (allows slug)

## File Structure

```
src/lib/slugValidation.js          # Main validation utility
src/components/dashboard/wizard/
  └── Step1FastTrack.jsx           # Updated to use new validation
```

## API Functions

### `validateSlugFormat(slug)`
Validates slug format and characters only (no database/API calls).

**Returns:**
```javascript
{
  isValid: boolean,
  error?: string,
  normalizedSlug?: string
}
```

### `checkSlugAvailability(slug, domain, userId, supabase)`
Checks if slug is available in the database.

**Returns:**
```javascript
{
  isAvailable: boolean,
  error?: string
}
```

### `checkSlugContent(slug)`
Checks slug content with OpenAI Moderation API.

**Returns:**
```javascript
{
  isSafe: boolean,
  error?: string,
  flaggedCategories?: string[]
}
```

### `validateSlug(slug, domain, userId, supabase, checkAvailability, checkContent)`
Comprehensive validation combining all checks.

**Returns:**
```javascript
{
  isValid: boolean,
  error?: string,
  normalizedSlug?: string,
  isAvailable?: boolean,
  isContentSafe?: boolean
}
```

## Environment Variables

### Required for Full Functionality

1. **Supabase** (already configured):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. **Google Perspective API** (optional but recommended):
   - `VITE_PERSPECTIVE_API_KEY` - Your Google Perspective API key
   - Get one at: https://developers.perspectiveapi.com/
   - Free tier: 1,000 requests per day

### Setting Up Perspective API Key

1. **For Local Development:**
   - Add to `.env.local`:
     ```env
     VITE_PERSPECTIVE_API_KEY=your-api-key-here
     ```

2. **For Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `VITE_PERSPECTIVE_API_KEY` = `your-api-key-here`
   - Select all environments
   - Redeploy

See `SETUP_PERSPECTIVE_API.md` for detailed instructions.

## Usage Example

```javascript
import { validateSlug } from '../lib/slugValidation';
import { supabase } from '../lib/supabase';

// In your component
const result = await validateSlug(
  'my-slug-123',      // slug
  'glynk.io',         // domain
  user.id,            // userId
  supabase,           // supabase client
  true,               // check availability
  true                // check content moderation
);

if (result.isValid) {
  // Slug is valid, available, and safe
  console.log('Normalized slug:', result.normalizedSlug);
} else {
  // Show error to user
  console.error(result.error);
}
```

## User Experience

1. **Real-time validation**: As user types, format is validated
2. **Auto lowercase**: Input automatically converted to lowercase
3. **Format errors shown immediately**: Invalid characters blocked with helpful error messages
4. **Availability check**: User clicks "Check" button to verify availability
5. **Content moderation**: Happens automatically during availability check

## Error Messages

- Format errors: Shown immediately as user types
- Availability errors: Shown after clicking "Check"
- Content moderation errors: Shown after clicking "Check" if content is flagged

## Testing

To test the validation:

1. **Format validation:**
   - Try entering Cyrillic characters (should be blocked)
   - Try entering special characters (should be blocked)
   - Try entering uppercase letters (should auto-convert to lowercase)
   - Try entering less than 3 characters (should show error)
   - Try entering more than 30 characters (should show error)

2. **Availability validation:**
   - Enter an existing slug (should show "already taken")
   - Enter a new slug (should show "available")

3. **Content moderation:**
   - Enter inappropriate content (should be blocked if OpenAI API key is configured)

## Notes

- The validation is case-insensitive (all slugs stored in lowercase)
- For default domains (`glynk.io`, `goodlink.ai`), availability is checked system-wide
- For custom domains, availability is checked only for that user
- OpenAI moderation is optional - if API key is not set, content check is skipped


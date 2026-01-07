/**
 * Slug Validation Utility
 * 
 * Comprehensive slug validation including:
 * - Character validation (English letters, numbers, hyphens only)
 * - Lookalike character detection (Cyrillic, etc.)
 * - Length validation (3-30 characters)
 * - Auto lowercase conversion
 * - Availability checking
 * - Content moderation with OpenAI
 */

/**
 * Check if a character is a valid English letter (a-z, A-Z)
 */
function isEnglishLetter(char) {
  const code = char.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

/**
 * Check if a character is a digit (0-9)
 */
function isDigit(char) {
  const code = char.charCodeAt(0);
  return code >= 48 && code <= 57;
}

/**
 * Check if a character is a hyphen (-)
 */
function isHyphen(char) {
  return char === '-';
}

/**
 * Check if a character looks like an English letter but isn't (e.g., Cyrillic)
 * This prevents lookalike attacks
 */
function isLookalikeCharacter(char) {
  const code = char.charCodeAt(0);
  
  // Cyrillic letters that look like English letters
  // а (Cyrillic) looks like a, о looks like o, е looks like e, etc.
  const cyrillicRanges = [
    [0x0400, 0x04FF], // Cyrillic
    [0x0500, 0x052F], // Cyrillic Supplement
    [0x2DE0, 0x2DFF], // Cyrillic Extended-A
    [0xA640, 0xA69F], // Cyrillic Extended-B
  ];
  
  // Greek letters that might look similar
  const greekRanges = [
    [0x0370, 0x03FF], // Greek and Coptic
  ];
  
  // Check if character is in any of these ranges
  for (const [start, end] of [...cyrillicRanges, ...greekRanges]) {
    if (code >= start && code <= end) {
      return true;
    }
  }
  
  // Check for specific lookalike characters
  const lookalikes = [
    0x0430, // а (Cyrillic a)
    0x043E, // о (Cyrillic o)
    0x0435, // е (Cyrillic e)
    0x0440, // р (Cyrillic p)
    0x0441, // с (Cyrillic c)
    0x0443, // у (Cyrillic y)
    0x0445, // х (Cyrillic x)
    0x044A, // ъ (Cyrillic hard sign)
    0x044C, // ь (Cyrillic soft sign)
    0x0456, // і (Cyrillic i)
    0x03B1, // α (Greek alpha)
    0x03BF, // ο (Greek omicron)
  ];
  
  return lookalikes.includes(code);
}

/**
 * Validate slug format and characters
 * 
 * @param {string} slug - The slug to validate
 * @returns {{isValid: boolean, error?: string, normalizedSlug?: string}}
 */
export function validateSlugFormat(slug) {
  // 1. Trim whitespace
  const trimmed = slug.trim();
  
  if (!trimmed) {
    return {
      isValid: false,
      error: 'Slug cannot be empty',
    };
  }
  
  // 2. Convert to lowercase automatically
  const lowercased = trimmed.toLowerCase();
  
  // 3. Check length (3-30 characters)
  if (lowercased.length < 3) {
    return {
      isValid: false,
      error: 'Slug must be at least 3 characters long',
    };
  }
  
  if (lowercased.length > 30) {
    return {
      isValid: false,
      error: 'Slug cannot exceed 30 characters',
    };
  }
  
  // 4. Check for valid characters only (English letters, numbers, hyphens)
  for (let i = 0; i < lowercased.length; i++) {
    const char = lowercased[i];
    
    // Check for lookalike characters first (security check)
    if (isLookalikeCharacter(char)) {
      return {
        isValid: false,
        error: `Invalid character "${char}" at position ${i + 1}. Only English letters, numbers, and hyphens are allowed.`,
      };
    }
    
    // Check if character is valid (English letter, digit, or hyphen)
    if (!isEnglishLetter(char) && !isDigit(char) && !isHyphen(char)) {
      return {
        isValid: false,
        error: `Invalid character "${char}" at position ${i + 1}. Only English letters (a-z), numbers (0-9), and hyphens (-) are allowed.`,
      };
    }
  }
  
  // 5. Check for consecutive hyphens (not allowed)
  if (lowercased.includes('--')) {
    return {
      isValid: false,
      error: 'Slug cannot contain consecutive hyphens (--).',
    };
  }
  
  // 6. Check that slug doesn't start or end with hyphen
  if (lowercased.startsWith('-')) {
    return {
      isValid: false,
      error: 'Slug cannot start with a hyphen (-).',
    };
  }
  
  if (lowercased.endsWith('-')) {
    return {
      isValid: false,
      error: 'Slug cannot end with a hyphen (-).',
    };
  }
  
  // All validations passed
  return {
    isValid: true,
    normalizedSlug: lowercased,
  };
}

/**
 * Check slug availability in database
 * 
 * @param {string} slug - The slug to check (should be normalized/lowercase)
 * @param {string} domain - The domain to check against
 * @param {string} userId - The user ID (for custom domain checks)
 * @param {object} supabase - Supabase client instance
 * @returns {Promise<{isAvailable: boolean, error?: string}>}
 */
export async function checkSlugAvailability(slug, domain, userId, supabase) {
  if (!supabase) {
    return {
      isAvailable: false,
      error: 'Database connection not available',
    };
  }
  
  try {
    // Normalize slug first
    const formatCheck = validateSlugFormat(slug);
    if (!formatCheck.isValid) {
      return {
        isAvailable: false,
        error: formatCheck.error,
      };
    }
    
    const normalizedSlug = formatCheck.normalizedSlug;
    
    // Check availability based on domain type
    // If domain is "glynk.io" or "goodlink.ai" (default domains), check system-wide
    // If domain is custom, check only for that user
    const normalizedDomain = domain?.toLowerCase() || '';
    const isDefaultDomain = 
      normalizedDomain === 'glynk.io' || 
      normalizedDomain === 'goodlink.ai';
    
    let query = supabase
      .from('links')
      .select('id, slug, domain, user_id')
      .eq('slug', normalizedSlug)
      .eq('domain', domain);
    
    // For default domain, check all users (system-wide)
    // For custom domain, check only this user's links
    if (!isDefaultDomain) {
      query = query.eq('user_id', userId);
    }
    
    const { data: existingLinks, error } = await query.limit(1);
    
    if (error) {
      console.error('Error checking slug availability:', error);
      return {
        isAvailable: false,
        error: 'Error checking slug availability. Please try again.',
      };
    }
    
    if (existingLinks && existingLinks.length > 0) {
      return {
        isAvailable: false,
        error: isDefaultDomain
          ? `This slug "${normalizedSlug}" is already taken for domain "${domain}". Please choose a different slug.`
          : `This slug "${normalizedSlug}" is already taken for your domain "${domain}". Please choose a different slug.`,
      };
    }
    
    return {
      isAvailable: true,
    };
  } catch (error) {
    console.error('Error checking slug availability:', error);
    return {
      isAvailable: false,
      error: 'Error checking slug availability. Please try again.',
    };
  }
}

/**
 * Check slug content with Google Perspective API
 * 
 * @param {string} slug - The slug to check
 * @returns {Promise<{isSafe: boolean, error?: string, flaggedCategories?: string[]}>}
 */
/**
 * Simple cache for moderation results (to avoid repeated API calls)
 */
const moderationCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * List of blocked words/phrases - checked before API calls
 * These are words that should be blocked regardless of API results
 */
const BLOCKED_WORDS = [
  // --- GAMBLING & BETTING (הימורים) ---
  'gambling', 'casino', 'betting', 'poker', 'slots', 'roulette', 'jackpot', 
  'bet', 'bet365', 'baccarat', 'lottery', 'bookie', 'wagering', 'casino-online',
  
  // --- ADULT CONTENT (תוכן למבוגרים) ---
  'porn', 'sex', 'xxx', 'adult', 'nude', 'naked', 'erotic', 'brazers', 'hentai',
  'escort', 'camgirl', 'milf', 'playboy', 'strip', 'vixen', 'hardcore', 'softcore',
  'sexual', 'penis', 'vagina', 'clitoris', 'boobs', 'butt', 'asshole',
  
  // --- DRUGS & ILLICIT SUBSTANCES (סמים וחומרים אסורים) ---
  'drugs', 'weed', 'marijuana', 'cocaine', 'heroin', 'meth', 'mdma', 'ecstasy',
  'pills', 'lsd', 'fentanyl', 'narcotics', 'cannabis', 'hashish', 'vape', 'smoke',
  'high-times', 'psychedelic', 'dealer', 'inject',
  
  // --- VIOLENCE & WEAPONS (אלימות ונשק) ---
  'bomb', 'weapon', 'gun', 'firearm', 'shoot', 'kill', 'murder', 'terror', 
  'terrorism', 'explosion', 'ammo', 'ammunition', 'grenade', 'knife', 'stab', 
  'suicide', 'deadly', 'assassin', 'sniper', 'slaughter', 'massacre',
  
  // --- OFFENSIVE & HATE SPEECH (ביטויים פוגעניים ושנאה) ---
  'nigger', 'faggot', 'retard', 'bitch', 'bastard', 'cunt', 'dick', 'fuck', 
  'shit', 'slut', 'whore', 'racist', 'nazi', 'hitler', 'white-power', 'hate',
  'motherfucker', 'piss', 'crap',
  
  // --- SCAMS & FRAUD (הונאות ודיוג) ---
  'hack', 'cracked', 'phishing', 'scam', 'fraud', 'exploit', 'malware', 'virus',
  'identity-theft', 'carding', 'spoof', 'pyramid-scheme', 'free-money',
  
  // --- OTHER SENSITIVE TOPICS (נושאים רגישים נוספים) ---
  'abortion', 'darknet', 'darkweb', 'tor-link', 'hitman', 'deepfake'
];

/**
 * Check if slug contains blocked words (before API calls)
 * 
 * @param {string} slug - The slug to check (with hyphens converted to spaces)
 * @returns {{isSafe: boolean, blockedWord?: string, error?: string}}
 */
function checkBlockedWords(slug) {
  // Convert slug to lowercase and split by spaces/hyphens for word matching
  const slugLower = slug.toLowerCase();
  const slugWords = slugLower.split(/[\s-]+/); // Split by spaces or hyphens
  
  // Check each word in the slug against blocked words list
  for (const word of slugWords) {
    // Check exact match
    if (BLOCKED_WORDS.includes(word)) {
      return {
        isSafe: false,
        blockedWord: word,
        error: `This slug contains inappropriate content and cannot be used.`,
      };
    }
    
    // Check if any blocked word appears in this word (for partial matches)
    for (const blockedWord of BLOCKED_WORDS) {
      if (word.includes(blockedWord) || blockedWord.includes(word)) {
        return {
          isSafe: false,
          blockedWord: blockedWord,
          error: `This slug contains inappropriate content and cannot be used.`,
        };
      }
    }
  }
  
  // Also check if slug contains any blocked word as substring
  for (const blockedWord of BLOCKED_WORDS) {
    if (slugLower.includes(blockedWord)) {
      return {
        isSafe: false,
        blockedWord: blockedWord,
        error: `This slug contains inappropriate content and cannot be used.`,
      };
    }
  }
  
  return {
    isSafe: true,
  };
}

/**
 * Retry helper with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 2, initialDelay = 2000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      
      // Exponential backoff with longer delays for rate limiting
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export async function checkSlugContent(slug) {
  const perspectiveApiKey = import.meta.env.VITE_PERSPECTIVE_API_KEY;
  
  // Check if running on localhost (CORS issues with Perspective API)
  const isLocalhost = 
    typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname === '');
  
  // Check cache first
  const cacheKey = `moderation_${slug}`;
  const cached = moderationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('💾 Using cached moderation result for slug:', slug);
    return cached.result;
  }
  
  // Convert hyphens to spaces for analysis (before sending to API)
  const slugForAnalysis = slug.replace(/-/g, ' ');
  
  // First check against blocked words list (before API calls)
  console.log('🔍 Checking slug against blocked words list...');
  const blockedWordsCheck = checkBlockedWords(slugForAnalysis);
  if (!blockedWordsCheck.isSafe) {
    console.warn('🚫 Slug blocked by word filter:', {
      slug,
      blockedWord: blockedWordsCheck.blockedWord,
    });
    const result = {
      isSafe: false,
      error: blockedWordsCheck.error || 'This slug contains inappropriate content and cannot be used.',
      blockedByWordFilter: true,
    };
    // Cache the result
    moderationCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }
  console.log('✅ Slug passed word filter check');
  
  console.log('🔍 Checking slug content with Google Perspective API:', {
    slug,
    slugForAnalysis, // Show the converted version (hyphens → spaces)
    hasApiKey: !!perspectiveApiKey,
    apiKeyLength: perspectiveApiKey ? perspectiveApiKey.length : 0,
    isLocalhost,
  });
  
  if (!perspectiveApiKey) {
    // If no API key, skip moderation (fail open)
    console.warn('⚠️ Perspective API key not configured. Skipping content moderation.');
    console.warn('💡 To enable content moderation, add VITE_PERSPECTIVE_API_KEY to your environment variables.');
    console.warn('💡 Get your API key from: https://developers.perspectiveapi.com/');
    const result = { isSafe: true };
    // Cache the result
    moderationCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }
  
  // Skip moderation on localhost due to CORS restrictions
  // Perspective API blocks localhost by default - need to configure API key restrictions
  if (isLocalhost) {
    console.warn('⚠️ Skipping Perspective API check on localhost (CORS restrictions).');
    console.warn('💡 To enable on localhost, configure API key restrictions in Google Cloud Console:');
    console.warn('💡 Allow HTTP referrers: http://localhost:5173/*');
    console.warn('💡 See FIX_PERSPECTIVE_API_CORS.md for instructions.');
    const result = { 
      isSafe: true,
      error: 'Content moderation skipped on localhost (CORS restrictions).',
    };
    // Cache for shorter time on localhost
    moderationCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }
  
  try {
    console.log('📤 Sending request to Google Perspective API...');
    
    // Perspective API endpoint
    const apiUrl = `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${perspectiveApiKey}`;
    
    // Request body for Perspective API
    const requestBody = {
      comment: {
        text: slugForAnalysis,
      },
      requestedAttributes: {
        TOXICITY: {},
        SEVERE_TOXICITY: {},
        IDENTITY_ATTACK: {},
        INSULT: {},
        PROFANITY: {},
        THREAT: {},
      },
      languages: ['en'], // English only for now
    };
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('📥 Perspective API response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.text();
      let errorMessage = 'Content moderation check unavailable.';
      
      // Handle specific error codes
      if (response.status === 429) {
        // Too Many Requests - rate limit exceeded
        console.warn('⚠️ Rate limit exceeded (429). Skipping moderation check (fail open).');
        const result = {
          isSafe: true,
          error: 'Content moderation temporarily unavailable due to rate limiting.',
          rateLimited: true,
        };
        // Cache rate limit for 5 minutes to avoid repeated calls
        moderationCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      } else if (response.status === 400) {
        // Bad Request
        errorMessage = 'Invalid request to Perspective API. Please check the slug format.';
      } else if (response.status === 403) {
        // Forbidden - invalid API key, quota exceeded, or CORS issue
        let parsedError;
        try {
          parsedError = JSON.parse(errorData);
        } catch (e) {
          parsedError = { error: { message: errorData } };
        }
        
        const errorMsg = parsedError?.error?.message || errorData;
        
        // Check if it's a CORS/localhost issue
        if (errorMsg.includes('localhost') || errorMsg.includes('blocked') || errorMsg.includes('referer')) {
          errorMessage = 'CORS error: localhost is blocked. You need to configure API key restrictions in Google Cloud Console to allow localhost, or use a proxy.';
          console.warn('⚠️ CORS Issue: Perspective API blocks localhost by default.');
          console.warn('💡 Solution: Configure API key restrictions in Google Cloud Console to allow localhost:5173');
        } else if (errorMsg.includes('quota') || errorMsg.includes('Quota')) {
          errorMessage = 'Quota exceeded. You have reached the daily limit (1,000 requests/day).';
        } else if (errorMsg.includes('API key') || errorMsg.includes('invalid')) {
          errorMessage = 'Invalid API key. Please check your Perspective API key configuration.';
        } else {
          errorMessage = `API error: ${errorMsg}`;
        }
      }
      
      console.error('❌ Perspective API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        parsedError: response.status === 403 ? (() => {
          try {
            return JSON.parse(errorData);
          } catch {
            return errorData;
          }
        })() : undefined,
        message: errorMessage,
      });
      
      // For all errors, fail open (don't block the user)
      const result = {
        isSafe: true,
        error: errorMessage,
        rateLimited: response.status === 429,
      };
      moderationCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }
    
    // Parse the successful response
    const data = await response.json();
    console.log('✅ Perspective API response:', data);
    
    // Perspective API returns attribute scores (0-1, where higher = more toxic)
    // Threshold: 0.3 (30%) - if any attribute exceeds this, flag as unsafe
    const TOXICITY_THRESHOLD = 0.3;
    
    let result;
    const flaggedCategories = [];
    const scores = {};
    
    if (data.attributeScores) {
      // Check each attribute
      for (const [attribute, attributeData] of Object.entries(data.attributeScores)) {
        const score = attributeData.summaryScore?.value || 0;
        scores[attribute] = score;
        
        if (score >= TOXICITY_THRESHOLD) {
          flaggedCategories.push(attribute);
        }
      }
      
      if (flaggedCategories.length > 0) {
        console.warn('🚫 Slug flagged by Perspective API:', {
          slug,
          flaggedCategories,
          scores,
        });
        
        result = {
          isSafe: false,
          flaggedCategories,
          error: `This slug contains inappropriate content and cannot be used.`,
        };
      } else {
        console.log('✅ Slug passed Perspective API check:', scores);
        
        // After Perspective API passes, check with Natural Language API
        console.log('🔍 Running additional check with Google Natural Language API...');
        const naturalLanguageResult = await checkSlugWithNaturalLanguage(slugForAnalysis);
        
        if (!naturalLanguageResult.isSafe) {
          // Natural Language API flagged the slug
          console.warn('🚫 Slug flagged by Natural Language API:', naturalLanguageResult);
          result = {
            isSafe: false,
            error: naturalLanguageResult.error || `This slug contains inappropriate content and cannot be used.`,
            sentiment: naturalLanguageResult.sentiment,
          };
        } else {
          // Both checks passed
          result = {
            isSafe: true,
            sentiment: naturalLanguageResult.sentiment,
          };
        }
      }
    } else {
      // No scores returned - assume safe
      console.warn('⚠️ No attribute scores in Perspective API response');
      result = {
        isSafe: true,
      };
    }
    
    // Cache the result
    moderationCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error('❌ Error checking slug content:', error);
    // Fail open - if check fails, allow the slug
    return {
      isSafe: true,
      error: 'Content moderation check failed. Please try again.',
    };
  }
}

/**
 * Check slug content with Google Natural Language API (Content Moderation)
 * This is called after Perspective API check (adds a second gate)
 * 
 * @param {string} slug - The slug to check (with hyphens converted to spaces)
 * @returns {Promise<{isSafe: boolean, error?: string, moderation?: object}>}
 */
async function checkSlugWithNaturalLanguage(slug) {
  const naturalLanguageApiKey = import.meta.env.VITE_GOOGLE_NATURAL_LANGUAGE_API_KEY || import.meta.env.VITE_PERSPECTIVE_API_KEY;
  
  // Use Perspective API key if Natural Language API key not set (same Google Cloud project)
  if (!naturalLanguageApiKey) {
    console.warn('⚠️ Google Natural Language API key not configured. Skipping Natural Language check.');
    console.warn('💡 To enable, add VITE_GOOGLE_NATURAL_LANGUAGE_API_KEY (or use Perspective API key).');
    return {
      isSafe: true,
    };
  }
  
  // Check if running on localhost (CORS issues)
  const isLocalhost = 
    typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname === '');
  
  if (isLocalhost) {
    console.warn('⚠️ Skipping Natural Language API check on localhost (CORS restrictions).');
    return { isSafe: true };
  }
  
  try {
    console.log('📤 Sending request to Google Natural Language API (Content Moderation)...');
    
    // Natural Language API endpoint for content moderation
    // moderateText endpoint format
    const apiUrl = `https://language.googleapis.com/v1/documents:moderateText?key=${naturalLanguageApiKey}`;
    
    // Request body for Natural Language API Content Moderation
    // Format according to Google Cloud Natural Language API documentation
    // moderateText requires: { document: { type: "PLAIN_TEXT", content: "text", language: "en" } }
    const requestBody = {
      document: {
        type: 'PLAIN_TEXT',
        content: slug, // slug already has hyphens converted to spaces
        language: 'en',
      },
    };
    
    console.log('📋 Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('📥 Natural Language API (moderation) response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.text();
      let parsedError;
      try {
        parsedError = JSON.parse(errorData);
      } catch (e) {
        parsedError = { error: { message: errorData } };
      }
      
      const errorMsg = parsedError?.error?.message || errorData;
      console.error('❌ Natural Language API (moderation) error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        parsedError: parsedError,
        message: errorMsg,
      });
      
      // If it's a 400 error, log more details for debugging
      if (response.status === 400) {
        console.warn('⚠️ Bad Request (400) - Check API request format or API availability');
        console.warn('💡 moderateText endpoint format: { document: { type: "PLAIN_TEXT", content: "text" } }');
        console.warn('💡 Make sure Natural Language API is enabled and moderateText feature is available');
        console.warn('💡 Note: moderateText might require specific API version or permissions');
        
        // Check if error mentions the endpoint or feature
        if (errorMsg && (errorMsg.includes('moderateText') || errorMsg.includes('not found') || errorMsg.includes('not available'))) {
          console.warn('⚠️ moderateText endpoint might not be available with this API key');
          console.warn('💡 Try using analyzeSentiment instead, or check API permissions');
        }
      }
      
      // Fail open - don't block if Natural Language API fails
      return {
        isSafe: true,
        error: `Natural Language API moderation check unavailable: ${errorMsg}`,
      };
    }
    
    // Parse the successful response
    const data = await response.json();
    console.log('✅ Natural Language API (moderation) response:', data);
    
    // Natural Language API moderation returns moderationCategories with confidence scores (0..1)
    // Block if ANY category confidence >= 0.5 per your requirement
    const BLOCK_THRESHOLD = 0.5;
    const categories = Array.isArray(data.moderationCategories) ? data.moderationCategories : [];
    
    // Normalize category objects and extract confidence fields
    const normalized = categories.map((c) => {
      const name = c.name || c.category || c.label || 'unknown';
      // confidence field may be named differently; try common options
      const confidence = typeof c.confidence === 'number'
        ? c.confidence
        : (typeof c.score === 'number' ? c.score
        : (typeof c.probability === 'number' ? c.probability : 0));
      return { name, confidence };
    });
    
    const blocked = normalized.filter((c) => c.confidence >= BLOCK_THRESHOLD).map((c) => c.name);
    
    if (blocked.length > 0) {
      console.warn('🚫 Slug flagged by Natural Language API (moderation):', {
        slug,
        blockedCategories: blocked,
        categories: normalized,
      });
      return {
        isSafe: false,
        moderation: {
          blockedCategories: blocked,
          categories: normalized,
        },
        error: `This slug contains inappropriate content and cannot be used.`,
      };
    }
    
    console.log('✅ Slug passed Natural Language API moderation check:', normalized);
    return {
      isSafe: true,
      moderation: {
        blockedCategories: [],
        categories: normalized,
      },
    };
  } catch (error) {
    console.error('❌ Error checking slug with Natural Language API (moderation):', error);
    // Fail open - if check fails, allow the slug
    return {
      isSafe: true,
      error: 'Natural Language API moderation check failed. Please try again.',
    };
  }
}

/**
 * Comprehensive slug validation (format + availability + content)
 * 
 * @param {string} slug - The slug to validate
 * @param {string} domain - The domain to check against
 * @param {string} userId - The user ID
 * @param {object} supabase - Supabase client instance
 * @param {boolean} checkAvailability - Whether to check availability (default: true)
 * @param {boolean} checkContent - Whether to check content moderation (default: true)
 * @returns {Promise<{isValid: boolean, error?: string, normalizedSlug?: string, isAvailable?: boolean, isContentSafe?: boolean}>}
 */
export async function validateSlug(
  slug,
  domain,
  userId,
  supabase,
  checkAvailability = true,
  checkContent = true
) {
  // 1. Format validation
  const formatCheck = validateSlugFormat(slug);
  if (!formatCheck.isValid) {
    return {
      isValid: false,
      error: formatCheck.error,
    };
  }
  
  const normalizedSlug = formatCheck.normalizedSlug;
  
  // 2. Content moderation (if enabled)
  let contentCheck = { isSafe: true };
  if (checkContent) {
    console.log('🔍 [validateSlug] Starting content moderation check for slug:', normalizedSlug);
    
    try {
      contentCheck = await checkSlugContent(normalizedSlug);
      console.log('📊 [validateSlug] Content moderation result:', contentCheck);
    } catch (error) {
      // If moderation check throws an error, fail open
      console.warn('⚠️ [validateSlug] Content moderation check failed with error:', error);
      contentCheck = { isSafe: true, error: 'Content moderation check unavailable' };
    }
    
    // If content check failed due to rate limiting, skip it entirely (fail open)
    if (contentCheck.rateLimited) {
      console.warn('⚠️ [validateSlug] Rate limited - skipping moderation check and allowing slug');
      // Skip moderation entirely - don't block the user
      // Continue with validation
    } else if (!contentCheck.isSafe) {
      // Content is actually flagged as inappropriate (not rate limited)
      console.warn('🚫 [validateSlug] Slug failed content moderation:', normalizedSlug);
      return {
        isValid: false,
        error: contentCheck.error || 'Slug contains inappropriate content.',
        normalizedSlug,
        isContentSafe: false,
      };
    } else {
      console.log('✅ [validateSlug] Slug passed content moderation');
    }
  } else {
    console.log('⏭️ [validateSlug] Content moderation check skipped (checkContent = false)');
  }
  
  // 3. Availability check (if enabled)
  let availabilityCheck = { isAvailable: true };
  if (checkAvailability) {
    availabilityCheck = await checkSlugAvailability(normalizedSlug, domain, userId, supabase);
    if (!availabilityCheck.isAvailable) {
      return {
        isValid: false,
        error: availabilityCheck.error || 'Slug is not available.',
        normalizedSlug,
        isAvailable: false,
      };
    }
  }
  
  // All checks passed
  return {
    isValid: true,
    normalizedSlug,
    isAvailable: true,
    isContentSafe: true,
  };
}


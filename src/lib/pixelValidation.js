/**
 * Pixel ID & CAPI Token validation by platform.
 * Shared across PixelBuilderPage, PixelModal, and PixelWizardOnePerPage.
 */

import { checkForMaliciousInput } from './inputSanitization';

/**
 * Validate Pixel ID format per platform.
 * @param {string} pixelId
 * @param {string} platform
 * @returns {boolean}
 */
export function validatePixelId(pixelId, platform) {
  const trimmed = (pixelId || '').trim();
  switch (platform) {
    case 'meta':
    case 'instagram':
      return /^\d{15,16}$/.test(trimmed);
    case 'tiktok':
      return /^[A-Z0-9]{18}$/.test(trimmed.toUpperCase());
    case 'snapchat':
      return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(trimmed);
    case 'google':
      return /^G-[a-zA-Z0-9]{8,15}$/.test(trimmed);
    case 'outbrain':
      return /^[a-f0-9]{32}$/.test(trimmed);
    case 'taboola':
      return /^\d{6,8}$/.test(trimmed);
    default:
      return false;
  }
}

/**
 * Validate CAPI / Access Token per platform.
 * Field is optional – empty string returns valid.
 * @param {string} token
 * @param {string} platform
 * @returns {{ isValid: boolean, error: string|null }}
 */
export function validateCapiToken(token, platform) {
  if (!token || token.trim() === '') return { isValid: true, error: null };
  const trimmed = token.trim();

  // Only validate allowed characters per platform – no length restrictions
  switch (platform) {
    case 'meta':
    case 'instagram':
      if (!/^[a-zA-Z0-9]+$/.test(trimmed))
        return { isValid: false, error: 'Access Token must contain only letters and numbers' };
      return { isValid: true, error: null };

    case 'tiktok':
      if (!/^[a-zA-Z0-9]+$/.test(trimmed))
        return { isValid: false, error: 'TikTok Access Token must contain only letters and numbers' };
      return { isValid: true, error: null };

    case 'google':
      if (!/^[a-zA-Z0-9_-]+$/.test(trimmed))
        return { isValid: false, error: 'Google Api_Secret must contain only letters, numbers, underscores and hyphens' };
      return { isValid: true, error: null };

    case 'snapchat':
      if (!/^[a-zA-Z0-9_\-]+$/.test(trimmed))
        return { isValid: false, error: 'Snapchat Access Token must contain only letters, numbers, underscores and hyphens' };
      return { isValid: true, error: null };

    case 'outbrain':
      if (!/^[a-zA-Z0-9]+$/.test(trimmed))
        return { isValid: false, error: 'Outbrain Access Token must contain only letters and numbers' };
      return { isValid: true, error: null };

    case 'taboola':
      if (!/^[a-zA-Z0-9]+$/.test(trimmed))
        return { isValid: false, error: 'Taboola Client Secret must contain only letters and numbers' };
      return { isValid: true, error: null };

    default:
      return { isValid: true, error: null };
  }
}

/**
 * Get the label for the Pixel ID field per platform.
 * @param {string} platform
 * @returns {string}
 */
export function getPixelIdLabel(platform) {
  switch (platform) {
    case 'google':
      return 'Measurement_Id';
    case 'taboola':
      return 'Account Id';
    case 'outbrain':
      return 'Outbrain Pixel ID';
    default:
      return 'Pixel ID';
  }
}

/**
 * Platform definitions with validation.
 */
export const PLATFORMS = [
  { value: 'meta', label: 'Facebook', validate: (id) => validatePixelId(id, 'meta') },
  { value: 'instagram', label: 'Instagram', validate: (id) => validatePixelId(id, 'instagram') },
  { value: 'tiktok', label: 'TikTok', validate: (id) => validatePixelId(id, 'tiktok') },
  { value: 'google', label: 'Google Ads', validate: (id) => validatePixelId(id, 'google') },
  { value: 'snapchat', label: 'Snapchat', validate: (id) => validatePixelId(id, 'snapchat') },
  { value: 'outbrain', label: 'Outbrain', validate: (id) => validatePixelId(id, 'outbrain') },
  { value: 'taboola', label: 'Taboola', validate: (id) => validatePixelId(id, 'taboola') },
];

/**
 * Validate entire pixel payload before save.
 * @param {object} data - { name, platform, pixelId, eventType, customEventName, capiToken }
 * @returns {{ valid: boolean, message: string|null }}
 */
export function validatePixelPayload(data) {
  if (!data.name?.trim()) return { valid: false, message: 'Friendly name is required' };
  if (data.name.trim().length > 100) return { valid: false, message: 'Friendly name cannot exceed 100 characters' };
  // XSS / injection check on name
  const nameXss = checkForMaliciousInput(data.name);
  if (!nameXss.safe) return { valid: false, message: nameXss.error };
  if (!data.pixelId?.trim())
    return { valid: false, message: `${getPixelIdLabel(data.platform)} is required` };
  const platform = PLATFORMS.find((p) => p.value === data.platform);
  if (platform && !platform.validate(data.pixelId)) {
    let msg = `Invalid ${platform.label} ${getPixelIdLabel(data.platform)} format. `;
    if (data.platform === 'meta' || data.platform === 'instagram')
      msg += 'Must be exactly 15 or 16 digits.';
    else if (data.platform === 'tiktok')
      msg += 'Must be exactly 18 characters (uppercase A-Z and 0-9).';
    else if (data.platform === 'google')
      msg += 'Must start with G- followed by 8-15 letters and numbers.';
    else if (data.platform === 'snapchat') msg += 'Must be a valid UUID (36 characters).';
    else if (data.platform === 'outbrain') msg += 'Must be exactly 32 lowercase hex characters.';
    else if (data.platform === 'taboola') msg += 'Must be between 6 and 8 digits.';
    else msg += 'Please check the format.';
    return { valid: false, message: msg };
  }
  if (data.platform === 'taboola' && !data.eventType?.trim())
    return { valid: false, message: 'Name is required' };
  if (data.platform === 'outbrain' && !data.eventType?.trim())
    return { valid: false, message: 'Conversion Name is required' };
  if (data.eventType === 'custom' && !data.customEventName?.trim())
    return { valid: false, message: 'Custom event name is required' };
  // XSS / injection check on custom event name
  if (data.customEventName?.trim()) {
    const evtXss = checkForMaliciousInput(data.customEventName);
    if (!evtXss.safe) return { valid: false, message: evtXss.error };
  }
  // XSS / injection check on eventType (for Taboola/Outbrain free-text Name field)
  if ((data.platform === 'taboola' || data.platform === 'outbrain') && data.eventType?.trim()) {
    const evtTypeXss = checkForMaliciousInput(data.eventType);
    if (!evtTypeXss.safe) return { valid: false, message: evtTypeXss.error };
  }
  if (data.capiToken?.trim()) {
    const capi = validateCapiToken(data.capiToken, data.platform);
    if (!capi.isValid) return { valid: false, message: capi.error };
  }
  return { valid: true, message: null };
}

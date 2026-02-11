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
      return /^\d+$/.test(trimmed);
    case 'tiktok':
      return /^[A-Z0-9]+$/.test(trimmed.toUpperCase());
    case 'snapchat':
      return /^[a-f0-9-]+$/i.test(trimmed);
    case 'google':
      return /^[a-zA-Z0-9-]+$/.test(trimmed);
    case 'outbrain':
      return /^[a-f0-9]+$/.test(trimmed);
    case 'taboola':
      return /^\d+$/.test(trimmed);
    default:
      return false;
  }
}

/**
 * Validate CAPI / Access Token per platform.
 * Field is required – empty string is invalid.
 * @param {string} token
 * @param {string} platform
 * @returns {{ isValid: boolean, error: string|null }}
 */
export function validateCapiToken(token, platform) {
  if (!token || token.trim() === '') {
    switch (platform) {
      case 'google':
        return { isValid: false, error: 'Api_Secret is required' };
      case 'taboola':
        return { isValid: false, error: 'Client Secret is required' };
      default:
        return { isValid: false, error: 'Access Token is required' };
    }
  }
  // Token is required; we do not validate format or character set
  return { isValid: true, error: null };
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
  const pixelIdXss = checkForMaliciousInput(data.pixelId);
  if (!pixelIdXss.safe) return { valid: false, message: pixelIdXss.error };
  const platform = PLATFORMS.find((p) => p.value === data.platform);
  if (platform && !platform.validate(data.pixelId)) {
    let msg = `Invalid ${platform.label} ${getPixelIdLabel(data.platform)} format. `;
    if (data.platform === 'meta' || data.platform === 'instagram')
      msg += 'Use numbers only.';
    else if (data.platform === 'tiktok')
      msg += 'Use uppercase letters and numbers only.';
    else if (data.platform === 'google')
      msg += 'Use letters, numbers, and hyphens only.';
    else if (data.platform === 'snapchat') msg += 'Use hex characters and hyphens only.';
    else if (data.platform === 'outbrain') msg += 'Use lowercase hex characters only (0-9, a-f).';
    else if (data.platform === 'taboola') msg += 'Use numbers only.';
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
  const capi = validateCapiToken(data.capiToken, data.platform);
  if (!capi.isValid) return { valid: false, message: capi.error };
  const capiTokenXss = checkForMaliciousInput(data.capiToken);
  if (!capiTokenXss.safe) return { valid: false, message: capiTokenXss.error };
  return { valid: true, message: null };
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { refreshRedisForLinksUsingPixel } from '../../lib/redisCache';
import Modal from '../common/Modal';

// Validation functions for each platform
const validatePixelId = (pixelId, platform) => {
  const trimmed = pixelId.trim();

  switch (platform) {
    case 'meta':
    case 'instagram':
      // Facebook / Instagram: 15 or 16 digits only (Meta Pixel)
      return /^\d{15,16}$/.test(trimmed);

    case 'tiktok':
      // TikTok: 18 characters, uppercase letters (A-Z) and numbers (0-9)
      const upperTrimmed = trimmed.toUpperCase();
      return /^[A-Z0-9]{18}$/.test(upperTrimmed);

    case 'snapchat':
      // Snapchat: Exactly 36 characters, UUID format (8-4-4-4-12)
      return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(trimmed);

    case 'google':
      // Google Ads: 11-13 characters total, starts with AW- followed by 9-10 digits
      return /^AW-\d{9,10}$/i.test(trimmed);

    case 'outbrain':
      // Outbrain: 32 chars hexadecimal (0-9, a-f)
      return /^[a-f0-9]{32}$/.test(trimmed);

    case 'taboola':
      // Taboola: 6-8 digits only
      return /^\d{6,8}$/.test(trimmed);

    default:
      return false;
  }
};

// CAPI Access Token validation by platform
const validateCapiToken = (token, platform) => {
  if (!token || token.trim() === '') return { isValid: true, error: null }; // Optional field

  const trimmed = token.trim();

  switch (platform) {
    case 'meta':
    case 'instagram':
      if (trimmed.length < 180 || trimmed.length > 250) {
        return { isValid: false, error: 'Access Token must be 180-250 characters' };
      }
      if (!/^[a-zA-Z0-9]+$/.test(trimmed)) {
        return { isValid: false, error: 'Access Token must contain only letters and numbers' };
      }
      return { isValid: true, error: null };

    case 'tiktok':
      if (trimmed.length !== 64) {
        return { isValid: false, error: 'TikTok Access Token must be 64 characters' };
      }
      if (!/^[a-zA-Z0-9]+$/.test(trimmed)) {
        return {
          isValid: false,
          error: 'TikTok Access Token must contain only letters and numbers',
        };
      }
      return { isValid: true, error: null };

    case 'google':
      // GA4 Api_Secret: starts with G- followed by ~10 alphanumeric characters
      if (!trimmed.startsWith('G-')) {
        return { isValid: false, error: 'Google Api_Secret must start with G-' };
      }
      if (!/^G-[a-zA-Z0-9]{8,15}$/.test(trimmed)) {
        return {
          isValid: false,
          error: 'Google Api_Secret must be G- followed by 8–15 letters and numbers',
        };
      }
      return { isValid: true, error: null };

    case 'snapchat':
      if (trimmed.length < 30 || trimmed.length > 50) {
        return { isValid: false, error: 'Snapchat Access Token must be 30-50 characters' };
      }
      if (!/^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
        return {
          isValid: false,
          error:
            'Snapchat Access Token must contain only letters, numbers, underscores and hyphens',
        };
      }
      return { isValid: true, error: null };

    case 'outbrain':
      if (trimmed.length < 30 || trimmed.length > 40) {
        return { isValid: false, error: 'Outbrain Access Token must be 30-40 characters' };
      }
      if (!/^[a-zA-Z0-9]+$/.test(trimmed)) {
        return {
          isValid: false,
          error: 'Outbrain Access Token must contain only letters and numbers',
        };
      }
      return { isValid: true, error: null };

    case 'taboola':
      if (trimmed.length < 30 || trimmed.length > 45) {
        return { isValid: false, error: 'Taboola Client Secret must be 30-45 characters' };
      }
      if (!/^[a-zA-Z0-9]+$/.test(trimmed)) {
        return {
          isValid: false,
          error: 'Taboola Client Secret must contain only letters and numbers',
        };
      }
      return { isValid: true, error: null };

    default:
      return { isValid: true, error: null };
  }
};

// Get CAPI token label by platform
const getPixelIdLabel = (platform) => (platform === 'google' ? 'Measurement_Id' : 'Pixel ID');

const getCapiTokenLabel = (platform) => {
  switch (platform) {
    case 'meta':
      return 'CAPI Access Token';
    case 'tiktok':
      return 'Access Token';
    case 'google':
      return 'Api_Secret';
    case 'snapchat':
      return 'Access Token';
    case 'outbrain':
      return 'Access Token';
    case 'taboola':
      return 'Client Secret';
    default:
      return 'CAPI Access Token';
  }
};

// Get CAPI token placeholder by platform
const getCapiTokenPlaceholder = (platform) => {
  switch (platform) {
    case 'meta':
    case 'instagram':
      return 'Enter your 180-250 character Access Token';
    case 'tiktok':
      return 'Enter your 64-character Access Token';
    case 'google':
      return 'Enter your Api_Secret (G- followed by ~10 letters and numbers)';
    case 'snapchat':
      return 'Enter your 30-50 character Access Token';
    case 'outbrain':
      return 'Enter your 30-40 character Access Token';
    case 'taboola':
      return 'Enter your 30-45 character Client Secret';
    default:
      return 'Enter your CAPI Access Token';
  }
};

const PLATFORMS = [
  {
    value: 'meta',
    label: 'Facebook',
    placeholder: 'Enter your 15-16 digit Pixel ID (numbers only)',
    validate: (id) => validatePixelId(id, 'meta'),
  },
  {
    value: 'instagram',
    label: 'Instagram',
    placeholder: 'Enter your 15-16 digit Pixel ID (numbers only)',
    validate: (id) => validatePixelId(id, 'instagram'),
  },
  {
    value: 'tiktok',
    label: 'TikTok',
    placeholder: 'Enter your 18-character Pixel ID (A-Z, 0-9)',
    validate: (id) => validatePixelId(id, 'tiktok'),
  },
  {
    value: 'google',
    label: 'Google Ads',
    placeholder: 'Enter your Measurement_Id (e.g., AW-1234567890)',
    validate: (id) => validatePixelId(id, 'google'),
  },
  {
    value: 'snapchat',
    label: 'Snapchat',
    placeholder: 'Enter your UUID Pixel ID (36 characters)',
    validate: (id) => validatePixelId(id, 'snapchat'),
  },
  {
    value: 'outbrain',
    label: 'Outbrain',
    placeholder: 'Enter your 32-character Marketer ID (0-9, a-f)',
    validate: (id) => validatePixelId(id, 'outbrain'),
  },
  {
    value: 'taboola',
    label: 'Taboola',
    placeholder: 'Enter your Account ID (6-8 digits)',
    validate: (id) => validatePixelId(id, 'taboola'),
  },
];

const STANDARD_EVENTS = {
  meta: [
    { value: 'PageView', label: 'PageView (Default)', description: 'Recommended for affiliates' },
    { value: 'ViewContent', label: 'ViewContent', description: 'Viewing content/offer' },
    { value: 'Lead', label: 'Lead', description: 'Most popular for affiliates' },
    { value: 'Contact', label: 'Contact', description: 'Contact initiated' },
    {
      value: 'CompleteRegistration',
      label: 'CompleteRegistration',
      description: 'Registration completed',
    },
    { value: 'Search', label: 'Search', description: 'Search within page' },
    { value: 'Donate', label: 'Donate', description: 'For donation campaigns' },
  ],
  instagram: [
    { value: 'PageView', label: 'PageView (Default)', description: 'Recommended for affiliates' },
    { value: 'ViewContent', label: 'ViewContent', description: 'Viewing content/offer' },
    { value: 'Lead', label: 'Lead', description: 'Most popular for affiliates' },
    { value: 'Contact', label: 'Contact', description: 'Contact initiated' },
    {
      value: 'CompleteRegistration',
      label: 'CompleteRegistration',
      description: 'Registration completed',
    },
    { value: 'Search', label: 'Search', description: 'Search within page' },
    { value: 'Donate', label: 'Donate', description: 'For donation campaigns' },
  ],
  tiktok: [
    { value: 'PageView', label: 'PageView (Default)', description: 'Recommended for affiliates' },
    { value: 'ViewContent', label: 'ViewContent', description: 'Viewing content/offer' },
    {
      value: 'ClickButton',
      label: 'ClickButton',
      description: 'Unique to TikTok - great for button clicks',
    },
    { value: 'Contact', label: 'Contact', description: 'Contact initiated' },
    {
      value: 'CompleteRegistration',
      label: 'CompleteRegistration',
      description: 'Registration completed',
    },
    { value: 'Download', label: 'Download', description: 'If page leads to download' },
    { value: 'SubmitForm', label: 'SubmitForm', description: 'If there is a form on page' },
  ],
  google: [
    { value: 'page_view', label: 'page_view (Default)', description: 'Recommended for affiliates' },
    { value: 'contact', label: 'contact', description: 'Contact initiated' },
    { value: 'qualified_lead', label: 'qualified_lead', description: 'High-quality lead' },
    { value: 'sign_up', label: 'sign_up', description: 'Registration completed' },
    { value: 'view_item', label: 'view_item', description: 'Similar to ViewContent' },
    { value: 'affiliate_click', label: 'affiliate_click', description: 'Affiliate link click' },
    { value: 'generate_lead', label: 'generate_lead', description: 'Lead generation' },
  ],
  snapchat: [
    { value: 'PAGE_VIEW', label: 'PAGE_VIEW (Default)', description: 'Recommended for affiliates' },
    { value: 'VIEW_CONTENT', label: 'VIEW_CONTENT', description: 'Viewing content/offer' },
    { value: 'SIGN_UP', label: 'SIGN_UP', description: 'Similar to Lead/Registration' },
    { value: 'AD_CLICK', label: 'AD_CLICK', description: 'If user clicks internal ad' },
    { value: 'SAVE', label: 'SAVE', description: 'Saving the offer' },
    { value: 'SEARCH', label: 'SEARCH', description: 'Search within page' },
    { value: 'LIST_VIEW', label: 'LIST_VIEW', description: 'Viewing a list' },
  ],
  outbrain: [
    { value: 'PAGE_VIEW', label: 'PAGE_VIEW (Default)', description: 'Recommended for affiliates' },
    { value: 'LEAD', label: 'LEAD', description: 'Lead generation' },
    { value: 'PURCHASE', label: 'PURCHASE', description: 'Sale conversion' },
  ],
  taboola: [
    { value: 'page_view', label: 'page_view (Default)', description: 'Recommended for affiliates' },
    { value: 'lead', label: 'lead', description: 'Lead generation' },
    { value: 'purchase', label: 'purchase', description: 'Sale conversion' },
  ],
};

const PixelModal = ({ isOpen, onClose, initialData = null }) => {
  const isEditMode = !!(initialData && initialData.id);

  const [formData, setFormData] = useState({
    name: '',
    platform: 'meta',
    pixelId: '',
    capiToken: '',
    eventType: 'PageView',
    customEventName: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        platform: initialData.platform || 'meta',
        pixelId: initialData.pixel_id || '',
        capiToken: initialData.capi_token || '',
        eventType: initialData.event_type || 'PageView',
        customEventName: initialData.custom_event_name || '',
      });
    } else {
      setFormData({
        name: '',
        platform: 'meta',
        pixelId: '',
        capiToken: '',
        eventType: 'PageView',
        customEventName: '',
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Friendly name is required';
    }

    if (!formData.pixelId.trim()) {
      newErrors.pixelId = `${getPixelIdLabel(formData.platform)} is required`;
    } else {
      const platform = PLATFORMS.find((p) => p.value === formData.platform);
      if (platform && !platform.validate(formData.pixelId)) {
        const idLabel = getPixelIdLabel(formData.platform);
        let errorMsg = `Invalid ${platform.label} ${idLabel} format. `;
        switch (formData.platform) {
          case 'meta':
          case 'instagram':
            errorMsg += 'Must be exactly 15 or 16 digits.';
            break;
          case 'tiktok':
            errorMsg += 'Must be exactly 18 characters (uppercase letters A-Z and numbers 0-9).';
            break;
          case 'google':
            errorMsg += 'Must start with AW- followed by 9-10 digits (e.g., AW-1234567890).';
            break;
          case 'snapchat':
            errorMsg += 'Must be a valid UUID format (36 characters: 8-4-4-4-12).';
            break;
          case 'outbrain':
            errorMsg += 'Must be exactly 32 lowercase hex characters (0-9, a-f).';
            break;
          case 'taboola':
            errorMsg += 'Must be between 6 and 8 digits.';
            break;
          default:
            errorMsg += 'Please check the format.';
        }
        newErrors.pixelId = errorMsg;
      }
    }

    if (formData.eventType === 'custom' && !formData.customEventName.trim()) {
      newErrors.customEventName = 'Custom event name is required';
    }

    // Validate CAPI Token if provided
    if (formData.capiToken.trim()) {
      const capiValidation = validateCapiToken(formData.capiToken, formData.platform);
      if (!capiValidation.isValid) {
        newErrors.capiToken = capiValidation.error;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to save pixels');
      }

      // Check duplicate pixel name (same user, case-insensitive)
      const trimmedName = formData.name.trim();
      const { data: existingPixels } = await supabase
        .from('pixels')
        .select('id')
        .eq('user_id', user.id)
        .ilike('name', trimmedName)
        .neq('status', 'deleted');
      const isDuplicateName =
        existingPixels?.length > 0 &&
        (isEditMode && initialData?.id
          ? existingPixels.some((p) => p.id !== initialData.id)
          : true);
      if (isDuplicateName) {
        setErrors((prev) => ({ ...prev, name: 'A pixel with this name already exists.' }));
        setIsSubmitting(false);
        return;
      }

      // Normalize pixel ID before saving (uppercase for TikTok)
      let normalizedPixelId = formData.pixelId.trim();
      if (formData.platform === 'tiktok') {
        normalizedPixelId = normalizedPixelId.toUpperCase();
      }

      const pixelData = {
        user_id: user.id,
        name: formData.name.trim(),
        platform: formData.platform,
        pixel_id: normalizedPixelId,
        capi_token: formData.capiToken.trim() || null,
        event_type: formData.eventType === 'custom' ? 'custom' : formData.eventType,
        custom_event_name: formData.eventType === 'custom' ? formData.customEventName.trim() : null,
        is_active: true,
      };

      let savedPixelId = initialData?.id;
      if (isEditMode) {
        const { error } = await supabase.from('pixels').update(pixelData).eq('id', initialData.id);

        if (error) throw error;
      } else {
        const { data: upserted, error } = await supabase
          .from('pixels')
          .upsert(pixelData, {
            onConflict: 'user_id,pixel_id,platform',
            ignoreDuplicates: false,
          })
          .select('id')
          .single();

        if (error) throw error;
        if (upserted?.id) savedPixelId = upserted.id;
      }

      try {
        if (savedPixelId) await refreshRedisForLinksUsingPixel(savedPixelId, supabase);
      } catch (redisErr) {
        console.warn('⚠️ [PixelModal] Redis refresh for links using pixel:', redisErr);
      }

      onClose();
    } catch (error) {
      console.error('Error saving pixel:', error);
      setErrorModal({
        isOpen: true,
        message: error.message || 'Error saving pixel. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPlatform = PLATFORMS.find((p) => p.value === formData.platform);
  const availableEvents = STANDARD_EVENTS[formData.platform] || [];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-[#101622] border border-[#232f48] rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden m-2 sm:m-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#232f48] flex-shrink-0">
                <div className="flex-1 min-w-0 pr-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    {isEditMode ? 'Edit Pixel' : 'Create New Pixel'}
                  </h2>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1">
                    {isEditMode ? 'Update your tracking pixel' : 'Add a new tracking pixel'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-white transition-colors p-2 flex-shrink-0"
                >
                  <span className="material-symbols-outlined text-xl sm:text-2xl">close</span>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Friendly Name */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Friendly Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (errors.name) setErrors({ ...errors, name: null });
                      }}
                      placeholder="e.g., FB - Main Account"
                      className={`w-full px-4 py-3 bg-[#0b0f19] border rounded-xl text-white placeholder-slate-500 focus:outline-none transition-colors ${
                        errors.name
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-[#232f48] focus:border-primary'
                      }`}
                    />
                    {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                  </div>

                  {/* Platform Select */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Platform <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.platform}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          platform: e.target.value,
                          eventType:
                            e.target.value === 'meta'
                              ? 'PageView'
                              : e.target.value === 'tiktok'
                                ? 'PageView'
                                : e.target.value === 'google'
                                  ? 'page_view'
                                  : 'PAGE_VIEW',
                        });
                        if (errors.platform) setErrors({ ...errors, platform: null });
                      }}
                      className="w-full px-4 py-3 bg-[#0b0f19] border border-[#232f48] rounded-xl text-white focus:outline-none focus:border-primary transition-colors"
                    >
                      {PLATFORMS.map((platform) => (
                        <option key={platform.value} value={platform.value}>
                          {platform.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Pixel ID / Measurement_Id (Google) */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      {getPixelIdLabel(formData.platform)} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.pixelId}
                      onChange={(e) => {
                        let value = e.target.value;
                        // Auto-uppercase for TikTok
                        if (formData.platform === 'tiktok') {
                          value = value.toUpperCase();
                        }
                        setFormData({ ...formData, pixelId: value });
                        if (errors.pixelId) setErrors({ ...errors, pixelId: null });
                      }}
                      placeholder={
                        currentPlatform?.placeholder ||
                        (formData.platform === 'google' ? 'Enter Measurement_Id' : 'Enter Pixel ID')
                      }
                      className={`w-full px-4 py-3 bg-[#0b0f19] border rounded-xl text-white placeholder-slate-500 focus:outline-none transition-colors font-mono text-sm ${
                        errors.pixelId
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-[#232f48] focus:border-primary'
                      }`}
                    />
                    {errors.pixelId && (
                      <p className="text-red-400 text-xs mt-1">{errors.pixelId}</p>
                    )}
                    <p className="text-slate-500 text-xs mt-1">{currentPlatform?.placeholder}</p>
                  </div>

                  {/* CAPI Access Token */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      {getCapiTokenLabel(formData.platform)}
                    </label>
                    <textarea
                      value={formData.capiToken}
                      onChange={(e) => {
                        setFormData({ ...formData, capiToken: e.target.value });
                        if (errors.capiToken) setErrors({ ...errors, capiToken: null });
                      }}
                      placeholder={getCapiTokenPlaceholder(formData.platform)}
                      rows={5}
                      className={`w-full min-h-[120px] sm:min-h-[140px] px-4 py-3 bg-[#1e152f] border rounded-xl text-white placeholder-slate-500 focus:outline-none transition-colors font-mono text-sm resize-y ${
                        errors.capiToken
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-[#584674] focus:border-primary'
                      }`}
                    />
                    {errors.capiToken && (
                      <p className="text-red-400 text-xs mt-1">{errors.capiToken}</p>
                    )}
                    <p className="text-slate-500 text-xs mt-1">
                      {getCapiTokenPlaceholder(formData.platform)} (optional)
                    </p>
                  </div>

                  {/* Event Type Selection */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Event Type
                      </label>
                      <select
                        value={formData.eventType}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            eventType: e.target.value,
                            customEventName:
                              e.target.value !== 'custom' ? '' : formData.customEventName,
                          });
                          if (errors.customEventName)
                            setErrors({ ...errors, customEventName: null });
                        }}
                        className="w-full px-4 py-3 bg-[#0b0f19] border border-[#232f48] rounded-xl text-white focus:outline-none focus:border-primary transition-colors"
                      >
                        {availableEvents.map((event) => (
                          <option key={event.value} value={event.value}>
                            {event.label} - {event.description}
                          </option>
                        ))}
                        <option value="custom">Custom Event</option>
                      </select>
                    </div>

                    {/* Custom Event Name (only if custom selected) */}
                    {formData.eventType === 'custom' && (
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Custom Event Name <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.customEventName}
                          onChange={(e) => {
                            setFormData({ ...formData, customEventName: e.target.value });
                            if (errors.customEventName)
                              setErrors({ ...errors, customEventName: null });
                          }}
                          placeholder="e.g., High_Quality_User, ClickedToOffer"
                          className={`w-full px-4 py-3 bg-[#0b0f19] border rounded-xl text-white placeholder-slate-500 focus:outline-none transition-colors ${
                            errors.customEventName
                              ? 'border-red-500 focus:border-red-500'
                              : 'border-[#232f48] focus:border-primary'
                          }`}
                        />
                        {errors.customEventName && (
                          <p className="text-red-400 text-xs mt-1">{errors.customEventName}</p>
                        )}
                        <p className="text-slate-500 text-xs mt-1">
                          Enter a custom event name (case-sensitive)
                        </p>
                      </div>
                    )}
                  </div>
                </form>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-[#232f48] flex-shrink-0">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm bg-[#232f48] text-white hover:bg-[#324467] rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-sm text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{
                    backgroundColor: isSubmitting ? undefined : '#FF10F0',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.backgroundColor = '#e00ed0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.backgroundColor = '#FF10F0';
                    }
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-base">
                        refresh
                      </span>
                      {isEditMode ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">
                        {isEditMode ? 'save' : 'add'}
                      </span>
                      {isEditMode ? 'Update Pixel' : 'Create Pixel'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Error Modal */}
      <Modal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
        title="Error"
        message={errorModal.message}
        type="error"
      />
    </>
  );
};

export default PixelModal;

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft } from 'lucide-react';
import Modal from '../../components/common/Modal';

// Validation functions for each platform
const validatePixelId = (pixelId, platform) => {
  const trimmed = pixelId.trim();
  
  switch (platform) {
    case 'meta':
      return /^\d{15,16}$/.test(trimmed);
    case 'tiktok':
      const upperTrimmed = trimmed.toUpperCase();
      return /^[A-Z0-9]{16}$/.test(upperTrimmed);
    case 'snapchat':
      return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(trimmed);
    case 'google':
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

const PLATFORMS = [
  { 
    value: 'meta', 
    label: 'Meta (Facebook)', 
    placeholder: 'Enter your 15-16 digit Pixel ID (numbers only)',
    validate: (id) => validatePixelId(id, 'meta')
  },
  { 
    value: 'tiktok', 
    label: 'TikTok', 
    placeholder: 'Enter your 16-character Pixel ID (A-Z, 0-9)',
    validate: (id) => validatePixelId(id, 'tiktok')
  },
  { 
    value: 'google', 
    label: 'Google Ads', 
    placeholder: 'Enter your Conversion ID (e.g., AW-1234567890)',
    validate: (id) => validatePixelId(id, 'google')
  },
  { 
    value: 'snapchat', 
    label: 'Snapchat', 
    placeholder: 'Enter your UUID Pixel ID (36 characters)',
    validate: (id) => validatePixelId(id, 'snapchat')
  },
  { 
    value: 'outbrain', 
    label: 'Outbrain', 
    placeholder: 'Enter your 32-character Marketer ID (0-9, a-f)',
    validate: (id) => validatePixelId(id, 'outbrain')
  },
  { 
    value: 'taboola', 
    label: 'Taboola', 
    placeholder: 'Enter your Account ID (6-8 digits)',
    validate: (id) => validatePixelId(id, 'taboola')
  },
];

const STANDARD_EVENTS = {
  meta: [
    { value: 'PageView', label: 'PageView (Default)', description: 'Recommended for affiliates' },
    { value: 'ViewContent', label: 'ViewContent', description: 'Viewing content/offer' },
    { value: 'Lead', label: 'Lead', description: 'Most popular for affiliates' },
    { value: 'Contact', label: 'Contact', description: 'Contact initiated' },
    { value: 'CompleteRegistration', label: 'CompleteRegistration', description: 'Registration completed' },
    { value: 'Search', label: 'Search', description: 'Search within page' },
    { value: 'Donate', label: 'Donate', description: 'For donation campaigns' },
  ],
  tiktok: [
    { value: 'PageView', label: 'PageView (Default)', description: 'Recommended for affiliates' },
    { value: 'ViewContent', label: 'ViewContent', description: 'Viewing content/offer' },
    { value: 'ClickButton', label: 'ClickButton', description: 'Unique to TikTok - great for button clicks' },
    { value: 'Contact', label: 'Contact', description: 'Contact initiated' },
    { value: 'CompleteRegistration', label: 'CompleteRegistration', description: 'Registration completed' },
    { value: 'Download', label: 'Download', description: 'If page leads to download' },
    { value: 'SubmitForm', label: 'SubmitForm', description: 'If there is a form on page' },
  ],
  google: [
    { value: 'page_view', label: 'page_view (Default)', description: 'Recommended for affiliates' },
    { value: 'contact', label: 'contact', description: 'Contact initiated' },
    { value: 'qualified_lead', label: 'qualified_lead', description: 'High-quality lead' },
    { value: 'sign_up', label: 'sign_up', description: 'Registration completed' },
    { value: 'view_item', label: 'view_item', description: 'Similar to ViewContent' },
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

const PixelBuilderPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState({
    name: '',
    platform: 'meta',
    pixelId: '',
    eventType: 'PageView',
    customEventName: '',
    enableAdvancedEvents: false,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });
  const [initialLoading, setInitialLoading] = useState(!!id);

  useEffect(() => {
    if (id) {
      fetchPixel();
    }
  }, [id]);

  const fetchPixel = async () => {
    try {
      setInitialLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/dashboard/pixels');
        return;
      }

      const { data, error } = await supabase
        .from('pixels')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!data) {
        navigate('/dashboard/pixels');
        return;
      }

      setFormData({
        name: data.name || '',
        platform: data.platform || 'meta',
        pixelId: data.pixel_id || '',
        eventType: data.event_type || 'PageView',
        customEventName: data.custom_event_name || '',
        enableAdvancedEvents: data.event_type !== 'PageView' || false,
      });
    } catch (error) {
      console.error('Error fetching pixel:', error);
      navigate('/dashboard/pixels');
    } finally {
      setInitialLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Friendly name is required';
    }

    if (!formData.pixelId.trim()) {
      newErrors.pixelId = 'Pixel ID is required';
    } else {
      const platform = PLATFORMS.find(p => p.value === formData.platform);
      if (platform && !platform.validate(formData.pixelId)) {
        let errorMsg = `Invalid ${platform.label} Pixel ID format. `;
        switch (formData.platform) {
          case 'meta':
            errorMsg += 'Must be exactly 15 or 16 digits.';
            break;
          case 'tiktok':
            errorMsg += 'Must be exactly 16 characters (uppercase letters A-Z and numbers 0-9).';
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

    if (formData.enableAdvancedEvents) {
      if (formData.eventType === 'custom' && !formData.customEventName.trim()) {
        newErrors.customEventName = 'Custom event name is required';
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to save pixels');
      }

      let normalizedPixelId = formData.pixelId.trim();
      if (formData.platform === 'tiktok') {
        normalizedPixelId = normalizedPixelId.toUpperCase();
      }

      const pixelData = {
        user_id: user.id,
        name: formData.name.trim(),
        platform: formData.platform,
        pixel_id: normalizedPixelId,
        event_type: formData.enableAdvancedEvents 
          ? (formData.eventType === 'custom' ? 'custom' : formData.eventType)
          : 'PageView',
        custom_event_name: formData.enableAdvancedEvents && formData.eventType === 'custom' 
          ? formData.customEventName.trim() 
          : null,
        is_active: true,
      };

      if (isEditMode) {
        const { error } = await supabase
          .from('pixels')
          .update(pixelData)
          .eq('id', id);

        if (error) throw error;
      } else {
        // Use upsert to handle duplicate key constraint
        const { error } = await supabase
          .from('pixels')
          .upsert(pixelData, {
            onConflict: 'user_id,pixel_id,platform',
            ignoreDuplicates: false
          });

        if (error) throw error;
      }

      navigate('/dashboard/pixels');
    } catch (error) {
      console.error('Error saving pixel:', error);
      setErrorModal({
        isOpen: true,
        message: error.message || 'Error saving pixel. Please try again.',
      });
      setIsSubmitting(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#1e152f] flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-slate-600 animate-spin">refresh</span>
          <p className="text-slate-400 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  const currentPlatform = PLATFORMS.find(p => p.value === formData.platform);
  const availableEvents = STANDARD_EVENTS[formData.platform] || [];

  return (
    <div className="min-h-screen bg-[#1e152f] pb-8">
      {/* Header with back button */}
      <div className="sticky top-0 z-10 bg-[#1e152f] border-b border-slate-800 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/pixels')}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-white">
            {isEditMode ? 'Edit Pixel' : 'Create New Pixel'}
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
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
              className={`w-full px-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:outline-none transition-colors ${
                errors.name ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-primary'
              }`}
            />
            {errors.name && (
              <p className="text-red-400 text-xs mt-1">{errors.name}</p>
            )}
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
                  eventType: e.target.value === 'meta' ? 'PageView' : 
                             e.target.value === 'tiktok' ? 'PageView' :
                             e.target.value === 'google' ? 'page_view' : 'PAGE_VIEW',
                });
                if (errors.platform) setErrors({ ...errors, platform: null });
              }}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-primary transition-colors"
            >
              {PLATFORMS.map((platform) => (
                <option key={platform.value} value={platform.value}>
                  {platform.label}
                </option>
              ))}
            </select>
          </div>

          {/* Pixel ID */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Pixel ID <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.pixelId}
              onChange={(e) => {
                let value = e.target.value;
                if (formData.platform === 'tiktok') {
                  value = value.toUpperCase();
                }
                setFormData({ ...formData, pixelId: value });
                if (errors.pixelId) setErrors({ ...errors, pixelId: null });
              }}
              placeholder={currentPlatform?.placeholder || 'Enter Pixel ID'}
              className={`w-full px-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:outline-none transition-colors font-mono text-sm ${
                errors.pixelId ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-primary'
              }`}
            />
            {errors.pixelId && (
              <p className="text-red-400 text-xs mt-1">{errors.pixelId}</p>
            )}
            <p className="text-slate-500 text-xs mt-1">
              {currentPlatform?.placeholder}
            </p>
          </div>

          {/* Enable Advanced Events Toggle */}
          <div className="flex items-center gap-3 p-4 bg-slate-800 border border-slate-700 rounded-xl">
            <input
              type="checkbox"
              id="enableAdvancedEvents"
              checked={formData.enableAdvancedEvents}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  enableAdvancedEvents: e.target.checked,
                  eventType: e.target.checked ? formData.eventType : 'PageView',
                });
              }}
              className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-primary focus:ring-primary focus:ring-offset-0"
            />
            <label htmlFor="enableAdvancedEvents" className="text-sm text-white cursor-pointer">
              Enable Advanced Events
            </label>
          </div>

          {/* Event Selection (only if advanced events enabled) */}
          {formData.enableAdvancedEvents && (
            <div className="space-y-4">
              {/* Standard Event Dropdown */}
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
                      customEventName: e.target.value !== 'custom' ? '' : formData.customEventName,
                    });
                    if (errors.customEventName) setErrors({ ...errors, customEventName: null });
                  }}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-primary transition-colors"
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
                      if (errors.customEventName) setErrors({ ...errors, customEventName: null });
                    }}
                    placeholder="e.g., High_Quality_User, ClickedToOffer"
                    className={`w-full px-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:outline-none transition-colors ${
                      errors.customEventName ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-primary'
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
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-[#e1567c] hover:bg-[#c94669] text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin">refresh</span>
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">{isEditMode ? 'save' : 'add'}</span>
                  {isEditMode ? 'Update Pixel' : 'Create Pixel'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error Modal */}
      <Modal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
        title="Error"
        message={errorModal.message}
        type="error"
      />
    </div>
  );
};

export default PixelBuilderPage;

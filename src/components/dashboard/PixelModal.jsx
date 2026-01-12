import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import Modal from '../common/Modal';

const PLATFORMS = [
  { value: 'meta', label: 'Meta (Facebook)', placeholder: 'Enter your 15-16 digit Pixel ID', pattern: /^\d{15,16}$/ },
  { value: 'tiktok', label: 'TikTok', placeholder: 'Enter your alphanumeric Pixel ID', pattern: /^[A-Z0-9]+$/i },
  { value: 'google', label: 'Google Ads', placeholder: 'Enter your Conversion ID (e.g., AW-123456789)', pattern: /^AW-\d+$/i },
  { value: 'snapchat', label: 'Snapchat', placeholder: 'Enter your UUID Pixel ID', pattern: /^[a-f0-9-]+$/i },
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
};

const PixelModal = ({ isOpen, onClose, initialData = null }) => {
  const isEditMode = !!(initialData && initialData.id);
  
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

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        platform: initialData.platform || 'meta',
        pixelId: initialData.pixel_id || '',
        eventType: initialData.event_type || 'PageView',
        customEventName: initialData.custom_event_name || '',
        enableAdvancedEvents: initialData.event_type === 'custom' || false,
      });
    } else {
      setFormData({
        name: '',
        platform: 'meta',
        pixelId: '',
        eventType: 'PageView',
        customEventName: '',
        enableAdvancedEvents: false,
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
      newErrors.pixelId = 'Pixel ID is required';
    } else {
      const platform = PLATFORMS.find(p => p.value === formData.platform);
      if (platform && !platform.pattern.test(formData.pixelId.trim())) {
        newErrors.pixelId = `Invalid ${platform.label} Pixel ID format`;
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

      const pixelData = {
        user_id: user.id,
        name: formData.name.trim(),
        platform: formData.platform,
        pixel_id: formData.pixelId.trim(),
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
          .eq('id', initialData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pixels')
          .insert(pixelData);

        if (error) throw error;
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

  const currentPlatform = PLATFORMS.find(p => p.value === formData.platform);
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
                        errors.name ? 'border-red-500 focus:border-red-500' : 'border-[#232f48] focus:border-primary'
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
                      className="w-full px-4 py-3 bg-[#0b0f19] border border-[#232f48] rounded-xl text-white focus:outline-none focus:border-primary transition-colors"
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
                        setFormData({ ...formData, pixelId: e.target.value });
                        if (errors.pixelId) setErrors({ ...errors, pixelId: null });
                      }}
                      placeholder={currentPlatform?.placeholder || 'Enter Pixel ID'}
                      className={`w-full px-4 py-3 bg-[#0b0f19] border rounded-xl text-white placeholder-slate-500 focus:outline-none transition-colors font-mono text-sm ${
                        errors.pixelId ? 'border-red-500 focus:border-red-500' : 'border-[#232f48] focus:border-primary'
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
                  <div className="flex items-center gap-3 p-4 bg-[#0b0f19] border border-[#232f48] rounded-xl">
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
                      className="w-5 h-5 rounded border-[#232f48] bg-[#101622] text-primary focus:ring-primary focus:ring-offset-0"
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
                              if (errors.customEventName) setErrors({ ...errors, customEventName: null });
                            }}
                            placeholder="e.g., High_Quality_User, ClickedToOffer"
                            className={`w-full px-4 py-3 bg-[#0b0f19] border rounded-xl text-white placeholder-slate-500 focus:outline-none transition-colors ${
                              errors.customEventName ? 'border-red-500 focus:border-red-500' : 'border-[#232f48] focus:border-primary'
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
                    backgroundColor: isSubmitting ? undefined : "#FF10F0",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.backgroundColor = "#e00ed0";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.backgroundColor = "#FF10F0";
                    }
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-base">refresh</span>
                      {isEditMode ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">{isEditMode ? 'save' : 'add'}</span>
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

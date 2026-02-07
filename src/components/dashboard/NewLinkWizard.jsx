import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { updateLinkInRedis } from '../../lib/redisCache';
import LinkWizardOnePerPage from './LinkWizardOnePerPage';
import Modal from '../common/Modal';

const NewLinkWizard = ({ isOpen, onClose, initialData = null }) => {
  const isEditMode = !!(initialData && initialData.id);
  const [planType, setPlanType] = useState('free');
  const wizardRef = useRef(null);

  const getInitialFormData = () => {
    if (initialData) {
      return {
        linkId: initialData.id || null,
        name: initialData.name || '',
        targetUrl: initialData.target_url || '',
        domain: initialData.domain || 'glynk.to',
        slug: initialData.slug || '',
        urlSafety: { isSafe: null, threatType: null }, // Safety check result
        // Step 2
        utmSource: initialData.utm_source || '',
        utmMedium: initialData.utm_medium || '',
        utmCampaign: initialData.utm_campaign || '',
        utmContent: initialData.utm_content || '',
        parameterPassThrough:
          initialData.parameter_pass_through !== undefined
            ? initialData.parameter_pass_through
            : true,
        platformPreset: null,
        // Step 3
        selectedPixels: initialData.pixels || [],
        trackingMode: initialData.tracking_mode || 'capi',
        serverSideTracking: initialData.server_side_tracking || false,
        customScript: initialData.custom_script || '',
        // Step 4
        fraudShield: initialData.fraud_shield || 'none',
        botAction: initialData.bot_action || 'no-tracking',
        fallbackUrl: initialData.fallback_url || '',
        geoRules: (() => {
          if (Array.isArray(initialData.geo_rules)) {
            return initialData.geo_rules;
          }
          if (initialData.geo_rules && typeof initialData.geo_rules === 'string') {
            try {
              const parsed = JSON.parse(initialData.geo_rules);
              return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              console.error('Error parsing geo_rules:', e);
              return [];
            }
          }
          return [];
        })(),
        // Step 5 - calculated
        shortUrl: initialData.short_url || '',
        fullUtmString: '',
      };
    }
    return {
      // Step 1
      name: '',
      targetUrl: '',
      domain: 'glynk.to',
      slug: '',
      urlSafety: { isSafe: null, threatType: null }, // Safety check result
      // Step 2
      utmSource: '',
      utmMedium: '',
      utmCampaign: '',
      utmContent: '',
      parameterPassThrough: true,
      platformPreset: null,
      // Step 3
      selectedPixels: [],
      trackingMode: 'capi',
      serverSideTracking: false,
      customScript: '',
      // Step 4
      fraudShield: 'none',
      botAction: 'no-tracking',
      fallbackUrl: '',
      geoRules: [],
      // Step 5 - calculated
      shortUrl: '',
      fullUtmString: '',
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal state
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    onConfirm: null,
    isLoading: false,
  });

  // Fetch user's plan type
  useEffect(() => {
    const fetchPlanType = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('plan_type')
          .eq('user_id', user.id)
          .single();

        if (profile?.plan_type) {
          setPlanType(profile.plan_type);
        }
      } catch (error) {
        console.error('Error fetching plan type:', error);
      }
    };
    if (isOpen) {
      fetchPlanType();
    }
  }, [isOpen]);

  // Reset form data when initialData changes (when switching between create/edit)
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
      setCurrentStep(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData]);

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    let finalFallbackUrl = null;
    if (wizardRef.current?.validateBeforeSubmit) {
      const result = wizardRef.current.validateBeforeSubmit();
      if (!result.isValid) return;
      finalFallbackUrl = result.normalizedUrl;
    }

    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Validate required fields
      if (!formData.targetUrl || !formData.targetUrl.trim()) {
        throw new Error('Target URL is required');
      }

      // Name is required - validate it
      let finalName = formData.name?.trim();
      if (!finalName) {
        throw new Error('Link name is required. Please enter a name for your link.');
      }

      // Check duplicate link name (same user, case-insensitive)
      const { data: existingLinks } = await supabase
        .from('links')
        .select('id')
        .eq('user_id', user.id)
        .ilike('name', finalName)
        .neq('status', 'deleted');
      const isDuplicateName =
        existingLinks?.length > 0 &&
        (isEditMode && initialData?.id ? existingLinks.some((l) => l.id !== initialData.id) : true);
      if (isDuplicateName) {
        setModalState({
          isOpen: true,
          type: 'alert',
          title: 'Name already in use',
          message: 'A link with this name already exists. Please choose a different name.',
          onConfirm: null,
          isLoading: false,
        });
        setIsSubmitting(false);
        return;
      }

      // Generate slug if not provided
      const finalSlug = formData.slug || generateRandomSlug();

      // Build UTM string
      const utmParams = new URLSearchParams();
      if (formData.utmSource) utmParams.append('utm_source', formData.utmSource);
      if (formData.utmMedium) utmParams.append('utm_medium', formData.utmMedium);
      if (formData.utmCampaign) utmParams.append('utm_campaign', formData.utmCampaign);
      if (formData.utmContent) utmParams.append('utm_content', formData.utmContent);

      const baseUrl = formData.domain || 'glynk.to';
      const shortUrl = `https://${baseUrl}/${finalSlug}`;
      const fullUtmString = utmParams.toString() ? `${shortUrl}?${utmParams.toString()}` : shortUrl;

      // Save to database (UPDATE if edit mode, INSERT if create mode)
      console.log('🔵 [Submit] Saving to database...');
      console.log('🔵 [Submit] isEditMode:', isEditMode);
      console.log('🔵 [Submit] finalFallbackUrl to save:', finalFallbackUrl);

      if (isEditMode && initialData.id) {
        // Update existing link
        console.log('🔵 [Submit] Updating link ID:', initialData.id);
        const { data: updatedRow, error } = await supabase
          .from('links')
          .update({
            name: finalName,
            target_url: formData.targetUrl,
            domain: baseUrl,
            slug: finalSlug,
            short_url: shortUrl,
            utm_source: formData.utmSource || null,
            utm_medium: formData.utmMedium || null,
            utm_campaign: formData.utmCampaign || null,
            utm_content: formData.utmContent || null,
            parameter_pass_through: formData.parameterPassThrough,
            pixels: formData.selectedPixels,
            tracking_mode: formData.trackingMode || 'capi',
            server_side_tracking:
              formData.trackingMode === 'capi' || formData.trackingMode === 'pixel_and_capi',
            custom_script: formData.customScript || null,
            fraud_shield: formData.fraudShield,
            bot_action: formData.botAction,
            fallback_url: finalFallbackUrl,
            geo_rules: Array.isArray(formData.geoRules) ? formData.geoRules : [],
            updated_at: new Date().toISOString(),
          })
          .eq('id', initialData.id)
          .select()
          .single();

        console.log('🔵 [Submit] Update result - error:', error);
        if (error) throw error;
        console.log('✅ [Submit] Link updated successfully!');

        try {
          const oldDomain = initialData.domain || null;
          const oldSlug = initialData.slug || null;
          if (updatedRow) {
            await updateLinkInRedis(updatedRow, supabase, oldDomain, oldSlug);
          }
        } catch (redisErr) {
          console.warn('⚠️ [NewLinkWizard] Redis sync after update:', redisErr);
        }

        // Show success modal
        setModalState({
          isOpen: true,
          type: 'success',
          title: 'Link Updated Successfully!',
          message: (
            <>
              <p>
                <strong>Short URL:</strong> {shortUrl}
              </p>
              <p style={{ marginTop: '12px' }}>
                <strong>Full UTM String:</strong>
              </p>
              <p style={{ wordBreak: 'break-all', fontSize: '0.9rem', color: '#6B7280' }}>
                {fullUtmString}
              </p>
            </>
          ),
          onConfirm: null,
          isLoading: false,
        });
      } else {
        // Create new link
        console.log('🔵 [Submit] Creating new link...');
        const { data: newLink, error } = await supabase
          .from('links')
          .insert({
            user_id: user.id,
            name: finalName,
            target_url: formData.targetUrl,
            domain: baseUrl,
            slug: finalSlug,
            short_url: shortUrl,
            utm_source: formData.utmSource || null,
            utm_medium: formData.utmMedium || null,
            utm_campaign: formData.utmCampaign || null,
            utm_content: formData.utmContent || null,
            parameter_pass_through: formData.parameterPassThrough,
            pixels: formData.selectedPixels,
            tracking_mode: formData.trackingMode || 'capi',
            server_side_tracking:
              formData.trackingMode === 'capi' || formData.trackingMode === 'pixel_and_capi',
            custom_script: formData.customScript || null,
            fraud_shield: formData.fraudShield,
            bot_action: formData.botAction,
            fallback_url: finalFallbackUrl,
            geo_rules: Array.isArray(formData.geoRules) ? formData.geoRules : [],
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        console.log('🔵 [Submit] Insert result - error:', error);
        if (error) throw error;
        console.log('✅ [Submit] Link created successfully!');

        try {
          if (newLink) await updateLinkInRedis(newLink, supabase);
        } catch (redisErr) {
          console.warn('⚠️ [NewLinkWizard] Redis sync after create:', redisErr);
        }

        // Copy to clipboard
        try {
          await navigator.clipboard.writeText(fullUtmString);
        } catch (err) {
          console.error('Failed to copy to clipboard:', err);
        }

        // Show success modal
        setModalState({
          isOpen: true,
          type: 'success',
          title: 'Link Created Successfully!',
          message: (
            <>
              <p>
                <strong>Short URL:</strong> {shortUrl}
              </p>
              <p style={{ marginTop: '12px' }}>
                <strong>Full UTM String (copied to clipboard):</strong>
              </p>
              <p style={{ wordBreak: 'break-all', fontSize: '0.9rem', color: '#6B7280' }}>
                {fullUtmString}
              </p>
            </>
          ),
          onConfirm: null,
          isLoading: false,
        });
        // Don't close wizard yet - wait for user to close modal
        return;
      }

      // Close wizard and reset (only if no modal was shown)
      onClose();
      setCurrentStep(1);
      setFormData({
        name: '',
        targetUrl: '',
        domain: 'glynk.to',
        slug: '',
        urlSafety: { isSafe: null, threatType: null },
        utmSource: '',
        utmMedium: '',
        utmCampaign: '',
        utmContent: '',
        parameterPassThrough: true,
        platformPreset: null,
        selectedPixels: [],
        trackingMode: 'capi',
        serverSideTracking: false,
        customScript: '',
        fraudShield: 'none',
        botAction: 'no-tracking',
        fallbackUrl: '',
        geoRules: [],
        shortUrl: '',
        fullUtmString: '',
      });
    } catch (error) {
      console.error('❌ [Submit] Error:', error);
      console.error('❌ [Submit] Error message:', error?.message);
      const errorMessage = error?.message || 'Unknown error occurred';
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error Creating Link',
        message: (
          <>
            <p>{errorMessage}</p>
            <p style={{ marginTop: '8px', fontSize: '0.9rem', color: '#6B7280' }}>
              Please check the console for more details.
            </p>
          </>
        ),
        onConfirm: null,
        isLoading: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateRandomSlug = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let slug = '';
    for (let i = 0; i < 8; i++) {
      slug += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return slug;
  };

  return (
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
            className="relative bg-[#101622] border border-[#232f48] rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden m-2 sm:m-0"
            style={{ overflowX: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#232f48] flex-shrink-0">
              <div className="flex-1 min-w-0 pr-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
                  {isEditMode ? 'Edit Link' : 'Add New Link'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors p-2 flex-shrink-0"
              >
                <span className="material-symbols-outlined text-xl sm:text-2xl">close</span>
              </button>
            </div>

            {/* One-per-page wizard (progress, steps, footer inside) */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <LinkWizardOnePerPage
                formData={formData}
                updateFormData={updateFormData}
                planType={planType}
                isEditMode={isEditMode}
                initialData={initialData}
                onValidateAndSubmit={handleSubmit}
                stepRefs={wizardRef}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* Success/Error Modal */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={() => {
          setModalState({ ...modalState, isOpen: false });
          // If it's a success modal, close the wizard after closing modal
          if (modalState.type === 'success') {
            onClose();
          }
        }}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onConfirm={modalState.onConfirm}
        isLoading={modalState.isLoading}
      />
    </AnimatePresence>
  );
};

export default NewLinkWizard;

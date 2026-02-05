import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { validateUrl } from '../../lib/urlValidation';
import { updateLinkInRedis } from '../../lib/redisCache';
import Step1FastTrack from './wizard/Step1FastTrack';
import Step2Optimization from './wizard/Step2Optimization';
import Step3Security from './wizard/Step3Security';
import Modal from '../common/Modal';

const allSteps = [
  { number: 1, title: 'The Fast Track', subtitle: 'Destination & Identity' },
  { number: 2, title: 'Security & Logic', subtitle: 'Smart Rules & Protection' },
  { number: 3, title: 'Optimization & Marketing', subtitle: 'CAPI' },
];

// Get visible steps based on plan type
const getStepsForPlan = (planType) => {
  switch (planType?.toLowerCase()) {
    case 'pro':
      return allSteps; // All 3 steps
    case 'advanced':
      return allSteps.slice(0, 2); // Steps 1 and 2
    case 'free':
    default:
      return allSteps.slice(0, 1); // Only Step 1
  }
};

const NewLinkWizard = ({ isOpen, onClose, initialData = null }) => {
  // Edit mode only if initialData exists AND has an ID (for duplication, we pass data without ID)
  const isEditMode = !!(initialData && initialData.id);
  const [currentStep, setCurrentStep] = useState(1);
  const [planType, setPlanType] = useState('free');
  const step1ValidationRef = useRef(null);
  const step3ValidationRef = useRef(null);

  // Get steps based on plan type
  const steps = getStepsForPlan(planType);

  // Initialize formData with initialData if in edit mode, otherwise use defaults
  const getInitialFormData = () => {
    if (initialData) {
      return {
        // Step 1
        linkId: initialData.id || null, // Store link ID for edit mode validation
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

  const nextStep = async () => {
    // If we're on step 1, run validations before continuing
    if (currentStep === 1 && step1ValidationRef.current) {
      const validationResult = await step1ValidationRef.current(true);
      if (!validationResult || !validationResult.isValid) {
        // Validation failed - errors are already shown in Step1FastTrack
        return;
      }
    }

    // Validate Step 2 (Security) - fallback URL is required if redirect is selected
    if (currentStep === 2 && step3ValidationRef.current) {
      const validationResult = step3ValidationRef.current();
      if (!validationResult || !validationResult.isValid) {
        return;
      }
    }

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    // Validate Step 2 (Security) before submitting
    let finalFallbackUrl = null;
    if (step3ValidationRef.current) {
      const step3Validation = step3ValidationRef.current();
      if (!step3Validation.isValid) {
        // Validation failed - error is already shown inline, just return
        return;
      }
      // Use the normalized URL from validation
      finalFallbackUrl = step3Validation.normalizedUrl;
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
                  {isEditMode ? 'Edit Link' : 'Create Your GoodLink'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors p-2 flex-shrink-0"
              >
                <span className="material-symbols-outlined text-xl sm:text-2xl">close</span>
              </button>
            </div>

            {/* Stepper - Hidden for FREE users */}
            {planType?.toLowerCase() !== 'free' && (
              <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-[#232f48] flex-shrink-0 overflow-x-auto">
                <div className="flex items-center gap-2 sm:gap-4 min-w-max">
                  {steps.map((step, index) => (
                    <React.Fragment key={step.number}>
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-bold text-sm sm:text-base transition-all flex-shrink-0 ${
                            currentStep === step.number
                              ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/50'
                              : currentStep > step.number
                                ? 'bg-primary/50 text-white'
                                : 'bg-[#232f48] text-slate-400'
                          }`}
                        >
                          {step.number}
                        </div>
                        <div className="hidden sm:block">
                          <div
                            className={`text-xs sm:text-sm font-bold ${
                              currentStep >= step.number ? 'text-white' : 'text-slate-400'
                            }`}
                          >
                            {step.title}
                          </div>
                          {step.subtitle && (
                            <div className="text-xs text-slate-500 mt-0.5 hidden md:block">
                              {step.subtitle}
                            </div>
                          )}
                        </div>
                      </div>
                      {index < steps.length - 1 && (
                        <div
                          className={`w-6 sm:w-12 h-0.5 flex-shrink-0 ${
                            currentStep > step.number ? 'bg-primary' : 'bg-[#232f48]'
                          }`}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6">
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <Step1FastTrack
                    key="step1"
                    formData={formData}
                    updateFormData={updateFormData}
                    onQuickCreate={handleSubmit}
                    onSafetyCheckUpdate={(safety) => updateFormData('urlSafety', safety)}
                    onValidationRequest={step1ValidationRef}
                    onContinue={nextStep}
                    planType={planType}
                  />
                )}
                {currentStep === 2 && (
                  <Step3Security
                    key="step2"
                    formData={formData}
                    updateFormData={updateFormData}
                    onValidationRequest={step3ValidationRef}
                  />
                )}
                {currentStep === 3 && (
                  <Step2Optimization
                    key="step3"
                    formData={formData}
                    updateFormData={updateFormData}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-3 sm:p-6 border-t border-[#232f48] flex-shrink-0 gap-2">
              {currentStep === 1 ? (
                // Step 1: Hide Previous button and Continue button (moved to Step1FastTrack)
                <div className="text-slate-400 text-xs sm:text-sm whitespace-nowrap">
                  {steps.length > 1 && `Step ${currentStep} of ${steps.length}`}
                </div>
              ) : (
                <>
                  <button
                    onClick={prevStep}
                    className="px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg sm:rounded-xl font-bold transition-colors flex-shrink-0 bg-[#232f48] text-white hover:bg-[#324467]"
                  >
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </button>
                  <div className="text-slate-400 text-xs sm:text-sm whitespace-nowrap">
                    Step {currentStep} of {steps.length}
                  </div>
                  {currentStep < steps.length ? (
                    <button
                      onClick={nextStep}
                      className="px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm bg-primary hover:bg-primary/90 text-white font-bold rounded-lg sm:rounded-xl transition-colors flex-shrink-0"
                    >
                      Continue
                    </button>
                  ) : null}
                </>
              )}
              {/* Show save button on last step, but not on Step 1 (Step 1 has pink button) */}
              {currentStep >= steps.length && currentStep > 1 && (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm bg-primary hover:bg-primary/90 text-white font-bold rounded-lg sm:rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-base sm:text-lg">
                        refresh
                      </span>
                      <span className="hidden sm:inline">
                        {isEditMode ? 'Updating...' : 'Creating...'}
                      </span>
                      <span className="sm:hidden">
                        {isEditMode ? 'Updating...' : 'Creating...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base sm:text-lg">check</span>
                      <span className="hidden sm:inline">
                        {isEditMode ? 'Update Link' : 'Create & Copy Link'}
                      </span>
                      <span className="sm:hidden">{isEditMode ? 'Update' : 'Create'}</span>
                    </>
                  )}
                </button>
              )}
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

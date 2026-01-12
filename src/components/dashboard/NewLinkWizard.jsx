import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import Step1FastTrack from './wizard/Step1FastTrack';
import Step2Optimization from './wizard/Step2Optimization';
import Step3Security from './wizard/Step3Security';
import Modal from '../common/Modal';

const steps = [
  { number: 1, title: 'The Fast Track', subtitle: 'Destination & Identity' },
  { number: 2, title: 'Optimization & Marketing', subtitle: 'UTM & Pixels' },
  { number: 3, title: 'Security & Logic', subtitle: 'Smart Rules & Protection' },
];

const NewLinkWizard = ({ isOpen, onClose, initialData = null }) => {
  // Edit mode only if initialData exists AND has an ID (for duplication, we pass data without ID)
  const isEditMode = !!(initialData && initialData.id);
  const [currentStep, setCurrentStep] = useState(1);
  
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
        parameterPassThrough: initialData.parameter_pass_through !== undefined ? initialData.parameter_pass_through : true,
        platformPreset: null,
        // Step 3
        selectedPixels: initialData.pixels || [],
        serverSideTracking: initialData.server_side_tracking || false,
        customScript: initialData.custom_script || '',
        // Step 4
        fraudShield: initialData.fraud_shield || 'none',
        botAction: initialData.bot_action || 'block',
        geoRules: initialData.geo_rules || [],
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
      serverSideTracking: false,
      customScript: '',
      // Step 4
      fraudShield: 'none',
      botAction: 'block',
      geoRules: [],
      // Step 5 - calculated
      shortUrl: '',
      fullUtmString: '',
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form data when initialData changes (when switching between create/edit)
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
      setCurrentStep(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData]);

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
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
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
      if (isEditMode && initialData.id) {
        // Update existing link
        const { error } = await supabase
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
            server_side_tracking: formData.serverSideTracking,
            custom_script: formData.customScript || null,
            fraud_shield: formData.fraudShield,
            bot_action: formData.botAction,
            geo_rules: formData.geoRules,
            updated_at: new Date().toISOString(),
          })
          .eq('id', initialData.id);

        if (error) throw error;

        // Show success modal
        setModalState({
          isOpen: true,
          type: 'success',
          title: 'Link Updated Successfully!',
          message: (
            <>
              <p><strong>Short URL:</strong> {shortUrl}</p>
              <p style={{ marginTop: '12px' }}><strong>Full UTM String:</strong></p>
              <p style={{ wordBreak: 'break-all', fontSize: '0.9rem', color: '#6B7280' }}>{fullUtmString}</p>
            </>
          ),
          onConfirm: null,
          isLoading: false,
        });
      } else {
        // Create new link
        const { error } = await supabase
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
            server_side_tracking: formData.serverSideTracking,
            custom_script: formData.customScript || null,
            fraud_shield: formData.fraudShield,
            bot_action: formData.botAction,
            geo_rules: formData.geoRules,
            created_at: new Date().toISOString(),
          });

        if (error) throw error;

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
              <p><strong>Short URL:</strong> {shortUrl}</p>
              <p style={{ marginTop: '12px' }}><strong>Full UTM String (copied to clipboard):</strong></p>
              <p style={{ wordBreak: 'break-all', fontSize: '0.9rem', color: '#6B7280' }}>{fullUtmString}</p>
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
        serverSideTracking: false,
        customScript: '',
        fraudShield: 'none',
        botAction: 'block',
        geoRules: [],
        shortUrl: '',
        fullUtmString: '',
      });
    } catch (error) {
      console.error('Error creating link:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error Creating Link',
        message: (
          <>
            <p>{errorMessage}</p>
            <p style={{ marginTop: '8px', fontSize: '0.9rem', color: '#6B7280' }}>Please check the console for more details.</p>
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
            className="relative bg-[#101622] border border-[#232f48] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#232f48] flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white">{isEditMode ? 'Edit Link' : 'The Smart Flow'}</h2>
            <p className="text-slate-400 text-sm mt-1">{isEditMode ? 'Update your smart link' : 'Create your smart link in 3 simple steps'}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Stepper */}
        <div className="px-6 py-4 border-b border-[#232f48] flex-shrink-0 overflow-x-auto">
          <div className="flex items-center gap-4 min-w-max">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-base transition-all ${
                      currentStep === step.number
                        ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/50'
                        : currentStep > step.number
                        ? 'bg-primary/50 text-white'
                        : 'bg-[#232f48] text-slate-400'
                    }`}
                  >
                    {step.number}
                  </div>
                  <div className="hidden md:block">
                    <div
                      className={`text-sm font-bold ${
                        currentStep >= step.number ? 'text-white' : 'text-slate-400'
                      }`}
                    >
                      {step.title}
                    </div>
                    {step.subtitle && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        {step.subtitle}
                      </div>
                    )}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-0.5 ${
                      currentStep > step.number ? 'bg-primary' : 'bg-[#232f48]'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <Step1FastTrack
                key="step1"
                formData={formData}
                updateFormData={updateFormData}
                onQuickCreate={handleSubmit}
                onSafetyCheckUpdate={(safety) => updateFormData('urlSafety', safety)}
              />
            )}
            {currentStep === 2 && (
              <Step2Optimization
                key="step2"
                formData={formData}
                updateFormData={updateFormData}
              />
            )}
            {currentStep === 3 && (
              <Step3Security
                key="step3"
                formData={formData}
                updateFormData={updateFormData}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[#232f48] flex-shrink-0">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`px-4 py-2 rounded-xl font-bold transition-colors ${
              currentStep === 1
                ? 'bg-[#232f48] text-slate-600 cursor-not-allowed'
                : 'bg-[#232f48] text-white hover:bg-[#324467]'
            }`}
          >
            Previous
          </button>
          <div className="text-slate-400 text-sm">
            Step {currentStep} of {steps.length}
          </div>
          {currentStep < steps.length ? (
            <button
              onClick={nextStep}
              disabled={
                currentStep === 1 && (
                  formData.urlSafety?.isSafe === false || 
                  formData.urlSafety?.isSafe === null ||
                  !formData.targetUrl?.trim()
                )
              }
              className={`px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-colors ${
                currentStep === 1 && (
                  formData.urlSafety?.isSafe === false || 
                  formData.urlSafety?.isSafe === null ||
                  !formData.targetUrl?.trim()
                )
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
              title={
                currentStep === 1 && formData.urlSafety?.isSafe === false
                  ? 'Cannot proceed with unsafe URL'
                  : currentStep === 1 && formData.urlSafety?.isSafe === null
                  ? 'Please wait for URL safety verification...'
                  : currentStep === 1 && !formData.targetUrl?.trim()
                  ? 'Please enter a URL'
                  : ''
              }
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin">refresh</span>
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">check</span>
                  {isEditMode ? 'Update Link' : 'Create & Copy Link'}
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


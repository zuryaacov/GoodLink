import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { updateLinkInRedis } from '../../lib/redisCache';
import { ArrowLeft } from 'lucide-react';
import Step1FastTrack from '../../components/dashboard/wizard/Step1FastTrack';
import Step2Optimization from '../../components/dashboard/wizard/Step2Optimization';
import Step3Security from '../../components/dashboard/wizard/Step3Security';
import Modal from '../../components/common/Modal';

const steps = [
  { number: 1, title: 'The Fast Track', subtitle: 'Destination & Identity' },
  { number: 2, title: 'Security & Logic', subtitle: 'Smart Rules & Protection' },
  { number: 3, title: 'Optimization & Marketing', subtitle: 'UTM & Pixels' },
];

const LinkBuilderPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const duplicateId = searchParams.get('duplicate');
  const isEditMode = !!id;
  const isDuplicateMode = !!duplicateId;
  const linkIdToLoad = id || duplicateId;
  const [currentStep, setCurrentStep] = useState(1);
  const step1ValidationRef = useRef(null);
  const step3ValidationRef = useRef(null);
  const [initialLoading, setInitialLoading] = useState(!!linkIdToLoad);

  const getInitialFormData = () => ({
    linkId: id || null,
    name: '',
    targetUrl: '',
    domain: 'glynk.to',
    slug: '',
    urlSafety: { isSafe: null, threatType: null },
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    utmContent: '',
    utmTerm: '',
    parameterPassThrough: true,
    selectedUtmPresets: [],
    selectedPixels: [],
    serverSideTracking: false,
    customScript: '',
    fraudShield: 'none',
    botAction: 'no-tracking',
    fallbackUrl: '',
    geoRules: [],
    shortUrl: '',
    fullUtmString: '',
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [originalLinkData, setOriginalLinkData] = useState(null); // Store original domain/slug for Redis key updates
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    onConfirm: null,
    isLoading: false,
  });

  useEffect(() => {
    if (linkIdToLoad) {
      fetchLink();
    }
  }, [linkIdToLoad]);

  const fetchLink = async () => {
    try {
      setInitialLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/dashboard/links');
        return;
      }

      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('id', linkIdToLoad)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!data) {
        navigate('/dashboard/links');
        return;
      }

      // For duplicate mode, remove ID and modify name/slug
      const isDuplicate = !!duplicateId;
      const modifiedName = isDuplicate && data.name 
        ? `${data.name} (Copy)` 
        : data.name || '';
      const modifiedSlug = isDuplicate && data.slug 
        ? `${data.slug}-copy` 
        : data.slug || '';

      // Store original domain/slug for Redis key updates (only in edit mode, not duplicate)
      if (!isDuplicate) {
        setOriginalLinkData({
          domain: data.domain || 'glynk.to',
          slug: data.slug || '',
        });
      }

      setFormData({
        linkId: isDuplicate ? null : data.id, // Remove ID for duplicate
        name: modifiedName,
        targetUrl: data.target_url || '',
        domain: data.domain || 'glynk.to',
        slug: modifiedSlug,
        urlSafety: { isSafe: null, threatType: null },
        utmSource: data.utm_source || '',
        utmMedium: data.utm_medium || '',
        utmCampaign: data.utm_campaign || '',
        utmContent: data.utm_content || '',
        utmTerm: data.utm_term || '',
        parameterPassThrough: data.parameter_pass_through !== undefined ? data.parameter_pass_through : true,
        selectedUtmPresets: Array.isArray(data.utm_presets) ? data.utm_presets : [],
        selectedPixels: data.pixels || [],
        serverSideTracking: data.server_side_tracking || false,
        customScript: data.custom_script || '',
        fraudShield: data.fraud_shield || 'none',
        botAction: data.bot_action || 'no-tracking',
        fallbackUrl: data.fallback_url || '',
        geoRules: (() => {
          if (Array.isArray(data.geo_rules)) {
            return data.geo_rules;
          }
          if (data.geo_rules && typeof data.geo_rules === 'string') {
            try {
              const parsed = JSON.parse(data.geo_rules);
              return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              console.error('Error parsing geo_rules:', e);
              return [];
            }
          }
          return [];
        })(),
        shortUrl: '', // Will be regenerated
        fullUtmString: '',
      });
    } catch (error) {
      console.error('Error fetching link:', error);
      navigate('/dashboard/links');
    } finally {
      setInitialLoading(false);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateRandomSlug = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let slug = '';
    for (let i = 0; i < 8; i++) {
      slug += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return slug;
  };

  const nextStep = async () => {
    if (currentStep === 1 && step1ValidationRef.current) {
      const validationResult = await step1ValidationRef.current();
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
    // Validate Step 3 (fallback URL) before submitting
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (!formData.targetUrl || !formData.targetUrl.trim()) {
        throw new Error('Target URL is required');
      }

      let finalName = formData.name?.trim();
      if (!finalName) {
        throw new Error('Link name is required. Please enter a name for your link.');
      }

      const finalSlug = formData.slug || generateRandomSlug();
      
      const utmParams = new URLSearchParams();
      if (formData.utmSource) utmParams.append('utm_source', formData.utmSource);
      if (formData.utmMedium) utmParams.append('utm_medium', formData.utmMedium);
      if (formData.utmCampaign) utmParams.append('utm_campaign', formData.utmCampaign);
      if (formData.utmContent) utmParams.append('utm_content', formData.utmContent);
      if (formData.utmTerm) utmParams.append('utm_term', formData.utmTerm);

      const baseUrl = formData.domain || 'glynk.to';
      const shortUrl = `https://${baseUrl}/${finalSlug}`;
      const fullUtmString = utmParams.toString() ? `${shortUrl}?${utmParams.toString()}` : shortUrl;

      if (isEditMode && id && !isDuplicateMode) {
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
            utm_term: formData.utmTerm || null,
            utm_presets: Array.isArray(formData.selectedUtmPresets) ? formData.selectedUtmPresets : [],
            parameter_pass_through: formData.parameterPassThrough,
            pixels: formData.selectedPixels,
            server_side_tracking: formData.serverSideTracking,
            custom_script: formData.customScript || null,
            fraud_shield: formData.fraudShield,
            bot_action: formData.botAction,
            fallback_url: finalFallbackUrl,
            geo_rules: Array.isArray(formData.geoRules) ? formData.geoRules : [],
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) throw error;

        // Fetch the updated link to get full data for Redis cache
        console.log('🔄 [LinkBuilder] Fetching updated link for Redis cache...');
        const { data: updatedLink, error: fetchError } = await supabase
          .from('links')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) {
          console.error('❌ [LinkBuilder] Error fetching updated link:', fetchError);
        } else if (updatedLink) {
          console.log('✅ [LinkBuilder] Link fetched, updating Redis cache...');
          console.log('🔵 [LinkBuilder] Original link data:', originalLinkData);
          console.log('🔵 [LinkBuilder] New link data:', { domain: updatedLink.domain, slug: updatedLink.slug });
          
          // Update Redis cache - pass old domain/slug to delete old key if changed
          try {
            const oldDomain = originalLinkData?.domain || null;
            const oldSlug = originalLinkData?.slug || null;
            
            console.log('🔵 [LinkBuilder] Sending to Redis - oldDomain:', oldDomain, 'oldSlug:', oldSlug);
            
            const redisResult = await updateLinkInRedis(
              updatedLink, 
              supabase,
              oldDomain,
              oldSlug
            );
            if (redisResult) {
              console.log('✅ [LinkBuilder] Redis cache updated successfully');
            } else {
              console.warn('⚠️ [LinkBuilder] Redis cache update returned false');
            }
          } catch (redisError) {
            console.error('❌ [LinkBuilder] Error updating Redis cache:', redisError);
          }
        } else {
          console.warn('⚠️ [LinkBuilder] No updated link data found');
        }

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
          onConfirm: () => navigate('/dashboard/links'),
          isLoading: false,
        });
      } else {
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
            utm_term: formData.utmTerm || null,
            utm_presets: Array.isArray(formData.selectedUtmPresets) ? formData.selectedUtmPresets : [],
            parameter_pass_through: formData.parameterPassThrough,
            pixels: formData.selectedPixels,
            server_side_tracking: formData.serverSideTracking,
            custom_script: formData.customScript || null,
            fraud_shield: formData.fraudShield,
            bot_action: formData.botAction,
            fallback_url: finalFallbackUrl,
            geo_rules: Array.isArray(formData.geoRules) ? formData.geoRules : [],
            created_at: new Date().toISOString(),
          });

        if (error) throw error;

        // Fetch the created link to get full data for Redis cache
        console.log('🔄 [LinkBuilder] Fetching created link for Redis cache...');
        console.log('🔄 [LinkBuilder] Searching for link:', { user_id: user.id, slug: finalSlug, domain: baseUrl });
        
        const { data: newLinks, error: fetchError } = await supabase
          .from('links')
          .select('*')
          .eq('user_id', user.id)
          .eq('slug', finalSlug)
          .eq('domain', baseUrl)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (fetchError) {
          console.error('❌ [LinkBuilder] Error fetching created link:', fetchError);
          console.error('❌ [LinkBuilder] Fetch error details:', {
            message: fetchError.message,
            details: fetchError.details,
            hint: fetchError.hint
          });
        } else if (newLinks) {
          console.log('✅ [LinkBuilder] Link fetched, updating Redis cache...');
          console.log('✅ [LinkBuilder] Link data:', { id: newLinks.id, domain: newLinks.domain, slug: newLinks.slug });
          // Update Redis cache
          try {
            const redisResult = await updateLinkInRedis(newLinks, supabase);
            if (redisResult) {
              console.log('✅ [LinkBuilder] Redis cache updated successfully');
            } else {
              console.warn('⚠️ [LinkBuilder] Redis cache update returned false');
            }
          } catch (redisError) {
            console.error('❌ [LinkBuilder] Error updating Redis cache:', redisError);
          }
        } else {
          console.warn('⚠️ [LinkBuilder] No created link data found');
        }

        try {
          await navigator.clipboard.writeText(fullUtmString);
        } catch (err) {
          console.error('Failed to copy to clipboard:', err);
        }

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
          onConfirm: () => navigate('/dashboard/links'),
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Error saving link:', error);
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Error saving link. Please try again.',
        onConfirm: null,
        isLoading: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-slate-600 animate-spin">refresh</span>
          <p className="text-slate-400 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] pb-8">
      {/* Header with back button */}
      <div className="sticky top-0 z-10 bg-[#0b0f19] border-b border-slate-800 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/links')}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{isEditMode ? 'Edit Link' : 'The Smart Flow'}</h1>
            <p className="text-slate-400 text-sm">{isEditMode ? 'Update your smart link' : 'Create your smart link in 3 simple steps'}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Stepper */}
        <div className="mb-8 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4 overflow-x-auto">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-base transition-all ${
                      currentStep === step.number
                        ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/50'
                        : currentStep > step.number
                        ? 'bg-primary/50 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {step.number}
                  </div>
                  <div className="hidden sm:block">
                    <div
                      className={`text-sm font-bold ${
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
                    className={`w-12 h-0.5 flex-shrink-0 ${
                      currentStep > step.number ? 'bg-primary' : 'bg-slate-800'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {currentStep === 1 && (
            <Step1FastTrack
              formData={formData}
              updateFormData={updateFormData}
              onQuickCreate={handleSubmit}
              onSafetyCheckUpdate={(safety) => updateFormData('urlSafety', safety)}
              onValidationRequest={step1ValidationRef}
              onContinue={nextStep}
            />
          )}
          {currentStep === 2 && (
            <Step3Security
              formData={formData}
              updateFormData={updateFormData}
              onValidationRequest={step3ValidationRef}
            />
          )}
          {currentStep === 3 && (
            <Step2Optimization
              formData={formData}
              updateFormData={updateFormData}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800 gap-4">
          {currentStep === 1 ? (
            <div className="text-slate-400 text-sm whitespace-nowrap">
              Step {currentStep} of {steps.length}
            </div>
          ) : (
            <>
              <button
                onClick={prevStep}
                className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors"
              >
                Previous
              </button>
              <div className="text-slate-400 text-sm whitespace-nowrap">
                Step {currentStep} of {steps.length}
              </div>
              {currentStep < steps.length ? (
                <button
                  onClick={nextStep}
                  className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-colors"
                >
                  Continue
                </button>
              ) : null}
            </>
          )}
          {currentStep >= steps.length && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-3 bg-[#FF10F0] hover:bg-[#e00ed0] text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
      </div>

      {/* Success/Error Modal */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={() => {
          setModalState({ ...modalState, isOpen: false });
          if (modalState.type === 'success' && modalState.onConfirm) {
            modalState.onConfirm();
          }
        }}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onConfirm={modalState.onConfirm}
        isLoading={modalState.isLoading}
      />
    </div>
  );
};

export default LinkBuilderPage;

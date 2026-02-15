import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { updateLinkInRedis } from '../../lib/redisCache';
import {
  cleanPayloadForDb,
  findNullCharsInPayload,
  normalizeJsonColumnsForPostgrest,
  payloadFromCleanJson,
  payloadSafeForSupabase,
} from '../../lib/inputSanitization';
import { ArrowLeft } from 'lucide-react';
import LinkWizardOnePerPage from '../../components/dashboard/LinkWizardOnePerPage';
import Modal from '../../components/common/Modal';

const LinkBuilderPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const duplicateId = searchParams.get('duplicate');
  const spaceIdFromQuery = searchParams.get('space_id');
  const isEditMode = !!id && id !== 'new';
  const isDuplicateMode = !!duplicateId;
  // When duplicating we're on /links/new?duplicate=ID – load by duplicateId, not by route id "new"
  const linkIdToLoad = duplicateId || (id && id !== 'new' ? id : null);
  const [planType, setPlanType] = useState('free');
  const wizardRef = useRef(null);
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
    trackingMode: 'capi', // 'pixel' | 'capi' | 'pixel_and_capi'
    serverSideTracking: false,
    customScript: '',
    fraudShield: 'none',
    botAction: 'no-tracking',
    fallbackUrl: '',
    geoRules: [],
    spaceId: spaceIdFromQuery || null,
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
    fetchPlanType();
  }, []);

  useEffect(() => {
    if (linkIdToLoad) {
      fetchLink();
    }
  }, [linkIdToLoad]);

  const fetchLink = async () => {
    try {
      setInitialLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

      // For duplicate mode, remove ID; keep full name but strip only trailing " (Copy)" if present; unique slug
      const isDuplicate = !!duplicateId;
      let modifiedName = data.name || '';
      if (isDuplicate && modifiedName.endsWith(' (Copy)')) modifiedName = modifiedName.slice(0, -7);
      const modifiedSlug =
        isDuplicate && data.slug
          ? `${data.slug}-${Math.random().toString(36).slice(2, 8)}`.slice(0, 30)
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
        parameterPassThrough:
          data.parameter_pass_through !== undefined ? data.parameter_pass_through : true,
        selectedUtmPresets: Array.isArray(data.utm_presets) ? data.utm_presets : [],
        selectedPixels: data.pixels || [],
        trackingMode: data.tracking_mode || 'capi',
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
        spaceId: data.space_id || spaceIdFromQuery || null,
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
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const generateRandomSlug = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let slug = '';
    for (let i = 0; i < 8; i++) {
      slug += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return slug;
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

      if (!formData.targetUrl || !formData.targetUrl.trim()) {
        throw new Error('Target URL is required');
      }

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
        (isEditMode && id && !isDuplicateMode ? existingLinks.some((l) => l.id !== id) : true);
      if (isDuplicateName) {
        setModalState({
          isOpen: true,
          type: 'alert',
          title: 'Name already in use',
          message: 'A link with this name already exists. Please choose a different name.',
          onConfirm: null,
          isLoading: false,
        });
        return;
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
        const updatePayloadRaw = {
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
          utm_presets: Array.isArray(formData.selectedUtmPresets)
            ? formData.selectedUtmPresets
            : [],
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
          space_id: formData.spaceId || null,
          updated_at: new Date().toISOString(),
        };
        const nullPathsRaw = findNullCharsInPayload(updatePayloadRaw);
        if (nullPathsRaw.length > 0) {
          console.warn(
            '[LinkBuilder] UPDATE payload (before clean) – fields with null char:',
            nullPathsRaw
          );
        }
        const updatePayloadNormalized = normalizeJsonColumnsForPostgrest(updatePayloadRaw);
        const updatePayload = cleanPayloadForDb(updatePayloadNormalized);
        const nullPathsAfterClean = findNullCharsInPayload(updatePayload);
        if (nullPathsAfterClean.length > 0) {
          console.warn(
            '[LinkBuilder] UPDATE payload (after cleanPayloadForDb) – still has null:',
            nullPathsAfterClean
          );
        }
        const payloadToSend = payloadFromCleanJson(payloadSafeForSupabase(updatePayload));
        console.log('[LinkBuilder] UPDATE links – payload keys:', Object.keys(payloadToSend));
        const { error } = await supabase.from('links').update(payloadToSend).eq('id', id);
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
          console.log('🔵 [LinkBuilder] New link data:', {
            domain: updatedLink.domain,
            slug: updatedLink.slug,
          });

          // Update Redis cache - pass old domain/slug to delete old key if changed
          try {
            const oldDomain = originalLinkData?.domain || null;
            const oldSlug = originalLinkData?.slug || null;

            console.log(
              '🔵 [LinkBuilder] Sending to Redis - oldDomain:',
              oldDomain,
              'oldSlug:',
              oldSlug
            );

            const redisResult = await updateLinkInRedis(updatedLink, supabase, oldDomain, oldSlug);
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
            <p>
              <strong>Short URL:</strong> {shortUrl}
            </p>
          ),
          onConfirm: () => navigate('/dashboard/links'),
          isLoading: false,
        });
      } else {
        const insertPayloadRaw = {
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
          utm_presets: Array.isArray(formData.selectedUtmPresets)
            ? formData.selectedUtmPresets
            : [],
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
          space_id: formData.spaceId || null,
          created_at: new Date().toISOString(),
        };
        const nullPathsRawInsert = findNullCharsInPayload(insertPayloadRaw);
        if (nullPathsRawInsert.length > 0) {
          console.warn(
            '[LinkBuilder] INSERT payload (before clean) – fields with null char:',
            nullPathsRawInsert
          );
        }
        const insertPayloadNormalized = normalizeJsonColumnsForPostgrest(insertPayloadRaw);
        const insertPayload = cleanPayloadForDb(insertPayloadNormalized);
        const nullPathsAfterCleanInsert = findNullCharsInPayload(insertPayload);
        if (nullPathsAfterCleanInsert.length > 0) {
          console.warn(
            '[LinkBuilder] INSERT payload (after cleanPayloadForDb) – still has null:',
            nullPathsAfterCleanInsert
          );
        }
        const payloadToSendInsert = payloadFromCleanJson(payloadSafeForSupabase(insertPayload));
        console.log('[LinkBuilder] INSERT links – payload keys:', Object.keys(payloadToSendInsert));
        const { error } = await supabase.from('links').insert(payloadToSendInsert);

        if (error) throw error;

        // Fetch the created link to get full data for Redis cache
        console.log('🔄 [LinkBuilder] Fetching created link for Redis cache...');
        console.log('🔄 [LinkBuilder] Searching for link:', {
          user_id: user.id,
          slug: finalSlug,
          domain: baseUrl,
        });

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
            hint: fetchError.hint,
          });
        } else if (newLinks) {
          console.log('✅ [LinkBuilder] Link fetched, updating Redis cache...');
          console.log('✅ [LinkBuilder] Link data:', {
            id: newLinks.id,
            domain: newLinks.domain,
            slug: newLinks.slug,
          });
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
            <p>
              <strong>Short URL:</strong> {shortUrl}
            </p>
          ),
          onConfirm: () => navigate('/dashboard/links'),
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Error saving link:', error);
      if (error?.message?.includes('null character') || error?.message?.includes('not permitted')) {
        console.error(
          '[LinkBuilder] NULL CHARACTER ERROR – check logs above for which field had null before clean'
        );
      }
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
          <span className="material-symbols-outlined text-4xl text-slate-600 animate-spin">
            refresh
          </span>
          <p className="text-slate-400 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  const initialDataForWizard = formData.linkId ? { id: formData.linkId } : null;

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col">
      {/* Header with back button */}
      <div className="flex-shrink-0 z-10 bg-[#0b0f19] border-b border-slate-800 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/links')}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">
              {isEditMode ? 'Edit Link' : 'Add New Link'}
            </h1>
          </div>
        </div>
      </div>

      {/* New one-per-page wizard */}
      <div className="flex-1 min-h-0 flex flex-col">
        <LinkWizardOnePerPage
          formData={formData}
          updateFormData={updateFormData}
          planType={planType}
          isEditMode={isEditMode && !duplicateId}
          initialData={initialDataForWizard}
          onValidateAndSubmit={handleSubmit}
          stepRefs={wizardRef}
          isSubmitting={isSubmitting}
        />
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

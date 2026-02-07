import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { validateUrl } from '../../lib/urlValidation';
import { checkUrlSafety } from '../../lib/urlSafetyCheck';
import { validateSlug } from '../../lib/slugValidation';
import countriesData from '../../data/countries.json';
import taboolaLogo from '../../assets/idRS-vCmxj_1769618141092.svg';
import outbrainLogo from '../../assets/id-bNajMAc_1769618145922.svg';

const BOT_OPTIONS = [
  { value: 'no-tracking', label: 'Allow' },
  { value: 'block', label: 'Block' },
  { value: 'redirect', label: 'Redirect' },
];

const PLATFORM_NAMES = {
  meta: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  google: 'Google Ads',
  snapchat: 'Snapchat',
  taboola: 'Taboola',
  outbrain: 'Outbrain',
};

export default function LinkWizardOnePerPage({
  formData,
  updateFormData,
  planType = 'free',
  isEditMode,
  initialData,
  onValidateAndSubmit,
  stepRefs,
}) {
  const [domains, setDomains] = useState(['glynk.to']);
  const [availablePixels, setAvailablePixels] = useState([]);
  const [loadingPixels, setLoadingPixels] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Validation state
  const [nameError, setNameError] = useState(null);
  const [urlError, setUrlError] = useState(null);
  const [urlSafety, setUrlSafety] = useState({ loading: false, isSafe: null });
  const [slugError, setSlugError] = useState(null);
  const [fallbackUrlError, setFallbackUrlError] = useState(null);
  const [validating, setValidating] = useState(false);

  // Geo rule form
  const [showGeoForm, setShowGeoForm] = useState(false);
  const [newGeoRule, setNewGeoRule] = useState({ country: '', url: '' });
  const [geoRuleErrors, setGeoRuleErrors] = useState({ country: null, url: null });

  // Build step list: domain step only if PRO (or non-free) AND has custom domains
  const steps = useMemo(() => {
    const list = [
      {
        id: 'name',
        badge: 'Start',
        badgeColor: 'text-[#10b981] bg-[#10b981]/10',
        title: 'Name your',
        highlight: 'Link',
        subtitle: 'Internal nickname for your campaign.',
      },
      {
        id: 'url',
        badge: 'Destination',
        badgeColor: 'text-[#135bec] bg-[#135bec]/10',
        title: 'Target',
        highlight: 'URL',
        subtitle: 'Where should the user land?',
      },
      {
        id: 'domain',
        badge: 'Domain',
        badgeColor: 'text-[#FF10F0] bg-[#FF10F0]/10',
        title: 'Select',
        highlight: 'Domain',
        subtitle: 'Choose the base for your short link.',
        show: planType?.toLowerCase() !== 'free' && domains.length > 1,
      },
      {
        id: 'slug',
        badge: 'Alias',
        badgeColor: 'text-[#FF10F0] bg-[#FF10F0]/10',
        title: 'Custom',
        highlight: 'Slug',
        subtitle: 'Make it memorable.',
      },
      {
        id: 'bot',
        badge: 'Security',
        badgeColor: 'text-yellow-500 bg-yellow-500/10',
        title: 'Bot',
        highlight: 'Protection',
        subtitle: 'How should we handle automated traffic?',
      },
      {
        id: 'geo',
        badge: 'Geography',
        badgeColor: 'text-orange-500 bg-orange-500/10',
        title: 'Geo',
        highlight: 'Targeting',
        subtitle: 'Optional routing by country.',
      },
      {
        id: 'capi',
        badge: 'Tracking',
        badgeColor: 'text-purple-500 bg-purple-500/10',
        title: 'CAPI',
        highlight: 'Select',
        subtitle: 'Select Conversions API to fire events.',
      },
      {
        id: 'review',
        badge: 'Launch',
        badgeColor: 'text-[#10b981] bg-[#10b981]/10',
        title: 'Final',
        highlight: 'Launch',
        subtitle: 'Review your smart link configuration.',
        isReview: true,
      },
    ];
    return list.filter((s) => s.show !== false);
  }, [planType, domains.length]);

  const totalSteps = steps.length;
  const currentStep = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  // Fetch domains
  useEffect(() => {
    if (planType?.toLowerCase() === 'free') {
      setDomains(['glynk.to']);
      updateFormData('domain', 'glynk.to');
      return;
    }
    const fetchDomains = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: customDomains, error } = await supabase
          .from('custom_domains')
          .select('domain')
          .eq('user_id', user.id)
          .eq('status', 'active');
        if (!error && customDomains?.length > 0) {
          const list = customDomains.map((d) => d.domain);
          setDomains(['glynk.to', ...list]);
        } else {
          setDomains(['glynk.to']);
        }
      } catch (e) {
        setDomains(['glynk.to']);
      }
    };
    fetchDomains();
  }, [planType]);

  // Fetch pixels for CAPI step
  useEffect(() => {
    const fetchPixels = async () => {
      setLoadingPixels(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from('pixels')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        if (!error) setAvailablePixels(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingPixels(false);
      }
    };
    fetchPixels();
  }, []);

  // Name validation (duplicate check)
  const checkName = async () => {
    const name = formData.name?.trim();
    if (!name) {
      setNameError('Please enter a name for your link.');
      return false;
    }
    setValidating(true);
    setNameError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setNameError('You must be logged in.');
        return false;
      }
      let query = supabase
        .from('links')
        .select('id')
        .eq('user_id', user.id)
        .ilike('name', name)
        .neq('status', 'deleted');
      if (initialData?.id) query = query.neq('id', initialData.id);
      const { data: existing } = await query.limit(1);
      if (existing?.length > 0) {
        setNameError('This name already exists in your links. Please use a different name.');
        return false;
      }
      return true;
    } catch (e) {
      setNameError('Error checking name.');
      return false;
    } finally {
      setValidating(false);
    }
  };

  // URL validation (format + safety + glynk.to + url exists)
  const performUrlCheck = async () => {
    const raw = formData.targetUrl?.trim();
    if (!raw) {
      setUrlError('Please enter a destination URL.');
      return false;
    }
    const validation = validateUrl(raw);
    if (!validation.isValid) {
      setUrlError(validation.error || 'Invalid URL format');
      return false;
    }
    const normalizedUrl = validation.normalizedUrl;
    try {
      const urlObj = new URL(normalizedUrl);
      const host = urlObj.hostname.toLowerCase().replace(/^www\./, '');
      if (host === 'glynk.to') {
        setUrlError('Redirect cannot be to glynk.to. Please use a different URL.');
        return false;
      }
    } catch (_) {}

    setUrlSafety({ loading: true, isSafe: null });
    setUrlError(null);
    try {
      const safetyResult = await checkUrlSafety(normalizedUrl);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let urlExists = false;
      if (user) {
        const { data: links } = await supabase
          .from('links')
          .select('id, target_url')
          .eq('user_id', user.id)
          .neq('status', 'deleted');
        if (links?.length) {
          const norm = (u) => {
            if (!u) return '';
            try {
              let t = u.trim().toLowerCase();
              if (!t.startsWith('http')) t = 'https://' + t;
              const o = new URL(t);
              let s = o.protocol + '//' + o.hostname.replace(/^www\./, '');
              if (o.pathname && o.pathname !== '/') s += o.pathname.replace(/\/$/, '');
              if (o.search) s += o.search;
              return s;
            } catch {
              return u.toLowerCase().trim();
            }
          };
          const inputNorm = norm(normalizedUrl);
          urlExists = links.some((l) =>
            formData.linkId && String(l.id) === String(formData.linkId)
              ? false
              : norm(l.target_url) === inputNorm
          );
        }
      }
      if (urlExists) {
        setUrlError('This URL already exists in your links. Please use a different URL.');
        setUrlSafety({ loading: false, isSafe: false });
        return false;
      }
      if (!safetyResult.isSafe) {
        setUrlError(safetyResult.error || 'URL safety check failed. This URL may be unsafe.');
        setUrlSafety({ loading: false, isSafe: false });
        return false;
      }
      setUrlSafety({ loading: false, isSafe: true });
      if (validation.normalizedUrl && validation.normalizedUrl !== formData.targetUrl) {
        updateFormData('targetUrl', validation.normalizedUrl);
      }
      return true;
    } catch (e) {
      setUrlError('Error checking URL.');
      setUrlSafety({ loading: false, isSafe: null });
      return false;
    }
  };

  // Slug validation
  const validateSlugStep = async () => {
    const slug = formData.slug?.trim().toLowerCase();
    if (!slug) {
      setSlugError('Please enter a slug.');
      return false;
    }
    const domain = formData.domain || domains[0];
    setValidating(true);
    setSlugError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSlugError('You must be logged in.');
        return false;
      }
      const result = await validateSlug(
        slug,
        domain,
        user.id,
        supabase,
        true,
        true,
        initialData?.id || null
      );
      if (!result.isValid) {
        setSlugError(result.error || 'Invalid slug');
        return false;
      }
      if (result.normalizedSlug && result.normalizedSlug !== formData.slug) {
        updateFormData('slug', result.normalizedSlug);
      }
      return true;
    } catch (e) {
      setSlugError('Error validating slug.');
      return false;
    } finally {
      setValidating(false);
    }
  };

  // Bot fallback URL validation
  const validateBotStep = () => {
    if (formData.botAction !== 'redirect') return true;
    const url = formData.fallbackUrl?.trim();
    if (!url) {
      setFallbackUrlError('Please enter a redirect URL for bots.');
      return false;
    }
    const v = validateUrl(url);
    if (!v.isValid) {
      setFallbackUrlError(v.error || 'Invalid URL format');
      return false;
    }
    try {
      const host = new URL(v.normalizedUrl).hostname.toLowerCase().replace(/^www\./, '');
      if (host === 'glynk.to') {
        setFallbackUrlError('Redirect cannot be to glynk.to. Please use a different URL.');
        return false;
      }
    } catch (_) {}
    setFallbackUrlError(null);
    if (v.normalizedUrl && v.normalizedUrl !== url) updateFormData('fallbackUrl', v.normalizedUrl);
    return true;
  };

  const goNext = async () => {
    if (currentStep.id === 'name') {
      const ok = await checkName();
      if (!ok) return;
    } else if (currentStep.id === 'url') {
      const ok = await performUrlCheck();
      if (!ok) return;
    } else if (currentStep.id === 'slug') {
      const ok = await validateSlugStep();
      if (!ok) return;
    } else if (currentStep.id === 'bot') {
      if (!validateBotStep()) return;
    }

    if (isLast) {
      if (currentStep.id === 'review') {
        if (formData.botAction === 'redirect' && !validateBotStep()) return;
        onValidateAndSubmit?.();
      }
      return;
    }
    setStepIndex((i) => i + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    if (!isFirst) {
      setStepIndex((i) => i - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Expose refs for parent (e.g. step3 fallback validation)
  useEffect(() => {
    if (!stepRefs) return;
    stepRefs.current = {
      validateBeforeSubmit: () => {
        if (formData.botAction !== 'redirect') return { isValid: true, normalizedUrl: null };
        if (!formData.fallbackUrl?.trim()) {
          setFallbackUrlError('Please enter a redirect URL for bots.');
          return { isValid: false, normalizedUrl: null };
        }
        const v = validateUrl(formData.fallbackUrl);
        if (!v.isValid) {
          setFallbackUrlError(v.error || 'Invalid URL');
          return { isValid: false, normalizedUrl: null };
        }
        try {
          const host = new URL(v.normalizedUrl).hostname.toLowerCase().replace(/^www\./, '');
          if (host === 'glynk.to') {
            setFallbackUrlError('Redirect cannot be to glynk.to.');
            return { isValid: false, normalizedUrl: null };
          }
        } catch (_) {}
        setFallbackUrlError(null);
        return { isValid: true, normalizedUrl: v.normalizedUrl || formData.fallbackUrl };
      },
    };
  }, [stepRefs, formData.botAction, formData.fallbackUrl]);

  const togglePixel = (pixelId) => {
    const list = formData.selectedPixels || [];
    if (list.includes(pixelId)) {
      updateFormData(
        'selectedPixels',
        list.filter((id) => id !== pixelId)
      );
    } else {
      updateFormData('selectedPixels', [...list, pixelId]);
    }
  };

  const addGeoRule = () => {
    setGeoRuleErrors({ country: null, url: null });
    if (!newGeoRule.country?.trim()) {
      setGeoRuleErrors((e) => ({ ...e, country: 'Please select a country' }));
      return;
    }
    if (!newGeoRule.url?.trim()) {
      setGeoRuleErrors((e) => ({ ...e, url: 'Please enter a URL' }));
      return;
    }
    const v = validateUrl(newGeoRule.url);
    if (!v.isValid) {
      setGeoRuleErrors((e) => ({ ...e, url: v.error || 'Invalid URL' }));
      return;
    }
    const rules = Array.isArray(formData.geoRules) ? formData.geoRules : [];
    updateFormData('geoRules', [
      ...rules,
      { country: newGeoRule.country, url: v.normalizedUrl || newGeoRule.url },
    ]);
    setNewGeoRule({ country: '', url: '' });
    setShowGeoForm(false);
  };

  const removeGeoRule = (index) => {
    const rules = [...(formData.geoRules || [])];
    rules.splice(index, 1);
    updateFormData('geoRules', rules);
  };

  const getCountryName = (code) => countriesData.find((c) => c.code === code)?.name || code;

  const selectedDomain = formData.domain || domains[0];
  const progressPct = totalSteps ? ((stepIndex + 1) / totalSteps) * 100 : 0;

  return (
    <div className="flex flex-col min-h-full">
      {/* Progress bar */}
      <div className="h-1 bg-[#232f48] flex-shrink-0">
        <div
          className="h-full bg-[#135bec] transition-all duration-500 shadow-[0_0_10px_#135bec]"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Background glow */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#135bec] opacity-[0.04] blur-[150px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="flex-1 px-6 pb-32 pt-8 max-w-2xl mx-auto w-full relative z-10">
        <AnimatePresence mode="wait">
          {currentStep && !currentStep.isReview && (
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, transform: 'translateY(10px)' }}
              animate={{ opacity: 1, transform: 'translateY(0)' }}
              exit={{ opacity: 0, transform: 'translateY(-10px)' }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center w-full">
                  <div
                    className={`inline-flex items-center gap-2 font-bold text-[10px] tracking-[0.2em] uppercase px-3 py-1 rounded-full ${currentStep.badgeColor}`}
                  >
                    <span>{currentStep.badge}</span>
                  </div>
                  <span className="text-[10px] font-black text-gray-500 tracking-widest">
                    {stepIndex + 1}/{totalSteps}
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                  {currentStep.title}{' '}
                  <span className="bg-gradient-to-r from-[#FF10F0] to-[#bc13fe] bg-clip-text text-transparent">
                    {currentStep.highlight}
                  </span>
                </h1>
                <p className="text-gray-400 font-medium text-sm">{currentStep.subtitle}</p>
              </div>

              {/* Step: Name */}
              {currentStep.id === 'name' && (
                <div className="rounded-2xl bg-[#101622] border-2 border-[#232f48] focus-within:border-[#135bec] focus-within:shadow-[0_0_15px_rgba(19,91,236,0.3)] transition-all">
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => {
                      updateFormData('name', e.target.value);
                      setNameError(null);
                    }}
                    placeholder="e.g. Black Friday Promo"
                    className="w-full bg-transparent py-5 px-6 text-xl outline-none border-none text-white placeholder-slate-500"
                  />
                  {nameError && <p className="text-red-400 text-xs px-6 pb-3">{nameError}</p>}
                  {validating && (
                    <p className="text-slate-400 text-xs px-6 pb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-sm">
                        refresh
                      </span>
                      Checking...
                    </p>
                  )}
                </div>
              )}

              {/* Step: URL */}
              {currentStep.id === 'url' && (
                <div className="space-y-2">
                  <div className="rounded-2xl bg-[#101622] border-2 border-[#232f48] focus-within:border-[#135bec] focus-within:shadow-[0_0_15px_rgba(19,91,236,0.3)] transition-all">
                    <input
                      type="url"
                      value={formData.targetUrl || ''}
                      onChange={(e) => {
                        updateFormData('targetUrl', e.target.value);
                        setUrlError(null);
                      }}
                      placeholder="https://..."
                      className="w-full bg-transparent py-5 px-6 text-xl outline-none border-none text-white placeholder-slate-500"
                    />
                  </div>
                  {urlSafety.loading && (
                    <p className="text-slate-400 text-xs flex items-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-sm">
                        refresh
                      </span>
                      Scanning for safety...
                    </p>
                  )}
                  {urlError && <p className="text-red-400 text-xs">{urlError}</p>}
                  {!urlError && urlSafety.isSafe === true && (
                    <p className="text-green-400 text-xs flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">verified</span>
                      Secure link
                    </p>
                  )}
                </div>
              )}

              {/* Step: Domain */}
              {currentStep.id === 'domain' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {domains.map((d) => {
                    const isSelected = selectedDomain === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => updateFormData('domain', d)}
                        className={`p-6 rounded-2xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-[#FF10F0] bg-[#FF10F0]/5 shadow-[0_0_20px_rgba(255,16,240,0.2)]'
                            : 'border-[#232f48] bg-[#101622] hover:border-[#324467]'
                        }`}
                      >
                        <span className="text-xl font-bold text-white">{d}</span>
                        <span className="block text-xs text-gray-500 uppercase mt-1">
                          {d === 'glynk.to' ? 'Short & Sweet' : 'Custom'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Step: Slug */}
              {currentStep.id === 'slug' && (
                <div className="space-y-2">
                  <div className="flex items-center rounded-2xl bg-[#101622] border-2 border-[#232f48] focus-within:border-[#135bec] overflow-hidden transition-all">
                    <div className="pl-6 text-[#135bec] font-bold text-lg flex-shrink-0">
                      {selectedDomain}/
                    </div>
                    <input
                      type="text"
                      value={formData.slug || ''}
                      onChange={(e) => {
                        updateFormData('slug', e.target.value.toLowerCase());
                        setSlugError(null);
                      }}
                      placeholder="my-deal"
                      className="flex-1 bg-transparent py-5 px-3 text-xl outline-none font-semibold border-none text-white placeholder-slate-500"
                    />
                  </div>
                  {slugError && <p className="text-red-400 text-xs">{slugError}</p>}
                  {validating && (
                    <p className="text-slate-400 text-xs flex items-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-sm">
                        refresh
                      </span>
                      Checking availability...
                    </p>
                  )}
                </div>
              )}

              {/* Step: Bot */}
              {currentStep.id === 'bot' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {BOT_OPTIONS.map((opt) => {
                      const isSelected = formData.botAction === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => updateFormData('botAction', opt.value)}
                          className={`p-4 rounded-xl border-2 font-bold transition-all ${
                            isSelected
                              ? 'border-[#FF10F0] bg-[#FF10F0]/5 shadow-[0_0_20px_rgba(255,16,240,0.2)] text-white'
                              : 'border-[#232f48] bg-[#101622] text-slate-300 hover:border-[#324467]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  {formData.botAction === 'redirect' && (
                    <div className="pt-2">
                      <p className="text-xs text-gray-500 mb-2 uppercase font-bold tracking-widest">
                        Redirect Bots to
                      </p>
                      <div className="rounded-xl bg-[#101622] border-2 border-[#232f48] focus-within:border-[#135bec] transition-all">
                        <input
                          type="url"
                          value={formData.fallbackUrl || ''}
                          onChange={(e) => {
                            updateFormData('fallbackUrl', e.target.value);
                            setFallbackUrlError(null);
                          }}
                          placeholder="https://google.com"
                          className="w-full bg-transparent py-4 px-4 outline-none border-none text-white placeholder-slate-500"
                        />
                      </div>
                      {fallbackUrlError && (
                        <p className="text-red-400 text-xs mt-2">{fallbackUrlError}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step: Geo */}
              {currentStep.id === 'geo' && (
                <div className="space-y-4">
                  {(formData.geoRules || []).length > 0 && (
                    <div className="space-y-2">
                      {formData.geoRules.map((rule, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-[#101622] p-4 rounded-xl border border-[#232f48]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="bg-[#135bec]/20 text-[#135bec] px-2 py-1 rounded text-[10px] font-bold flex-shrink-0">
                              {getCountryName(rule.country)}
                            </span>
                            <span className="text-sm text-gray-400 truncate">{rule.url}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeGeoRule(idx)}
                            className="text-red-500 hover:text-red-400 flex-shrink-0 p-1"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {!showGeoForm ? (
                    <button
                      type="button"
                      onClick={() => setShowGeoForm(true)}
                      className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-[#232f48] text-slate-400 hover:border-[#135bec] hover:text-white transition-all"
                    >
                      <span className="material-symbols-outlined">add</span>
                      Add geo rule
                    </button>
                  ) : (
                    <div className="p-4 bg-[#101622] border-2 border-[#232f48] rounded-2xl space-y-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-2">
                          If Country is
                        </label>
                        <select
                          value={newGeoRule.country}
                          onChange={(e) =>
                            setNewGeoRule((r) => ({ ...r, country: e.target.value }))
                          }
                          className="w-full bg-[#0b0f19] border border-[#232f48] rounded-xl p-4 text-white outline-none focus:border-[#135bec]"
                        >
                          <option value="">Select...</option>
                          {countriesData.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        {geoRuleErrors.country && (
                          <p className="text-red-400 text-xs mt-1">{geoRuleErrors.country}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-2">
                          Then go to URL
                        </label>
                        <input
                          type="url"
                          value={newGeoRule.url}
                          onChange={(e) => setNewGeoRule((r) => ({ ...r, url: e.target.value }))}
                          placeholder="https://..."
                          className="w-full bg-[#0b0f19] border border-[#232f48] rounded-xl p-4 text-white outline-none focus:border-[#135bec]"
                        />
                        {geoRuleErrors.url && (
                          <p className="text-red-400 text-xs mt-1">{geoRuleErrors.url}</p>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setShowGeoForm(false)}
                          className="flex-1 py-3 rounded-xl font-bold bg-[#232f48] text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={addGeoRule}
                          className="flex-1 py-3 rounded-xl font-bold bg-[#10b981] text-white"
                        >
                          Add Rule
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step: CAPI */}
              {currentStep.id === 'capi' && (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {loadingPixels ? (
                    <p className="text-slate-400">Loading pixels...</p>
                  ) : availablePixels.length === 0 ? (
                    <p className="text-slate-500 text-sm">
                      No CAPI pixels yet. Add them in CAPI Manager.
                    </p>
                  ) : (
                    availablePixels.map((pixel) => {
                      const isSelected = (formData.selectedPixels || []).includes(pixel.id);
                      const name = PLATFORM_NAMES[pixel.platform] || pixel.platform;
                      return (
                        <button
                          key={pixel.id}
                          type="button"
                          onClick={() => togglePixel(pixel.id)}
                          className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                            isSelected
                              ? 'border-[#FF10F0] bg-[#FF10F0]/5'
                              : 'border-[#232f48] bg-[#101622] hover:border-[#324467]'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[#232f48] flex items-center justify-center overflow-hidden">
                              {pixel.platform === 'taboola' && (
                                <img
                                  src={taboolaLogo}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              )}
                              {pixel.platform === 'outbrain' && (
                                <img
                                  src={outbrainLogo}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              )}
                              {!['taboola', 'outbrain'].includes(pixel.platform) && (
                                <span className="text-white text-sm font-bold">
                                  {name.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div className="text-left">
                              <div className="font-bold text-white">{pixel.name}</div>
                              <div className="text-[10px] text-gray-500 uppercase">{name}</div>
                            </div>
                          </div>
                          <div className={isSelected ? 'text-[#FF10F0]' : 'text-gray-600'}>
                            <span className="material-symbols-outlined text-xl">
                              {isSelected ? 'check_circle' : 'circle'}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Step: Review */}
          {currentStep?.isReview && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 text-center"
            >
              <div>
                <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">
                  Step {totalSteps} of {totalSteps}
                </span>
              </div>
              <div className="w-20 h-20 bg-[#10b981]/20 text-[#10b981] rounded-full flex items-center justify-center mx-auto border-4 border-[#10b981]/10">
                <span className="material-symbols-outlined text-4xl">check</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
                Final <span className="text-[#10b981]">Launch</span>
              </h1>
              <p className="text-gray-400">Review your smart link configuration below.</p>

              <div className="bg-[#101622] border border-[#232f48] rounded-2xl p-6 space-y-4 text-left">
                <div className="flex justify-between items-center border-b border-[#232f48] pb-3">
                  <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                    Link Name
                  </span>
                  <span className="font-bold text-white">{formData.name || '—'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#232f48] pb-3">
                  <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                    Short Link
                  </span>
                  <span className="font-bold text-[#FF10F0] break-all">
                    https://{selectedDomain}/{formData.slug || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-[#232f48] pb-3">
                  <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                    Destination
                  </span>
                  <span
                    className="text-xs text-gray-400 truncate max-w-[180px]"
                    title={formData.targetUrl}
                  >
                    {formData.targetUrl || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-[#232f48] pb-3">
                  <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                    Bot Action
                  </span>
                  <span className="font-bold text-yellow-500 text-xs uppercase">
                    {formData.botAction === 'redirect'
                      ? 'Redirect'
                      : formData.botAction === 'block'
                        ? 'Block'
                        : 'Allow'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-[#232f48] pb-3">
                  <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                    Geo Rules
                  </span>
                  <span className="font-bold text-orange-500 text-xs">
                    {(formData.geoRules || []).length} rule(s)
                  </span>
                </div>
                <div className="flex justify-between items-center pb-1">
                  <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                    Tracking
                  </span>
                  <span className="font-bold text-purple-500 text-xs text-right max-w-[180px]">
                    {(formData.selectedPixels || []).length
                      ? `${formData.selectedPixels.length} pixel(s)`
                      : 'None'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-[#0b0f19]/95 backdrop-blur border-t border-[#232f48] z-50">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            type="button"
            onClick={goBack}
            className={`flex items-center justify-center p-5 rounded-2xl border border-[#232f48] font-bold text-gray-400 hover:bg-[#232f48] hover:text-white transition-all active:scale-90 ${
              isFirst ? 'invisible' : ''
            }`}
          >
            <span className="material-symbols-outlined text-2xl">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={validating || urlSafety.loading}
            className="flex-1 flex items-center justify-center gap-3 py-5 rounded-2xl font-extrabold text-xl tracking-tight transition-all active:scale-[0.98] shadow-xl bg-[#FF10F0] hover:bg-[#e00ed0] text-white disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span>{isLast ? 'Complete Setup' : 'Next Step'}</span>
            <span className="material-symbols-outlined text-2xl">
              {isLast ? 'rocket_launch' : 'arrow_forward'}
            </span>
          </button>
        </div>
      </footer>
    </div>
  );
}

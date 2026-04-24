import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { validateUrl, validateBotRedirectUrl } from '../../lib/urlValidation';
import { checkUrlSafety } from '../../lib/urlSafetyCheck';
import { validateSlug } from '../../lib/slugValidation';
import { sanitizeInput } from '../../lib/inputSanitization';
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
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  google: 'Google Ads',
  snapchat: 'Snapchat',
  taboola: 'Taboola',
  outbrain: 'Outbrain',
};

const META_FAMILY_PLATFORMS = new Set(['meta', 'facebook', 'instagram']);
const SINGLE_SELECT_PLATFORMS = new Set(['tiktok']);

const isMetaFamilyPlatform = (platform) =>
  META_FAMILY_PLATFORMS.has(String(platform || '').trim().toLowerCase());

const isSingleSelectPlatform = (platform) =>
  SINGLE_SELECT_PLATFORMS.has(String(platform || '').trim().toLowerCase());

const getTimeZoneOptions = () => {
  const fallback = ['UTC', 'Asia/Jerusalem', 'America/New_York', 'Europe/London'];
  const list =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : fallback;
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZoneName: 'shortOffset',
    hour: '2-digit',
    minute: '2-digit',
  });
  const now = new Date();
  return list.map((tz) => {
    const parts = fmt.formatToParts(now, { timeZone: tz });
    const offset = parts.find((p) => p.type === 'timeZoneName')?.value || 'UTC';
    return { value: tz, label: `(${offset}) ${tz}` };
  });
};

function getPlatformLogo(platform) {
  switch (platform) {
    case 'meta':
    case 'facebook':
      return (
        <div className="w-10 h-10 rounded-xl bg-[#1877F2] flex items-center justify-center flex-shrink-0">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="white"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </div>
      );
    case 'instagram':
      return (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-gradient-to-br from-[#f9ed32] via-[#ee2a7b] to-[#6228d7] p-0.5">
          <div className="w-full h-full rounded-[5px] bg-slate-900 flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="white"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          </div>
        </div>
      );
    case 'tiktok':
      return (
        <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="white"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
          </svg>
        </div>
      );
    case 'google':
      return (
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        </div>
      );
    case 'snapchat':
      return (
        <div className="w-10 h-10 rounded-xl bg-[#FFFC00] flex items-center justify-center flex-shrink-0">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="black"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M12 2.979c-2.32 0-4.085 1.705-4.085 4.084 0 .393.048.775.14 1.144-.816.143-1.632.39-2.222.95-.29.274-.467.575-.544.896-.062.257-.04.516.066.764.123.284.348.513.626.657.34.175.71.258 1.05.28l.19.012c.07.004.143.007.222.01l.013.25c.012.247.025.513.04.79v.117c0 .633.435.986.974 1.15.54.164 1.25.164 1.83.164.083 0 .167 0 .252-.002l.144 1.15c.08.647.284.974.606 1.15.32.176.716.216 1.08.216h1.22c.365 0 .76-.04 1.08-.216.32-.176.526-.503.606-1.15l.144-1.15c.085.002.169.002.252.002.58 0 1.29 0 1.83-.164.54-.164.975-.517.975-1.15v-.117c.015-.277.026-.543.04-.79l.012-.25c.08-.003.153-.006.223-.01l.19-.012c.34-.022.71-.105 1.05-.28.278-.144.503-.373.626-.657.106-.248.128-.507.066-.764-.077-.321-.254-.622-.544-.896-.59-.56-1.406-.807-2.222-.95.093-.369.14-.75.14-1.144 0-2.379-1.765-4.084-4.085-4.084z" />
          </svg>
        </div>
      );
    case 'taboola':
      return (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200">
          <img src={taboolaLogo} alt="Taboola" className="w-full h-full object-cover" />
        </div>
      );
    case 'outbrain':
      return (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200">
          <img src={outbrainLogo} alt="Outbrain" className="w-full h-full object-cover" />
        </div>
      );
    default:
      return (
        <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0">
          <span className="text-[#1b1b1b] text-sm font-bold">
            {(PLATFORM_NAMES[platform] || platform).charAt(0)}
          </span>
        </div>
      );
  }
}

export default function LinkWizardOnePerPage({
  formData,
  updateFormData,
  planType = 'free',
  isEditMode,
  initialData,
  onValidateAndSubmit,
  stepRefs,
  isSubmitting = false,
}) {
  const [domains, setDomains] = useState(['glynk.to']);
  const [domainStatuses, setDomainStatuses] = useState({}); // domain -> 'active' | 'pending'
  const [availablePixels, setAvailablePixels] = useState([]);
  const [loadingPixels, setLoadingPixels] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [timeZoneOptions] = useState(() => getTimeZoneOptions());

  // Validation state
  const [nameError, setNameError] = useState(null);
  const [urlError, setUrlError] = useState(null);
  const [urlSafety, setUrlSafety] = useState({ loading: false, isSafe: null });
  const [slugError, setSlugError] = useState(null);
  const [fallbackUrlError, setFallbackUrlError] = useState(null);
  const [validating, setValidating] = useState(false);

  // Track initial values for edit mode to skip re-validation when unchanged
  const initialNameRef = useRef(null);
  const initialTargetUrlRef = useRef(null);
  const initialSlugRef = useRef(null);
  const initialFallbackUrlRef = useRef(null);

  useEffect(() => {
    if (isEditMode) {
      if (initialNameRef.current === null && formData.name != null) {
        initialNameRef.current = (formData.name || '').trim();
      }
      if (initialTargetUrlRef.current === null && formData.targetUrl != null) {
        initialTargetUrlRef.current = (formData.targetUrl || '').trim().toLowerCase();
      }
      if (initialSlugRef.current === null && formData.slug != null) {
        initialSlugRef.current = (formData.slug || '').trim().toLowerCase();
      }
      if (initialFallbackUrlRef.current === null && formData.fallbackUrl != null) {
        initialFallbackUrlRef.current = (formData.fallbackUrl || '').trim().toLowerCase();
      }
    }
  }, [isEditMode, formData.name, formData.targetUrl, formData.slug, formData.fallbackUrl]);

  const uniqueDomains = (list) => {
    const seen = new Set();
    return (list || []).filter((d) => {
      const normalized = String(d || '')
        .trim()
        .toLowerCase();
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  };

  // Geo rule form
  const [showGeoForm, setShowGeoForm] = useState(false);
  const [newGeoRule, setNewGeoRule] = useState({ country: '', url: '' });
  const [geoRuleErrors, setGeoRuleErrors] = useState({ country: null, url: null });
  const [editingGeoIndex, setEditingGeoIndex] = useState(null);

  // Step visibility by plan:
  // FREE & START: Name, Target URL, Custom Slug only.
  // ADVANCED: + Select Domain (if multiple), Bot Protection.
  // PRO: + Geo Targeting, CAPI Select.
  const steps = useMemo(() => {
    const plan = (planType || '').toLowerCase();
    const isFreeOrStart = plan === 'free' || plan === 'start' || plan === 'starter';
    const isAdvancedOrPro = plan === 'advanced' || plan === 'pro';
    const isPro = plan === 'pro';

    const list = [
      {
        id: 'name',
        badge: 'Start',
        badgeColor: 'text-[#10b981] bg-[#10b981]/10',
        title: 'Name your',
        highlight: 'Link',
        highlightClass:
          'bg-gradient-to-r from-[#a855f7] to-[#7c6ee8] bg-clip-text text-transparent',
        subtitle: 'What should we call your link ?',
      },
      {
        id: 'url',
        badge: 'Destination',
        badgeColor: 'text-[#135bec] bg-[#135bec]/10',
        title: 'Target',
        highlight: 'URL',
        highlightClass:
          'bg-gradient-to-r from-[#135bec] to-[#42a5f5] bg-clip-text text-transparent',
        subtitle: 'Where should the user land ?',
      },
      {
        id: 'mode',
        badge: 'Access',
        badgeColor: 'text-[#0b996f] bg-[#0b996f]/10',
        title: 'Choose',
        highlight: 'Redirection Mode',
        highlightClass:
          'bg-gradient-to-r from-[#0b996f] to-[#10b981] bg-clip-text text-transparent',
        subtitle: 'Direct access or secured link controls.',
      },
      {
        id: 'access',
        badge: 'Security',
        badgeColor: 'text-[#135bec] bg-[#135bec]/10',
        title: 'Configure',
        highlight: 'Access Rules',
        highlightClass:
          'bg-gradient-to-r from-[#135bec] to-[#42a5f5] bg-clip-text text-transparent',
        subtitle: 'Set password, time limits, and click limits.',
        show: (formData.accessMode || 'direct') === 'controlled',
      },
      {
        id: 'domain',
        badge: 'Domain',
        badgeColor: 'text-[#a855f7] bg-[#a855f7]/10',
        title: 'Select',
        highlight: 'Domain',
        highlightClass:
          'bg-gradient-to-r from-[#a855f7] to-[#7c6ee8] bg-clip-text text-transparent',
        subtitle: 'Choose the base for your short link.',
        // For testing: show when plan fits (even with only glynk.to). Normally: && domains.length > 1
        show: isAdvancedOrPro,
      },
      {
        id: 'slug',
        badge: 'Alias',
        badgeColor: 'text-[#a855f7] bg-[#a855f7]/10',
        title: 'Custom',
        highlight: 'Slug',
        highlightClass:
          'bg-gradient-to-r from-[#a855f7] to-[#7c6ee8] bg-clip-text text-transparent',
        subtitle: 'Make it memorable.',
      },
      {
        id: 'bot',
        badge: 'Security',
        badgeColor: 'text-yellow-500 bg-yellow-500/10',
        title: 'Bot',
        highlight: 'Protection',
        highlightClass: 'text-yellow-500',
        subtitle: 'How should we handle bots ?',
        show: isAdvancedOrPro,
      },
      {
        id: 'geo',
        badge: 'Geography',
        badgeColor: 'text-orange-500 bg-orange-500/10',
        title: 'Geo',
        highlight: 'Targeting',
        highlightClass: 'text-orange-500',
        subtitle: 'Optional routing by country.',
        show: isPro,
      },
      {
        id: 'capi',
        badge: 'Tracking',
        badgeColor: 'text-purple-500 bg-purple-500/10',
        title: 'CAPI',
        highlight: 'Select',
        highlightClass: 'text-purple-500',
        subtitle: 'Select Conversions API to fire events.',
        show: isPro,
      },
      {
        id: 'review',
        badge: 'Launch',
        badgeColor: 'text-[#10b981] bg-[#10b981]/10',
        title: 'Final',
        highlight: 'Launch',
        highlightClass: 'text-[#10b981]',
        subtitle: 'Final review of your GoodLink.',
        isReview: true,
      },
    ];
    return list.filter((s) => s.show !== false);
  }, [planType, domains.length, formData.accessMode]);

  const totalSteps = steps.length;
  const currentStep = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  // Clamp step index when steps list shrinks (e.g. plan change: free hides geo/capi)
  useEffect(() => {
    if (totalSteps > 0 && stepIndex >= totalSteps) {
      setStepIndex(Math.max(0, totalSteps - 1));
    }
  }, [totalSteps, stepIndex]);

  // Fetch domains (FREE/START: default only; ADVANCED/PRO: only active custom domains)
  useEffect(() => {
    const plan = (planType || '').toLowerCase();
    if (plan === 'free' || plan === 'start' || plan === 'starter') {
      setDomains(['glynk.to']);
      // In edit mode keep the existing domain; only default for new links
      if (!isEditMode) updateFormData('domain', 'glynk.to');
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
          .select('domain, status')
          .eq('user_id', user.id)
          .eq('status', 'active');
        if (!error && customDomains?.length > 0) {
          const list = customDomains.map((d) => d.domain);
          const statusMap = {};
          customDomains.forEach((d) => {
            statusMap[d.domain] = d.status || 'active';
          });
          setDomainStatuses(statusMap);
          setDomains(uniqueDomains(['glynk.to', ...list]));
        } else {
          setDomainStatuses({});
          setDomains(['glynk.to']);
        }
      } catch (e) {
        setDomainStatuses({});
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
        if (!error) {
          const pixels = data || [];
          setAvailablePixels(pixels);

          // Enforce mutual-exclusivity for Meta/Instagram on load.
          // If formData.selectedPixels already contains more than one Meta/Instagram
          // pixel (e.g. from old data), keep only the last one selected.
          const current = formData.selectedPixels || [];
          // Normalise each item to a string ID (handles stored objects or plain strings)
          const toId = (item) => (typeof item === 'string' ? item : item?.id ?? '');
          const currentIds = current.map(toId).filter(Boolean);
          const metaPixelIds = pixels
            .filter((p) => isMetaFamilyPlatform(p.platform))
            .map((p) => p.id);
          const selectedMetaIds = currentIds.filter((id) => metaPixelIds.includes(id));
          if (selectedMetaIds.length > 1) {
            // Keep only the last (most recent) Meta/Instagram selection
            const keepId = selectedMetaIds[selectedMetaIds.length - 1];
            const cleaned = currentIds.filter(
              (id) => !metaPixelIds.includes(id) || id === keepId
            );
            updateFormData('selectedPixels', cleaned);
          } else if (currentIds.length !== current.length || current.some((i) => typeof i !== 'string')) {
            // Normalise to plain string IDs if needed (objects → strings)
            updateFormData('selectedPixels', currentIds);
          }
        }
      } catch (e) {
        // silent
      } finally {
        setLoadingPixels(false);
      }
    };
    fetchPixels();
  }, []);

  // Name validation (duplicate check)
  const checkName = async () => {
    const name = formData.name?.trim();
    // In edit mode, if name didn't change from initial, skip duplicate check
    if (isEditMode && initialNameRef.current && name === initialNameRef.current) {
      setNameError(null);
      return true;
    }
    if (!name) {
      setNameError('Please enter a name for your link.');
      return false;
    }
    // XSS / injection check
    const nameCheck = sanitizeInput(name);
    if (!nameCheck.safe) {
      setNameError(nameCheck.error);
      return false;
    }
    setValidating(true);
    setNameError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setNameError('Please log in to continue.');
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
      setNameError('Could not validate the link name. Please try again.');
      return false;
    } finally {
      setValidating(false);
    }
  };

  // URL validation (format + safety + glynk.to + url exists)
  const performUrlCheck = async () => {
    const raw = formData.targetUrl?.trim();
    // In edit mode, if URL didn't change from initial, skip full validation
    if (
      isEditMode &&
      initialTargetUrlRef.current &&
      raw &&
      raw.toLowerCase() === initialTargetUrlRef.current
    ) {
      setUrlError(null);
      setUrlSafety({ loading: false, isSafe: true });
      return true;
    }
    if (!raw) {
      setUrlError('Please enter a destination URL.');
      return false;
    }
    const validation = validateUrl(raw);
    if (!validation.isValid) {
      setUrlError(validation.error || 'Please enter a valid URL.');
      return false;
    }
    const normalizedUrl = validation.normalizedUrl;

    setUrlSafety({ loading: true, isSafe: null });
    setUrlError(null);
    try {
      const safetyResult = await checkUrlSafety(normalizedUrl);
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
      setUrlError('Could not validate the destination URL. Please try again.');
      setUrlSafety({ loading: false, isSafe: null });
      return false;
    }
  };

  // Slug validation
  const validateSlugStep = async () => {
    const slug = formData.slug?.trim().toLowerCase();
    // In edit mode, if slug didn't change from initial, skip uniqueness check
    if (isEditMode && initialSlugRef.current && slug === initialSlugRef.current) {
      setSlugError(null);
      return true;
    }
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
        setSlugError('Please log in to continue.');
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
        setSlugError(result.error || 'Please enter a valid slug.');
        return false;
      }
      if (result.normalizedSlug && result.normalizedSlug !== formData.slug) {
        updateFormData('slug', result.normalizedSlug);
      }
      return true;
    } catch (e) {
      setSlugError('Could not validate the slug. Please try again.');
      return false;
    } finally {
      setValidating(false);
    }
  };

  // Bot fallback URL validation (blocked: glynk.to, goodlink.ai; cannot be same as link target)
  const validateBotStep = () => {
    if (formData.botAction !== 'redirect') return true;
    const url = formData.fallbackUrl?.trim();
    // In edit mode, if fallback URL didn't change from initial, skip re-validation
    if (
      isEditMode &&
      initialFallbackUrlRef.current &&
      url &&
      url.toLowerCase() === initialFallbackUrlRef.current
    ) {
      setFallbackUrlError(null);
      return true;
    }
    if (!url) {
      setFallbackUrlError('Please enter a redirect URL for bots.');
      return false;
    }
    const v = validateBotRedirectUrl(url, formData.targetUrl || '');
    if (!v.isValid) {
      setFallbackUrlError(v.error || 'Please enter a valid URL.');
      return false;
    }
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
    } else if (currentStep.id === 'access') {
      if (formData.enablePasswordProtection && !String(formData.accessPassword || '').trim()) {
        return;
      }
      if (formData.enablePasswordProtection && formData.enableAntiBruteForce) {
        const attempts = Number(formData.maxLoginAttempts);
        const lockout = Number(formData.lockoutDurationMinutes);
        if (!Number.isFinite(attempts) || attempts < 1) return;
        if (!Number.isFinite(lockout) || lockout < 1) return;
      }
      if (formData.enableClickLimit) {
        const maxClicks = Number(formData.maxClicksAllowed);
        if (!Number.isFinite(maxClicks) || maxClicks < 1) return;
      }
      if (formData.enableTimeLimit) {
        if (!String(formData.expirationDateTime || '').trim()) return;
        if (!String(formData.expirationTimeZone || '').trim()) return;
      }
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
        const v = validateBotRedirectUrl(formData.fallbackUrl, formData.targetUrl || '');
        if (!v.isValid) {
          setFallbackUrlError(v.error || 'Please enter a valid URL.');
          return { isValid: false, normalizedUrl: null };
        }
        setFallbackUrlError(null);
        return { isValid: true, normalizedUrl: v.normalizedUrl || formData.fallbackUrl };
      },
    };
  }, [stepRefs, formData.botAction, formData.fallbackUrl]);

  const togglePixel = (pixelId) => {
    // Normalise stored items — they may be plain UUID strings or full pixel objects
    const toId = (item) => (typeof item === 'string' ? item : item?.id ?? '');
    const raw = formData.selectedPixels || [];
    const list = raw.map(toId).filter(Boolean); // always work with plain ID strings

    if (list.includes(pixelId)) {
      updateFormData('selectedPixels', list.filter((id) => id !== pixelId));
      return;
    }

    // Meta-family share the same Graph API endpoint — only one may be active at a time.
    // TikTok is also limited to one selected profile.
    const clickedPixel = availablePixels.find((p) => p.id === pixelId);
    let filtered = list;
    if (clickedPixel && isMetaFamilyPlatform(clickedPixel.platform)) {
      // Remove every currently-selected Meta/Instagram pixel before adding the new one.
      const metaIds = new Set(
        availablePixels
          .filter((p) => isMetaFamilyPlatform(p.platform))
          .map((p) => p.id)
      );
      filtered = list.filter((id) => !metaIds.has(id));
    } else if (clickedPixel && isSingleSelectPlatform(clickedPixel.platform)) {
      // Allow only one selected TikTok profile.
      const samePlatformIds = new Set(
        availablePixels
          .filter((p) => isSingleSelectPlatform(p.platform))
          .map((p) => p.id)
      );
      filtered = list.filter((id) => !samePlatformIds.has(id));
    }
    updateFormData('selectedPixels', [...filtered, pixelId]);
  };

  const addGeoRule = () => {
    setGeoRuleErrors({ country: null, url: null });
    if (!newGeoRule.country?.trim()) {
      setGeoRuleErrors((e) => ({ ...e, country: 'Please select a country' }));
      return;
    }
    const rules = Array.isArray(formData.geoRules) ? formData.geoRules : [];
    // Check for duplicate country (ignore the rule currently being edited)
    if (
      rules.some((r, idx) => r.country === newGeoRule.country && idx !== (editingGeoIndex ?? -1))
    ) {
      setGeoRuleErrors((e) => ({ ...e, country: 'A rule for this country already exists' }));
      return;
    }
    if (!newGeoRule.url?.trim()) {
      setGeoRuleErrors((e) => ({ ...e, url: 'Please enter a URL' }));
      return;
    }
    const v = validateUrl(newGeoRule.url);
    if (!v.isValid) {
      setGeoRuleErrors((e) => ({ ...e, url: v.error || 'Please enter a valid URL.' }));
      return;
    }
    const normalizedRule = {
      country: newGeoRule.country,
      url: v.normalizedUrl || newGeoRule.url,
    };

    if (editingGeoIndex != null) {
      const next = [...rules];
      next[editingGeoIndex] = normalizedRule;
      updateFormData('geoRules', next);
    } else {
      updateFormData('geoRules', [...rules, normalizedRule]);
    }

    setNewGeoRule({ country: '', url: '' });
    setEditingGeoIndex(null);
    setShowGeoForm(false);
  };

  const removeGeoRule = (index) => {
    const rules = [...(formData.geoRules || [])];
    rules.splice(index, 1);
    updateFormData('geoRules', rules);
  };

  const beginEditGeoRule = (index) => {
    const rules = Array.isArray(formData.geoRules) ? formData.geoRules : [];
    const rule = rules[index];
    if (!rule) return;
    setNewGeoRule({ country: rule.country, url: rule.url });
    setGeoRuleErrors({ country: null, url: null });
    setEditingGeoIndex(index);
    setShowGeoForm(true);
  };

  const getCountryName = (code) => countriesData.find((c) => c.code === code)?.name || code;

  const selectedDomain = formData.domain || domains[0];
  const nameInputRef = useRef(null);
  const targetUrlInputRef = useRef(null);
  const slugInputRef = useRef(null);
  const botFallbackUrlInputRef = useRef(null);
  const geoThenUrlInputRef = useRef(null);
  const progressPct = totalSteps ? ((stepIndex + 1) / totalSteps) * 100 : 0;

  useEffect(() => {
    if (!currentStep) return;
    const t = setTimeout(() => {
      if (currentStep.id === 'name') {
        nameInputRef.current?.focus?.();
        nameInputRef.current?.select?.();
        return;
      }
      if (currentStep.id === 'url') {
        targetUrlInputRef.current?.focus?.();
        targetUrlInputRef.current?.select?.();
        return;
      }
      if (currentStep.id === 'slug') {
        slugInputRef.current?.focus?.();
        slugInputRef.current?.select?.();
        return;
      }
      if (currentStep.id === 'bot' && formData.botAction === 'redirect') {
        botFallbackUrlInputRef.current?.focus?.();
        botFallbackUrlInputRef.current?.select?.();
        return;
      }
      if (currentStep.id === 'geo' && showGeoForm) {
        geoThenUrlInputRef.current?.focus?.();
        geoThenUrlInputRef.current?.select?.();
      }
    }, 0);
    return () => clearTimeout(t);
  }, [currentStep?.id, formData.botAction, showGeoForm]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Progress bar */}
      <div
        className="h-1 bg-slate-200 flex-shrink-0"
        role="progressbar"
        aria-valuenow={stepIndex + 1}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Step ${stepIndex + 1} of ${totalSteps}`}
      >
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

      <div className="flex-1 min-h-0 flex flex-col justify-center px-6 pb-32 pt-8 max-w-2xl mx-auto w-full relative z-10">
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
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#1b1b1b]">
                  {currentStep.title}{' '}
                  <span
                    className={
                      currentStep.highlightClass ||
                      'bg-gradient-to-r from-[#a855f7] to-[#7c6ee8] bg-clip-text text-transparent'
                    }
                  >
                    {currentStep.highlight}
                  </span>
                </h1>
                <p className="text-gray-500 font-medium text-2xl">{currentStep.subtitle}</p>
              </div>

              {/* Step: Name */}
              {currentStep.id === 'name' && (
                <>
                  <div className="rounded-2xl bg-white border-2 border-slate-200 focus-within:border-[#135bec] focus-within:shadow-[0_0_15px_rgba(19,91,236,0.3)] transition-all">
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => {
                        updateFormData('name', e.target.value);
                        setNameError(null);
                      }}
                      placeholder="e.g. Black Friday Promo"
                      aria-label="Link name"
                      aria-describedby={nameError ? 'name-error' : undefined}
                      className="w-full bg-transparent py-5 px-6 text-xl outline-none border-none text-[#1b1b1b] placeholder-slate-500"
                    />
                  </div>
                  {/* Reserve space for error / helper text so layout doesn't jump */}
                  <div className="min-h-[32px] mt-1 space-y-1">
                    {nameError && (
                      <p id="name-error" className="text-red-500 text-sm px-1" role="alert">{nameError}</p>
                    )}
                    {!nameError && validating && (
                      <p className="text-[#1b1b1b] text-xs px-1 flex items-center gap-2" role="status">
                        <span className="material-symbols-outlined animate-spin text-sm" aria-hidden="true">
                          refresh
                        </span>
                        Checking...
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Step: URL */}
              {currentStep.id === 'url' && (
                <div className="space-y-2">
                  <div className="rounded-2xl bg-white border-2 border-slate-200 focus-within:border-[#135bec] focus-within:shadow-[0_0_15px_rgba(19,91,236,0.3)] transition-all">
                    <input
                      ref={targetUrlInputRef}
                      type="url"
                      value={formData.targetUrl || ''}
                      onChange={(e) => {
                        updateFormData('targetUrl', e.target.value.toLowerCase());
                        setUrlError(null);
                      }}
                      placeholder="https://..."
                      autoFocus
                      aria-label="Target URL"
                      aria-describedby={urlError ? 'url-error' : undefined}
                      className="w-full bg-transparent py-5 px-6 text-xl outline-none border-none text-[#1b1b1b] placeholder-slate-500"
                    />
                  </div>
                  {/* Reserve space for URL error / safety text to avoid layout jumps */}
                  <div className="min-h-[32px] mt-1 space-y-1">
                    {urlError && <p id="url-error" className="text-red-500 text-sm" role="alert">{urlError}</p>}
                    {!urlError && urlSafety.loading && (
                      <p className="text-[#1b1b1b] text-xs flex items-center gap-2" role="status">
                        <span className="material-symbols-outlined animate-spin text-sm" aria-hidden="true">
                          refresh
                        </span>
                        Scanning for safety...
                      </p>
                    )}
                    {!urlError && !urlSafety.loading && urlSafety.isSafe === true && (
                      <p className="text-green-700 text-xs flex items-center gap-1" role="status">
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">verified</span>
                        Secure link
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step: Domain */}
              {currentStep.id === 'mode' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => updateFormData('accessMode', 'direct')}
                    className={`p-5 rounded-2xl border-2 text-left transition-all ${
                      (formData.accessMode || 'direct') === 'direct'
                        ? 'border-[#10b981] bg-[#10b981]/5'
                        : 'border-slate-200 bg-white hover:border-[#10b981]/40'
                    }`}
                  >
                    <p className="text-lg font-bold text-[#1b1b1b]">Direct Access</p>
                    <p className="text-sm text-slate-600 mt-2">
                      Simple, fast redirection with no restrictions or security layers.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFormData('accessMode', 'controlled')}
                    className={`p-5 rounded-2xl border-2 text-left transition-all ${
                      (formData.accessMode || 'direct') === 'controlled'
                        ? 'border-[#135bec] bg-[#135bec]/5'
                        : 'border-slate-200 bg-white hover:border-[#135bec]/40'
                    }`}
                  >
                    <p className="text-lg font-bold text-[#1b1b1b]">Access Control &amp; Limits</p>
                    <p className="text-sm text-slate-600 mt-2">
                      Secure your link with passwords, expiration dates, or click caps.
                    </p>
                  </button>
                </div>
              )}

              {currentStep.id === 'access' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={!!formData.enablePasswordProtection}
                        onChange={(e) => updateFormData('enablePasswordProtection', e.target.checked)}
                      />
                      <span className="font-bold text-[#1b1b1b]">Enable Password Protection</span>
                    </label>
                    {formData.enablePasswordProtection && (
                      <>
                        <input
                          type="text"
                          value={formData.accessPassword || ''}
                          onChange={(e) => updateFormData('accessPassword', e.target.value)}
                          placeholder="Enter password..."
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-[#1b1b1b] outline-none focus:border-[#135bec]"
                        />
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={!!formData.enableAntiBruteForce}
                            onChange={(e) => updateFormData('enableAntiBruteForce', e.target.checked)}
                          />
                          <span className="font-semibold text-[#1b1b1b]">
                            Enable Anti-Brute Force Protection
                          </span>
                        </label>
                        {formData.enableAntiBruteForce && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="number"
                              min={1}
                              value={formData.maxLoginAttempts ?? 5}
                              onChange={(e) => updateFormData('maxLoginAttempts', e.target.value)}
                              placeholder="e.g. 5"
                              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-[#1b1b1b] outline-none focus:border-[#135bec]"
                            />
                            <input
                              type="number"
                              min={1}
                              value={formData.lockoutDurationMinutes ?? 30}
                              onChange={(e) => updateFormData('lockoutDurationMinutes', e.target.value)}
                              placeholder="e.g. 30"
                              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-[#1b1b1b] outline-none focus:border-[#135bec]"
                            />
                          </div>
                        )}
                        <p className="text-xs text-slate-500">
                          Temporarily blocks the visitor&apos;s IP after multiple failed attempts.
                        </p>
                      </>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={!!formData.enableTimeLimit}
                        onChange={(e) => updateFormData('enableTimeLimit', e.target.checked)}
                      />
                      <span className="font-bold text-[#1b1b1b]">Enable Time Limit</span>
                    </label>
                    {formData.enableTimeLimit && (
                      <>
                        <input
                          type="datetime-local"
                          value={formData.expirationDateTime || ''}
                          onChange={(e) => updateFormData('expirationDateTime', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-[#1b1b1b] outline-none focus:border-[#135bec]"
                        />
                        <select
                          value={formData.expirationTimeZone || 'UTC'}
                          onChange={(e) => updateFormData('expirationTimeZone', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-[#1b1b1b] outline-none focus:border-[#135bec]"
                        >
                          {timeZoneOptions.map((tz) => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-500">
                          The link will deactivate based on the selected time zone.
                        </p>
                      </>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={!!formData.enableClickLimit}
                        onChange={(e) => updateFormData('enableClickLimit', e.target.checked)}
                      />
                      <span className="font-bold text-[#1b1b1b]">Enable Click Limit</span>
                    </label>
                    {formData.enableClickLimit && (
                      <>
                        <input
                          type="number"
                          min={1}
                          value={formData.maxClicksAllowed || ''}
                          onChange={(e) => updateFormData('maxClicksAllowed', e.target.value)}
                          placeholder="e.g. 1000"
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-[#1b1b1b] outline-none focus:border-[#135bec]"
                        />
                        <p className="text-xs text-slate-500">
                          Once this limit is reached, the link will no longer redirect visitors.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Step: Domain */}
              {currentStep.id === 'domain' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {uniqueDomains(domains).map((d) => {
                    const isSelected = selectedDomain === d;
                    const status = domainStatuses[d];
                    const isPending = status === 'pending';
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          updateFormData('domain', d);
                          if (d === 'glynk.to') updateFormData('selectedPixels', []);
                        }}
                        aria-pressed={isSelected}
                        className={`p-6 rounded-2xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-[#a855f7] bg-[#a855f7]/5 shadow-[0_0_20px_rgba(255,16,240,0.2)]'
                            : 'border-slate-200 bg-white hover:border-[#324467]'
                        }`}
                      >
                        <span className="text-xl font-bold text-[#1b1b1b]">{d}</span>
                        <span className="block text-xs text-gray-500 uppercase mt-1">
                          {d === 'glynk.to'
                            ? 'Short & Sweet'
                            : isPending
                              ? 'Custom · Pending'
                              : 'Custom'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Step: Slug */}
              {currentStep.id === 'slug' && (
                <div className="space-y-2">
                  <div className="flex items-center rounded-2xl bg-white border-2 border-slate-200 focus-within:border-[#135bec] overflow-hidden transition-all">
                    <div className="pl-6 text-[#135bec] font-bold text-lg flex-shrink-0">
                      {selectedDomain}/
                    </div>
                    <input
                      ref={slugInputRef}
                      type="text"
                      value={formData.slug || ''}
                      onChange={(e) => {
                        updateFormData('slug', e.target.value.toLowerCase());
                        setSlugError(null);
                      }}
                      placeholder="my-deal"
                      autoFocus
                      aria-label="Custom slug"
                      aria-describedby={slugError ? 'slug-error' : undefined}
                      className="flex-1 bg-transparent py-5 px-3 text-xl outline-none font-semibold border-none text-[#1b1b1b] placeholder-slate-500"
                    />
                  </div>
                  <div className="min-h-[32px] mt-1 space-y-1">
                    {slugError && <p id="slug-error" className="text-red-500 text-sm" role="alert">{slugError}</p>}
                    {!slugError && validating && (
                      <p className="text-[#1b1b1b] text-xs flex items-center gap-2" role="status">
                        <span className="material-symbols-outlined animate-spin text-sm" aria-hidden="true">
                          refresh
                        </span>
                        Checking availability...
                      </p>
                    )}
                  </div>
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
                          aria-pressed={isSelected}
                          className={`p-4 rounded-xl border-2 font-bold transition-all ${
                            isSelected
                              ? 'border-[#a855f7] bg-[#a855f7]/5 shadow-[0_0_20px_rgba(255,16,240,0.2)] text-[#1b1b1b]'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-[#324467]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  {formData.botAction === 'redirect' && (
                    <div className="pt-2">
                      <label htmlFor="bot-fallback-url" className="text-xs text-gray-500 mb-2 uppercase font-bold tracking-widest block">
                        Redirect Bots to
                      </label>
                      <div className="rounded-xl bg-white border-2 border-slate-200 focus-within:border-[#135bec] transition-all">
                        <input
                          id="bot-fallback-url"
                          ref={botFallbackUrlInputRef}
                          type="url"
                          value={formData.fallbackUrl || ''}
                          onChange={(e) => {
                            updateFormData('fallbackUrl', e.target.value.toLowerCase());
                            setFallbackUrlError(null);
                          }}
                          placeholder="https://google.com"
                          autoFocus
                          aria-describedby={fallbackUrlError ? 'fallback-url-error' : undefined}
                          className="w-full bg-transparent py-4 px-4 outline-none border-none text-[#1b1b1b] placeholder-slate-500"
                        />
                      </div>
                      <div className="min-h-[24px] mt-1">
                        {fallbackUrlError && (
                          <p id="fallback-url-error" className="text-red-500 text-sm" role="alert">{fallbackUrlError}</p>
                        )}
                      </div>
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
                          className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="bg-[#135bec]/20 text-[#135bec] px-2 py-1 rounded text-[10px] font-bold flex-shrink-0">
                              {getCountryName(rule.country)}
                            </span>
                            <button
                              type="button"
                              onClick={() => beginEditGeoRule(idx)}
                              className="text-left text-sm text-gray-500 truncate hover:text-[#135bec] underline-offset-2 hover:underline"
                            >
                              {rule.url}
                            </button>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => beginEditGeoRule(idx)}
                              className="text-slate-500 hover:text-[#135bec] p-1"
                              title="Edit rule"
                              aria-label={`Edit geo rule for ${getCountryName(rule.country)}`}
                            >
                              <span className="material-symbols-outlined text-lg" aria-hidden="true">edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeGeoRule(idx)}
                              className="text-red-500 hover:text-red-400 p-1"
                              title="Delete rule"
                              aria-label={`Delete geo rule for ${getCountryName(rule.country)}`}
                            >
                              <span className="material-symbols-outlined text-lg" aria-hidden="true">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!showGeoForm ? (
                    <button
                      type="button"
                      onClick={() => setShowGeoForm(true)}
                      className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 text-[#1b1b1b] hover:border-[#135bec] hover:text-[#1b1b1b] transition-all"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">add</span>
                      Add geo rule
                    </button>
                  ) : (
                    <div className="p-4 bg-white border-2 border-slate-200 rounded-2xl space-y-4">
                      <div>
                        <label htmlFor="geo-country" className="text-xs font-bold text-gray-500 uppercase block mb-2">
                          If Country is
                        </label>
                        <select
                          id="geo-country"
                          value={newGeoRule.country}
                          onChange={(e) =>
                            setNewGeoRule((r) => ({ ...r, country: e.target.value }))
                          }
                          aria-describedby={geoRuleErrors.country ? 'geo-country-error' : undefined}
                          className="w-full bg-white border border-slate-200 rounded-xl p-4 text-[#1b1b1b] outline-none focus:border-[#135bec]"
                        >
                          <option value="">Select...</option>
                          {countriesData.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <div className="min-h-[20px] mt-1">
                          {geoRuleErrors.country && (
                            <p id="geo-country-error" className="text-red-500 text-sm" role="alert">{geoRuleErrors.country}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <label htmlFor="geo-url" className="text-xs font-bold text-gray-500 uppercase block mb-2">
                          Then go to URL
                        </label>
                        <input
                          id="geo-url"
                          ref={geoThenUrlInputRef}
                          type="url"
                          value={newGeoRule.url}
                          onChange={(e) => setNewGeoRule((r) => ({ ...r, url: e.target.value.toLowerCase() }))}
                          placeholder="https://..."
                          autoFocus
                          aria-describedby={geoRuleErrors.url ? 'geo-url-error' : undefined}
                          className="w-full bg-white border border-slate-200 rounded-xl p-4 text-[#1b1b1b] outline-none focus:border-[#135bec]"
                        />
                        <div className="min-h-[20px] mt-1">
                          {geoRuleErrors.url && (
                            <p id="geo-url-error" className="text-red-500 text-sm" role="alert">{geoRuleErrors.url}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowGeoForm(false);
                            setEditingGeoIndex(null);
                            setNewGeoRule({ country: '', url: '' });
                            setGeoRuleErrors({ country: null, url: null });
                          }}
                          className="flex-1 py-3 rounded-xl font-bold bg-slate-200 text-[#1b1b1b]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={addGeoRule}
                          className="flex-1 py-3 rounded-xl font-bold bg-[#10b981] text-[#1b1b1b]"
                        >
                          {editingGeoIndex != null ? 'Update Rule' : 'Add Rule'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step: CAPI - list only when custom domain; otherwise show notice */}
              {currentStep.id === 'capi' && (
                <div className="flex flex-col min-h-0 flex-1">
                  {(formData.domain || 'glynk.to') === 'glynk.to' ? (
                    <p className="text-slate-600 text-[2rem] leading-relaxed">
                      CAPI is available only when using a custom domain.
                    </p>
                  ) : loadingPixels ? (
                    <p className="text-[#1b1b1b]">Loading CAPI...</p>
                  ) : availablePixels.length === 0 ? (
                    <p className="text-slate-500 text-sm">
                      No CAPI profiles yet. Add one in CAPI Manager.
                    </p>
                  ) : (
                    <div
                      className="space-y-3 overflow-y-auto pr-2 min-h-0 flex-1 max-h-[calc(100vh-280px)]"
                      style={{ minHeight: '200px' }}
                    >
                      {availablePixels.map((pixel) => {
                        // Support both plain UUID strings and stored pixel objects
                        const isSelected = (formData.selectedPixels || []).some(
                          (item) => (typeof item === 'string' ? item : item?.id) === pixel.id
                        );
                        const name = PLATFORM_NAMES[pixel.platform] || pixel.platform;
                        return (
                          <button
                            key={pixel.id}
                            type="button"
                            onClick={() => togglePixel(pixel.id)}
                            aria-pressed={isSelected}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                              isSelected
                                ? 'border-[#a855f7] bg-[#a855f7]/5'
                                : 'border-slate-200 bg-white hover:border-[#324467]'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div aria-hidden="true">{getPlatformLogo(pixel.platform)}</div>
                              <div className="text-left">
                                <div className="font-bold text-[#1b1b1b]">{pixel.name}</div>
                                <div className="text-[10px] text-gray-500 uppercase">{name}</div>
                              </div>
                            </div>
                            <div className={isSelected ? 'text-[#a855f7]' : 'text-gray-600'} aria-hidden="true">
                              <span className="material-symbols-outlined text-xl">
                                {isSelected ? 'check_circle' : 'circle'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
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
              <div className="w-20 h-20 bg-[#10b981]/20 text-[#10b981] rounded-full flex items-center justify-center mx-auto border-4 border-[#10b981]/10" aria-hidden="true">
                <span className="material-symbols-outlined text-4xl">check</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1b1b1b]">
                Final <span className="text-[#10b981]">Launch</span>
              </h1>
              <p className="text-gray-500 font-medium text-2xl">
                Review your GoodLink configuration below.
              </p>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 text-left">
                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                  <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                    Link Name
                  </span>
                  <span className="font-bold text-[#1b1b1b]">{formData.name || '—'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                  <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                    Short Link
                  </span>
                  <span className="font-bold text-[#a855f7] break-all">
                    https://{selectedDomain}/{formData.slug || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                  <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                    Destination
                  </span>
                  <span
                    className="text-xs text-gray-500 truncate max-w-[180px]"
                    title={formData.targetUrl}
                  >
                    {formData.targetUrl || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                  <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                    Access Mode
                  </span>
                  <span className="font-bold text-[#1b1b1b] text-xs uppercase">
                    {(formData.accessMode || 'direct') === 'controlled'
                      ? 'Access Control & Limits'
                      : 'Direct Access'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                  <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                    Bot Action
                  </span>
                  <span className="font-bold text-yellow-700 text-xs uppercase">
                    {formData.botAction === 'redirect'
                      ? 'Redirect'
                      : formData.botAction === 'block'
                        ? 'Block'
                        : 'Allow'}
                  </span>
                </div>
                {(formData.accessMode || 'direct') === 'controlled' && (
                  <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                    <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                      Access Rules
                    </span>
                    <span className="font-bold text-[#135bec] text-xs text-right max-w-[180px]">
                      {[
                        formData.enablePasswordProtection ? 'Password' : null,
                        formData.enableClickLimit ? 'Click Limit' : null,
                        formData.enableTimeLimit ? 'Time Limit' : null,
                      ]
                        .filter(Boolean)
                        .join(' + ') || 'None'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                  <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                    Geo Rules
                  </span>
                  <span className="font-bold text-orange-700 text-xs">
                    {(formData.geoRules || []).length} rule(s)
                  </span>
                </div>
                <div className="flex justify-between items-center pb-1">
                  <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                    Tracking
                  </span>
                  <span className="font-bold text-purple-700 text-xs text-right max-w-[180px]">
                    {(formData.selectedPixels || []).length
                      ? `${formData.selectedPixels.length} CAPI profile(s)`
                      : 'None'}
                  </span>
                </div>

                {/* QR Code (qrserver.com) */}
                {formData.slug && (
                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest block mb-3">
                      QR Code
                    </span>
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&bgcolor=FFFFFF&data=${encodeURIComponent(`https://${selectedDomain}/${formData.slug}`)}`}
                        alt={`QR Code for https://${selectedDomain}/${formData.slug}`}
                        className="w-[180px] h-[180px] rounded-xl border border-slate-200 bg-white p-2"
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur border-t border-slate-200 z-50">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            type="button"
            onClick={goBack}
            aria-label="Previous step"
            className={`flex items-center justify-center p-5 rounded-2xl border border-slate-200 font-bold text-gray-400 hover:bg-slate-200 hover:text-[#1b1b1b] transition-all active:scale-90 ${
              isFirst ? 'invisible' : ''
            }`}
          >
            <span className="material-symbols-outlined text-2xl" aria-hidden="true">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={validating || urlSafety.loading || (isLast && isSubmitting)}
            className="flex-1 flex items-center justify-center gap-3 py-5 rounded-2xl font-extrabold text-xl tracking-tight transition-all active:scale-[0.98] shadow-xl bg-[#a855f7] hover:bg-[#9333ea] text-white disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLast && isSubmitting ? (
              <>
                <span className="material-symbols-outlined text-2xl animate-spin" aria-hidden="true">refresh</span>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>{isLast ? 'Complete Setup' : 'Next Step'}</span>
                <span className="material-symbols-outlined text-2xl" aria-hidden="true">
                  {isLast ? 'rocket_launch' : 'arrow_forward'}
                </span>
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPixelIdLabel, validateCapiToken, validatePixelId } from '../../lib/pixelValidation';
import { checkForMaliciousInput } from '../../lib/inputSanitization';
import taboolaLogo from '../../assets/idRS-vCmxj_1769618141092.svg';
import outbrainLogo from '../../assets/id-bNajMAc_1769618145922.svg';

const getPlatformLogo = (platform) => {
  const w = 'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0';
  switch (platform) {
    case 'meta':
      return (
        <div className={`${w} bg-[#1877F2]`}>
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="white"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </div>
      );
    case 'instagram':
      return (
        <div
          className={`${w} overflow-hidden bg-gradient-to-br from-[#f9ed32] via-[#ee2a7b] to-[#6228d7] p-0.5`}
        >
          <div className="w-full h-full rounded-[6px] bg-slate-900 flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="white"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          </div>
        </div>
      );
    case 'google':
      return (
        <div className={`${w} bg-white`}>
          <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
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
    case 'tiktok':
      return (
        <div className={`${w} bg-black`}>
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="white"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
          </svg>
        </div>
      );
    case 'taboola':
      return (
        <div className={`${w} overflow-hidden border border-[#232f48]`}>
          <img src={taboolaLogo} alt="Taboola" className="w-full h-full object-cover" />
        </div>
      );
    case 'outbrain':
      return (
        <div className={`${w} overflow-hidden border border-[#232f48]`}>
          <img src={outbrainLogo} alt="Outbrain" className="w-full h-full object-cover" />
        </div>
      );
    case 'snapchat':
      return (
        <div className={`${w} bg-[#FFFC00]`}>
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="black"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 2.979c-2.32 0-4.085 1.705-4.085 4.084 0 .393.048.775.14 1.144-.816.143-1.632.39-2.222.95-.29.274-.467.575-.544.896-.062.257-.04.516.066.764.123.284.348.513.626.657.34.175.71.258 1.05.28l.19.012c.07.004.143.007.222.01l.013.25c.012.247.025.513.04.79v.117c0 .633.435.986.974 1.15.54.164 1.25.164 1.83.164.083 0 .167 0 .252-.002l.144 1.15c.08.647.284.974.606 1.15.32.176.716.216 1.08.216h1.22c.365 0 .76-.04 1.08-.216.32-.176.526-.503.606-1.15l.144-1.15c.085.002.169.002.252.002.58 0 1.29 0 1.83-.164.54-.164.975-.517.975-1.15v-.117c.015-.277.026-.543.04-.79l.012-.25c.08-.003.153-.006.223-.01l.19-.012c.34-.022.71-.105 1.05-.28.278-.144.503-.373.626-.657.106-.248.128-.507.066-.764-.077-.321-.254-.622-.544-.896-.59-.56-1.406-.807-2.222-.95.093-.369.14-.75.14-1.144 0-2.379-1.765-4.084-4.085-4.084z" />
          </svg>
        </div>
      );
    default:
      return (
        <div className={`${w} bg-[#232f48]`}>
          <span className="text-slate-400 text-xs">?</span>
        </div>
      );
  }
};

const PLATFORMS = [
  { value: 'meta', label: 'Facebook', placeholder: 'Pixel ID (numbers only)' },
  { value: 'instagram', label: 'Instagram', placeholder: 'Pixel ID (numbers only)' },
  { value: 'tiktok', label: 'TikTok', placeholder: 'Pixel ID (A-Z, 0-9)' },
  { value: 'google', label: 'Google Ads', placeholder: 'Measurement_Id (e.g. G-77Y4B2X5Z1)' },
  { value: 'snapchat', label: 'Snapchat', placeholder: 'UUID Pixel ID' },
  { value: 'outbrain', label: 'Outbrain', placeholder: 'Marketer ID (0-9, a-f)' },
  { value: 'taboola', label: 'Taboola', placeholder: 'Account ID (numbers only)' },
];

// getPixelIdLabel imported from ../../lib/pixelValidation

const getCapiTokenLabel = (platform) => {
  switch (platform) {
    case 'meta':
    case 'instagram':
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

const getCapiTokenPlaceholder = (platform) => {
  switch (platform) {
    case 'meta':
    case 'instagram':
      return 'Access Token';
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

const getEventTypeLabel = (platform) =>
  platform === 'taboola' ? 'Name' : platform === 'outbrain' ? 'Conversion Name' : 'Event Type';

const STANDARD_EVENTS = {
  meta: [
    { value: 'PageView', label: 'PageView (Default)' },
    { value: 'ViewContent', label: 'ViewContent' },
    { value: 'Lead', label: 'Lead' },
    { value: 'Contact', label: 'Contact' },
    { value: 'CompleteRegistration', label: 'CompleteRegistration' },
    { value: 'Search', label: 'Search' },
    { value: 'Donate', label: 'Donate' },
  ],
  instagram: [
    { value: 'PageView', label: 'PageView (Default)' },
    { value: 'ViewContent', label: 'ViewContent' },
    { value: 'Lead', label: 'Lead' },
    { value: 'Contact', label: 'Contact' },
    { value: 'CompleteRegistration', label: 'CompleteRegistration' },
    { value: 'Search', label: 'Search' },
    { value: 'Donate', label: 'Donate' },
  ],
  tiktok: [
    { value: 'PageView', label: 'PageView (Default)' },
    { value: 'ViewContent', label: 'ViewContent' },
    { value: 'ClickButton', label: 'ClickButton' },
    { value: 'Contact', label: 'Contact' },
    { value: 'CompleteRegistration', label: 'CompleteRegistration' },
    { value: 'Download', label: 'Download' },
    { value: 'SubmitForm', label: 'SubmitForm' },
  ],
  google: [
    { value: 'page_view', label: 'page_view (Default)' },
    { value: 'contact', label: 'contact' },
    { value: 'qualified_lead', label: 'qualified_lead' },
    { value: 'sign_up', label: 'sign_up' },
    { value: 'view_item', label: 'view_item' },
    { value: 'affiliate_click', label: 'affiliate_click' },
    { value: 'generate_lead', label: 'generate_lead' },
  ],
  snapchat: [
    { value: 'PAGE_VIEW', label: 'PAGE_VIEW (Default)' },
    { value: 'VIEW_CONTENT', label: 'VIEW_CONTENT' },
    { value: 'SIGN_UP', label: 'SIGN_UP' },
    { value: 'AD_CLICK', label: 'AD_CLICK' },
    { value: 'SAVE', label: 'SAVE' },
    { value: 'SEARCH', label: 'SEARCH' },
    { value: 'LIST_VIEW', label: 'LIST_VIEW' },
  ],
  outbrain: [
    { value: 'PAGE_VIEW', label: 'PAGE_VIEW (Default)' },
    { value: 'LEAD', label: 'LEAD' },
    { value: 'PURCHASE', label: 'PURCHASE' },
  ],
  taboola: [
    { value: 'page_view', label: 'page_view (Default)' },
    { value: 'lead', label: 'lead' },
    { value: 'purchase', label: 'purchase' },
  ],
};

const defaultEventForPlatform = (platform) => {
  if (platform === 'meta' || platform === 'tiktok') return 'PageView';
  if (platform === 'google' || platform === 'taboola') return 'page_view';
  if (platform === 'outbrain') return 'PAGE_VIEW';
  if (platform === 'snapchat') return 'PAGE_VIEW';
  return 'PageView';
};

const STEPS = [
  {
    id: 'name',
    badge: 'Start',
    badgeColor: 'text-[#10b981] bg-[#10b981]/10',
    title: 'Name your',
    highlight: 'CAPI',
    highlightClass: 'bg-gradient-to-r from-[#FF10F0] to-[#bc13fe] bg-clip-text text-transparent',
    subtitle: 'A friendly name for this CAPI profile.',
  },
  {
    id: 'platform',
    badge: 'Platform',
    badgeColor: 'text-[#135bec] bg-[#135bec]/10',
    title: 'Select',
    highlight: 'Company',
    highlightClass: 'bg-gradient-to-r from-[#135bec] to-[#42a5f5] bg-clip-text text-transparent',
    subtitle: 'Which ad platform is this CAPI profile for?',
  },
  {
    id: 'pixelId',
    badge: 'Tracking',
    badgeColor: 'text-blue-400 bg-blue-400/10',
    title: 'Enter',
    highlight: 'Pixel ID',
    highlightClass: 'bg-gradient-to-r from-[#135bec] to-[#42a5f5] bg-clip-text text-transparent',
    subtitle: 'The pixel or measurement ID from your ad platform.',
  },
  {
    id: 'capiToken',
    badge: 'CAPI',
    badgeColor: 'text-purple-500 bg-purple-500/10',
    title: 'CAPI',
    highlight: 'Token',
    highlightClass: 'text-purple-500',
    subtitle: 'Optional. For server-side events.',
  },
  {
    id: 'eventType',
    badge: 'Event',
    badgeColor: 'text-yellow-500 bg-yellow-500/10',
    title: 'Event',
    highlight: 'Type',
    highlightClass: 'text-yellow-500',
    subtitle: 'The conversion event to send.',
  },
];

export default function PixelWizardOnePerPage({ initialData, onSave, onBack, isEdit }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    platform: 'meta',
    pixelId: '',
    capiToken: '',
    eventType: 'PageView',
    customEventName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        platform: initialData.platform || 'meta',
        pixelId: initialData.pixelId || '',
        capiToken: initialData.capiToken || '',
        eventType: initialData.eventType || 'PageView',
        customEventName: initialData.customEventName || '',
      });
    }
  }, [initialData]);

  const totalSteps = STEPS.length;
  const currentStep = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;
  const progressPct = totalSteps ? ((stepIndex + 1) / totalSteps) * 100 : 0;
  const currentPlatform = PLATFORMS.find((p) => p.value === formData.platform);
  const availableEvents = STANDARD_EVENTS[formData.platform] || [];
  const goNext = async () => {
    const validateCurrentStep = () => {
      const nextErrors = {};
      if (currentStep?.id === 'name') {
        const name = formData.name?.trim() || '';
        if (!name) nextErrors.name = 'Friendly name is required.';
        else if (name.length > 100) nextErrors.name = 'Friendly name cannot exceed 100 characters.';
        else {
          const check = checkForMaliciousInput(name);
          if (!check.safe) nextErrors.name = check.error;
        }
      }
      if (currentStep?.id === 'pixelId') {
        const pixelId = formData.pixelId?.trim() || '';
        if (!pixelId) {
          nextErrors.pixelId = `${getPixelIdLabel(formData.platform)} is required.`;
        } else if (!validatePixelId(pixelId, formData.platform)) {
          nextErrors.pixelId = `Invalid ${getPixelIdLabel(formData.platform)} format for ${formData.platform}.`;
        }
      }
      if (currentStep?.id === 'capiToken') {
        const tokenCheck = validateCapiToken(formData.capiToken, formData.platform);
        if (!tokenCheck.isValid) nextErrors.capiToken = tokenCheck.error || 'Invalid token format.';
      }
      if (currentStep?.id === 'eventType') {
        if (
          (formData.platform === 'taboola' || formData.platform === 'outbrain') &&
          !formData.eventType?.trim()
        ) {
          nextErrors.eventType =
            formData.platform === 'taboola' ? 'Name is required.' : 'Conversion Name is required.';
        } else if (formData.eventType === 'custom') {
          if (!formData.customEventName?.trim()) {
            nextErrors.customEventName = 'Custom event name is required.';
          } else {
            const check = checkForMaliciousInput(formData.customEventName);
            if (!check.safe) nextErrors.customEventName = check.error;
          }
        }
      }
      setFieldErrors(nextErrors);
      return Object.keys(nextErrors).length === 0;
    };

    if (!validateCurrentStep()) return;

    if (isLast) {
      setError(null);
      setLoading(true);
      try {
        await onSave({
          name: formData.name.trim(),
          platform: formData.platform,
          pixelId:
            formData.platform === 'tiktok'
              ? formData.pixelId.trim().toUpperCase()
              : formData.pixelId.trim(),
          capiToken: formData.capiToken.trim() || null,
          eventType:
            formData.platform === 'taboola' || formData.platform === 'outbrain'
              ? formData.eventType.trim()
              : formData.eventType === 'custom'
                ? 'custom'
                : formData.eventType,
          customEventName:
            formData.platform === 'taboola' || formData.platform === 'outbrain'
              ? null
              : formData.eventType === 'custom'
                ? formData.customEventName.trim()
                : null,
        });
      } catch (e) {
        setError(e.message || 'Failed to save.');
        setLoading(false);
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
    } else if (onBack) onBack();
  };

  const setPlatform = (value) => {
    setFormData((prev) => ({
      ...prev,
      platform: value,
      eventType: defaultEventForPlatform(value),
      customEventName: '',
    }));
    setFieldErrors((prev) => ({ ...prev, pixelId: null, capiToken: null, eventType: null }));
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="h-1 bg-[#232f48] flex-shrink-0">
        <div
          className="h-full bg-[#135bec] transition-all duration-500 shadow-[0_0_10px_#135bec]"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#135bec] opacity-[0.04] blur-[150px] pointer-events-none"
        aria-hidden="true"
      />
      <div className="flex-1 min-h-0 flex flex-col justify-center px-6 pb-32 pt-8 max-w-2xl mx-auto w-full relative z-10">
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep?.id}
            initial={{ opacity: 0, transform: 'translateY(10px)' }}
            animate={{ opacity: 1, transform: 'translateY(0)' }}
            exit={{ opacity: 0, transform: 'translateY(-10px)' }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center w-full">
                <div
                  className={`inline-flex items-center gap-2 font-bold text-[10px] tracking-[0.2em] uppercase px-3 py-1 rounded-full ${currentStep?.badgeColor}`}
                >
                  <span>{currentStep?.badge}</span>
                </div>
                <span className="text-[10px] font-black text-gray-500 tracking-widest">
                  {stepIndex + 1}/{totalSteps}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                {currentStep?.title}{' '}
                <span
                  className={
                    currentStep?.highlightClass ||
                    'bg-gradient-to-r from-[#FF10F0] to-[#bc13fe] bg-clip-text text-transparent'
                  }
                >
                  {currentStep?.highlight}
                </span>
              </h1>
              <p className="text-gray-400 font-medium text-sm">{currentStep?.subtitle}</p>
            </div>

            {currentStep?.id === 'name' && (
              <>
                <div className="rounded-2xl bg-[#101622] border-2 border-[#232f48] focus-within:border-[#135bec] transition-all">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, name: e.target.value }));
                      setFieldErrors((prev) => ({ ...prev, name: null }));
                    }}
                    placeholder="e.g. FB - Main Account"
                    className="w-full bg-transparent py-5 px-6 text-xl outline-none border-none text-white placeholder-slate-500"
                  />
                </div>
                {fieldErrors.name && <p className="text-red-400 text-xs">{fieldErrors.name}</p>}
              </>
            )}

            {currentStep?.id === 'platform' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPlatform(p.value)}
                    className={`p-5 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${
                      formData.platform === p.value
                        ? 'border-[#FF10F0] bg-[#FF10F0]/5'
                        : 'border-[#232f48] bg-[#101622] hover:border-[#324467]'
                    }`}
                  >
                    {getPlatformLogo(p.value)}
                    <span className="font-bold text-white">{p.label}</span>
                  </button>
                ))}
              </div>
            )}

            {currentStep?.id === 'pixelId' && (
              <div className="space-y-2">
                <div className="rounded-2xl bg-[#101622] border-2 border-[#232f48] focus-within:border-[#135bec] transition-all">
                  <input
                    type="text"
                    value={formData.pixelId}
                    onChange={(e) => {
                      setFormData((p) => ({
                        ...p,
                        pixelId:
                          formData.platform === 'tiktok'
                            ? e.target.value.toUpperCase()
                            : e.target.value,
                      }));
                      setFieldErrors((prev) => ({ ...prev, pixelId: null }));
                    }}
                    placeholder={currentPlatform?.placeholder}
                    className="w-full bg-transparent py-5 px-6 text-xl outline-none border-none text-white placeholder-slate-500 font-mono"
                  />
                </div>
                {fieldErrors.pixelId && (
                  <p className="text-red-400 text-xs">{fieldErrors.pixelId}</p>
                )}
                <p className="text-slate-500 text-xs">
                  {getPixelIdLabel(formData.platform)} • {currentPlatform?.placeholder}
                </p>
              </div>
            )}

            {currentStep?.id === 'capiToken' && (
              <div className="space-y-2">
                <div className="rounded-2xl bg-[#101622] border-2 border-[#232f48] focus-within:border-[#135bec] transition-all">
                  <textarea
                    value={formData.capiToken}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, capiToken: e.target.value }));
                      setFieldErrors((prev) => ({ ...prev, capiToken: null }));
                    }}
                    placeholder={getCapiTokenPlaceholder(formData.platform)}
                    rows={4}
                    className="w-full bg-transparent py-4 px-6 text-base outline-none border-none text-white placeholder-slate-500 font-mono resize-y"
                  />
                </div>
                {fieldErrors.capiToken && (
                  <p className="text-red-400 text-xs">{fieldErrors.capiToken}</p>
                )}
                <p className="text-slate-500 text-xs">
                  {getCapiTokenLabel(formData.platform)} (required)
                </p>
              </div>
            )}

            {currentStep?.id === 'eventType' && (
              <div className="space-y-4">
                {formData.platform === 'taboola' || formData.platform === 'outbrain' ? (
                  <>
                    <div className="rounded-2xl bg-[#101622] border-2 border-[#232f48] focus-within:border-[#135bec] transition-all">
                      <input
                        type="text"
                        value={formData.eventType}
                        onChange={(e) => {
                          setFormData((p) => ({ ...p, eventType: e.target.value }));
                          setFieldErrors((prev) => ({ ...prev, eventType: null }));
                        }}
                        placeholder={
                          formData.platform === 'taboola'
                            ? 'e.g. lead, purchase, page_view'
                            : 'e.g. arrival, lead, purchase'
                        }
                        className="w-full bg-transparent py-5 px-6 text-xl outline-none border-none text-white placeholder-slate-500"
                      />
                    </div>
                    {fieldErrors.eventType && (
                      <p className="text-red-400 text-xs">{fieldErrors.eventType}</p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="rounded-2xl bg-[#101622] border-2 border-[#232f48] focus-within:border-[#135bec] transition-all overflow-hidden">
                      <select
                        value={formData.eventType}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            eventType: e.target.value,
                            customEventName: e.target.value === 'custom' ? p.customEventName : '',
                          }))
                        }
                        className="w-full bg-transparent py-5 px-6 text-lg outline-none border-none text-white appearance-none cursor-pointer"
                      >
                        {availableEvents.map((ev) => (
                          <option
                            key={ev.value}
                            value={ev.value}
                            className="bg-[#101622] text-white"
                          >
                            {ev.label}
                          </option>
                        ))}
                        <option value="custom" className="bg-[#101622] text-white">
                          Custom Event
                        </option>
                      </select>
                    </div>
                    {formData.eventType === 'custom' && (
                      <div className="rounded-2xl bg-[#101622] border-2 border-[#232f48] focus-within:border-[#135bec] transition-all">
                        <input
                          type="text"
                          value={formData.customEventName}
                          onChange={(e) => {
                            setFormData((p) => ({ ...p, customEventName: e.target.value }));
                            setFieldErrors((prev) => ({ ...prev, customEventName: null }));
                          }}
                          placeholder="e.g. High_Quality_User"
                          className="w-full bg-transparent py-5 px-6 text-xl outline-none border-none text-white placeholder-slate-500"
                        />
                      </div>
                    )}
                    {fieldErrors.customEventName && (
                      <p className="text-red-400 text-xs">{fieldErrors.customEventName}</p>
                    )}
                  </>
                )}
                <p className="text-slate-500 text-xs">{getEventTypeLabel(formData.platform)}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-[#0b0f19]/95 backdrop-blur border-t border-[#232f48] z-50">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            type="button"
            onClick={goBack}
            className={`flex items-center justify-center p-5 rounded-2xl border border-[#232f48] font-bold text-gray-400 hover:bg-[#232f48] hover:text-white transition-all ${isFirst ? 'invisible' : ''}`}
          >
            <span className="material-symbols-outlined text-2xl">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-3 py-5 rounded-2xl font-extrabold text-xl tracking-tight transition-all bg-[#FF10F0] hover:bg-[#e00ed0] text-white disabled:opacity-60 disabled:cursor-not-allowed shadow-xl"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-2xl">refresh</span>
            ) : (
              <>
                <span>{isLast ? (isEdit ? 'Update CAPI' : 'Create CAPI') : 'Next Step'}</span>
                <span className="material-symbols-outlined text-2xl">
                  {isLast ? 'check_circle' : 'arrow_forward'}
                </span>
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}

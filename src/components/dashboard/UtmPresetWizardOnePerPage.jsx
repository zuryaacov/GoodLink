import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import taboolaLogo from '../../assets/idRS-vCmxj_1769618141092.svg';
import outbrainLogo from '../../assets/id-bNajMAc_1769618145922.svg';
import { sanitizeInput } from '../../lib/inputSanitization';

const getPlatformLogo = (platform) => {
  const w = 'w-12 h-12 rounded-xl';
  switch (platform) {
    case 'meta':
      return (
        <div className={`${w} bg-[#1877F2] flex items-center justify-center`}>
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
          className={`${w} flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#f9ed32] via-[#ee2a7b] to-[#6228d7] p-0.5`}
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
        <div className={`${w} bg-white flex items-center justify-center`}>
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
        <div className={`${w} bg-black flex items-center justify-center`}>
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
        <div
          className={`${w} flex items-center justify-center overflow-hidden border border-[#232f48]`}
        >
          <img src={taboolaLogo} alt="Taboola" className="w-full h-full object-cover" />
        </div>
      );
    case 'outbrain':
      return (
        <div
          className={`${w} flex items-center justify-center overflow-hidden border border-[#232f48]`}
        >
          <img src={outbrainLogo} alt="Outbrain" className="w-full h-full object-cover" />
        </div>
      );
    case 'snapchat':
      return (
        <div className={`${w} bg-[#FFFC00] flex items-center justify-center`}>
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
        <div className={`${w} bg-[#232f48] flex items-center justify-center`}>
          <span className="text-slate-400 text-xs">?</span>
        </div>
      );
  }
};

const PLATFORMS = [
  { id: 'meta', name: 'Meta (FB/IG)' },
  { id: 'google', name: 'Google Ads' },
  { id: 'tiktok', name: 'TikTok Ads' },
  { id: 'taboola', name: 'Taboola' },
  { id: 'outbrain', name: 'Outbrain' },
  { id: 'snapchat', name: 'Snapchat' },
];

const UTM_OPTIONS = {
  meta: {
    source: [
      'meta_ads',
      'audience_network',
      'whatsapp_ads',
      'messenger_ads',
      'instagram_ads',
      'facebook_ads',
      '{{site_source_name}}',
      'meta',
      'instagram',
      'facebook',
    ],
    medium: ['video', 'retargeting', 'cpm', 'cpc', 'paidsocial'],
    campaign: ['{{campaign.name}}', '{{campaign.id}}'],
    content: ['{{ad.name}}', '{{ad.id}}'],
    term: ['{{placement}}', '{{adset.name}}', '{{adset.id}}'],
  },
  google: {
    source: ['google'],
    medium: ['pmax', 'shopping', 'video', 'display', 'cpc'],
    campaign: ['{campaignname}', '{campaignid}'],
    content: ['{adid}', '{creative}', '{adgroupname}', '{adgroupid}'],
    term: [
      '{loc_physical_ms}',
      '{targetid}',
      '{placement}',
      '{searchterm}',
      '{matchtype}',
      '{keyword}',
    ],
  },
  tiktok: {
    source: ['tiktok'],
    medium: ['cpv', 'cpm', 'cpc', 'paidsocial'],
    campaign: ['__CAMPAIGN_ID__', '__CAMPAIGN_NAME__'],
    content: ['__CID__', '__CID_NAME__'],
    term: ['__PLACEMENT__', '__AID_NAME__', '__QUERY__', '__KEYWORD__'],
  },
  taboola: {
    source: ['taboola'],
    medium: ['content', 'video', 'paid', 'display', 'discovery', 'cpc', 'native'],
    campaign: ['{campaign_id}', '{campaign_name}'],
    content: ['{thumbnail_id}', '{creative_id}', '{ad_title}', '{content_item_title}'],
    term: ['{section_id}', '{site_id}', '{site}'],
  },
  outbrain: {
    source: ['outbrain_paid', 'Outbrain'],
    medium: ['content', 'video', 'paidsocial', 'paid', 'discovery', 'cpc', 'native'],
    campaign: ['{{campaign_id}}', '{{campaign_name}}'],
    content: ['{{promoted_link_id}}', '{{ad_title}}', '{{ad_id}}'],
    term: ['{{publisher_name}}', '{{section_id}}', '{{section_name}}'],
  },
  snapchat: {
    source: ['snapchat'],
    medium: ['video', 'display', 'social', 'paidsocial'],
    campaign: ['{{campaign.id}}', '{{campaign.name}}'],
    content: ['{{ad.id}}', '{{ad.name}}'],
    term: ['{{adgroup.id}}', '{{adgroup.name}}'],
  },
};

const UTM_STEPS = [
  {
    id: 'source',
    label: 'Source',
    key: 'utm_source',
    highlightClass: 'bg-gradient-to-r from-[#135bec] to-[#42a5f5] bg-clip-text text-transparent',
  },
  { id: 'medium', label: 'Medium', key: 'utm_medium', highlightClass: 'text-purple-400' },
  { id: 'campaign', label: 'Campaign', key: 'utm_campaign', highlightClass: 'text-yellow-500' },
  { id: 'content', label: 'Content', key: 'utm_content', highlightClass: 'text-emerald-400' },
  { id: 'term', label: 'Term', key: 'utm_term', highlightClass: 'text-orange-500' },
];

const PARAM_COLORS = {
  utm_source: 'text-blue-400',
  utm_medium: 'text-purple-400',
  utm_campaign: 'text-yellow-400',
  utm_content: 'text-emerald-400',
  utm_term: 'text-orange-400',
};

const STEPS = [
  {
    id: 'name',
    badge: 'Start',
    badgeColor: 'text-[#10b981] bg-[#10b981]/10',
    title: 'Name your',
    highlight: 'Preset',
    highlightClass: 'bg-gradient-to-r from-[#FF10F0] to-[#bc13fe] bg-clip-text text-transparent',
    subtitle: 'Internal name for this UTM preset.',
  },
  {
    id: 'platform',
    badge: 'Platform',
    badgeColor: 'text-[#135bec] bg-[#135bec]/10',
    title: 'Select',
    highlight: 'Company',
    highlightClass: 'bg-gradient-to-r from-[#135bec] to-[#42a5f5] bg-clip-text text-transparent',
    subtitle: 'Which ad platform is this preset for?',
  },
  {
    id: 'source',
    badge: 'UTM',
    badgeColor: 'text-blue-400 bg-blue-400/10',
    title: 'Select',
    highlight: 'Source',
    highlightClass: 'bg-gradient-to-r from-[#135bec] to-[#42a5f5] bg-clip-text text-transparent',
    subtitle: 'Where the traffic comes from.',
  },
  {
    id: 'medium',
    badge: 'UTM',
    badgeColor: 'text-purple-400 bg-purple-400/10',
    title: 'Select',
    highlight: 'Medium',
    highlightClass: 'text-purple-400',
    subtitle: 'Marketing medium (e.g. cpc, email).',
  },
  {
    id: 'campaign',
    badge: 'UTM',
    badgeColor: 'text-yellow-500 bg-yellow-500/10',
    title: 'Select',
    highlight: 'Campaign',
    highlightClass: 'text-yellow-500',
    subtitle: 'Campaign name or dynamic value.',
  },
  {
    id: 'content',
    badge: 'UTM',
    badgeColor: 'text-emerald-400 bg-emerald-400/10',
    title: 'Select',
    highlight: 'Content',
    highlightClass: 'text-emerald-400',
    subtitle: 'Ad content or variation.',
  },
  {
    id: 'term',
    badge: 'UTM',
    badgeColor: 'text-orange-500 bg-orange-500/10',
    title: 'Select',
    highlight: 'Term',
    highlightClass: 'text-orange-500',
    subtitle: 'Paid search keyword or term.',
  },
];

function buildPreviewFromParams(params) {
  const entries = Object.entries(params).filter(([, v]) => v);
  if (entries.length === 0) return null;
  return entries.map(([k, v]) => `${k}=${v}`).join('&');
}

export default function UtmPresetWizardOnePerPage({ initialData, onSave, onBack, isEdit }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [presetName, setPresetName] = useState('');
  const [platform, setPlatform] = useState('meta');
  const [params, setParams] = useState({
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_content: '',
    utm_term: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setPresetName(initialData.name || '');
      setPlatform(initialData.platform || 'meta');
      setParams({
        utm_source: initialData.utm_source || '',
        utm_medium: initialData.utm_medium || '',
        utm_campaign: initialData.utm_campaign || '',
        utm_content: initialData.utm_content || '',
        utm_term: initialData.utm_term || '',
      });
    }
  }, [initialData]);

  const totalSteps = STEPS.length;
  const currentStep = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;
  const progressPct = totalSteps ? ((stepIndex + 1) / totalSteps) * 100 : 0;
  const platformOptions = UTM_OPTIONS[platform] || {};
  const previewQuery = buildPreviewFromParams(params);

  const handleChipClick = (utmKey, value) => {
    const current = params[utmKey];
    setParams((prev) => ({ ...prev, [utmKey]: current === value ? '' : value }));
    setFieldErrors((prev) => ({ ...prev, [utmKey]: null }));
  };

  const goNext = async () => {
    const validateCurrentStep = () => {
      const nextErrors = {};
      if (currentStep?.id === 'name') {
        const name = (presetName || '').trim();
        if (!name) {
          nextErrors.name = 'Preset name is required.';
        } else if (name.length > 100) {
          nextErrors.name = 'Preset name cannot exceed 100 characters.';
        } else {
          const check = sanitizeInput(name);
          if (!check.safe) nextErrors.name = check.error || 'Invalid preset name.';
        }
      }
      if (currentStep?.id && UTM_STEPS.some((s) => s.id === currentStep.id)) {
        const utmStep = UTM_STEPS.find((s) => s.id === currentStep.id);
        const value = params[utmStep.key];
        if (value) {
          if (value.length > 250) {
            nextErrors[utmStep.key] = `${utmStep.label} cannot exceed 250 characters.`;
          } else {
            const check = sanitizeInput(value);
            if (!check.safe) nextErrors[utmStep.key] = check.error || `Invalid ${utmStep.label}.`;
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
          name: presetName.trim(),
          platform,
          utm_source: params.utm_source || null,
          utm_medium: params.utm_medium || null,
          utm_campaign: params.utm_campaign || null,
          utm_content: params.utm_content || null,
          utm_term: params.utm_term || null,
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

  const PreviewBlock = () => (
    <div className="mt-6 rounded-2xl bg-[#101622] border border-[#232f48] p-4">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
        Preview Query String
      </p>
      <div className="font-mono text-sm break-all text-slate-300" dir="ltr">
        {previewQuery ? (
          <>
            <span className="text-slate-500">? </span>
            {Object.entries(params).map(([key, value]) => {
              if (!value) return null;
              const filtered = Object.entries(params).filter(([, v]) => v);
              const idx = filtered.findIndex(([k]) => k === key);
              return (
                <span key={key}>
                  <span className={PARAM_COLORS[key] || 'text-slate-300'}>
                    {key}=
                    <span
                      className={value.includes('{') || value.includes('__') ? 'underline' : ''}
                    >
                      {value}
                    </span>
                  </span>
                  {idx < filtered.length - 1 && <span className="text-slate-600 mx-1">&</span>}
                </span>
              );
            })}
          </>
        ) : (
          <span className="text-slate-500">Select options above to build the query string.</span>
        )}
      </div>
    </div>
  );

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
                    value={presetName}
                    onChange={(e) => {
                      setPresetName(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, name: null }));
                    }}
                    placeholder="e.g. Summer Campaign Meta"
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
                    key={p.id}
                    type="button"
                    onClick={() => setPlatform(p.id)}
                    className={`p-5 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${
                      platform === p.id
                        ? 'border-[#FF10F0] bg-[#FF10F0]/5'
                        : 'border-[#232f48] bg-[#101622] hover:border-[#324467]'
                    }`}
                  >
                    {getPlatformLogo(p.id)}
                    <span className="font-bold text-white">{p.name}</span>
                  </button>
                ))}
              </div>
            )}

            {UTM_STEPS.map(
              (utmStep) =>
                currentStep?.id === utmStep.id &&
                (() => {
                  const options = platformOptions[utmStep.id] || [];
                  const value = params[utmStep.key];
                  return (
                    <div key={utmStep.id}>
                      <div className="flex flex-wrap gap-2">
                        {options.map((option) => {
                          const isSelected = value === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => handleChipClick(utmStep.key, option)}
                              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                                isSelected
                                  ? 'border-[#FF10F0] bg-[#FF10F0]/10 text-white'
                                  : 'border-[#232f48] bg-[#101622] text-slate-300 hover:border-[#324467]'
                              }`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                      <PreviewBlock />
                      {fieldErrors[utmStep.key] && (
                        <p className="text-red-400 text-xs mt-2">{fieldErrors[utmStep.key]}</p>
                      )}
                    </div>
                  );
                })()
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
                <span>{isLast ? (isEdit ? 'Update Preset' : 'Create Preset') : 'Next Step'}</span>
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

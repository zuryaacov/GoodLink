import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../../lib/supabase';
import outbrainLogo from '../../../assets/id-bNajMAc_1769618145922.svg';
import taboolaLogo from '../../../assets/idRS-vCmxj_1769618141092.svg';

const PLATFORMS = {
  meta: { name: 'Facebook', colorClass: 'text-blue-400 bg-blue-400/10' },
  instagram: { name: 'Instagram', colorClass: 'text-pink-400 bg-pink-400/10' },
  google: { name: 'Google Ads', colorClass: 'text-emerald-400 bg-emerald-400/10' },
  tiktok: { name: 'TikTok Ads', colorClass: 'text-pink-400 bg-pink-400/10' },
  taboola: { name: 'Taboola', colorClass: 'text-orange-400 bg-orange-400/10' },
  outbrain: { name: 'Outbrain', colorClass: 'text-indigo-400 bg-indigo-400/10' },
  snapchat: { name: 'Snapchat', colorClass: 'text-yellow-400 bg-yellow-400/10' },
};

const Step2Optimization = ({ formData, updateFormData }) => {
  const [availablePixels, setAvailablePixels] = useState([]);
  const [loadingPixels, setLoadingPixels] = useState(false);
  const [availablePresets, setAvailablePresets] = useState([]);
  const [loadingPresets, setLoadingPresets] = useState(false);

  useEffect(() => {
    const fetchPixels = async () => {
      setLoadingPixels(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          // Fetch active pixels from pixels table
          const { data, error } = await supabase
            .from('pixels')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active') // Only fetch active pixels
            .order('created_at', { ascending: false });

          if (error) throw error;

          // Transform pixels data to match the expected format
          const transformedPixels = (data || []).map((pixel) => ({
            id: pixel.id,
            name: pixel.name,
            type: pixel.platform, // 'meta', 'tiktok', 'google', 'snapchat'
            platform: pixel.platform,
            pixel_id: pixel.pixel_id,
            event_type: pixel.event_type,
            custom_event_name: pixel.custom_event_name,
            isActive: pixel.is_active && pixel.status === 'active',
          }));

          setAvailablePixels(transformedPixels);
        }
      } catch (error) {
        console.error('Error fetching pixels:', error);
        setAvailablePixels([]);
      } finally {
        setLoadingPixels(false);
      }
    };

    const fetchPresets = async () => {
      setLoadingPresets(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          // Include active and pending (same as UTM Preset Manager / Select Domain)
          const { data, error } = await supabase
            .from('utm_presets')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

          if (error) throw error;
          setAvailablePresets(data || []);
        }
      } catch (error) {
        console.error('Error fetching UTM presets:', error);
        setAvailablePresets([]);
      } finally {
        setLoadingPresets(false);
      }
    };

    fetchPixels();
    fetchPresets();
  }, []);

  const handlePresetClick = (preset) => {
    const selectedPresets = formData.selectedUtmPresets || [];
    const isSelected = selectedPresets.includes(preset.id);

    if (isSelected) {
      // Remove preset from selection
      const newSelectedPresets = selectedPresets.filter((id) => id !== preset.id);
      updateFormData('selectedUtmPresets', newSelectedPresets);
    } else {
      // Add preset to selection
      const newSelectedPresets = [...selectedPresets, preset.id];
      updateFormData('selectedUtmPresets', newSelectedPresets);
    }
  };

  const togglePixel = (pixelId) => {
    const currentPixels = formData.selectedPixels || [];
    if (currentPixels.includes(pixelId)) {
      updateFormData(
        'selectedPixels',
        currentPixels.filter((id) => id !== pixelId)
      );
    } else {
      updateFormData('selectedPixels', [...currentPixels, pixelId]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white mb-2">Optimization & Marketing</h3>
        <p className="text-slate-400 text-sm">UTM & Pixels</p>
      </div>

      {/* UTM Presets - User's Custom Presets */}
      {false && availablePresets.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-white mb-4">UTM Presets</label>
          {loadingPresets ? (
            <div className="text-slate-400 text-sm">Loading presets...</div>
          ) : (
            <div className="space-y-3">
              {availablePresets.map((preset) => {
                const selectedPresets = formData.selectedUtmPresets || [];
                const isSelected = selectedPresets.includes(preset.id);
                const platformInfo = PLATFORMS[preset.platform] || {
                  name: preset.platform,
                  colorClass: 'text-slate-400 bg-slate-400/10',
                };

                return (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetClick(preset)}
                    className={`w-full relative p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-lg'
                        : 'border-[#232f48] bg-[#0b0f19] hover:border-[#324467]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isSelected
                            ? 'border-primary bg-primary'
                            : 'border-slate-500 bg-transparent'
                        }`}
                      >
                        {isSelected && (
                          <span className="material-symbols-outlined text-white text-sm">
                            check
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <div
                            className={`px-2 py-1 rounded-lg text-xs font-bold ${platformInfo.colorClass}`}
                          >
                            {platformInfo.name}
                          </div>
                          {preset.status === 'pending' && (
                            <span className="px-2 py-1 rounded-lg text-xs font-bold text-amber-400 bg-amber-400/10">
                              Pending
                            </span>
                          )}
                          <h4
                            className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-slate-300'}`}
                          >
                            {preset.name}
                          </h4>
                        </div>
                        {(preset.utm_source || preset.utm_medium || preset.utm_campaign) && (
                          <div className="space-y-1 text-xs font-mono text-slate-500">
                            {preset.utm_source && <div>utm_source={preset.utm_source}</div>}
                            {preset.utm_medium && <div>utm_medium={preset.utm_medium}</div>}
                            {preset.utm_campaign && <div>utm_campaign={preset.utm_campaign}</div>}
                            {preset.utm_content && <div>utm_content={preset.utm_content}</div>}
                            {preset.utm_term && <div>utm_term={preset.utm_term}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* How do you want to track conversions? - Hidden for now (CAPI only). Restore when Pixel option is reintroduced.
      {availablePixels.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-white mb-4">
            How do you want to track conversions?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {[
              { value: 'pixel', label: 'Pixel', desc: 'Client-side only' },
              { value: 'capi', label: 'CAPI', desc: 'Server-side only' },
              { value: 'pixel_and_capi', label: 'Pixel & CAPI', desc: 'Both' },
            ].map((opt) => {
              const isSelected = (formData.trackingMode || 'pixel') === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateFormData('trackingMode', opt.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-[#232f48] bg-[#0b0f19] hover:border-[#324467]'
                  }`}
                >
                  <p className="font-bold text-white">{opt.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
      */}

      {/* CAPI Selection with Liveness Indicator - Only show if pixels exist */}
      {availablePixels.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-white mb-4">CAPI Selection</label>
          {loadingPixels ? (
            <div className="text-slate-400 text-sm">Loading pixels...</div>
          ) : (
            <div className="space-y-3">
              {availablePixels.map((pixel) => {
                const isSelected = (formData.selectedPixels || []).includes(pixel.id);
                const getPlatformLogo = (platform) => {
                  switch (platform) {
                    case 'meta':
                      return (
                        <div className="w-8 h-8 rounded-lg bg-[#1877F2] flex items-center justify-center flex-shrink-0">
                          <svg
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            fill="white"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                        </div>
                      );
                    case 'instagram':
                      return (
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-gradient-to-br from-[#f9ed32] via-[#ee2a7b] to-[#6228d7] p-0.5">
                          <div className="w-full h-full rounded-[5px] bg-slate-900 flex items-center justify-center">
                            <svg
                              viewBox="0 0 24 24"
                              width="14"
                              height="14"
                              fill="white"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                            </svg>
                          </div>
                        </div>
                      );
                    case 'tiktok':
                      return (
                        <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center flex-shrink-0">
                          <svg
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            fill="white"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                          </svg>
                        </div>
                      );
                    case 'google':
                      return (
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                          <svg
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            xmlns="http://www.w3.org/2000/svg"
                          >
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
                        <div className="w-8 h-8 rounded-lg bg-[#FFFC00] flex items-center justify-center flex-shrink-0">
                          <svg
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            fill="black"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M12 2.979c-2.32 0-4.085 1.705-4.085 4.084 0 .393.048.775.14 1.144-.816.143-1.632.39-2.222.95-.29.274-.467.575-.544.896-.062.257-.04.516.066.764.123.284.348.513.626.657.34.175.71.258 1.05.28l.19.012c.07.004.143.007.222.01l.013.25c.012.247.025.513.04.79v.117c0 .633.435.986.974 1.15.54.164 1.25.164 1.83.164.083 0 .167 0 .252-.002l.144 1.15c.08.647.284.974.606 1.15.32.176.716.216 1.08.216h1.22c.365 0 .76-.04 1.08-.216.32-.176.526-.503.606-1.15l.144-1.15c.085.002.169.002.252.002.58 0 1.29 0 1.83-.164.54-.164.975-.517.975-1.15v-.117c.015-.277.026-.543.04-.79l.012-.25c.08-.003.153-.006.223-.01l.19-.012c.34-.022.71-.105 1.05-.28.278-.144.503-.373.626-.657.106-.248.128-.507.066-.764-.077-.321-.254-.622-.544-.896-.59-.56-1.406-.807-2.222-.95.093-.369.14-.75.14-1.144 0-2.379-1.765-4.084-4.085-4.084z" />
                          </svg>
                        </div>
                      );
                    case 'taboola':
                      return (
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-[#232f48]">
                          <img
                            src={taboolaLogo}
                            alt="Taboola"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      );
                    case 'outbrain':
                      return (
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-[#232f48]">
                          <img
                            src={outbrainLogo}
                            alt="Outbrain"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      );
                    default:
                      return (
                        <div className="w-8 h-8 rounded-lg bg-[#232f48] flex items-center justify-center flex-shrink-0">
                          <span className="text-slate-400 text-xs">?</span>
                        </div>
                      );
                  }
                };

                const getPlatformName = (platform) => {
                  switch (platform) {
                    case 'meta':
                      return 'Facebook';
                    case 'instagram':
                      return 'Instagram';
                    case 'tiktok':
                      return 'TikTok';
                    case 'google':
                      return 'Google Ads';
                    case 'snapchat':
                      return 'Snapchat';
                    case 'taboola':
                      return 'Taboola';
                    case 'outbrain':
                      return 'Outbrain';
                    default:
                      return platform;
                  }
                };

                return (
                  <button
                    key={pixel.id}
                    onClick={() => togglePixel(pixel.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-[#232f48] bg-[#0b0f19] hover:border-[#324467]'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'border-primary bg-primary' : 'border-slate-500'
                        }`}
                      >
                        {isSelected && (
                          <span className="material-symbols-outlined text-white text-sm">
                            check
                          </span>
                        )}
                      </div>
                      {getPlatformLogo(pixel.platform)}
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{pixel.name}</p>
                        <p className="text-slate-500 text-xs">{getPlatformName(pixel.platform)}</p>
                      </div>
                    </div>
                    {/* Liveness Indicator */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          pixel.isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-600'
                        }`}
                      />
                      <span className="text-xs text-slate-500">
                        {pixel.isActive ? 'Active' : 'Inactive'}
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
  );
};

export default Step2Optimization;

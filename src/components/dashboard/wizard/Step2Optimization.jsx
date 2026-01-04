import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../../lib/supabase';

const platformPresets = [
  {
    name: 'Facebook',
    icon: 'facebook',
    color: 'bg-blue-600',
    hoverColor: 'hover:bg-blue-700',
    borderColor: 'border-blue-500',
    utmSource: 'facebook',
    utmMedium: 'cpc',
    utmCampaign: '{{campaign.name}}',
  },
  {
    name: 'TikTok',
    icon: 'video_library',
    color: 'bg-black',
    hoverColor: 'hover:bg-gray-900',
    borderColor: 'border-gray-600',
    utmSource: 'tiktok',
    utmMedium: 'cpc',
    utmCampaign: '{{campaign.name}}',
  },
  {
    name: 'Google',
    icon: 'search',
    color: 'bg-blue-500',
    hoverColor: 'hover:bg-blue-600',
    borderColor: 'border-blue-400',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: '{{campaign.name}}',
  },
  {
    name: 'Taboola',
    icon: 'campaign',
    color: 'bg-purple-600',
    hoverColor: 'hover:bg-purple-700',
    borderColor: 'border-purple-500',
    utmSource: 'taboola',
    utmMedium: 'native',
    utmCampaign: '{{campaign.name}}',
  },
];

const Step2Optimization = ({ formData, updateFormData }) => {
  const [availablePixels, setAvailablePixels] = useState([]);
  const [loadingPixels, setLoadingPixels] = useState(false);

  useEffect(() => {
    const fetchPixels = async () => {
      setLoadingPixels(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // TODO: Fetch from pixels table when implemented
          // Mock data with "liveness" status
          setAvailablePixels([
            { id: '1', name: 'Facebook Pixel', type: 'facebook', isActive: true },
            { id: '2', name: 'TikTok Pixel', type: 'tiktok', isActive: true },
            { id: '3', name: 'Google Analytics', type: 'google', isActive: false },
          ]);
        }
      } catch (error) {
        console.error('Error fetching pixels:', error);
      } finally {
        setLoadingPixels(false);
      }
    };
    fetchPixels();
  }, []);

  const handlePlatformClick = (preset) => {
    const isActive = formData.platformPreset === preset.name;
    if (isActive) {
      // Deactivate
      updateFormData('platformPreset', null);
      updateFormData('utmSource', '');
      updateFormData('utmMedium', '');
      updateFormData('utmCampaign', '');
    } else {
      // Activate
      updateFormData('platformPreset', preset.name);
      updateFormData('utmSource', preset.utmSource);
      updateFormData('utmMedium', preset.utmMedium);
      updateFormData('utmCampaign', preset.utmCampaign);
    }
  };

  const togglePixel = (pixelId) => {
    const currentPixels = formData.selectedPixels || [];
    if (currentPixels.includes(pixelId)) {
      updateFormData('selectedPixels', currentPixels.filter(id => id !== pixelId));
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

      {/* UTM Presets - Large Colorful Logos */}
      <div>
        <label className="block text-sm font-medium text-white mb-4">
          UTM Presets <span className="text-slate-500">(One-Tap Setup)</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {platformPresets.map((preset) => {
            const isActive = formData.platformPreset === preset.name;
            return (
              <button
                key={preset.name}
                onClick={() => handlePlatformClick(preset)}
                className={`relative p-6 rounded-2xl border-2 transition-all transform ${
                  isActive
                    ? `${preset.color} ${preset.borderColor} border-2 scale-105 shadow-xl`
                    : 'bg-[#0b0f19] border-[#232f48] hover:border-[#324467]'
                }`}
              >
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-white text-sm">check</span>
                  </motion.div>
                )}
                <div className="flex flex-col items-center gap-3">
                  <span
                    className={`material-symbols-outlined text-4xl ${
                      isActive ? 'text-white' : 'text-slate-400'
                    }`}
                  >
                    {preset.icon}
                  </span>
                  <span
                    className={`font-bold text-sm ${
                      isActive ? 'text-white' : 'text-slate-300'
                    }`}
                  >
                    {preset.name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        {formData.platformPreset && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-[#0b0f19] border border-[#232f48] rounded-xl"
          >
            <p className="text-xs text-slate-500 mb-2">UTM Parameters (Auto-filled):</p>
            <div className="space-y-1 text-sm font-mono">
              {formData.utmSource && <p className="text-white">utm_source={formData.utmSource}</p>}
              {formData.utmMedium && <p className="text-white">utm_medium={formData.utmMedium}</p>}
              {formData.utmCampaign && <p className="text-white">utm_campaign={formData.utmCampaign}</p>}
            </div>
          </motion.div>
        )}
      </div>

      {/* Manual UTM Fields (if no preset selected) */}
      {!formData.platformPreset && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              UTM Source
            </label>
            <input
              type="text"
              value={formData.utmSource}
              onChange={(e) => updateFormData('utmSource', e.target.value)}
              placeholder="e.g., facebook, google, tiktok"
              className="w-full px-4 py-3 bg-[#0b0f19] border border-[#232f48] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              UTM Medium
            </label>
            <input
              type="text"
              value={formData.utmMedium}
              onChange={(e) => updateFormData('utmMedium', e.target.value)}
              placeholder="e.g., cpc, email, social"
              className="w-full px-4 py-3 bg-[#0b0f19] border border-[#232f48] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              UTM Campaign
            </label>
            <input
              type="text"
              value={formData.utmCampaign}
              onChange={(e) => updateFormData('utmCampaign', e.target.value)}
              placeholder="e.g., summer-sale-2024 or {{campaign.name}}"
              className="w-full px-4 py-3 bg-[#0b0f19] border border-[#232f48] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
      )}

      {/* Pixel Selection with Liveness Indicator */}
      <div>
        <label className="block text-sm font-medium text-white mb-4">
          Pixel Selection
        </label>
        {loadingPixels ? (
          <div className="text-slate-400 text-sm">Loading pixels...</div>
        ) : availablePixels.length === 0 ? (
          <div className="p-4 bg-[#0b0f19] border border-[#232f48] rounded-xl text-center">
            <p className="text-slate-400 text-sm mb-2">No pixels configured yet</p>
            <p className="text-slate-500 text-xs">Go to Pixels Manager to add tracking pixels</p>
          </div>
        ) : (
          <div className="space-y-3">
            {availablePixels.map((pixel) => {
              const isSelected = (formData.selectedPixels || []).includes(pixel.id);
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
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                      isSelected ? 'border-primary bg-primary' : 'border-slate-500'
                    }`}>
                      {isSelected && (
                        <span className="material-symbols-outlined text-white text-sm">check</span>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-white font-medium">{pixel.name}</p>
                      <p className="text-slate-500 text-xs capitalize">{pixel.type}</p>
                    </div>
                  </div>
                  {/* Liveness Indicator */}
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      pixel.isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-600'
                    }`} />
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

      {/* Server-Side Tracking (CAPI) - Gold/Neon Toggle */}
      <div className="p-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/30 rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-yellow-400">star</span>
              <label className="block text-base font-bold text-white">
                Server-Side Tracking (CAPI)
              </label>
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded">
                PREMIUM
              </span>
            </div>
            <p className="text-sm text-slate-300">
              Enable Conversion API for direct reporting to Facebook/TikTok servers (bypasses ad blockers)
            </p>
          </div>
          <button
            onClick={() => updateFormData('serverSideTracking', !formData.serverSideTracking)}
            className={`relative w-16 h-9 rounded-full transition-all flex-shrink-0 shadow-lg ${
              formData.serverSideTracking
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                : 'bg-[#232f48]'
            }`}
            aria-label="Toggle server-side tracking"
          >
            <span
              className={`absolute top-1 left-1 w-7 h-7 bg-white rounded-full transition-transform shadow-md ${
                formData.serverSideTracking ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Parameter Pass-through */}
      <div className="flex items-center justify-between p-4 bg-[#0b0f19] border border-[#232f48] rounded-xl">
        <div className="flex-1">
          <label className="block text-sm font-medium text-white mb-1">
            Parameter Pass-through
          </label>
          <p className="text-xs text-slate-500">
            Automatically forward all additional parameters (like ClickID) to the affiliate URL
          </p>
        </div>
        <button
          onClick={() => updateFormData('parameterPassThrough', !formData.parameterPassThrough)}
          className={`relative w-14 h-7 rounded-full transition-colors flex-shrink-0 ${
            formData.parameterPassThrough ? 'bg-primary' : 'bg-[#232f48]'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow-md ${
              formData.parameterPassThrough ? 'translate-x-7' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </motion.div>
  );
};

export default Step2Optimization;


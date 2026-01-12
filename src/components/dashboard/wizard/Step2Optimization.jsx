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
          // Fetch active pixels from pixels table
          const { data, error } = await supabase
            .from('pixels')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active') // Only fetch active pixels
            .order('created_at', { ascending: false });

          if (error) throw error;
          
          // Transform pixels data to match the expected format
          const transformedPixels = (data || []).map(pixel => ({
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

      {/* Pixel Selection with Liveness Indicator - Only show if pixels exist */}
      {availablePixels.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-white mb-4">
            Pixel Selection
          </label>
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
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="white" xmlns="http://www.w3.org/2000/svg">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                        </div>
                      );
                    case 'tiktok':
                      return (
                        <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center flex-shrink-0">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="white" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                          </svg>
                        </div>
                      );
                    case 'google':
                      return (
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                          <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                        </div>
                      );
                    case 'snapchat':
                      return (
                        <div className="w-8 h-8 rounded-lg bg-[#FFFC00] flex items-center justify-center flex-shrink-0">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="black" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.097.118.112.222.083.343-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.487.535 6.624 0 11.99-5.367 11.99-11.987C23.97 5.39 18.592.026 11.976.026L12.017 0z"/>
                          </svg>
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
                    case 'meta': return 'Meta (Facebook)';
                    case 'tiktok': return 'TikTok';
                    case 'google': return 'Google Ads';
                    case 'snapchat': return 'Snapchat';
                    default: return platform;
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
                      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-primary bg-primary' : 'border-slate-500'
                      }`}>
                        {isSelected && (
                          <span className="material-symbols-outlined text-white text-sm">check</span>
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
      )}

      {/* Server-Side Tracking (CAPI) - Gold/Neon Toggle - Only show if pixels exist */}
      {availablePixels.length > 0 && (
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
      )}

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


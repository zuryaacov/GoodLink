import React from 'react';
import { motion } from 'framer-motion';

const platformPresets = [
  {
    name: 'Facebook',
    icon: 'facebook',
    utmSource: 'facebook',
    utmMedium: 'cpc',
    utmCampaign: '{{campaign.name}}',
  },
  {
    name: 'TikTok',
    icon: 'video_library',
    utmSource: 'tiktok',
    utmMedium: 'cpc',
    utmCampaign: '{{campaign.name}}',
  },
  {
    name: 'Google',
    icon: 'search',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: '{{campaign.name}}',
  },
  {
    name: 'Taboola',
    icon: 'campaign',
    utmSource: 'taboola',
    utmMedium: 'native',
    utmCampaign: '{{campaign.name}}',
  },
];

const Step2UTMParameters = ({ formData, updateFormData }) => {
  const handlePlatformClick = (preset) => {
    updateFormData('platformPreset', preset.name);
    updateFormData('utmSource', preset.utmSource);
    updateFormData('utmMedium', preset.utmMedium);
    updateFormData('utmCampaign', preset.utmCampaign);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Step 2: UTM Parameters</h3>
        <p className="text-slate-400 text-sm">Create the marketing identity for your link</p>
      </div>

      {/* Platform Presets */}
      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Platform Presets <span className="text-slate-500">(Quick Setup)</span>
        </label>
        <div className="flex flex-wrap gap-3">
          {platformPresets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handlePlatformClick(preset)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
                formData.platformPreset === preset.name
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-[#232f48] bg-[#0b0f19] text-white hover:border-[#324467]'
              }`}
            >
              <span className="material-symbols-outlined">{preset.icon}</span>
              <span className="font-medium">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Manual Fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">UTM Source</label>
          <input
            type="text"
            value={formData.utmSource}
            onChange={(e) => updateFormData('utmSource', e.target.value)}
            placeholder="e.g., facebook, google, tiktok"
            className="w-full px-4 py-3 bg-[#0b0f19] border border-[#232f48] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">UTM Medium</label>
          <input
            type="text"
            value={formData.utmMedium}
            onChange={(e) => updateFormData('utmMedium', e.target.value)}
            placeholder="e.g., cpc, email, social"
            className="w-full px-4 py-3 bg-[#0b0f19] border border-[#232f48] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">UTM Campaign</label>
          <input
            type="text"
            value={formData.utmCampaign}
            onChange={(e) => updateFormData('utmCampaign', e.target.value)}
            placeholder="e.g., summer-sale-2024 or {{campaign.name}}"
            className="w-full px-4 py-3 bg-[#0b0f19] border border-[#232f48] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
          />
          <p className="text-xs text-slate-500 mt-1">
            Use dynamic placeholders like {'{{campaign.name}}'} for auto-replacement
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            UTM Content <span className="text-slate-500">(Optional)</span>
          </label>
          <input
            type="text"
            value={formData.utmContent}
            onChange={(e) => updateFormData('utmContent', e.target.value)}
            placeholder="e.g., ad-variant-1"
            className="w-full px-4 py-3 bg-[#0b0f19] border border-[#232f48] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Parameter Pass-through */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-[#0b0f19] border border-[#232f48] rounded-xl">
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
          className={`relative w-14 h-7 sm:w-12 sm:h-6 rounded-full transition-colors flex-shrink-0 ${
            formData.parameterPassThrough ? 'bg-primary' : 'bg-[#232f48]'
          }`}
          aria-label="Toggle parameter pass-through"
        >
          <span
            className={`absolute top-0.5 left-0.5 sm:top-1 sm:left-1 w-6 h-6 sm:w-4 sm:h-4 bg-white rounded-full transition-transform shadow-md ${
              formData.parameterPassThrough ? 'translate-x-7 sm:translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Preview */}
      {(formData.utmSource || formData.utmMedium || formData.utmCampaign) && (
        <div className="p-4 bg-[#0b0f19] border border-[#232f48] rounded-xl">
          <p className="text-xs text-slate-500 mb-2">UTM Preview:</p>
          <div className="space-y-1 text-sm font-mono">
            {formData.utmSource && <p className="text-white">utm_source={formData.utmSource}</p>}
            {formData.utmMedium && <p className="text-white">utm_medium={formData.utmMedium}</p>}
            {formData.utmCampaign && (
              <p className="text-white">utm_campaign={formData.utmCampaign}</p>
            )}
            {formData.utmContent && <p className="text-white">utm_content={formData.utmContent}</p>}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Step2UTMParameters;

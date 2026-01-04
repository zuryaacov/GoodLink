import React from 'react';
import { motion } from 'framer-motion';

const Step5Review = ({ formData, generateRandomSlug }) => {
  const baseUrl = formData.domain || 'goodlink.ai';
  const finalSlug = formData.slug || generateRandomSlug();
  const shortUrl = `https://${baseUrl}/${finalSlug}`;

  const buildUtmString = () => {
    const params = new URLSearchParams();
    if (formData.utmSource) params.append('utm_source', formData.utmSource);
    if (formData.utmMedium) params.append('utm_medium', formData.utmMedium);
    if (formData.utmCampaign) params.append('utm_campaign', formData.utmCampaign);
    if (formData.utmContent) params.append('utm_content', formData.utmContent);
    const queryString = params.toString();
    return queryString ? `${shortUrl}?${queryString}` : shortUrl;
  };

  const fullUtmString = buildUtmString();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Step 5: Review & Launch</h3>
        <p className="text-slate-400 text-sm">Review your link configuration before creating</p>
      </div>

      {/* Summary Card */}
      <div className="bg-[#0b0f19] border border-[#232f48] rounded-2xl p-6 space-y-6">
        {/* Core Details */}
        <div>
          <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Core Details</h4>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">Link Name</p>
              <p className="text-white font-medium">{formData.name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Target URL</p>
              <p className="text-white font-mono text-sm break-all">{formData.targetUrl || '—'}</p>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-1">Domain</p>
                <p className="text-white font-medium">{baseUrl}</p>
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-1">Slug</p>
                <p className="text-white font-mono text-sm">{finalSlug}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Short URL</p>
              <p className="text-primary font-mono text-sm break-all">{shortUrl}</p>
            </div>
          </div>
        </div>

        {/* UTM Parameters */}
        {(formData.utmSource || formData.utmMedium || formData.utmCampaign || formData.utmContent) && (
          <div className="border-t border-[#232f48] pt-6">
            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">UTM Parameters</h4>
            <div className="space-y-2">
              {formData.utmSource && (
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Source</span>
                  <span className="text-white text-sm font-mono">{formData.utmSource}</span>
                </div>
              )}
              {formData.utmMedium && (
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Medium</span>
                  <span className="text-white text-sm font-mono">{formData.utmMedium}</span>
                </div>
              )}
              {formData.utmCampaign && (
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Campaign</span>
                  <span className="text-white text-sm font-mono">{formData.utmCampaign}</span>
                </div>
              )}
              {formData.utmContent && (
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Content</span>
                  <span className="text-white text-sm font-mono">{formData.utmContent}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[#232f48]">
                <span className="text-slate-400 text-sm">Parameter Pass-through</span>
                <span className="text-white text-sm">{formData.parameterPassThrough ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tracking */}
        <div className="border-t border-[#232f48] pt-6">
          <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Tracking</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Pixels Selected</span>
              <span className="text-white text-sm">
                {formData.selectedPixels?.length > 0 ? `${formData.selectedPixels.length} pixel(s)` : 'None'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Server-Side Tracking (CAPI)</span>
              <span className="text-white text-sm">{formData.serverSideTracking ? 'Enabled' : 'Disabled'}</span>
            </div>
            {formData.customScript && (
              <div>
                <span className="text-slate-400 text-sm">Custom Script</span>
                <p className="text-white text-xs font-mono mt-1 bg-[#101622] p-2 rounded break-all">
                  {formData.customScript.substring(0, 100)}
                  {formData.customScript.length > 100 ? '...' : ''}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Security */}
        <div className="border-t border-[#232f48] pt-6">
          <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Security & Routing</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Fraud Shield</span>
              <span className="text-white text-sm capitalize">{formData.fraudShield}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Bot Action</span>
              <span className="text-white text-sm capitalize">{formData.botAction.replace('-', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Geo-Rules</span>
              <span className="text-white text-sm">
                {formData.geoRules?.length > 0 ? `${formData.geoRules.length} rule(s)` : 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Final URL Preview */}
        <div className="border-t border-[#232f48] pt-6">
          <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Final URL</h4>
          <div className="p-4 bg-[#101622] border border-primary/30 rounded-xl">
            <p className="text-xs text-slate-500 mb-2">Copy this URL for your ad platform:</p>
            <p className="text-primary font-mono text-sm break-all">{fullUtmString}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Step5Review;



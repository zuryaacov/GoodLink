import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../../lib/supabase';

const Step3Tracking = ({ formData, updateFormData }) => {
  const [availablePixels, setAvailablePixels] = useState([]);
  const [loadingPixels, setLoadingPixels] = useState(false);

  useEffect(() => {
    // Fetch user's pixels
    const fetchPixels = async () => {
      setLoadingPixels(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          // TODO: Fetch from pixels table when implemented
          // For now, use mock data
          setAvailablePixels([
            { id: '1', name: 'Facebook Pixel', type: 'facebook' },
            { id: '2', name: 'TikTok Pixel', type: 'tiktok' },
            { id: '3', name: 'Google Analytics', type: 'google' },
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
      className="space-y-6"
    >
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Step 3: Tracking & CAPI</h3>
        <p className="text-slate-400 text-sm">
          Configure tracking pixels and server-side reporting
        </p>
      </div>

      {/* Pixel Selection */}
      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Select Pixels <span className="text-slate-500">(Multi-select)</span>
        </label>
        {loadingPixels ? (
          <div className="text-slate-400 text-sm">Loading pixels...</div>
        ) : availablePixels.length === 0 ? (
          <div className="p-4 bg-[#0b0f19] border border-[#232f48] rounded-xl text-center">
            <p className="text-slate-400 text-sm mb-2">No pixels configured yet</p>
            <p className="text-slate-500 text-xs">Go to Pixels Manager to add tracking pixels</p>
          </div>
        ) : (
          <div className="space-y-2">
            {availablePixels.map((pixel) => {
              const isSelected = (formData.selectedPixels || []).includes(pixel.id);
              return (
                <button
                  key={pixel.id}
                  onClick={() => togglePixel(pixel.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-[#232f48] bg-[#0b0f19] hover:border-[#324467]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected ? 'border-primary bg-primary' : 'border-slate-500'
                      }`}
                    >
                      {isSelected && (
                        <span className="material-symbols-outlined text-white text-sm">check</span>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-white font-medium">{pixel.name}</p>
                      <p className="text-slate-500 text-xs capitalize">{pixel.type}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Server-Side Tracking */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-[#0b0f19] border border-[#232f48] rounded-xl">
        <div className="flex-1">
          <label className="block text-sm font-medium text-white mb-1">
            Server-Side Tracking (CAPI)
          </label>
          <p className="text-xs text-slate-500">
            Enable Conversion API for direct reporting to Facebook/TikTok servers (bypasses ad
            blockers)
          </p>
        </div>
        <button
          onClick={() => updateFormData('serverSideTracking', !formData.serverSideTracking)}
          className={`relative w-14 h-7 sm:w-12 sm:h-6 rounded-full transition-colors flex-shrink-0 ${
            formData.serverSideTracking ? 'bg-primary' : 'bg-[#232f48]'
          }`}
          aria-label="Toggle server-side tracking"
        >
          <span
            className={`absolute top-0.5 left-0.5 sm:top-1 sm:left-1 w-6 h-6 sm:w-4 sm:h-4 bg-white rounded-full transition-transform shadow-md ${
              formData.serverSideTracking ? 'translate-x-7 sm:translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Custom Script */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Custom Script <span className="text-slate-500">(Optional)</span>
        </label>
        <textarea
          value={formData.customScript}
          onChange={(e) => updateFormData('customScript', e.target.value)}
          placeholder="Add custom JavaScript code that will be injected on the redirect page..."
          rows={6}
          className="w-full px-4 py-3 bg-[#0b0f19] border border-[#232f48] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors resize-none font-mono text-sm"
        />
        <p className="text-xs text-slate-500 mt-1">
          This script will run on the intermediate redirect page before forwarding to the target URL
        </p>
      </div>
    </motion.div>
  );
};

export default Step3Tracking;

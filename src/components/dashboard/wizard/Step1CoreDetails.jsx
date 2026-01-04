import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../../lib/supabase';

const Step1CoreDetails = ({ formData, updateFormData, generateRandomSlug }) => {
  const [domains, setDomains] = useState(['goodlink.ai']); // Default domain
  const [loadingDomains, setLoadingDomains] = useState(false);

  useEffect(() => {
    // Fetch user's custom domains
    const fetchDomains = async () => {
      setLoadingDomains(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // TODO: Fetch from domains table when implemented
          // For now, just use default
          setDomains(['goodlink.ai']);
        }
      } catch (error) {
        console.error('Error fetching domains:', error);
      } finally {
        setLoadingDomains(false);
      }
    };
    fetchDomains();
  }, []);

  const handleMagicWand = () => {
    const randomSlug = generateRandomSlug();
    updateFormData('slug', randomSlug);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Step 1: Core Details</h3>
        <p className="text-slate-400 text-sm">Set up the basic information for your link</p>
      </div>

      {/* Link Name */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Link Name <span className="text-slate-500">(Internal use only)</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => updateFormData('name', e.target.value)}
          placeholder="e.g., iPhone Campaign January - Facebook"
          className="w-full px-4 py-3 bg-[#0b0f19] border border-[#232f48] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Target URL */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Target / Affiliate URL
        </label>
        <textarea
          value={formData.targetUrl}
          onChange={(e) => updateFormData('targetUrl', e.target.value)}
          placeholder="Paste your long affiliate URL here..."
          rows={3}
          className="w-full px-4 py-3 bg-[#0b0f19] border border-[#232f48] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors resize-none"
        />
      </div>

      {/* Domain Selector */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Domain
        </label>
        <select
          value={formData.domain || domains[0]}
          onChange={(e) => updateFormData('domain', e.target.value)}
          className="w-full px-4 py-3 bg-[#0b0f19] border border-[#232f48] rounded-xl text-white focus:outline-none focus:border-primary transition-colors"
        >
          {domains.map((domain) => (
            <option key={domain} value={domain}>
              {domain}
            </option>
          ))}
        </select>
      </div>

      {/* Slug */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Slug (URL Path)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => updateFormData('slug', e.target.value)}
            placeholder="e.g., iphone-deal"
            className="flex-1 px-4 py-3 bg-[#0b0f19] border border-[#232f48] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={handleMagicWand}
            className="px-4 py-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-xl transition-colors flex items-center gap-2 font-medium"
            title="Generate random secure slug"
          >
            <span className="material-symbols-outlined">auto_awesome</span>
            <span className="hidden sm:inline">Magic</span>
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Leave empty to auto-generate, or click Magic to generate a random slug
        </p>
      </div>

      {/* Preview */}
      {(formData.domain || domains[0]) && formData.slug && (
        <div className="p-4 bg-[#0b0f19] border border-[#232f48] rounded-xl">
          <p className="text-xs text-slate-500 mb-1">Preview:</p>
          <p className="text-primary font-mono text-sm break-all">
            https://{formData.domain || domains[0]}/{formData.slug}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default Step1CoreDetails;



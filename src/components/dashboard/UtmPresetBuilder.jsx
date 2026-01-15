import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, CheckCircle2, Zap } from 'lucide-react';
import { Facebook, Globe, Send, Layout, MousePointer2 } from 'lucide-react';

const PLATFORMS = {
  meta: {
    id: 'meta',
    name: "Meta (FB/IG)",
    icon: <Facebook size={24} />,
    color: "blue",
    presets: {
      utm_source: "{{site_source_name}}",
      utm_medium: "paidsocial",
      utm_campaign: "{{campaign.name}}",
      utm_content: "{{ad.name}}",
      utm_term: "{{adset.name}}"
    }
  },
  google: {
    id: 'google',
    name: "Google Ads",
    icon: <Globe size={24} />,
    color: "emerald",
    presets: {
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "{campaignid}",
      utm_content: "{adgroupid}",
      utm_term: "{keyword}"
    }
  },
  tiktok: {
    id: 'tiktok',
    name: "TikTok Ads",
    icon: <Send size={24} />,
    color: "pink",
    presets: {
      utm_source: "tiktok",
      utm_medium: "paidsocial",
      utm_campaign: "__CAMPAIGN_NAME__",
      utm_content: "__CID_NAME__",
      utm_term: "__AID_NAME__"
    }
  },
  taboola: {
    id: 'taboola',
    name: "Taboola",
    icon: <Layout size={24} />,
    color: "orange",
    presets: {
      utm_source: "taboola",
      utm_medium: "native",
      utm_campaign: "{campaign_name}",
      utm_content: "{content_item_title}",
      utm_term: "{site}"
    }
  },
  custom: {
    id: 'custom',
    name: "Custom",
    icon: <MousePointer2 size={24} />,
    color: "slate",
    presets: {
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      utm_content: "",
      utm_term: ""
    }
  }
};

const MEDIUM_OPTIONS = ["paidsocial", "cpc", "native", "display", "email"];

const PARAM_COLORS = {
  utm_source: "text-blue-400",
  utm_medium: "text-purple-400",
  utm_campaign: "text-yellow-400",
  utm_content: "text-emerald-400",
  utm_term: "text-orange-400"
};

const UtmPresetBuilder = ({ isOpen, onClose, editingPreset, links }) => {
  const [selectedPlatform, setSelectedPlatform] = useState('meta');
  const [presetName, setPresetName] = useState('');
  const [slug, setSlug] = useState('');
  const [params, setParams] = useState(PLATFORMS.meta.presets);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (editingPreset) {
      setPresetName(editingPreset.name || '');
      setSlug(editingPreset.slug || '');
      setSelectedPlatform(editingPreset.platform || 'meta');
      setParams({
        utm_source: editingPreset.utm_source || '',
        utm_medium: editingPreset.utm_medium || '',
        utm_campaign: editingPreset.utm_campaign || '',
        utm_content: editingPreset.utm_content || '',
        utm_term: editingPreset.utm_term || ''
      });
    } else {
      setPresetName('');
      setSlug('');
      setSelectedPlatform('meta');
      setParams(PLATFORMS.meta.presets);
    }
  }, [editingPreset, isOpen]);

  const handlePlatformChange = (platformId) => {
    setSelectedPlatform(platformId);
    setParams(PLATFORMS[platformId].presets);
  };

  const updateParam = (key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const buildUtmUrl = () => {
    const baseUrl = `https://glynk.to/${slug}`;
    const queryParams = Object.entries(params)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    return queryParams ? `${baseUrl}?${queryParams}` : baseUrl;
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!presetName.trim()) {
        setError('Preset name is required');
        return;
      }

      if (!slug.trim()) {
        setError('Slug is required');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

      // Check if slug exists in user's links
      const link = links.find(l => l.slug === slug);
      if (!link) {
        setError('Slug not found in your links');
        return;
      }

      const presetData = {
        name: presetName.trim(),
        platform: selectedPlatform,
        slug: slug.trim(),
        link_id: link.id,
        utm_source: params.utm_source || null,
        utm_medium: params.utm_medium || null,
        utm_campaign: params.utm_campaign || null,
        utm_content: params.utm_content || null,
        utm_term: params.utm_term || null,
      };

      if (editingPreset) {
        // Update existing preset
        const { error } = await supabase
          .from('utm_presets')
          .update(presetData)
          .eq('id', editingPreset.id);

        if (error) throw error;
      } else {
        // Create new preset
        const { error } = await supabase
          .from('utm_presets')
          .insert([{ ...presetData, user_id: user.id }]);

        if (error) throw error;
      }

      onClose();
    } catch (error) {
      console.error('Error saving preset:', error);
      setError(error.message || 'Failed to save preset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const fullUrl = buildUtmUrl();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {editingPreset ? 'Edit UTM Preset' : 'Create New UTM Preset'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl">
            {error}
          </div>
        )}

        <div className="space-y-8">
          {/* Preset Name and Slug */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Preset Name</label>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g., Summer Campaign Meta"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Link Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g., summer-promo"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-primary"
              />
              <p className="text-xs text-slate-500 mt-1">Must match an existing link slug</p>
            </div>
          </div>

          {/* Step 1: Platform Selection */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Select Platform</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.values(PLATFORMS).map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePlatformChange(p.id)}
                  className={`relative group flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    selectedPlatform === p.id
                      ? `border-primary bg-primary/10 text-white`
                      : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <div className={selectedPlatform === p.id ? "text-primary" : "text-slate-500"}>
                    {p.icon}
                  </div>
                  <span className="font-bold text-xs text-center">{p.name}</span>
                  {selectedPlatform === p.id && (
                    <div className="absolute -top-2 -right-2 bg-primary text-white rounded-full p-1">
                      <CheckCircle2 size={14} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: UTM Parameters */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">UTM Parameters</h3>
            </div>

            {/* Medium Selection (Chips) */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Medium</label>
              <div className="flex flex-wrap gap-2">
                {MEDIUM_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    onClick={() => updateParam('utm_medium', opt)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                      params.utm_medium === opt
                        ? "bg-primary text-white border-primary"
                        : "bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-500"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* UTM Parameters Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Source</label>
                <input
                  type="text"
                  value={params.utm_source}
                  onChange={(e) => updateParam('utm_source', e.target.value)}
                  placeholder="e.g., facebook, google"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Medium</label>
                <input
                  type="text"
                  value={params.utm_medium}
                  onChange={(e) => updateParam('utm_medium', e.target.value)}
                  placeholder="e.g., paidsocial, cpc"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Campaign</label>
                <div className="relative">
                  <input
                    type="text"
                    value={params.utm_campaign}
                    onChange={(e) => updateParam('utm_campaign', e.target.value)}
                    placeholder="e.g., {campaign.name}"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-primary"
                  />
                  {(params.utm_campaign.includes('{') || params.utm_campaign.includes('__')) && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-md text-[10px] font-bold">
                      <Zap size={10} />
                      DYNAMIC
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Content</label>
                <div className="relative">
                  <input
                    type="text"
                    value={params.utm_content}
                    onChange={(e) => updateParam('utm_content', e.target.value)}
                    placeholder="e.g., {ad.name}"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-primary"
                  />
                  {(params.utm_content.includes('{') || params.utm_content.includes('__')) && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md text-[10px] font-bold">
                      <Zap size={10} />
                      DYNAMIC
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Term</label>
                <input
                  type="text"
                  value={params.utm_term}
                  onChange={(e) => updateParam('utm_term', e.target.value)}
                  placeholder="e.g., {keyword}"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Preview URL */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Preview URL</h3>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
              <div className="font-mono text-sm break-all text-slate-300" dir="ltr">
                <span className="text-slate-500">https://glynk.to/</span>
                <span className="text-primary font-bold">{slug || 'your-slug'}</span>
                {Object.entries(params).some(([_, v]) => v) && <span className="text-slate-600">?</span>}
                {Object.entries(params).map(([key, value], index) => {
                  if (!value) return null;
                  return (
                    <span key={key} className="inline-block">
                      <span className={PARAM_COLORS[key] || "text-slate-300"}>
                        {key}
                        <span className="text-slate-600">=</span>
                        <span className={value.includes('{') || value.includes('__') ? "font-bold underline decoration-slate-600" : ""}>
                          {value}
                        </span>
                      </span>
                      {index < Object.entries(params).filter(([_, v]) => v).length - 1 && (
                        <span className="text-slate-600 mx-1">&</span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={handleSave}
              disabled={loading || !presetName.trim() || !slug.trim()}
              className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">refresh</span>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  {editingPreset ? 'Update Preset' : 'Create Preset'}
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UtmPresetBuilder;

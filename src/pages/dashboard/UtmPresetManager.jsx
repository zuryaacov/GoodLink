import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/common/Modal';
import { Copy, Trash2, Edit2 } from 'lucide-react';

const PLATFORMS = {
  meta: { name: 'Meta (FB/IG)', colorClass: 'text-blue-400 bg-blue-400/10' },
  google: { name: 'Google Ads', colorClass: 'text-emerald-400 bg-emerald-400/10' },
  tiktok: { name: 'TikTok Ads', colorClass: 'text-pink-400 bg-pink-400/10' },
  taboola: { name: 'Taboola', colorClass: 'text-orange-400 bg-orange-400/10' },
  outbrain: { name: 'Outbrain', colorClass: 'text-indigo-400 bg-indigo-400/10' },
  snapchat: { name: 'Snapchat', colorClass: 'text-yellow-400 bg-yellow-400/10' },
};

const UtmPresetManager = () => {
  const navigate = useNavigate();
  const [presets, setPresets] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [planType, setPlanType] = useState(null);

  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    onConfirm: null,
    isLoading: false,
  });

  useEffect(() => {
    fetchPlanAndPresets();
    fetchLinks();
  }, []);

  const fetchPlanAndPresets = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let currentPlanType = null;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan_type')
          .eq('user_id', user.id)
          .single();
        if (profile?.plan_type) {
          currentPlanType = profile.plan_type;
          setPlanType(profile.plan_type);
        }
      } catch (_) {}

      const normalized = (currentPlanType || '').toLowerCase();
      if (normalized === 'free' || normalized === 'start' || normalized === 'starter') {
        setPresets([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('utm_presets')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPresets(data || []);
    } catch (error) {
      console.error('Error fetching presets:', error);
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to load UTM presets. Please try again.',
        onConfirm: null,
        isLoading: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLinks = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('links')
        .select('id, slug, target_url')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Error fetching links:', error);
    }
  };

  const buildUtmQueryString = (preset, encode = false) => {
    const params = [];

    // For display: show raw values with {} brackets
    // For copy: use encodeURIComponent for proper URL encoding
    const encodeValue = (value) => (encode ? encodeURIComponent(value) : value);

    if (preset.utm_source) params.push(`utm_source=${encodeValue(preset.utm_source)}`);
    if (preset.utm_medium) params.push(`utm_medium=${encodeValue(preset.utm_medium)}`);
    if (preset.utm_campaign) params.push(`utm_campaign=${encodeValue(preset.utm_campaign)}`);
    if (preset.utm_content) params.push(`utm_content=${encodeValue(preset.utm_content)}`);
    if (preset.utm_term) params.push(`utm_term=${encodeValue(preset.utm_term)}`);

    return params.length > 0 ? params.join('&') : '';
  };

  const handleCopy = async (preset) => {
    try {
      // Don't encode - copy raw values with {} brackets (same as display)
      const queryString = buildUtmQueryString(preset, false);
      await navigator.clipboard.writeText(queryString);
      setCopiedId(preset.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDelete = (preset) => {
    setModalState({
      isOpen: true,
      type: 'confirm',
      title: 'Delete UTM Preset',
      message: `Are you sure you want to delete "${preset.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          setModalState((prev) => ({ ...prev, isLoading: true }));
          const { error } = await supabase
            .from('utm_presets')
            .update({ is_active: false })
            .eq('id', preset.id);

          if (error) throw error;
          await fetchPresets();
          setModalState({
            isOpen: false,
            type: 'alert',
            title: '',
            message: '',
            onConfirm: null,
            isLoading: false,
          });
        } catch (error) {
          console.error('Error deleting preset:', error);
          setModalState({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: 'Failed to delete preset. Please try again.',
            onConfirm: null,
            isLoading: false,
          });
        }
      },
      isLoading: false,
    });
  };

  const handleEdit = (preset) => {
    navigate(`/dashboard/utm-presets/edit/${preset.id}`);
  };

  const handleNewPreset = () => {
    navigate('/dashboard/utm-presets/new');
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-8 w-full h-full items-center justify-center">
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-4xl text-slate-600 animate-spin">
            refresh
          </span>
          <p className="text-slate-400 mt-4">Loading UTM presets...</p>
        </div>
      </div>
    );
  }

  const normalizedPlan = (planType || '').toLowerCase();
  if (normalizedPlan === 'free' || normalizedPlan === 'start' || normalizedPlan === 'starter') {
    return (
      <div className="relative min-h-[480px] w-full flex items-center justify-center p-6 overflow-hidden bg-[#0b0f19] rounded-2xl border border-dashed border-[#232f48]">
        <div className="absolute inset-0 opacity-[0.18] blur-[3px] pointer-events-none select-none p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="h-10 bg-[#141b2e] rounded-md w-1/3 mb-8" />
            <div className="grid grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 bg-[#141b2e] rounded-xl" />
              ))}
            </div>
            <div className="h-56 bg-[#141b2e] rounded-xl w-full" />
          </div>
        </div>
        <div className="relative z-10 max-w-xl w-full bg-[#101622]/90 backdrop-blur-xl border border-[#232f48] shadow-2xl rounded-3xl p-8 md:p-10 text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-[#FF10F0] blur-2xl opacity-25 animate-pulse" />
              <div className="relative bg-gradient-to-br from-[#FF10F0] to-[#7c3aed] p-4 rounded-2xl shadow-lg shadow-[#FF10F0]/40">
                <Lock className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight">
            Unlock UTM Presets
          </h2>
          <p className="text-sm md:text-base text-slate-300 mb-8 leading-relaxed">
            Your current&nbsp;
            <span className="font-semibold text-white italic capitalize">
              {normalizedPlan} plan
            </span>
            &nbsp;does not include UTM preset management. Upgrade to&nbsp;
            <span className="text-[#FF10F0] font-bold uppercase tracking-wider">
              ADVANCED
            </span> or{' '}
            <span className="text-[#FF10F0] font-bold uppercase tracking-wider">PRO</span> to create
            and manage UTM presets for your campaigns.
          </p>
          <button
            onClick={() => {
              window.location.href = '/#pricing';
            }}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#FF10F0] text-white font-bold py-3.5 px-8 rounded-2xl transition-all hover:bg-[#e00ed0] shadow-xl shadow-[#FF10F0]/30"
          >
            View Plans & Upgrade
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">UTM Presets</h1>
          <p className="text-slate-400">
            Create and manage UTM parameter presets for your campaigns
          </p>
        </div>
        <button
          onClick={handleNewPreset}
          className="px-6 py-3 bg-[#FF10F0] hover:bg-[#e00ed0] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#FF10F0]/20 flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          New UTM Preset
        </button>
      </div>

      {presets.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-600 mb-4">campaign</span>
          <h3 className="text-xl font-bold text-white mb-2">No UTM Presets Yet</h3>
          <p className="text-slate-400 mb-6">
            Create your first UTM preset to start tracking your campaigns
          </p>
          <button
            onClick={handleNewPreset}
            className="px-6 py-3 bg-[#FF10F0] hover:bg-[#e00ed0] text-white font-bold rounded-xl transition-all"
          >
            Create First Preset
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.map((preset) => {
            const platform = PLATFORMS[preset.platform] || {
              name: preset.platform,
              colorClass: 'text-slate-400 bg-slate-400/10',
            };
            // Display query string without encoding (to show {{}} instead of %7B%7D)
            const queryString = buildUtmQueryString(preset, false);

            return (
              <div
                key={preset.id}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">{preset.name}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-block px-2 py-1 rounded-lg text-xs font-bold ${platform.colorClass}`}
                      >
                        {platform.name}
                      </span>
                      {preset.status === 'pending' && (
                        <span className="inline-block px-2 py-1 rounded-lg text-xs font-bold text-amber-400 bg-amber-400/10">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(preset)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(preset)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {queryString ? (
                    <div className="text-base font-mono font-bold text-emerald-400 break-all bg-slate-900/50 p-3 rounded-lg">
                      {queryString}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic p-3 rounded-lg">
                      No UTM parameters set
                    </div>
                  )}

                  {preset.utm_source && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-blue-400 font-mono text-xs w-20">source:</span>
                      <span className="text-slate-300">{preset.utm_source}</span>
                    </div>
                  )}
                  {preset.utm_medium && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-purple-400 font-mono text-xs w-20">medium:</span>
                      <span className="text-slate-300">{preset.utm_medium}</span>
                    </div>
                  )}
                  {preset.utm_campaign && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-yellow-400 font-mono text-xs w-20">campaign:</span>
                      <span className="text-slate-300">{preset.utm_campaign}</span>
                    </div>
                  )}
                  {preset.utm_content && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-emerald-400 font-mono text-xs w-20">content:</span>
                      <span className="text-slate-300">{preset.utm_content}</span>
                    </div>
                  )}
                  {preset.utm_term && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-orange-400 font-mono text-xs w-20">term:</span>
                      <span className="text-slate-300">{preset.utm_term}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(preset)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    {copiedId === preset.id ? (
                      <>
                        <span className="material-symbols-outlined text-sm">check</span>
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        Copy Query String
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
        isLoading={modalState.isLoading}
      />
    </div>
  );
};

export default UtmPresetManager;

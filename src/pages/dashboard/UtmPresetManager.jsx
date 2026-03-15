import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import SubscriptionCancelledScreen from '../../components/dashboard/SubscriptionCancelledScreen';
import Modal from '../../components/common/Modal';
import { Copy } from 'lucide-react';
import { useToast } from '../../components/common/ToastProvider.jsx';

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
  const location = useLocation();
  const [presets, setPresets] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [planType, setPlanType] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);

  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    onConfirm: null,
    isLoading: false,
  });

  const [openMenuPresetId, setOpenMenuPresetId] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchPlanAndPresets();
    fetchLinks();
  }, []);

  // Show toast after returning from builder (create/update)
  useEffect(() => {
    if (location.state && location.state.toast) {
      showToast(location.state.toast);
      // Clear state so it doesn't show again on refresh/back
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, location.pathname, navigate, showToast]);

  const fetchPlanAndPresets = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let currentPlanType = null;
      try {
        let { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('plan_type, subscription_status')
          .eq('user_id', user.id)
          .maybeSingle();
        if (profileError || !profile) {
          const res = await supabase
            .from('profiles')
            .select('plan_type, subscription_status')
            .eq('id', user.id)
            .maybeSingle();
          profile = res.data;
          profileError = res.error;
        }
        if (!profileError && profile?.plan_type) {
          currentPlanType = profile.plan_type;
          setPlanType(profile.plan_type);
        }
        setSubscriptionStatus(profile?.subscription_status ?? null);
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

  const renderQueryString = (str) => {
    return str.split('&').map((segment, i) => (
      <span key={i}>
        {i > 0 && <span className="font-bold text-[#7e8896]">&</span>}
        <span className="font-bold text-[#7e8896]">{segment}</span>
      </span>
    ));
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
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            setModalState({
              isOpen: true,
              type: 'error',
              title: 'Error',
              message: 'You must be logged in to delete a preset.',
              onConfirm: null,
              isLoading: false,
            });
            return;
          }
          const { data, error } = await supabase
            .from('utm_presets')
            .update({ is_active: false })
            .eq('id', preset.id)
            .eq('user_id', user.id)
            .select('id')
            .maybeSingle();

          if (error) throw error;
          if (!data) {
            setModalState({
              isOpen: true,
              type: 'error',
              title: 'Error',
              message: 'Preset not found or you do not have permission to delete it.',
              onConfirm: null,
              isLoading: false,
            });
            return;
          }
          await fetchPlanAndPresets();
          showToast({
            type: 'success',
            title: 'UTM preset deleted',
            message: 'The preset was removed successfully.',
          });
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
          const message =
            error?.message && !error.message.includes('fetch')
              ? error.message
              : 'Failed to delete preset. Please try again.';
          setModalState({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message,
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
          <p className="text-[#1b1b1b] mt-4">Loading UTM presets...</p>
        </div>
      </div>
    );
  }

  if (subscriptionStatus === 'cancelled') {
    return <SubscriptionCancelledScreen />;
  }

  const normalizedPlan = (planType || '').toLowerCase();
  if (normalizedPlan === 'free' || normalizedPlan === 'start' || normalizedPlan === 'starter') {
    return (
      <div className="relative min-h-[480px] w-full flex items-center justify-center p-6 overflow-hidden bg-white rounded-2xl border border-dashed border-card-border">
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
        <div className="relative z-10 max-w-xl w-full bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-3xl p-8 md:p-10 text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-[#c0ffa5] blur-2xl opacity-25 animate-pulse" />
              <div className="relative bg-gradient-to-br from-[#c0ffa5] to-[#c0ffa5] p-4 rounded-2xl shadow-lg shadow-[#c0ffa5]/40">
                <Lock className="w-8 h-8 text-[#1b1b1b]" />
              </div>
            </div>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1b1b1b] mb-4 tracking-tight">
            Unlock UTM Presets
          </h2>
          <p className="text-sm md:text-base text-[#1b1b1b] mb-8 leading-relaxed">
            Your current&nbsp;
            <span className="font-semibold text-[#1b1b1b] italic capitalize">
              {normalizedPlan} plan
            </span>
            &nbsp;does not include UTM preset management. Upgrade to&nbsp;
            <span className="text-[#6358de] font-bold uppercase tracking-wider">
              ADVANCED
            </span> or{' '}
            <span className="text-[#6358de] font-bold uppercase tracking-wider">PRO</span> to create
            and manage UTM presets for your campaigns.
          </p>
          <button
            onClick={() => {
              window.location.href = '/#pricing';
            }}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#6358de] text-white font-bold py-3.5 px-8 rounded-2xl transition-all hover:bg-[#5348c7] shadow-xl shadow-[#6358de]/30"
          >
            View Plans & Upgrade
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#1b1b1b] mb-2">UTM Presets</h1>
          <p className="text-[#1b1b1b]">
            Create and manage UTM parameter presets for your campaigns
          </p>
        </div>
        <button
          onClick={handleNewPreset}
          className="w-full sm:w-auto px-6 py-3 bg-[#6358de] hover:bg-[#5348c7] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#6358de]/20 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          New UTM Preset
        </button>
      </div>

      {presets.length === 0 ? (
        <div className="bg-[#fcfdfd] border rounded-2xl p-12 text-center hover:shadow-card-mint transition-all border-[#6358de]/40 md:border-card-border md:hover:border-[#6358de]/40">
          <span className="material-symbols-outlined text-6xl text-black mb-4">campaign</span>
          <h3 className="text-xl font-bold text-black mb-2">No UTM Presets Yet</h3>
          <p className="text-black mb-6">
            Create your first UTM preset to start tracking your campaigns
          </p>
          <button
            onClick={handleNewPreset}
            className="px-6 py-3 bg-[#6358de] hover:bg-[#5348c7] text-white font-bold rounded-xl transition-all"
          >
            Create First Preset
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.map((preset) => {
            const platform = PLATFORMS[preset.platform] || {
              name: preset.platform,
              colorClass: 'text-black bg-slate-200',
            };
            // Display query string without encoding (to show {{}} instead of %7B%7D)
            const queryString = buildUtmQueryString(preset, false);

            return (
              <div
                key={preset.id}
                className="bg-[#fcfdfd] border rounded-xl p-6 hover:shadow-card-mint transition-all border-[#6358de]/40 md:border-card-border md:hover:border-[#6358de]/40"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-4xl font-bold text-black mb-1">{preset.name}</h3>
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
                  <div className="relative flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuPresetId(openMenuPresetId === preset.id ? null : preset.id);
                      }}
                      className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-[#1b1b1b] transition-colors"
                      aria-label="Actions menu"
                    >
                      <span className="material-symbols-outlined text-base">more_vert</span>
                    </button>
                    {openMenuPresetId === preset.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenMenuPresetId(null)}
                          aria-hidden
                        />
                        <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-xl shadow-2xl z-20 overflow-hidden min-w-max">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuPresetId(null);
                              handleEdit(preset);
                            }}
                            className="w-full px-4 py-3 text-left text-[#1b1b1b] hover:bg-white/5 transition-colors flex items-center gap-3 text-sm"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuPresetId(null);
                              handleDelete(preset);
                            }}
                            className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-3 text-sm"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  {/* Chips: one per UTM param */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'utm_source', label: 'Source', value: preset.utm_source },
                      { key: 'utm_medium', label: 'Medium', value: preset.utm_medium },
                      { key: 'utm_campaign', label: 'Campaign', value: preset.utm_campaign },
                      { key: 'utm_content', label: 'Content', value: preset.utm_content },
                      { key: 'utm_term', label: 'Term', value: preset.utm_term },
                    ]
                      .filter(({ value }) => value)
                      .map(({ key, label, value }) => (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-sm font-medium"
                        >
                          <span className="font-semibold text-[#6358de]">{label}:</span>
                          <span className="text-[#1b1b1b]">{value}</span>
                        </span>
                      ))}
                  </div>

                  {/* Full UTM string below */}
                  {queryString ? (
                    <div className="text-base font-mono font-bold break-all bg-white border border-slate-200 p-3 rounded-lg text-[#7e8896]">
                      {renderQueryString(queryString)}
                    </div>
                  ) : (
                    <div className="text-xs text-[#7e8896] font-bold italic p-3 rounded-lg bg-white border border-slate-200">
                      No UTM parameters set
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(preset)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-black rounded-lg transition-colors text-sm font-bold"
                  >
                    {copiedId === preset.id ? (
                      <>
                        <span className="material-symbols-outlined text-sm">check</span>
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        Copy UTM Preset
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

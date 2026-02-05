import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Zap, ArrowRight, Globe, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/common/Modal';
import outbrainLogo from '../../assets/id-bNajMAc_1769618145922.svg';
import taboolaLogo from '../../assets/idRS-vCmxj_1769618141092.svg';

const PixelManager = () => {
  const navigate = useNavigate();
  const [pixels, setPixels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [planType, setPlanType] = useState(null); // null = still loading, don't show paywall yet

  // Modal states for delete confirmation
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    pixelId: null,
    pixelName: '',
    isLoading: false,
  });

  // Modal states for errors/alerts
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    onConfirm: null,
    isLoading: false,
  });

  useEffect(() => {
    fetchPixels();
  }, []);

  const fetchPixels = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPixels([]);
        setLoading(false);
        return;
      }

      // Fetch plan type – only block if explicitly not PRO
      let currentPlanType = null; // null = allow access (fail open)
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('plan_type')
          .eq('user_id', user.id)
          .single();

        console.log('PixelManager - Profile fetch result:', {
          profile,
          profileError,
          userId: user.id,
        });

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          // On error, allow access (fail open)
          setPlanType(null);
          currentPlanType = null;
        } else if (profile?.plan_type) {
          currentPlanType = profile.plan_type;
          setPlanType(profile.plan_type);
          console.log('PixelManager - Plan type set to:', profile.plan_type);
        } else {
          // No plan_type in profile = allow access (don't block)
          setPlanType(null);
          currentPlanType = null;
          console.log('PixelManager - No plan_type found, allowing access');
        }
      } catch (planError) {
        console.error('Error fetching plan type for pixels:', planError);
        // On error, allow access (fail open) - don't block data
        setPlanType(null);
        currentPlanType = null;
      }

      const normalized = (currentPlanType || '').toLowerCase();
      console.log(
        'PixelManager - Normalized plan:',
        normalized,
        '| Will block:',
        normalized && normalized !== 'pro'
      );

      // Only block if explicitly not PRO - otherwise allow access
      if (normalized && normalized !== 'pro') {
        console.log('PixelManager - Blocking access, showing paywall');
        setPixels([]);
        setLoading(false);
        return;
      }

      console.log('PixelManager - Access granted, fetching pixels...');

      const { data, error } = await supabase
        .from('pixels')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'deleted') // Don't fetch deleted pixels
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPixels(data || []);
    } catch (error) {
      console.error('Error fetching pixels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModalState.pixelId) return;

    setDeleteModalState((prev) => ({ ...prev, isLoading: true }));

    try {
      const { error } = await supabase
        .from('pixels')
        .update({
          status: 'deleted',
          deleted_at: new Date().toISOString(),
        })
        .eq('id', deleteModalState.pixelId);

      if (error) throw error;

      try {
        const { refreshRedisForLinksUsingPixel } = await import('../../lib/redisCache');
        await refreshRedisForLinksUsingPixel(deleteModalState.pixelId, supabase);
      } catch (redisErr) {
        console.warn('⚠️ [PixelManager] Redis refresh after pixel delete:', redisErr);
      }

      setDeleteModalState({ isOpen: false, pixelId: null, pixelName: '', isLoading: false });
      fetchPixels();
    } catch (error) {
      console.error('Error deleting pixel:', error);
      setDeleteModalState((prev) => ({ ...prev, isLoading: false }));
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error deleting pixel. Please try again.',
        onConfirm: null,
        isLoading: false,
      });
    }
  };

  const handleToggleStatus = async (pixelId, currentStatus) => {
    try {
      // Toggle between 'active' and 'PAUSED'
      const newStatus = currentStatus === 'active' ? 'PAUSED' : 'active';

      const { error } = await supabase
        .from('pixels')
        .update({ status: newStatus })
        .eq('id', pixelId);

      if (error) {
        throw error;
      }

      try {
        const { refreshRedisForLinksUsingPixel } = await import('../../lib/redisCache');
        await refreshRedisForLinksUsingPixel(pixelId, supabase);
      } catch (redisErr) {
        console.warn('⚠️ [PixelManager] Redis refresh after pixel status toggle:', redisErr);
      }

      fetchPixels(); // Refresh the list
    } catch (error) {
      console.error('Error updating pixel status:', error);
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error updating pixel status. Please try again.',
        onConfirm: null,
        isLoading: false,
      });
    }
  };

  const maskPixelId = (pixelId) => {
    if (!pixelId) return '';
    if (pixelId.length <= 8) return '••••••••';
    // Show first 4 and last 4 characters, mask the middle
    const start = pixelId.substring(0, 4);
    const end = pixelId.substring(pixelId.length - 4);
    const masked = '•'.repeat(Math.min(8, pixelId.length - 8));
    return `${start}${masked}${end}`;
  };

  const getPlatformLogo = (platform) => {
    switch (platform) {
      case 'meta':
        // Facebook logo from simpleicons.org
        return (
          <div className="w-10 h-10 rounded-lg bg-[#1877F2] flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="white"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </div>
        );
      case 'instagram':
        // Instagram logo from simpleicons.org (gradient camera)
        return (
          <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#f9ed32] via-[#ee2a7b] to-[#6228d7] p-0.5">
            <div className="w-full h-full rounded-[6px] bg-slate-900 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="white"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </div>
          </div>
        );
      case 'tiktok':
        // TikTok logo from simpleicons.org
        return (
          <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="white"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
            </svg>
          </div>
        );
      case 'google':
        // Google Ads logo from simpleicons.org (using Google logo as base)
        return (
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
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
        // Snapchat logo from simpleicons.org
        return (
          <div className="w-10 h-10 rounded-lg bg-[#FFFC00] flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="black"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.097.118.112.222.083.343-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.487.535 6.624 0 11.99-5.367 11.99-11.987C23.97 5.39 18.592.026 11.976.026L12.017 0z" />
            </svg>
          </div>
        );
      case 'taboola':
        return (
          <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden border border-slate-700">
            <img src={taboolaLogo} alt="Taboola" className="w-full h-full object-cover" />
          </div>
        );
      case 'outbrain':
        return (
          <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden border border-slate-700">
            <img src={outbrainLogo} alt="Outbrain" className="w-full h-full object-cover" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-lg bg-[#232f48] flex items-center justify-center">
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

  const normalizedPlan = planType?.toLowerCase() || null;

  if (loading) {
    return (
      <div className="flex flex-col gap-8 w-full h-full items-center justify-center">
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-4xl text-slate-600 animate-spin">
            refresh
          </span>
          <p className="text-slate-400 mt-4">Loading pixels...</p>
        </div>
      </div>
    );
  }

  // Show upgrade paywall only if explicitly not PRO
  if (normalizedPlan && normalizedPlan !== 'pro') {
    return (
      <div className="relative min-h-[480px] w-full flex items-center justify-center p-6 overflow-hidden bg-[#0b0f19] rounded-2xl border border-dashed border-[#232f48]">
        {/* Background mock layout */}
        <div className="absolute inset-0 opacity-[0.18] blur-[3px] pointer-events-none select-none p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="h-10 bg-[#141b2e] rounded-md w-1/3 mb-8" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-[#141b2e] rounded-xl" />
              ))}
            </div>
            <div className="h-56 bg-[#141b2e] rounded-xl w-full" />
          </div>
        </div>

        {/* Main card */}
        <div className="relative z-10 max-w-xl w-full bg-[#101622]/90 backdrop-blur-xl border border-[#232f48] shadow-2xl rounded-3xl p-8 md:p-10 text-center">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-[#FF10F0] blur-2xl opacity-25 animate-pulse" />
              <div className="relative bg-gradient-to-br from-[#FF10F0] to-[#7c3aed] p-4 rounded-2xl shadow-lg shadow-[#FF10F0]/40">
                <Lock className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight">
            Unlock Pixel & CAPI Manager
          </h2>

          <p className="text-sm md:text-base text-slate-300 mb-8 leading-relaxed">
            Your current&nbsp;
            <span className="font-semibold text-white italic capitalize">
              {normalizedPlan} plan
            </span>{' '}
            does not include pixel tracking. Upgrade to&nbsp;
            <span className="text-[#FF10F0] font-bold uppercase tracking-wider">PRO</span> to
            create, manage, and optimize pixels across all your campaigns.
          </p>

          {/* Value props */}
          <div className="space-y-4 mb-10 text-left">
            <div className="flex items-center gap-3 p-3 bg-[#0b0f19]/80 rounded-xl border border-[#232f48] hover:border-[#FF10F0]/40 transition-colors">
              <Globe className="w-5 h-5 text-[#FF10F0]" />
              <div>
                <p className="font-semibold text-sm text-white italic">Cross‑platform Pixels</p>
                <p className="text-xs text-slate-400">
                  Track Meta, TikTok, Google, Taboola, Outbrain and more from one place.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#0b0f19]/80 rounded-xl border border-[#232f48] hover:border-[#FF10F0]/40 transition-colors">
              <BarChart3 className="w-5 h-5 text-[#FF10F0]" />
              <div>
                <p className="font-semibold text-sm text-white italic">
                  Advanced Attribution & Optimization
                </p>
                <p className="text-xs text-slate-400">
                  Optimize ROAS with unified pixel events and cleaner reporting.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => {
              window.location.href = '/#pricing';
            }}
            className="group relative w-full inline-flex items-center justify-center gap-2 bg-[#FF10F0] text-white font-bold py-3.5 px-8 rounded-2xl transition-all duration-300 hover:bg-[#e00ed0] hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-[#FF10F0]/30"
          >
            <Zap className="w-5 h-5" />
            <span>View Plans & Upgrade</span>
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>

          <p className="mt-5 text-xs text-slate-500">
            Pixel & CAPI Manager is available on the{' '}
            <span className="font-semibold text-slate-300">PRO</span> plan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Pixel & CAPI Manager</h1>
          <p className="text-sm md:text-base text-slate-400">
            Manage your tracking pixels and CAPI tokens
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/pixels/new')}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 md:py-2.5 text-white font-bold rounded-xl transition-colors shadow-lg text-base md:text-sm"
          style={{
            backgroundColor: '#FF10F0',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e00ed0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FF10F0';
          }}
        >
          <span className="material-symbols-outlined text-xl md:text-base">add</span>
          New Pixel
        </button>
      </div>

      {/* Pixels List */}
      {pixels.length === 0 ? (
        <div className="bg-[#101622] border border-[#232f48] rounded-2xl p-4 md:p-6 w-full">
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-slate-600 mb-4">
              ads_click
            </span>
            <p className="text-slate-400 text-lg mb-2">No pixels yet</p>
            <p className="text-slate-500 text-sm">
              Create your first tracking pixel to get started
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {pixels.map((pixel) => (
            <div
              key={pixel.id}
              className="bg-[#101622] border border-[#232f48] rounded-xl p-5 transition-all hover:bg-white/5 hover:border-primary/30 flex flex-col gap-4"
            >
              {/* Header with Logo and Name */}
              <div className="flex items-start gap-3">
                {getPlatformLogo(pixel.platform)}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white break-words line-clamp-2">
                    {pixel.name}
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">{getPlatformName(pixel.platform)}</p>
                </div>
              </div>

              {/* Pixel ID (Masked) */}
              <div className="p-3 bg-[#0b0f19] rounded-lg border border-[#232f48]">
                <p className="text-xs text-slate-500 mb-1">Pixel ID</p>
                <p className="font-mono text-sm text-slate-300 break-all">
                  {maskPixelId(pixel.pixel_id)}
                </p>
              </div>

              {/* Event Info */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Event:</span>
                <span className="text-slate-300 font-medium">
                  {pixel.event_type === 'custom' ? pixel.custom_event_name : pixel.event_type}
                </span>
              </div>

              {/* Taboola: what to set in Taboola (URL with tglid) */}
              {pixel.platform === 'taboola' && (
                <div className="p-3 bg-[#0b0f19] rounded-lg border border-[#232f48] text-xs">
                  <p className="text-slate-500 mb-1.5">מה להגדיר בטבולה:</p>
                  <p className="text-slate-300 font-mono break-all">
                    www.domain.com/slug
                    <span className="text-green-400">?tglid=&#123;ctoken&#125;</span>
                  </p>
                </div>
              )}

              {/* Status & Actions */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#232f48]">
                {/* Status */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStatus(pixel.id, pixel.status || 'active')}
                    className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                      pixel.status === 'active' ? 'bg-primary' : 'bg-[#232f48]'
                    }`}
                    aria-label="Toggle pixel status"
                    title={
                      pixel.status === 'active'
                        ? 'Active - Click to pause'
                        : 'Paused - Click to activate'
                    }
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        pixel.status === 'active' ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-slate-400 font-medium">
                    {pixel.status === 'active' ? 'ACTIVE' : 'PAUSED'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigate(`/dashboard/pixels/edit/${pixel.id}`);
                    }}
                    className="text-slate-400 hover:text-primary transition-colors p-2"
                    title="Edit pixel"
                  >
                    <span className="material-symbols-outlined text-base">edit</span>
                  </button>
                  <button
                    onClick={() => {
                      setDeleteModalState({
                        isOpen: true,
                        pixelId: pixel.id,
                        pixelName: pixel.name,
                        isLoading: false,
                      });
                    }}
                    className="text-slate-400 hover:text-red-400 transition-colors p-2"
                    title="Delete pixel"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalState.isOpen}
        onClose={() =>
          !deleteModalState.isLoading && setDeleteModalState({ ...deleteModalState, isOpen: false })
        }
        title="Delete this pixel?"
        message={
          <>
            Are you sure you want to delete <strong>{deleteModalState.pixelName}</strong>? This
            action cannot be undone.
          </>
        }
        type="delete"
        confirmText="Delete Pixel"
        cancelText="Cancel"
        onConfirm={handleDelete}
        isLoading={deleteModalState.isLoading}
      />

      {/* Error/Alert Modal */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onConfirm={modalState.onConfirm}
        isLoading={modalState.isLoading}
      />
    </div>
  );
};

export default PixelManager;

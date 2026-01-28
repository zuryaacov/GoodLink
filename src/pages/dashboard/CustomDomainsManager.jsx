import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Zap, ArrowRight, Globe, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/common/Modal';

const CustomDomainsManager = () => {
  const navigate = useNavigate();
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [planType, setPlanType] = useState('free');

  // Modal states for errors/alerts
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    onConfirm: null,
    isLoading: false,
  });

  // Modal state for delete confirmation
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    domainId: null,
    domainName: '',
    isLoading: false,
  });

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setDomains([]);
        setPlanType('free');
        return;
      }

      // Fetch plan type – on error, allow access so we don't block data
      let currentPlanType = 'free';
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan_type')
          .eq('user_id', user.id)
          .single();

        if (profile?.plan_type) {
          currentPlanType = profile.plan_type;
          setPlanType(profile.plan_type);
        } else {
          setPlanType('free');
        }
      } catch (planError) {
        console.error('Error fetching plan type for domains:', planError);
        setPlanType('free');
        // Don't block: if profile fetch fails, still fetch domains (fail open)
        currentPlanType = 'advanced';
      }

      const normalized = (currentPlanType || '').toLowerCase();
      // If FREE or STARTER, don't fetch domains – UI will show paywall
      if (normalized === 'free' || normalized === 'start' || normalized === 'starter') {
        setDomains([]);
        return;
      }

      const { data, error } = await supabase
        .from('custom_domains')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'deleted') // Don't fetch deleted domains
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDomains(data || []);
    } catch (error) {
      console.error('Error fetching domains:', error);
      // If table doesn't exist, just show empty state
      setDomains([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (domainId, domainName) => {
    setDeleteModalState({
      isOpen: true,
      domainId,
      domainName,
      isLoading: false,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalState.domainId) return;

    setDeleteModalState((prev) => ({ ...prev, isLoading: true }));

    try {
      const { error } = await supabase
        .from('custom_domains')
        .update({
          status: 'deleted',
          deleted_at: new Date().toISOString(),
        })
        .eq('id', deleteModalState.domainId);

      if (error) throw error;

      setDeleteModalState({ isOpen: false, domainId: null, domainName: '', isLoading: false });
      fetchDomains();
    } catch (error) {
      console.error('Error deleting domain:', error);
      setDeleteModalState((prev) => ({ ...prev, isLoading: false }));
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error deleting domain. Please try again.',
        onConfirm: null,
        isLoading: false,
      });
    }
  };

  const handleVerifyDNS = async (domain) => {
    // Show loading state
    setModalState({
      isOpen: true,
      type: 'alert',
      title: 'Verifying DNS Records',
      message: 'Please wait while we verify your DNS configuration...',
      onConfirm: null,
      isLoading: true,
    });

    try {
      const domainId = domain.id;
      const hostnameId = domain.cloudflare_hostname_id;

      if (!domainId && !hostnameId) {
        throw new Error('Domain ID or Cloudflare hostname ID is required');
      }

      // Get worker URL from environment variable (fallback to glynk.to)
      const workerUrl = import.meta.env.VITE_WORKER_URL || 'https://glynk.to';
      const apiUrl = `${workerUrl}/api/verify-custom-domain`;

      console.log('🔵 [VerifyDNS] Calling worker API:', apiUrl);

      // Call worker endpoint to verify domain
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain_id: domainId,
          cloudflare_hostname_id: hostnameId,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to verify domain');
      }

      console.log('✅ [VerifyDNS] Verification result:', result);

      if (result.is_active) {
        // Domain is verified and active
        setModalState({
          isOpen: true,
          type: 'success',
          title: 'DNS Verified Successfully!',
          message: `Your domain ${domain.domain} has been verified and is now active.`,
          onConfirm: null,
          isLoading: false,
        });
        // Refresh domains list
        fetchDomains();
      } else {
        // DNS records not yet verified
        setModalState({
          isOpen: true,
          type: 'alert',
          title: 'DNS Verification Pending',
          message: `DNS records are still pending verification. Current status: ${result.ssl_status || 'pending'}. Please wait a few minutes and try again.`,
          onConfirm: null,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('❌ [VerifyDNS] Error:', error);
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Verification Failed',
        message: error.message || 'Error verifying DNS records. Please try again.',
        onConfirm: null,
        isLoading: false,
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'error':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return 'check_circle';
      case 'pending':
        return 'schedule';
      case 'error':
        return 'error';
      default:
        return 'help';
    }
  };

  const getDnsRecordsArray = (dnsRecords) => {
    if (!dnsRecords) return null;
    if (Array.isArray(dnsRecords)) return dnsRecords;
    if (typeof dnsRecords === 'string') {
      try {
        const parsed = JSON.parse(dnsRecords);
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }
    // Sometimes PostgREST can return JSON objects depending on column type
    return Array.isArray(dnsRecords?.records) ? dnsRecords.records : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Loading domains...</div>
      </div>
    );
  }

  const normalizedPlan = planType?.toLowerCase() || 'free';

  // Show upgrade paywall for FREE or STARTER plans
  if (normalizedPlan === 'free' || normalizedPlan === 'start' || normalizedPlan === 'starter') {
    return (
      <div className="relative min-h-[480px] w-full flex items-center justify-center p-6 overflow-hidden bg-[#0b0f19] rounded-2xl border border-dashed border-[#232f48]">
        {/* Background mock layout */}
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
            Unlock Custom Domains
          </h2>

          <p className="text-sm md:text-base text-slate-300 mb-8 leading-relaxed">
            Your current&nbsp;
            <span className="font-semibold text-white italic capitalize">
              {normalizedPlan} plan
            </span>{' '}
            does not include custom domain management. Upgrade to&nbsp;
            <span className="text-[#FF10F0] font-bold uppercase tracking-wider">
              ADVANCED
            </span> or{' '}
            <span className="text-[#FF10F0] font-bold uppercase tracking-wider">PRO</span> to
            connect your own domains and brand your links.
          </p>

          {/* Value props */}
          <div className="space-y-4 mb-10 text-left">
            <div className="flex items-center gap-3 p-3 bg-[#0b0f19]/80 rounded-xl border border-[#232f48] hover:border-[#FF10F0]/40 transition-colors">
              <Globe className="w-5 h-5 text-[#FF10F0]" />
              <div>
                <p className="font-semibold text-sm text-white italic">Brand Your Links</p>
                <p className="text-xs text-slate-400">
                  Use your own domain (e.g., go.mybrand.com) instead of the default short links.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#0b0f19]/80 rounded-xl border border-[#232f48] hover:border-[#FF10F0]/40 transition-colors">
              <BarChart3 className="w-5 h-5 text-[#FF10F0]" />
              <div>
                <p className="font-semibold text-sm text-white italic">Professional Appearance</p>
                <p className="text-xs text-slate-400">
                  Build trust with branded links that match your business identity.
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
            Custom Domains are available on the{' '}
            <span className="font-semibold text-slate-300">ADVANCED</span> and{' '}
            <span className="font-semibold text-slate-300">PRO</span> plans.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Custom Domains</h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Brand your links with custom domains (e.g., go.mybrand.com)
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/domains/new')}
          className="px-6 py-3 bg-[#FF10F0] hover:bg-[#e00ed0] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#FF10F0]/20 flex items-center gap-2 whitespace-nowrap"
        >
          <span className="material-symbols-outlined">add</span>
          New Domain
        </button>
      </div>

      {/* Domains List */}
      {domains.length === 0 ? (
        <div className="bg-[#101622] border border-[#232f48] rounded-2xl p-4 md:p-6 w-full">
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-slate-600 mb-4">public</span>
            <p className="text-slate-400 text-lg mb-2">No custom domains yet</p>
            <p className="text-slate-500 text-sm">Create your first custom domain to get started</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {domains.map((domain) => (
            <div
              key={domain.id}
              className="bg-[#101622] border border-[#232f48] rounded-2xl p-6 md:p-8 transition-all hover:bg-white/5 hover:border-primary/40 flex flex-col gap-6 shadow-2xl"
            >
              {/* Domain Name & Status */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#232f48]">
                <div className="flex flex-col gap-2">
                  <h3
                    className="text-xl md:text-2xl font-bold text-white tracking-tight break-all"
                    title={domain.domain}
                  >
                    {domain.domain}
                  </h3>
                  <div
                    className={`inline-flex items-center self-start gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold uppercase tracking-wider ${getStatusColor(domain.status)}`}
                  >
                    <span className="material-symbols-outlined text-base">
                      {getStatusIcon(domain.status)}
                    </span>
                    <span>{domain.status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-center">
                  {/* Verify Button - Show if pending or error */}
                  {(domain.status === 'pending' || domain.status === 'error') && (
                    <button
                      onClick={() => handleVerifyDNS(domain)}
                      className="px-4 py-2 bg-[#FF10F0] hover:bg-[#e00ed0] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#FF10F0]/20 flex items-center justify-center gap-2 text-sm"
                    >
                      <span className="material-symbols-outlined text-lg">verified</span>
                      Verify DNS
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteClick(domain.id, domain.domain)}
                    className="text-slate-500 hover:text-red-400 transition-colors p-2 bg-red-500/10 rounded-lg border border-red-500/20"
                    title="Delete domain"
                  >
                    <span className="material-symbols-outlined text-xl md:text-2xl">delete</span>
                  </button>
                </div>
              </div>

              {/* DNS Records Detail Display */}
              {getDnsRecordsArray(domain.dns_records) && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-sm">dns</span>
                    <p className="text-xs uppercase tracking-widest font-black">
                      DNS Configuration Required
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {getDnsRecordsArray(domain.dns_records).map((record, idx) => (
                      <div
                        key={idx}
                        className="bg-[#0b0f19] border border-[#232f48] rounded-xl p-4 md:p-6 space-y-4 hover:border-primary/20 transition-all shadow-inner"
                      >
                        {/* Record Type Header */}
                        <div className="flex items-center gap-3">
                          <div className="px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded-lg font-bold text-xs uppercase tracking-wider">
                            Record {idx + 1}
                          </div>
                          <div className="h-px flex-1 bg-[#232f48]"></div>
                          <span className="text-xl text-primary font-black font-mono uppercase">
                            {record.type}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          {/* Host / Name Section */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-slate-500 text-sm">
                                label
                              </span>
                              <span className="text-[10px] uppercase font-black text-slate-600 tracking-[0.2em]">
                                Host / Name
                              </span>
                            </div>
                            <div className="flex items-center gap-3 bg-[#101622] p-3 rounded-xl border border-[#232f48] group hover:border-primary/20 transition-all">
                              <code className="text-sm md:text-base text-white font-mono flex-1 truncate selection:bg-primary/40">
                                {record.host || record.name}
                              </code>
                              <button
                                onClick={() =>
                                  navigator.clipboard.writeText(record.host || record.name)
                                }
                                className="w-10 h-10 flex items-center justify-center bg-[#232f48] hover:bg-primary text-white rounded-lg transition-all shadow-xl active:scale-90"
                                title="Copy Host"
                              >
                                <span className="material-symbols-outlined text-xl">
                                  content_copy
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Target Value Section */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-slate-500 text-sm">
                                shortcut
                              </span>
                              <span className="text-[10px] uppercase font-black text-slate-600 tracking-[0.2em]">
                                Target Value
                              </span>
                            </div>
                            <div className="flex items-center gap-3 bg-[#101622] p-3 md:p-4 rounded-xl border border-[#232f48] group hover:border-primary/20 transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                              <code className="text-sm md:text-lg text-green-400 font-mono flex-1 break-all leading-tight selection:bg-primary/30">
                                {record.value}
                              </code>
                              <button
                                onClick={() => navigator.clipboard.writeText(record.value)}
                                className="w-10 h-10 flex items-center justify-center bg-[#232f48] hover:bg-primary text-white rounded-lg transition-all shadow-xl active:scale-90 flex-shrink-0"
                                title="Copy Value"
                              >
                                <span className="material-symbols-outlined text-xl">
                                  content_copy
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verified Date */}
              {domain.verified_at && (
                <div className="pt-4 border-t border-[#232f48] text-[11px] md:text-sm text-slate-500 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">calendar_today</span>
                  <span className="font-semibold uppercase tracking-wide">Last Verified:</span>
                  <span className="text-slate-300">
                    {new Date(domain.verified_at).toLocaleString()}
                  </span>
                </div>
              )}
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
        title="Delete this domain?"
        message={
          <>
            Are you sure you want to delete <strong>{deleteModalState.domainName}</strong>? This
            action cannot be undone.
          </>
        }
        type="delete"
        confirmText="Delete Domain"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
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

export default CustomDomainsManager;

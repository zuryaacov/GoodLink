import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Zap, ArrowRight, Globe, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/common/Modal';
import SubscriptionCancelledScreen from '../../components/dashboard/SubscriptionCancelledScreen';
import { useToast } from '../../components/common/ToastProvider.jsx';

const CustomDomainsManager = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [planType, setPlanType] = useState(null); // null = still loading, don't show paywall yet
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [dnsRecordsByDomainId, setDnsRecordsByDomainId] = useState({});
  const [dnsLoadingByDomainId, setDnsLoadingByDomainId] = useState({});

  const workerUrl = import.meta.env.VITE_WORKER_URL || 'https://glynk.to';
  const { showToast } = useToast();

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

  // Details modal: domain object or null
  const [detailsModalDomain, setDetailsModalDomain] = useState(null);
  // 3-dots menu open for domain id
  const [openMenuDomainId, setOpenMenuDomainId] = useState(null);

  useEffect(() => {
    fetchDomains();
  }, []);

  // Show toast after returning from AddDomainPage (create/update/verify)
  useEffect(() => {
    if (location.state && location.state.toast) {
      showToast(location.state.toast);
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, location.pathname, navigate, showToast]);

  useEffect(() => {
    if (!openMenuDomainId) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpenMenuDomainId(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openMenuDomainId]);

  const fetchDomainRecords = async (domain) => {
    if (!domain?.cloudflare_hostname_id) return;

    setDnsLoadingByDomainId((prev) => ({ ...prev, [domain.id]: true }));
    try {
      const response = await fetch(`${workerUrl}/api/get-domain-records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cloudflare_hostname_id: domain.cloudflare_hostname_id,
          domain_id: domain.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch DNS records for ${domain.domain}`);
      }

      const result = await response.json();
      if (Array.isArray(result?.dns_records)) {
        setDnsRecordsByDomainId((prev) => ({
          ...prev,
          [domain.id]: result.dns_records,
        }));
      }
    } catch (error) {
      console.error('Error fetching domain DNS records:', error);
    } finally {
      setDnsLoadingByDomainId((prev) => ({ ...prev, [domain.id]: false }));
    }
  };

  const fetchDomains = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setDomains([]);
        setLoading(false);
        return;
      }

      // Fetch plan type – only block if explicitly FREE/STARTER
      let currentPlanType = null; // null = allow access (fail open)
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('plan_type, subscription_status')
          .eq('user_id', user.id)
          .single();

        console.log('CustomDomains - Profile fetch result:', {
          profile,
          profileError,
          userId: user.id,
        });

        if (profileError) {
          console.error('CustomDomains - Profile fetch error:', profileError);
          setPlanType(null);
          currentPlanType = null;
        } else if (profile?.plan_type) {
          currentPlanType = profile.plan_type;
          setPlanType(profile.plan_type);
          console.log('CustomDomains - Plan type set to:', profile.plan_type);
        } else {
          // No plan_type in profile = allow access (don't block)
          setPlanType(null);
          currentPlanType = null;
          console.log('CustomDomains - No plan_type found, allowing access');
        }
        setSubscriptionStatus(profile?.subscription_status ?? null);
      } catch (planError) {
        console.error('Error fetching plan type for domains:', planError);
        // On error, allow access (fail open) - don't block data
        setPlanType(null);
        currentPlanType = null;
      }

      const normalized = (currentPlanType || '').toLowerCase();
      console.log(
        'CustomDomains - Normalized plan:',
        normalized,
        '| Will block:',
        normalized === 'free' || normalized === 'start' || normalized === 'starter'
      );

      // Only block if explicitly FREE or STARTER - otherwise allow access
      if (normalized === 'free' || normalized === 'start' || normalized === 'starter') {
        console.log('CustomDomains - Blocking access, showing paywall');
        setDomains([]);
        setLoading(false);
        return;
      }

      console.log('CustomDomains - Access granted, fetching domains...');
      const { data, error } = await supabase
        .from('custom_domains')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'deleted') // Don't fetch deleted domains
        .order('created_at', { ascending: false });

      console.log('CustomDomains - Fetch result:', { data, error });
      if (error) throw error;
      const fetchedDomains = data || [];
      setDomains(fetchedDomains);

      // Always refresh DNS records from worker so cards show full/updated records.
      const domainsWithCloudflareHost = fetchedDomains.filter((domain) => domain.cloudflare_hostname_id);
      if (domainsWithCloudflareHost.length > 0) {
        await Promise.all(domainsWithCloudflareHost.map((domain) => fetchDomainRecords(domain)));
      }
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
      showToast({
        type: 'success',
        title: 'Domain deleted',
        message: 'The custom domain was removed successfully.',
      });
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
        return 'bg-green-500/20 text-black border-green-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
      case 'error':
        return 'bg-red-500/20 text-red-700 border-red-500/30';
      default:
        return 'bg-slate-200 text-[#1b1b1b] border-slate-500/30';
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
      <div className="flex items-center justify-center h-full" role="status">
        <div className="text-[#1b1b1b]">Loading domains...</div>
      </div>
    );
  }

  const normalizedPlan = planType?.toLowerCase() || null;

  if (subscriptionStatus === 'cancelled') {
    return <SubscriptionCancelledScreen />;
  }

  // Show upgrade paywall only if explicitly FREE or STARTER
  if (normalizedPlan === 'free' || normalizedPlan === 'start' || normalizedPlan === 'starter') {
    return (
      <div className="relative min-h-[480px] w-full flex items-center justify-center p-6 overflow-hidden bg-card-bg rounded-2xl border border-dashed border-card-border">
        {/* Background mock layout */}
        <div className="absolute inset-0 opacity-[0.18] blur-[3px] pointer-events-none select-none p-6" aria-hidden="true">
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
        <div className="relative z-10 max-w-xl w-full bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-3xl p-8 md:p-10 text-center">
          {/* Icon */}
          <div className="mb-6 flex justify-center" aria-hidden="true">
            <div className="relative">
              <div className="absolute inset-0 bg-[#c0ffa5] blur-2xl opacity-25 animate-pulse" />
              <div className="relative bg-gradient-to-br from-[#c0ffa5] to-[#c0ffa5] p-4 rounded-2xl shadow-lg shadow-[#c0ffa5]/40">
                <Lock className="w-8 h-8 text-[#1b1b1b]" />
              </div>
            </div>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-[#1b1b1b] mb-4 tracking-tight">
            Unlock Custom Domains
          </h2>

          <p className="text-sm md:text-base text-[#1b1b1b] mb-8 leading-relaxed">
            Your current&nbsp;
            <span className="font-semibold text-[#1b1b1b] italic capitalize">
              {normalizedPlan} plan
            </span>{' '}
            does not include custom domain management. Upgrade to&nbsp;
            <span className="text-[#a855f7] font-bold uppercase tracking-wider">
              ADVANCED
            </span> or{' '}
            <span className="text-[#a855f7] font-bold uppercase tracking-wider">PRO</span> to
            connect your own domains and brand your links.
          </p>

          {/* Value props */}
          <div className="space-y-4 mb-10 text-left">
            <div className="flex items-center gap-3 p-3 bg-white/80 rounded-xl border border-slate-200 hover:border-[#a855f7]/40 transition-colors">
              <Globe className="w-5 h-5 text-[#a855f7]" aria-hidden="true" />
              <div>
                <p className="font-semibold text-sm text-[#1b1b1b] italic">Brand Your Links</p>
                <p className="text-xs text-[#1b1b1b]">
                  Use your own domain (e.g., go.mybrand.com) instead of the default short links.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/80 rounded-xl border border-slate-200 hover:border-[#a855f7]/40 transition-colors">
              <BarChart3 className="w-5 h-5 text-[#a855f7]" aria-hidden="true" />
              <div>
                <p className="font-semibold text-sm text-[#1b1b1b] italic">Professional Appearance</p>
                <p className="text-xs text-[#1b1b1b]">
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
            className="group relative w-full inline-flex items-center justify-center gap-2 bg-[#a855f7] text-white font-bold py-3.5 px-8 rounded-2xl transition-all duration-300 hover:bg-[#9333ea] hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-[#a855f7]/30"
          >
            <Zap className="w-5 h-5" aria-hidden="true" />
            <span>View Plans & Upgrade</span>
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </button>

          <p className="mt-5 text-xs text-[#1b1b1b]">
            Custom Domains are available on the{' '}
            <span className="font-semibold text-[#1b1b1b]">ADVANCED</span> and{' '}
            <span className="font-semibold text-[#1b1b1b]">PRO</span> plans.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1b1b1b]">Custom Domains</h1>
          <p className="text-[#1b1b1b] text-sm sm:text-base">
            Brand your links with custom domains (e.g., go.mybrand.com)
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/domains/new')}
          className="px-6 py-3 bg-[#a855f7] hover:bg-[#9333ea] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#a855f7]/20 flex items-center gap-2 whitespace-nowrap"
        >
          <span className="material-symbols-outlined" aria-hidden="true">add</span>
          New Domain
        </button>
      </div>

      <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-[#1b1b1b]">How To Connect Your Custom Domain</h2>
        <p className="text-[#1b1b1b] text-sm">
          To use your own domain with GoodLink.ai, you need to point your DNS settings to our
          servers.
        </p>
        <div className="text-[#1b1b1b] text-sm space-y-2">
          <p className="font-semibold">Follow these steps:</p>
          <p>1. Log in to your domain registrar (e.g., GoDaddy, Namecheap, Cloudflare).</p>
          <p>2. Navigate to the DNS Management section.</p>
          <p>
            3. Add the CNAME and TXT records exactly as shown in the Setup Wizard or in the
            Details section of your domain card.
          </p>
          <p>
            4. Important for Cloudflare users: Set the Proxy Status to &quot;DNS Only&quot; (Grey
            Cloud). Do NOT use &quot;Proxied&quot; (Orange Cloud), as it will interfere with our
            routing and SSL.
          </p>
        </div>
        <div className="text-[#1b1b1b] text-sm space-y-2">
          <p className="font-semibold">Verification & Timing</p>
          <p>
            Propagation: DNS changes usually take a few minutes, but can take up to 24 hours to
            fully update globally.
          </p>
          <p>
            Status: Your domain status will change to &quot;Active&quot; in your dashboard once the
            connection is verified.
          </p>
        </div>
      </div>

      {/* Domains List */}
      {domains.length === 0 ? (
        <div className="bg-[#fcfdfd] border rounded-2xl p-12 text-center hover:shadow-card-mint transition-all border-[#a855f7]/40 md:border-card-border md:hover:border-[#a855f7]/40">
          <span className="material-symbols-outlined text-6xl text-black mb-4" aria-hidden="true">public</span>
          <h3 className="text-xl font-bold text-black mb-2">No Custom Domains Yet</h3>
          <p className="text-black mb-6">
            Create your first custom domain to brand your links
          </p>
          <button
            onClick={() => navigate('/dashboard/domains/new')}
            className="px-6 py-3 bg-[#a855f7] hover:bg-[#9333ea] text-white font-bold rounded-xl transition-all"
          >
            Create First Domain
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {domains.map((domain) => (
            <div
              key={domain.id}
              className="bg-card-bg border rounded-2xl p-6 md:p-8 transition-all hover:shadow-card-mint flex flex-col gap-4 border-[#a855f7]/40 md:border-card-border md:hover:border-[#a855f7]/40"
            >
              {/* Domain Name, Status, Root only */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-2 min-w-0 flex-1">
                  <h3
                    className="text-4xl font-bold text-[#1b1b1b] tracking-tight break-all"
                    title={domain.domain}
                  >
                    {domain.domain}
                  </h3>
                  <div
                    className={`inline-flex items-center self-start gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold tracking-wider ${getStatusColor(domain.status)}`}
                  >
                    <span className={`material-symbols-outlined text-base ${domain.status === 'active' ? 'text-green-700' : ''}`} aria-hidden="true">
                      {getStatusIcon(domain.status)}
                    </span>
                    <span>{domain.status ? domain.status.charAt(0).toUpperCase() + domain.status.slice(1).toLowerCase() : ''}</span>
                  </div>
                  {domain.root_redirect && (
                    <div className="flex items-center gap-2 text-[#1b1b1b] text-sm mt-1">
                      <span className="material-symbols-outlined text-sm" aria-hidden="true">
                        subdirectory_arrow_right
                      </span>
                      <span className="text-slate-500">Root:</span>
                      <a
                        href={`https://${domain.root_redirect}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate max-w-[200px]"
                        title={domain.root_redirect}
                      >
                        {domain.root_redirect}
                      </a>
                    </div>
                  )}
                </div>
                {/* 3-dots menu */}
                <div className="relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuDomainId(openMenuDomainId === domain.id ? null : domain.id);
                    }}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-[#1b1b1b] transition-colors"
                    aria-label="Actions menu"
                    aria-expanded={openMenuDomainId === domain.id}
                    aria-haspopup="true"
                  >
                    <span className="material-symbols-outlined text-base" aria-hidden="true">more_vert</span>
                  </button>
                  {openMenuDomainId === domain.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpenMenuDomainId(null)}
                        aria-hidden="true"
                      />
                      <div
                        role="menu"
                        aria-label="Domain actions"
                        className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-20 overflow-hidden min-w-max"
                      >
                        <button
                          role="menuitem"
                          type="button"
                          onClick={() => {
                            setOpenMenuDomainId(null);
                            setDetailsModalDomain(domain);
                          }}
                          className="w-full px-4 py-3 text-left text-[#1b1b1b] hover:bg-white/5 transition-colors flex items-center gap-3 text-sm"
                        >
                          <span className="material-symbols-outlined text-base" aria-hidden="true">info</span>
                          Details
                        </button>
                        <button
                          role="menuitem"
                          type="button"
                          onClick={() => {
                            setOpenMenuDomainId(null);
                            navigate(`/dashboard/domains/edit/${domain.id}`);
                          }}
                          className="w-full px-4 py-3 text-left text-[#1b1b1b] hover:bg-white/5 transition-colors flex items-center gap-3 text-sm"
                        >
                          <span className="material-symbols-outlined text-base" aria-hidden="true">edit</span>
                          Edit Root
                        </button>
                        <button
                          role="menuitem"
                          type="button"
                          onClick={() => {
                            setOpenMenuDomainId(null);
                            handleDeleteClick(domain.id, domain.domain);
                          }}
                          className="w-full px-4 py-3 text-left text-red-500 hover:bg-red-400/10 transition-colors flex items-center gap-3 text-sm"
                        >
                          <span className="material-symbols-outlined text-base" aria-hidden="true">delete</span>
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal – full domain info (DNS, verified date, etc.) */}
      {detailsModalDomain && (
        <Modal
          isOpen={!!detailsModalDomain}
          onClose={() => setDetailsModalDomain(null)}
          title={detailsModalDomain.domain}
          type="alert"
          message={
            <div className="space-y-4 text-left">
              {/* Verify DNS – when pending/error */}
              {(detailsModalDomain.status === 'pending' || detailsModalDomain.status === 'error') && (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      handleVerifyDNS(detailsModalDomain);
                      setDetailsModalDomain(null);
                    }}
                    className="px-4 py-2 bg-[#a855f7] hover:bg-[#9333ea] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#a855f7]/20 flex items-center justify-center gap-2 text-sm"
                  >
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">verified</span>
                    Verify DNS
                  </button>
                </div>
              )}

              {/* DNS Records */}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">dns</span>
                    <p className="text-xs uppercase tracking-widest font-black">
                      DNS Configuration Required
                    </p>
                  </div>
                  {(() => {
                    const currentRecords = getDnsRecordsArray(
                      dnsRecordsByDomainId[detailsModalDomain.id] ?? detailsModalDomain.dns_records
                    );
                    const validRecordsCount = Array.isArray(currentRecords)
                      ? currentRecords.filter((r) => r && (r.host || r.name) && r.value).length
                      : 0;
                    if (validRecordsCount >= 6) return null;

                    return (
                      <button
                        type="button"
                        onClick={() => fetchDomainRecords(detailsModalDomain)}
                        disabled={!!dnsLoadingByDomainId[detailsModalDomain.id]}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-white hover:border-[#a855f7] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        <span
                          className={`material-symbols-outlined text-sm ${dnsLoadingByDomainId[detailsModalDomain.id] ? 'animate-spin' : ''}`}
                          aria-hidden="true"
                        >
                          refresh
                        </span>
                        Refresh
                      </button>
                    );
                  })()}
                </div>

                {(() => {
                  const displayedRecords = getDnsRecordsArray(
                    dnsRecordsByDomainId[detailsModalDomain.id] ?? detailsModalDomain.dns_records
                  );
                  if (!displayedRecords || displayedRecords.length === 0) {
                    return (
                      <div className="bg-card-bg border border-card-border rounded-xl p-4 text-sm text-[#1b1b1b]">
                        {dnsLoadingByDomainId[detailsModalDomain.id]
                          ? 'Loading DNS records...'
                          : 'No DNS records available yet.'}
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-1 gap-4 max-h-[60vh] overflow-y-auto">
                      {displayedRecords.map((record, idx) => (
                        <div
                          key={idx}
                          className="bg-card-bg border border-card-border rounded-xl p-4 md:p-6 space-y-4 hover:shadow-card-mint transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded-lg font-bold text-xs uppercase tracking-wider">
                              Record {idx + 1}
                            </div>
                            <div className="h-px flex-1 bg-slate-200" />
                            <span className="text-xl text-primary font-black font-mono uppercase">
                              {record.type}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-slate-500 text-sm" aria-hidden="true">label</span>
                                <span className="text-[10px] uppercase font-black text-slate-600 tracking-[0.2em]">
                                  Host / Name
                                </span>
                              </div>
                              <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                                <code className="text-sm md:text-base text-black font-mono font-bold flex-1 truncate selection:bg-primary/40">
                                  {record.host || record.name}
                                </code>
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard.writeText(record.host || record.name)}
                                  className="w-10 h-10 flex items-center justify-center bg-white hover:bg-slate-100 text-[#1b1b1b] rounded-lg border border-slate-200 transition-all"
                                  title="Copy Host"
                                  aria-label="Copy host value"
                                >
                                  <span className="material-symbols-outlined text-xl" aria-hidden="true">content_copy</span>
                                </button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-slate-500 text-sm" aria-hidden="true">shortcut</span>
                                <span className="text-[10px] uppercase font-black text-slate-600 tracking-[0.2em]">
                                  Target Value
                                </span>
                              </div>
                              <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                                <code className="text-sm md:text-lg text-black font-mono font-bold flex-1 break-all leading-tight selection:bg-primary/30">
                                  {record.value}
                                </code>
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard.writeText(record.value)}
                                  className="w-10 h-10 flex items-center justify-center bg-white hover:bg-slate-100 text-[#1b1b1b] rounded-lg border border-slate-200 transition-all flex-shrink-0"
                                  title="Copy Value"
                                  aria-label="Copy target value"
                                >
                                  <span className="material-symbols-outlined text-xl" aria-hidden="true">content_copy</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Last Verified */}
              {detailsModalDomain.verified_at && (
                <div className="pt-4 border-t border-slate-200 text-[11px] md:text-sm text-slate-500 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">calendar_today</span>
                  <span className="font-semibold uppercase tracking-wide">Last Verified:</span>
                  <span className="text-slate-600">
                    {new Date(detailsModalDomain.verified_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          }
        />
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

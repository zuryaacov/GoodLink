import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/common/Modal';

const CustomDomainsManager = () => {
  const navigate = useNavigate();
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
    
    setDeleteModalState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const { error } = await supabase
        .from('custom_domains')
        .update({ 
          status: 'deleted',
          deleted_at: new Date().toISOString()
        })
        .eq('id', deleteModalState.domainId);

      if (error) throw error;
      
      setDeleteModalState({ isOpen: false, domainId: null, domainName: '', isLoading: false });
      fetchDomains();
    } catch (error) {
      console.error('Error deleting domain:', error);
      setDeleteModalState(prev => ({ ...prev, isLoading: false }));
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Loading domains...</div>
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
        <div className="grid grid-cols-1 gap-6 w-full">
          {domains.map((domain) => (
            <div
              key={domain.id}
              className="bg-[#101622] border border-[#232f48] rounded-2xl p-6 md:p-10 transition-all hover:bg-white/5 hover:border-primary/40 flex flex-col gap-8 shadow-2xl"
            >
              {/* Domain Name & Status */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-[#232f48]">
                <div className="flex flex-col gap-4">
                  <h3 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight" title={domain.domain}>
                    {domain.domain}
                  </h3>
                  <div className={`inline-flex items-center self-start gap-2 px-4 py-1.5 rounded-xl border text-base font-bold uppercase tracking-wider ${getStatusColor(domain.status)}`}>
                    <span className="material-symbols-outlined text-xl">{getStatusIcon(domain.status)}</span>
                    <span>{domain.status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 self-end sm:self-center">
                   {/* Verify Button - Show if pending or error */}
                  {(domain.status === 'pending' || domain.status === 'error') && (
                    <button
                      onClick={() => handleVerifyDNS(domain)}
                      className="px-8 py-3 bg-[#FF10F0] hover:bg-[#e00ed0] text-white font-bold rounded-2xl transition-all shadow-lg shadow-[#FF10F0]/20 flex items-center justify-center gap-3 text-lg"
                    >
                      <span className="material-symbols-outlined text-2xl">verified</span>
                      Verify DNS
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteClick(domain.id, domain.domain)}
                    className="text-slate-500 hover:text-red-400 transition-colors p-3 bg-red-500/10 rounded-xl border border-red-500/20"
                    title="Delete domain"
                  >
                    <span className="material-symbols-outlined text-2xl md:text-3xl">delete</span>
                  </button>
                </div>
              </div>

              {/* DNS Records Detail Display */}
              {domain.dns_records && Array.isArray(domain.dns_records) && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-slate-400">
                    <span className="material-symbols-outlined">dns</span>
                    <p className="text-lg uppercase tracking-widest font-black">DNS Configuration Required</p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6">
                    {domain.dns_records.map((record, idx) => (
                      <div key={idx} className="bg-[#0b0f19] border-2 border-[#232f48] rounded-[2rem] p-8 md:p-12 space-y-8 hover:border-primary/30 transition-all shadow-inner">
                        {/* Record Type Header */}
                        <div className="flex items-center gap-6">
                          <div className="px-6 py-2 bg-primary text-white rounded-full font-black text-lg uppercase tracking-[0.2em]">Record {idx + 1}</div>
                          <div className="h-px flex-1 bg-[#232f48]"></div>
                          <span className="text-4xl text-primary font-black font-mono uppercase">{record.type}</span>
                        </div>

                        <div className="grid grid-cols-1 gap-8">
                          {/* Host / Name Section */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-slate-500">label</span>
                              <span className="text-sm uppercase font-black text-slate-500 tracking-[0.3em]">Host / Name</span>
                            </div>
                            <div className="flex items-center gap-4 bg-[#101622] p-6 rounded-2xl border-2 border-[#232f48] group hover:border-primary/20 transition-all">
                              <code className="text-2xl md:text-3xl text-white font-mono flex-1 truncate selection:bg-primary/40">
                                {record.host || record.name}
                              </code>
                              <button 
                                onClick={() => navigator.clipboard.writeText(record.host || record.name)}
                                className="w-16 h-16 flex items-center justify-center bg-[#232f48] hover:bg-primary text-white rounded-2xl transition-all shadow-xl active:scale-90"
                                title="Copy Host"
                              >
                                <span className="material-symbols-outlined text-3xl">content_copy</span>
                              </button>
                            </div>
                          </div>

                          {/* Target Value Section */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-slate-500">shortcut</span>
                              <span className="text-sm uppercase font-black text-slate-500 tracking-[0.3em]">Target Value</span>
                            </div>
                            <div className="flex items-center gap-4 bg-[#101622] p-6 md:p-8 rounded-2xl border-2 border-[#232f48] group hover:border-primary/40 transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                              <code className="text-2xl md:text-4xl text-green-400 font-mono flex-1 break-all leading-[1.3] selection:bg-primary/30">
                                {record.value}
                              </code>
                              <button 
                                onClick={() => navigator.clipboard.writeText(record.value)}
                                className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center bg-primary hover:bg-[#FF10F0] text-white rounded-[1.5rem] transition-all shadow-[0_0_30px_rgba(19,91,236,0.3)] hover:shadow-[0_0_40px_rgba(19,91,236,0.5)] active:scale-95 flex-shrink-0"
                                title="Copy Value"
                              >
                                <span className="material-symbols-outlined text-4xl md:text-5xl font-bold">content_copy</span>
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
                <div className="pt-6 border-t border-[#232f48] text-sm md:text-base text-slate-500 flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl">calendar_today</span>
                  <span className="font-semibold uppercase tracking-wide">Last Verified:</span>
                  <span className="text-slate-300">{new Date(domain.verified_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalState.isOpen}
        onClose={() => !deleteModalState.isLoading && setDeleteModalState({ ...deleteModalState, isOpen: false })}
        title="Delete this domain?"
        message={
          <>
            Are you sure you want to delete <strong>{deleteModalState.domainName}</strong>? This action cannot be undone.
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

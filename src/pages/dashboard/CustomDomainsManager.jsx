import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/common/Modal';
import AddDomainModal from '../../components/dashboard/AddDomainModal';

const CustomDomainsManager = () => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState(null);

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
          onClick={() => {
            setEditingDomain(null);
            setIsModalOpen(true);
          }}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {domains.map((domain) => (
            <div
              key={domain.id}
              className="bg-[#101622] border border-[#232f48] rounded-xl p-5 sm:p-6 transition-all hover:bg-white/5 hover:border-primary/30 flex flex-col gap-4"
            >
              {/* Domain Name & Status */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2 truncate" title={domain.domain}>
                    {domain.domain}
                  </h3>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs sm:text-sm font-medium ${getStatusColor(domain.status)}`}>
                    <span className="material-symbols-outlined text-sm sm:text-base">{getStatusIcon(domain.status)}</span>
                    <span className="capitalize">{domain.status}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteClick(domain.id, domain.domain)}
                  className="text-slate-400 hover:text-red-400 transition-colors p-2 flex-shrink-0"
                  title="Delete domain"
                >
                  <span className="material-symbols-outlined text-lg sm:text-xl">delete</span>
                </button>
              </div>

              {/* DNS Records - Show if pending or error */}
              {(domain.status === 'pending' || domain.status === 'error') && domain.dns_records && (
                <div className="pt-4 border-t border-[#232f48]">
                  <button
                    onClick={() => handleVerifyDNS(domain)}
                    className="w-full px-4 py-2.5 bg-[#FF10F0] hover:bg-[#e00ed0] text-white font-bold rounded-xl transition-colors"
                  >
                    Verify My DNS
                  </button>
                </div>
              )}

              {/* Verified Date */}
              {domain.verified_at && (
                <div className="text-xs text-slate-500">
                  Verified: {new Date(domain.verified_at).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Domain Modal */}
      {isModalOpen && (
        <AddDomainModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingDomain(null);
            fetchDomains();
          }}
          domain={editingDomain}
        />
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

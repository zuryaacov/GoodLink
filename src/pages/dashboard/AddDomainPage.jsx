import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft } from 'lucide-react';
import DNSRecordsDisplay from '../../components/dashboard/DNSRecordsDisplay';

const AddDomainPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [domainName, setDomainName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dnsRecords, setDnsRecords] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [savedDomainId, setSavedDomainId] = useState(null);
  const [cloudflareHostnameId, setCloudflareHostnameId] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [verifyError, setVerifyError] = useState(null);
  const [initialLoading, setInitialLoading] = useState(!!id);

  const steps = [
    { number: 1, title: 'Domain', subtitle: 'Enter your domain' },
    { number: 2, title: 'DNS Setup', subtitle: 'Configure DNS records' },
    { number: 3, title: 'Verify', subtitle: 'Verify configuration' },
  ];

  useEffect(() => {
    if (id) {
      fetchDomain();
    }
  }, [id]);

  const fetchDomain = async () => {
    try {
      setInitialLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/dashboard/domains');
        return;
      }

      const { data, error } = await supabase
        .from('custom_domains')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!data) {
        navigate('/dashboard/domains');
        return;
      }

      setDomainName(data.domain || '');
      setSavedDomainId(data.id);
      setCloudflareHostnameId(data.cloudflare_hostname_id);
      
      // If domain already has DNS records, fetch them
      if (data.cloudflare_hostname_id) {
        // Fetch DNS records from Cloudflare
        const workerUrl = import.meta.env.VITE_WORKER_URL || 'https://glynk.to';
        const apiUrl = `${workerUrl}/api/get-domain-records`;
        
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cloudflare_hostname_id: data.cloudflare_hostname_id }),
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.dns_records) {
              setDnsRecords(result.dns_records);
              setCurrentStep(2);
            }
          }
        } catch (err) {
          console.error('Error fetching DNS records:', err);
        }
      }
    } catch (error) {
      console.error('Error fetching domain:', error);
      navigate('/dashboard/domains');
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchDnsRecords = async () => {
    if (!cloudflareHostnameId) return;
    
    setIsSubmitting(true);
    const workerUrl = import.meta.env.VITE_WORKER_URL || 'https://glynk.to';
    const apiUrl = `${workerUrl}/api/get-domain-records`;
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloudflare_hostname_id: cloudflareHostnameId }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.dns_records) {
          setDnsRecords(result.dns_records);
        }
      }
    } catch (err) {
      console.error('Error fetching DNS records:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!domainName || !domainName.trim()) {
        return;
      }
      
      const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
      if (!domainRegex.test(domainName.trim())) {
        return;
      }

      if (!savedDomainId) {
        setIsSubmitting(true);
        setSaveError(null);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          const workerUrl = import.meta.env.VITE_WORKER_URL || 'https://glynk.to';
          const apiUrl = `${workerUrl}/api/add-custom-domain`;

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              domain: domainName.trim(),
              user_id: user.id,
            }),
          });

          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(result.error || 'Failed to register domain with Cloudflare');
          }

          if (result.dns_records && result.dns_records.length > 0) {
            setDnsRecords(result.dns_records);
          }

          if (result.domain_id) {
            setSavedDomainId(result.domain_id);
          }
          if (result.cloudflare_hostname_id) {
            setCloudflareHostnameId(result.cloudflare_hostname_id);
          }
          
          setCurrentStep(2);
        } catch (error) {
          console.error('Error:', error);
          setSaveError(error.message || 'Error registering domain. Please try again.');
        } finally {
          setIsSubmitting(false);
        }
      } else {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerifyError(null);
    try {
      const domainId = savedDomainId;
      const hostnameId = cloudflareHostnameId;

      if (!domainId && !hostnameId) {
        throw new Error('Domain ID or Cloudflare hostname ID is required');
      }

      const workerUrl = import.meta.env.VITE_WORKER_URL || 'https://glynk.to';
      const apiUrl = `${workerUrl}/api/verify-custom-domain`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain_id: domainId,
          cloudflare_hostname_id: hostnameId,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to verify domain');
      }

      if (result.is_active) {
        navigate('/dashboard/domains');
      } else {
        setVerifyError(`DNS records are still pending. Status: ${result.ssl_status || 'pending'}. Please wait a few minutes and try again.`);
      }
    } catch (error) {
      console.error('Error:', error);
      setVerifyError(error.message || 'Error verifying domain. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-slate-600 animate-spin">refresh</span>
          <p className="text-slate-400 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] pb-8">
      {/* Header with back button */}
      <div className="sticky top-0 z-10 bg-[#0b0f19] border-b border-slate-800 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/domains')}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-white">
            {id ? 'Edit Domain' : 'Add Custom Domain'}
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Stepper */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base ${
                      currentStep >= step.number
                        ? 'bg-primary text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {step.number}
                  </div>
                  <div
                    className={`mt-1 text-sm text-center whitespace-nowrap ${
                      currentStep >= step.number ? 'text-white' : 'text-slate-500'
                    }`}
                  >
                    {step.title}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-0.5 flex-shrink-0 ${
                      currentStep > step.number ? 'bg-primary' : 'bg-slate-800'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Domain Name
                </label>
                <input
                  type="text"
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  placeholder="links.mybrand.com"
                  disabled={!!id}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Enter your domain (e.g., links.mybrand.com)
                </p>
                {saveError && (
                  <p className="text-red-400 text-xs mt-2">
                    {saveError}
                  </p>
                )}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">DNS Configuration</h3>
                    <p className="text-sm text-slate-400">
                      Add these DNS records to your domain registrar
                    </p>
                  </div>
                  <button
                    onClick={fetchDnsRecords}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors border border-slate-700"
                  >
                    <span className={`material-symbols-outlined text-sm ${isSubmitting ? 'animate-spin' : ''}`}>refresh</span>
                    Refresh Records
                  </button>
                </div>
                {dnsRecords && <DNSRecordsDisplay records={dnsRecords} domain={domainName} />}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-bold text-white">Verify DNS Records</h3>
                <p className="text-sm text-slate-400">
                  Click below to verify that your DNS records are configured correctly. This may take a few minutes after adding the DNS records.
                </p>
                {verifyError && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-left">
                    <p className="text-red-400 text-sm font-medium">{verifyError}</p>
                  </div>
                )}
                <button
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                >
                  {isVerifying ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">refresh</span>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">verified</span>
                      Verify DNS Records
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800 gap-4">
          <button
            onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : navigate('/dashboard/domains')}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors"
          >
            {currentStep === 1 ? 'Cancel' : 'Previous'}
          </button>
          <div className="text-slate-400 text-sm">
            Step {currentStep} of {steps.length}
          </div>
          {currentStep < steps.length && (
            <button
              onClick={handleNext}
              disabled={!domainName.trim() || isSubmitting}
              className="px-6 py-3 bg-[#FF10F0] hover:bg-[#e00ed0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin">refresh</span>
                  Saving...
                </>
              ) : (
                'Next'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddDomainPage;

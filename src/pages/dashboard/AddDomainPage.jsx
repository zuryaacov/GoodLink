import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft } from 'lucide-react';
import DNSRecordsDisplay from '../../components/dashboard/DNSRecordsDisplay';
import { validateDomain } from '../../lib/domainValidation';
import { validateUrl } from '../../lib/urlValidation';

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
  const [rootRedirect, setRootRedirect] = useState('');
  const [rootRedirectError, setRootRedirectError] = useState(null);

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
      setRootRedirect(data.root_redirect || '');

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
        body: JSON.stringify({
          cloudflare_hostname_id: cloudflareHostnameId,
          domain_id: savedDomainId,
        }),
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

  // Validate URL format for root redirect - uses same validation as target URL + min 3 char domain
  const validateRootRedirectUrl = (url) => {
    if (!url || url.trim() === '') {
      return { isValid: true, sanitized: '' }; // Optional field
    }

    // Use the same comprehensive validation as target URL
    const result = validateUrl(url);

    if (!result.isValid) {
      return { isValid: false, error: result.error };
    }

    // Additional check: domain name must be at least 3 characters (like domain validation)
    try {
      const urlObj = new URL(result.normalizedUrl);
      const hostParts = urlObj.hostname.split('.');

      // Handle two-part TLDs like co.il, co.uk, com.br, etc.
      const twoPartTLDs = [
        'co.il',
        'org.il',
        'net.il',
        'ac.il',
        'gov.il',
        'muni.il',
        'k12.il',
        'co.uk',
        'org.uk',
        'ac.uk',
        'gov.uk',
        'me.uk',
        'net.uk',
        'com.au',
        'net.au',
        'org.au',
        'edu.au',
        'gov.au',
        'co.nz',
        'net.nz',
        'org.nz',
        'govt.nz',
        'ac.nz',
        'co.za',
        'org.za',
        'net.za',
        'gov.za',
        'ac.za',
        'com.br',
        'net.br',
        'org.br',
        'gov.br',
        'edu.br',
        'co.jp',
        'ne.jp',
        'or.jp',
        'ac.jp',
        'go.jp',
        'co.kr',
        'ne.kr',
        'or.kr',
        'ac.kr',
        'go.kr',
        'com.mx',
        'net.mx',
        'org.mx',
        'gob.mx',
        'edu.mx',
        'com.ar',
        'net.ar',
        'org.ar',
        'gov.ar',
        'edu.ar',
        'co.in',
        'net.in',
        'org.in',
        'gov.in',
        'ac.in',
        'com.sg',
        'net.sg',
        'org.sg',
        'gov.sg',
        'edu.sg',
        'com.hk',
        'net.hk',
        'org.hk',
        'gov.hk',
        'edu.hk',
        'com.tw',
        'net.tw',
        'org.tw',
        'gov.tw',
        'edu.tw',
        'com.cn',
        'net.cn',
        'org.cn',
        'gov.cn',
        'edu.cn',
      ];

      let domainName;
      if (hostParts.length >= 3) {
        const possibleTwoPartTLD = `${hostParts[hostParts.length - 2]}.${hostParts[hostParts.length - 1]}`;
        if (twoPartTLDs.includes(possibleTwoPartTLD.toLowerCase())) {
          // Two-part TLD - domain is the part before that
          domainName = hostParts[hostParts.length - 3];
        } else {
          // Single TLD
          domainName = hostParts[hostParts.length - 2];
        }
      } else if (hostParts.length === 2) {
        domainName = hostParts[0];
      }

      if (domainName && domainName.length < 3 && domainName !== 'www') {
        return { isValid: false, error: 'Domain name must be at least 3 characters' };
      }
    } catch (e) {
      // URL already validated above, this shouldn't fail
    }

    return { isValid: true, sanitized: result.normalizedUrl };
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      // Validate domain using comprehensive validation
      const validation = validateDomain(domainName, {
        allowSubdomains: true,
        allowPunycode: true,
        requireTLD: true,
        allowLocalhost: false,
        allowIP: false,
      });

      if (!validation.isValid) {
        setSaveError(validation.error);
        return;
      }

      // Validate root redirect URL if provided
      const rootRedirectValidation = validateRootRedirectUrl(rootRedirect);
      if (!rootRedirectValidation.isValid) {
        setRootRedirectError(rootRedirectValidation.error);
        return;
      }
      setRootRedirectError(null);

      // Clear any previous errors
      setSaveError(null);

      if (!savedDomainId) {
        setIsSubmitting(true);
        setSaveError(null);
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          // Use sanitized domain from validation and add www. if not present
          let finalDomain = validation.sanitized;
          if (!finalDomain.startsWith('www.')) {
            finalDomain = `www.${finalDomain}`;
          }

          // Update the domain name in state to reflect the www. prefix
          setDomainName(finalDomain);

          const workerUrl = import.meta.env.VITE_WORKER_URL || 'https://glynk.to';
          const apiUrl = `${workerUrl}/api/add-custom-domain`;

          // Get sanitized root redirect URL - store domain only (no https://) with www.
          const rootRedirectValidation = validateRootRedirectUrl(rootRedirect);
          let finalRootRedirect = null;
          if (rootRedirectValidation.sanitized) {
            // Remove protocol (https:// or http://)
            let rootDomain = rootRedirectValidation.sanitized.replace(/^https?:\/\//, '');
            // Add www. if not present
            if (!rootDomain.startsWith('www.')) {
              rootDomain = `www.${rootDomain}`;
            }
            finalRootRedirect = rootDomain;
          }

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              domain: finalDomain,
              user_id: user.id,
              root_redirect: finalRootRedirect,
            }),
          });

          if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            throw new Error(
              result.error || `HTTP ${response.status}: Failed to register domain with Cloudflare`
            );
          }

          const result = await response.json();

          if (!result.success) {
            throw new Error(
              result.error || 'Failed to register domain with Cloudflare. Please try again.'
            );
          }

          let currentRecords = result.dns_records || [];
          const hostnameId = result.cloudflare_hostname_id;

          if (result.domain_id) setSavedDomainId(result.domain_id);
          if (hostnameId) setCloudflareHostnameId(hostnameId);

          // Check if we have the SSL challenge record already
          const hasSslRecord = (records) =>
            records.some(
              (r) =>
                r.host?.toLowerCase().includes('_acme-challenge') ||
                r.name?.toLowerCase().includes('_acme-challenge')
            );

          if (!hasSslRecord(currentRecords) && hostnameId) {
            // Poll for up to 60 seconds (12 attempts every 5s)
            console.log('⏳ SSL record missing, starting poll...');
            setIsSubmitting(true);

            for (let i = 0; i < 15; i++) {
              // Wait 4 seconds between attempts
              await new Promise((resolve) => setTimeout(resolve, 4000));

              try {
                const pollRes = await fetch(`${workerUrl}/api/get-domain-records`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ cloudflare_hostname_id: hostnameId }),
                });

                if (pollRes.ok) {
                  const pollData = await pollRes.json();
                  if (pollData.dns_records && hasSslRecord(pollData.dns_records)) {
                    currentRecords = pollData.dns_records;
                    console.log('✅ SSL record found!');
                    break;
                  }
                }
              } catch (err) {
                console.error('Polling error:', err);
              }
            }
          }

          setDnsRecords(currentRecords);
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
    } else if (currentStep === 3) {
      // Final step - navigate back to domains list
      navigate('/dashboard/domains');
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

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `HTTP ${response.status}: Failed to verify domain`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(
          result.error || 'Domain verification failed. Please check your DNS records.'
        );
      }

      if (result.is_active) {
        navigate('/dashboard/domains');
      } else {
        const statusMessage = result.ssl_status
          ? `Status: ${result.ssl_status}`
          : 'DNS records not fully propagated yet';
        setVerifyError(
          `⚠️ DNS records are still pending. ${statusMessage}. Please wait a few minutes and try again.`
        );
      }
    } catch (error) {
      console.error('Error verifying domain:', error);
      const errorMessage =
        error.message || 'Error verifying domain. Please check your DNS records and try again.';
      setVerifyError(`❌ ${errorMessage}`);
    } finally {
      setIsVerifying(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-slate-600 animate-spin">
            refresh
          </span>
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
                <label className="block text-sm font-medium text-white mb-2">Domain Name</label>
                <input
                  type="text"
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  placeholder="mybrand.com"
                  disabled={!!id}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                />
                <p className="text-xs text-slate-500 mt-2">Enter your domain (e.g., mybrand.com)</p>
                {saveError && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mt-3">
                    <p className="text-red-400 text-sm font-medium">❌ {saveError}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">Root Redirect</label>
                <p className="text-sm font-bold mb-2 text-white">
                  Visitors accessing the domain without a referral slug will be automatically
                  redirected to the root domain.
                </p>
                <input
                  type="text"
                  value={rootRedirect}
                  onChange={(e) => {
                    setRootRedirect(e.target.value);
                    setRootRedirectError(null);
                  }}
                  placeholder="RootRedirect.com"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
                />
                {rootRedirectError && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mt-3">
                    <p className="text-red-400 text-sm font-medium">❌ {rootRedirectError}</p>
                  </div>
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
                  {!(Array.isArray(dnsRecords) && dnsRecords.length >= 3) && (
                    <button
                      onClick={fetchDnsRecords}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors border border-slate-700"
                    >
                      <span
                        className={`material-symbols-outlined text-sm ${isSubmitting ? 'animate-spin' : ''}`}
                      >
                        refresh
                      </span>
                      Refresh Records
                    </button>
                  )}
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
                  Click below to verify that your DNS records are configured correctly. This may
                  take a few minutes after adding the DNS records.
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
            onClick={() =>
              currentStep > 1 ? setCurrentStep(currentStep - 1) : navigate('/dashboard/domains')
            }
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors"
          >
            {currentStep === 1 ? 'Cancel' : 'Previous'}
          </button>
          <div className="text-slate-400 text-sm">
            Step {currentStep} of {steps.length}
          </div>
          <button
            onClick={handleNext}
            disabled={!domainName.trim() || isSubmitting}
            className="px-6 py-3 bg-[#FF10F0] hover:bg-[#e00ed0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined animate-spin">refresh</span>
                {currentStep === 1 ? 'Preparing records...' : 'Loading...'}
              </>
            ) : currentStep === 3 ? (
              'Add Domain'
            ) : (
              'Next'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddDomainPage;

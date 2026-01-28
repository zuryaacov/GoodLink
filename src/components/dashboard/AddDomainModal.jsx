import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import DNSRecordsDisplay from './DNSRecordsDisplay';
import { validateDomain } from '../../lib/domainValidation';
import { validateUrl } from '../../lib/urlValidation';

const AddDomainModal = ({ isOpen, onClose, domain = null }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [domainName, setDomainName] = useState(domain?.domain || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dnsRecords, setDnsRecords] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [savedDomainId, setSavedDomainId] = useState(domain?.id || null);
  const [cloudflareHostnameId, setCloudflareHostnameId] = useState(
    domain?.cloudflare_hostname_id || null
  );
  const [saveError, setSaveError] = useState(null);
  const [verifyError, setVerifyError] = useState(null);
  const [rootRedirect, setRootRedirect] = useState(domain?.root_redirect || '');
  const [rootRedirectError, setRootRedirectError] = useState(null);

  const steps = [
    { number: 1, title: 'Domain', subtitle: 'Enter your domain' },
    { number: 2, title: 'DNS Setup', subtitle: 'Configure DNS records' },
    { number: 3, title: 'Verify', subtitle: 'Verify configuration' },
  ];

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
      if (hostParts.length >= 2) {
        const domainName = hostParts[hostParts.length - 2]; // Get domain part before TLD
        if (domainName.length < 3) {
          return { isValid: false, error: 'Domain name must be at least 3 characters' };
        }
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

      // Save domain to database if it's a new domain
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

          // Get worker URL from environment variable
          // Fallback to glynk.to if not set (for production)
          const workerUrl = import.meta.env.VITE_WORKER_URL || 'https://glynk.to';
          const apiUrl = `${workerUrl}/api/add-custom-domain`;

          console.log('🔵 [AddDomain] Calling worker API:', apiUrl);

          // Get sanitized root redirect URL
          const rootRedirectValidation = validateRootRedirectUrl(rootRedirect);
          const finalRootRedirect = rootRedirectValidation.sanitized || null;

          // Call worker endpoint to register domain with Cloudflare
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
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

          console.log('✅ [AddDomain] Domain registered successfully:', result);

          // Set DNS records from Cloudflare response
          if (result.dns_records && result.dns_records.length > 0) {
            setDnsRecords(result.dns_records);
          }

          // Save domain ID and Cloudflare hostname ID
          if (result.domain_id) {
            setSavedDomainId(result.domain_id);
          }
          if (result.cloudflare_hostname_id) {
            setCloudflareHostnameId(result.cloudflare_hostname_id);
          }

          setCurrentStep(2);
        } catch (error) {
          console.error('❌ [AddDomain] Error:', error);
          setSaveError(error.message || 'Error registering domain. Please try again.');
        } finally {
          setIsSubmitting(false);
        }
      } else {
        // Domain already saved, just move to next step
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Final step - close modal
      onClose();
    }
  };

  const handleSubmit = async () => {
    // This function is no longer needed as we save in handleNext
    // But keeping it for backward compatibility
    onClose();
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerifyError(null);
    try {
      const domainId = savedDomainId || domain?.id;
      const hostnameId = cloudflareHostnameId || domain?.cloudflare_hostname_id;

      if (!domainId && !hostnameId) {
        throw new Error('Domain ID or Cloudflare hostname ID is required');
      }

      // Get worker URL from environment variable (fallback to glynk.to)
      const workerUrl = import.meta.env.VITE_WORKER_URL || 'https://glynk.to';
      const apiUrl = `${workerUrl}/api/verify-custom-domain`;

      console.log('🔵 [VerifyDomain] Calling worker API:', apiUrl);

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

      console.log('✅ [VerifyDomain] Verification result:', result);

      if (result.is_active) {
        // Domain is verified and active
        onClose();
        // Refresh the domains list (parent component should handle this)
      } else {
        // DNS records not yet verified
        const statusMessage = result.ssl_status
          ? `Status: ${result.ssl_status}`
          : 'DNS records not fully propagated yet';
        setVerifyError(
          `⚠️ DNS records are still pending. ${statusMessage}. Please wait a few minutes and try again.`
        );
      }
    } catch (error) {
      console.error('❌ [VerifyDomain] Error:', error);
      const errorMessage =
        error.message || 'Error verifying domain. Please check your DNS records and try again.';
      setVerifyError(`❌ ${errorMessage}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setDomainName(domain?.domain || '');
    setRootRedirect(domain?.root_redirect || '');
    setRootRedirectError(null);
    setDnsRecords(null);
    setSavedDomainId(domain?.id || null);
    setCloudflareHostnameId(domain?.cloudflare_hostname_id || null);
    setSaveError(null);
    setVerifyError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-x-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative bg-[#0b0f19] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-[#232f48]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-6 border-b border-[#232f48] flex-shrink-0">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              {domain ? 'Edit Domain' : 'Add Custom Domain'}
            </h2>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>

          {/* Stepper */}
          <div className="p-3 sm:p-6 border-b border-[#232f48] flex-shrink-0">
            <div className="flex justify-between items-center">
              {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-base ${
                        currentStep >= step.number
                          ? 'bg-primary text-white'
                          : 'bg-[#232f48] text-slate-400'
                      }`}
                    >
                      {step.number}
                    </div>
                    <div
                      className={`mt-1 text-xs sm:text-sm text-center whitespace-nowrap ${
                        currentStep >= step.number ? 'text-white' : 'text-slate-500'
                      }`}
                    >
                      {step.title}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-6 sm:w-12 h-0.5 flex-shrink-0 ${
                        currentStep > step.number ? 'bg-primary' : 'bg-[#232f48]'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4 sm:space-y-6"
                >
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Domain Name</label>
                    <input
                      type="text"
                      value={domainName}
                      onChange={(e) => setDomainName(e.target.value)}
                      placeholder="mybrand.com"
                      className="w-full px-4 py-3 bg-[#101622] border border-[#232f48] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
                      autoFocus
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Enter your domain (e.g., mybrand.com)
                    </p>
                    {saveError && (
                      <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mt-3">
                        <p className="text-red-400 text-sm font-medium">❌ {saveError}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Root Redirect
                    </label>
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
                      className="w-full px-4 py-3 bg-[#101622] border border-[#232f48] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
                    />
                    {rootRedirectError && (
                      <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mt-3">
                        <p className="text-red-400 text-sm font-medium">❌ {rootRedirectError}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4 sm:space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">DNS Configuration</h3>
                    <p className="text-sm text-slate-400 mb-4">
                      Add these DNS records to your domain registrar (e.g., Cloudflare, GoDaddy)
                    </p>
                    {dnsRecords && <DNSRecordsDisplay records={dnsRecords} domain={domainName} />}
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4 sm:space-y-6"
                >
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-3 sm:p-6 border-t border-[#232f48] flex-shrink-0 gap-2">
            <button
              onClick={() => (currentStep > 1 ? setCurrentStep(currentStep - 1) : handleClose())}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg sm:rounded-xl font-bold transition-colors flex-shrink-0 bg-[#232f48] text-white hover:bg-[#324467]"
            >
              {currentStep === 1 ? 'Cancel' : 'Previous'}
            </button>
            <div className="text-slate-400 text-xs sm:text-sm whitespace-nowrap">
              Step {currentStep} of {steps.length}
            </div>
            <button
              onClick={handleNext}
              disabled={!domainName.trim() || isSubmitting}
              className="px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm bg-[#FF10F0] hover:bg-[#e00ed0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg sm:rounded-xl transition-colors flex-shrink-0"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm sm:text-base mr-2">
                    refresh
                  </span>
                  Saving...
                </>
              ) : currentStep === 3 ? (
                'Add Domain'
              ) : (
                'Next'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AddDomainModal;

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import DNSRecordsDisplay from './DNSRecordsDisplay';

const AddDomainModal = ({ isOpen, onClose, domain = null }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [domainName, setDomainName] = useState(domain?.domain || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dnsRecords, setDnsRecords] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [savedDomainId, setSavedDomainId] = useState(domain?.id || null);
  const [cloudflareHostnameId, setCloudflareHostnameId] = useState(domain?.cloudflare_hostname_id || null);
  const [saveError, setSaveError] = useState(null);
  const [verifyError, setVerifyError] = useState(null);

  const steps = [
    { number: 1, title: 'Domain', subtitle: 'Enter your domain' },
    { number: 2, title: 'DNS Setup', subtitle: 'Configure DNS records' },
    { number: 3, title: 'Verify', subtitle: 'Verify configuration' },
  ];

  const handleNext = async () => {
    if (currentStep === 1) {
      // Validate domain format
      if (!domainName || !domainName.trim()) {
        return;
      }
      
      // Basic domain validation
      const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
      if (!domainRegex.test(domainName.trim())) {
        return;
      }

      // Save domain to database if it's a new domain
      if (!savedDomainId) {
        setIsSubmitting(true);
        setSaveError(null);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          // Get worker URL from environment variable
          // Fallback to glynk.to if not set (for production)
          const workerUrl = import.meta.env.VITE_WORKER_URL || 'https://glynk.to';
          const apiUrl = `${workerUrl}/api/add-custom-domain`;

          console.log('🔵 [AddDomain] Calling worker API:', apiUrl);

          // Call worker endpoint to register domain with Cloudflare
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              domain: domainName.trim(),
              user_id: user.id,
            }),
          });

          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(result.error || 'Failed to register domain with Cloudflare');
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

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to verify domain');
      }

      console.log('✅ [VerifyDomain] Verification result:', result);

      if (result.is_active) {
        // Domain is verified and active
        onClose();
        // Refresh the domains list (parent component should handle this)
      } else {
        // DNS records not yet verified
        setVerifyError(`DNS records are still pending. Status: ${result.ssl_status || 'pending'}. Please wait a few minutes and try again.`);
      }
    } catch (error) {
      console.error('❌ [VerifyDomain] Error:', error);
      setVerifyError(error.message || 'Error verifying domain. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setDomainName(domain?.domain || '');
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
            <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
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
                    <label className="block text-sm font-medium text-white mb-2">
                      Domain Name
                    </label>
                    <input
                      type="text"
                      value={domainName}
                      onChange={(e) => setDomainName(e.target.value)}
                      placeholder="links.mybrand.com"
                      className="w-full px-4 py-3 bg-[#101622] border border-[#232f48] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
                      autoFocus
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-3 sm:p-6 border-t border-[#232f48] flex-shrink-0 gap-2">
            <button
              onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : handleClose()}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg sm:rounded-xl font-bold transition-colors flex-shrink-0 bg-[#232f48] text-white hover:bg-[#324467]"
            >
              {currentStep === 1 ? 'Cancel' : 'Previous'}
            </button>
            <div className="text-slate-400 text-xs sm:text-sm whitespace-nowrap">
              Step {currentStep} of {steps.length}
            </div>
            {currentStep < steps.length ? (
              <button
                onClick={handleNext}
                disabled={!domainName.trim() || isSubmitting}
                className="px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm bg-[#FF10F0] hover:bg-[#e00ed0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg sm:rounded-xl transition-colors flex-shrink-0"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm sm:text-base mr-2">refresh</span>
                    Saving...
                  </>
                ) : (
                  'Next'
                )}
              </button>
            ) : null}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AddDomainModal;

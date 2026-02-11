import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DNSRecordsDisplay from './DNSRecordsDisplay';

const STEPS = [
  {
    id: 'domain',
    badge: 'Start',
    badgeColor: 'text-[#10b981] bg-[#10b981]/10',
    title: 'Enter your',
    highlight: 'Domain',
    highlightClass: 'bg-gradient-to-r from-[#FF10F0] to-[#bc13fe] bg-clip-text text-transparent',
    subtitle: 'Your custom domain (e.g. mybrand.com). We’ll use www by default.',
  },
  {
    id: 'rootRedirect',
    badge: 'Redirect',
    badgeColor: 'text-orange-500 bg-orange-500/10',
    title: 'Root',
    highlight: 'Redirect',
    highlightClass: 'text-orange-500',
    subtitle: 'Optional. Where to send visitors who open the domain without a slug.',
  },
  {
    id: 'dns',
    badge: 'DNS',
    badgeColor: 'text-[#135bec] bg-[#135bec]/10',
    title: 'DNS',
    highlight: 'Setup',
    highlightClass: 'bg-gradient-to-r from-[#135bec] to-[#42a5f5] bg-clip-text text-transparent',
    subtitle: 'Add these records at your domain registrar.',
  },
  {
    id: 'verify',
    badge: 'Verify',
    badgeColor: 'text-yellow-500 bg-yellow-500/10',
    title: 'Verify',
    highlight: 'Configuration',
    highlightClass: 'text-yellow-500',
    subtitle: 'Confirm DNS is set up correctly. May take a few minutes after adding records.',
  },
];

export default function DomainWizardOnePerPage({
  domainName,
  rootRedirect,
  onDomainNameChange,
  onRootRedirectChange,
  dnsRecords,
  onRegister,
  onVerify,
  onRefreshDns,
  onBack,
  isSubmitting,
  isVerifying,
  saveError,
  verifyError,
  rootRedirectError,
  isEdit,
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [localError, setLocalError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const totalSteps = STEPS.length;
  const currentStep = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;
  const progressPct = totalSteps ? ((stepIndex + 1) / totalSteps) * 100 : 0;

  const goNext = async () => {
    if (currentStep.id === 'domain') {
      if (!domainName?.trim()) {
        setFieldErrors((prev) => ({ ...prev, domain: 'Domain is required.' }));
        return;
      }
      setFieldErrors((prev) => ({ ...prev, domain: null }));
      setStepIndex(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (currentStep.id === 'rootRedirect') {
      if (rootRedirectError) {
        setFieldErrors((prev) => ({
          ...prev,
          rootRedirect: rootRedirectError || 'Please fix the redirect URL first.',
        }));
        return;
      }
      setFieldErrors((prev) => ({ ...prev, rootRedirect: null }));
      setLocalError(null);
      try {
        await onRegister(domainName, rootRedirect);
        setStepIndex(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (e) {
        setLocalError(e.message || 'Failed to register domain.');
      }
      return;
    }
    if (currentStep.id === 'dns') {
      setStepIndex(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (currentStep.id === 'verify') {
      onBack?.();
    }
  };

  const goBack = () => {
    if (!isFirst) {
      setStepIndex((i) => i - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onBack?.();
    }
  };

  const errorToShow = localError || saveError;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="h-1 bg-[#232f48] flex-shrink-0">
        <div
          className="h-full bg-[#135bec] transition-all duration-500 shadow-[0_0_10px_#135bec]"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#135bec] opacity-[0.04] blur-[150px] pointer-events-none"
        aria-hidden="true"
      />
      <div className="flex-1 min-h-0 flex flex-col justify-center px-6 pb-32 pt-8 max-w-2xl mx-auto w-full relative z-10">
        {(errorToShow || verifyError) && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
            {currentStep.id === 'verify' ? verifyError : errorToShow}
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep?.id}
            initial={{ opacity: 0, transform: 'translateY(10px)' }}
            animate={{ opacity: 1, transform: 'translateY(0)' }}
            exit={{ opacity: 0, transform: 'translateY(-10px)' }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center w-full">
                <div
                  className={`inline-flex items-center gap-2 font-bold text-[10px] tracking-[0.2em] uppercase px-3 py-1 rounded-full ${currentStep?.badgeColor}`}
                >
                  <span>{currentStep?.badge}</span>
                </div>
                <span className="text-[10px] font-black text-gray-500 tracking-widest">
                  {stepIndex + 1}/{totalSteps}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                {currentStep?.title}{' '}
                <span
                  className={
                    currentStep?.highlightClass ||
                    'bg-gradient-to-r from-[#FF10F0] to-[#bc13fe] bg-clip-text text-transparent'
                  }
                >
                  {currentStep?.highlight}
                </span>
              </h1>
              <p className="text-gray-400 font-medium text-sm">{currentStep?.subtitle}</p>
            </div>

            {currentStep?.id === 'domain' && (
              <div className="space-y-5">
                <div className="rounded-2xl bg-[#101622] border-2 border-[#232f48] focus-within:border-[#135bec] transition-all">
                  <input
                    type="text"
                    value={domainName}
                    onChange={(e) => {
                      onDomainNameChange?.(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, domain: null }));
                    }}
                    placeholder="mybrand.com"
                    disabled={!!isEdit}
                    className="w-full bg-transparent py-5 px-6 text-xl outline-none border-none text-white placeholder-slate-500 disabled:opacity-60"
                  />
                </div>
                {fieldErrors.domain && <p className="text-red-400 text-xs">{fieldErrors.domain}</p>}
                <p className="text-slate-500 text-xs">
                  We’ll use www (e.g. www.mybrand.com) for the hostname.
                </p>
              </div>
            )}

            {currentStep?.id === 'rootRedirect' && (
              <div className="space-y-5">
                <div className="rounded-2xl bg-[#101622] border-2 border-[#232f48] focus-within:border-[#135bec] transition-all">
                  <input
                    type="text"
                    value={rootRedirect}
                    onChange={(e) => {
                      onRootRedirectChange?.(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, rootRedirect: null }));
                    }}
                    placeholder="https://example.com"
                    className="w-full bg-transparent py-5 px-6 text-xl outline-none border-none text-white placeholder-slate-500"
                  />
                </div>
                {fieldErrors.rootRedirect && (
                  <p className="text-red-400 text-xs">{fieldErrors.rootRedirect}</p>
                )}
                {rootRedirectError && <p className="text-red-400 text-xs">{rootRedirectError}</p>}
                <p className="text-slate-500 text-xs">
                  Leave empty if you don’t need a redirect for the root URL.
                </p>
              </div>
            )}

            {currentStep?.id === 'dns' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  {!(Array.isArray(dnsRecords) && dnsRecords.length >= 3) && (
                    <button
                      type="button"
                      onClick={onRefreshDns}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-3 py-2 bg-[#232f48] hover:bg-[#324467] text-white text-sm font-medium rounded-xl transition-colors border border-[#232f48]"
                    >
                      <span
                        className={`material-symbols-outlined text-lg ${isSubmitting ? 'animate-spin' : ''}`}
                      >
                        refresh
                      </span>
                      Refresh Records
                    </button>
                  )}
                </div>
                {dnsRecords && dnsRecords.length > 0 ? (
                  <DNSRecordsDisplay records={dnsRecords} domain={domainName} />
                ) : (
                  <div className="rounded-2xl bg-[#101622] border border-[#232f48] p-6 text-slate-400 text-sm">
                    No DNS records yet. Complete the previous step to generate records.
                  </div>
                )}
              </div>
            )}

            {currentStep?.id === 'verify' && (
              <div className="space-y-6">
                <p className="text-slate-400 text-sm">
                  Click the button below to verify your DNS configuration. Propagation can take a
                  few minutes after adding records.
                </p>
                <button
                  type="button"
                  onClick={onVerify}
                  disabled={isVerifying}
                  className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-bold text-lg bg-[#10b981] hover:bg-[#0d9668] text-white disabled:opacity-60 disabled:cursor-not-allowed transition-all border-2 border-[#10b981]/30"
                >
                  {isVerifying ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-2xl">
                        refresh
                      </span>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-2xl">verified</span>
                      Verify DNS Records
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-[#0b0f19]/95 backdrop-blur border-t border-[#232f48] z-50">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            type="button"
            onClick={goBack}
            className={`flex items-center justify-center p-5 rounded-2xl border border-[#232f48] font-bold text-gray-400 hover:bg-[#232f48] hover:text-white transition-all ${isFirst ? 'invisible' : ''}`}
          >
            <span className="material-symbols-outlined text-2xl">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={currentStep?.id === 'rootRedirect' && isSubmitting}
            className="flex-1 flex items-center justify-center gap-3 py-5 rounded-2xl font-extrabold text-xl tracking-tight transition-all bg-[#FF10F0] hover:bg-[#e00ed0] text-white disabled:opacity-60 disabled:cursor-not-allowed shadow-xl"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-2xl">refresh</span>
                {currentStep?.id === 'rootRedirect' ? 'Preparing records...' : 'Loading...'}
              </>
            ) : currentStep?.id === 'verify' ? (
              <>
                <span>Done</span>
                <span className="material-symbols-outlined text-2xl">arrow_forward</span>
              </>
            ) : (
              <>
                <span>Next Step</span>
                <span className="material-symbols-outlined text-2xl">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}

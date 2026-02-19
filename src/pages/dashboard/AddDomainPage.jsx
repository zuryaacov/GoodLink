import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft } from 'lucide-react';
import DomainWizardOnePerPage from '../../components/dashboard/DomainWizardOnePerPage';
import { validateDomain } from '../../lib/domainValidation';
import { validateUrl } from '../../lib/urlValidation';

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

const BLOCKED_ROOT_REDIRECT_HOSTS = ['glynk.to', 'goodlink.ai'];

function normalizeHostForComparison(value) {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim().toLowerCase();
  const withoutProtocol = trimmed.replace(/^https?:\/\//, '');
  const hostOnly = withoutProtocol.split('/')[0].split('?')[0].split('#')[0];
  const withoutPort = hostOnly.replace(/:\d+$/, '');
  const withoutTrailingDot = withoutPort.replace(/\.$/, '');
  return withoutTrailingDot.replace(/^www\./, '');
}

function isBlockedRootRedirectHost(host) {
  return BLOCKED_ROOT_REDIRECT_HOSTS.some(
    (blockedHost) => host === blockedHost || host.endsWith(`.${blockedHost}`)
  );
}

function validateRootRedirectUrl(url, customDomain = '') {
  if (!url || !url.trim()) return { isValid: true, sanitized: '' };
  const result = validateUrl(url);
  if (!result.isValid) return { isValid: false, error: result.error };
  try {
    const urlObj = new URL(result.normalizedUrl);
    const redirectHostForComparison = normalizeHostForComparison(urlObj.hostname || '');
    const customHostForComparison = normalizeHostForComparison(customDomain);

    if (isBlockedRootRedirectHost(redirectHostForComparison)) {
      return {
        isValid: false,
        error: 'Root redirect cannot point to glynk.to or goodlink.ai.',
      };
    }

    if (customHostForComparison && redirectHostForComparison === customHostForComparison) {
      return {
        isValid: false,
        error: 'Root redirect cannot be the same as your custom domain.',
      };
    }

    const hostParts = urlObj.hostname.split('.');
    let domainName;
    if (hostParts.length >= 3) {
      const possibleTwoPartTLD = `${hostParts[hostParts.length - 2]}.${hostParts[hostParts.length - 1]}`;
      domainName = twoPartTLDs.includes(possibleTwoPartTLD.toLowerCase())
        ? hostParts[hostParts.length - 3]
        : hostParts[hostParts.length - 2];
    } else if (hostParts.length === 2) {
      domainName = hostParts[0];
    }
    if (domainName && domainName.length < 2 && domainName !== 'www') {
      return { isValid: false, error: 'Invalid domain' };
    }
  } catch (_) {}
  return { isValid: true, sanitized: result.normalizedUrl };
}

const AddDomainPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [domainName, setDomainName] = useState('');
  const [rootRedirect, setRootRedirect] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dnsRecords, setDnsRecords] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [savedDomainId, setSavedDomainId] = useState(null);
  const [cloudflareHostnameId, setCloudflareHostnameId] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [verifyError, setVerifyError] = useState(null);
  const [rootRedirectError, setRootRedirectError] = useState(null);
  const [initialLoading, setInitialLoading] = useState(!!id);

  const workerUrl = import.meta.env.VITE_WORKER_URL || 'https://glynk.to';

  useEffect(() => {
    if (id) fetchDomain();
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
      if (data.cloudflare_hostname_id) {
        try {
          const res = await fetch(`${workerUrl}/api/get-domain-records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cloudflare_hostname_id: data.cloudflare_hostname_id }),
          });
          if (res.ok) {
            const result = await res.json();
            if (result.dns_records) setDnsRecords(result.dns_records);
          }
        } catch (_) {}
      }
    } catch (err) {
      console.error('Error fetching domain:', err);
      navigate('/dashboard/domains');
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchDnsRecords = async () => {
    if (!cloudflareHostnameId) return;
    setIsSubmitting(true);
    setSaveError(null);
    try {
      const res = await fetch(`${workerUrl}/api/get-domain-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloudflare_hostname_id: cloudflareHostnameId,
          domain_id: savedDomainId,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.dns_records) setDnsRecords(result.dns_records);
      }
    } catch (err) {
      console.error('Error fetching DNS records:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const normalizeRootRedirectForStorage = (sanitizedUrl) => {
    if (!sanitizedUrl) return null;
    return sanitizedUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  };

  const handleUpdateRootRedirectOnly = async (name, redirect) => {
    const validation = validateDomain(name, {
      allowSubdomains: true,
      allowPunycode: true,
      requireTLD: true,
      allowLocalhost: false,
      allowIP: false,
    });
    if (!validation.isValid) throw new Error(validation.error);

    const finalDomain = validation.sanitized;
    setDomainName(finalDomain);

    const rootValidation = validateRootRedirectUrl(redirect, finalDomain);
    if (!rootValidation.isValid) {
      setRootRedirectError(rootValidation.error);
      throw new Error(rootValidation.error);
    }
    setRootRedirectError(null);

    const finalRootRedirect = normalizeRootRedirectForStorage(rootValidation.sanitized);
    const { error } = await supabase
      .from('custom_domains')
      .update({
        root_redirect: finalRootRedirect,
        updated_at: new Date().toISOString(),
      })
      .eq('id', savedDomainId);
    if (error) throw error;

    setRootRedirect(finalRootRedirect || '');
  };

  const handleRegister = async (name, redirect) => {
    const validation = validateDomain(name, {
      allowSubdomains: true,
      allowPunycode: true,
      requireTLD: true,
      allowLocalhost: false,
      allowIP: false,
    });
    if (!validation.isValid) throw new Error(validation.error);
    const finalDomain = validation.sanitized;
    const rootValidation = validateRootRedirectUrl(redirect, finalDomain);
    if (!rootValidation.isValid) {
      setRootRedirectError(rootValidation.error);
      throw new Error(rootValidation.error);
    }
    setRootRedirectError(null);
    setSaveError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Use sanitized domain as-is (naked or with subdomain per user input – no forcing www.)
    setDomainName(finalDomain);

    let finalRootRedirect = null;
    if (rootValidation.sanitized) {
      finalRootRedirect = rootValidation.sanitized.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }

    const response = await fetch(`${workerUrl}/api/add-custom-domain`, {
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
    if (!result.success)
      throw new Error(
        result.error || 'Failed to register domain with Cloudflare. Please try again.'
      );

    let currentRecords = result.dns_records || [];
    const hostnameId = result.cloudflare_hostname_id;
    if (result.domain_id) setSavedDomainId(result.domain_id);
    if (hostnameId) setCloudflareHostnameId(hostnameId);

    const hasSslRecord = (records) =>
      records?.some(
        (r) =>
          r.host?.toLowerCase().includes('_acme-challenge') ||
          r.name?.toLowerCase().includes('_acme-challenge')
      );
    if (!hasSslRecord(currentRecords) && hostnameId) {
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 4000));
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
              break;
            }
          }
        } catch (_) {}
      }
    }
    setDnsRecords(currentRecords);
  };

  const handleVerify = async () => {
    setVerifyError(null);
    setIsVerifying(true);
    try {
      const domainId = savedDomainId;
      const hostnameId = cloudflareHostnameId;
      if (!domainId && !hostnameId)
        throw new Error('Domain ID or Cloudflare hostname ID is required');
      const res = await fetch(`${workerUrl}/api/verify-custom-domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain_id: domainId, cloudflare_hostname_id: hostnameId }),
      });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        throw new Error(result.error || `HTTP ${res.status}: Failed to verify domain`);
      }
      const result = await res.json();
      if (!result.success)
        throw new Error(
          result.error || 'Domain verification failed. Please check your DNS records.'
        );
      if (Array.isArray(result.dns_records)) {
        setDnsRecords(result.dns_records);
      }
      if (result.is_active) {
        navigate('/dashboard/domains');
      } else {
        const statusMessage = result.ssl_status
          ? `Status: ${result.ssl_status}`
          : 'DNS records not fully propagated yet';
        setVerifyError(
          `DNS records are still pending. ${statusMessage}. Please wait a few minutes and try again.`
        );
      }
    } catch (err) {
      setVerifyError(
        err.message || 'Error verifying domain. Please check your DNS records and try again.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  if (initialLoading || (id && !domainName && !savedDomainId)) {
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
    <div className="min-h-screen bg-[#0b0f19] flex flex-col">
      <div className="flex-shrink-0 z-10 bg-[#0b0f19] border-b border-slate-800 px-4 py-4">
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
      <div className="flex-1 min-h-0 flex flex-col">
        <DomainWizardOnePerPage
          domainName={domainName}
          rootRedirect={rootRedirect}
          onDomainNameChange={setDomainName}
          onRootRedirectChange={(v) => {
            setRootRedirect(v);
            setRootRedirectError(null);
          }}
          dnsRecords={dnsRecords}
          onRegister={async (name, redirect) => {
            setSaveError(null);
            setIsSubmitting(true);
            try {
              if (savedDomainId) {
                await handleUpdateRootRedirectOnly(name, redirect);
              } else {
                await handleRegister(name, redirect);
              }
            } catch (e) {
              setSaveError(e.message);
              throw e;
            } finally {
              setIsSubmitting(false);
            }
          }}
          onVerify={handleVerify}
          onRefreshDns={fetchDnsRecords}
          onBack={() => navigate('/dashboard/domains')}
          isSubmitting={isSubmitting}
          isVerifying={isVerifying}
          saveError={saveError}
          verifyError={verifyError}
          rootRedirectError={rootRedirectError}
          isEdit={!!id}
        />
      </div>
    </div>
  );
};

export default AddDomainPage;

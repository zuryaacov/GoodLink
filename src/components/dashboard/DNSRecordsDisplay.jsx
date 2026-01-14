import React, { useState } from 'react';
import { motion } from 'framer-motion';

// Extract host from full Cloudflare hostname
const extractDnsHost = (fullCfhName, userDomain) => {
  // fullCfhName: _cf-custom-hostname.www.tipul4u.com
  // userDomain: tipul4u.com
  
  if (!fullCfhName || !userDomain) return "";

  // Check if the string ends with the user's domain
  const suffix = `.${userDomain}`;
  if (fullCfhName.endsWith(suffix)) {
    // Cut from the start until before the domain's dot
    return fullCfhName.slice(0, -suffix.length);
  }
  
  return fullCfhName;
};

const DNSRecordsDisplay = ({ records, domain }) => {
  const [copiedField, setCopiedField] = useState(null);

  const handleCopy = async (value, fieldName) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Find TXT records - take the first one (ownership verification comes first from worker)
  // Note: Worker sends 'txt' (lowercase) but we check case-insensitively
  const txtRecords = records?.filter(r => r.type?.toUpperCase() === 'TXT') || [];
  const ownershipRecord = txtRecords[0]; // First TXT record is ownership verification
  
  // Find CNAME record (also case-insensitive)
  const cnameRecord = records?.find(r => r.type?.toUpperCase() === 'CNAME');

  // Extract host for TXT record
  const txtHost = ownershipRecord?.host ? extractDnsHost(ownershipRecord.host, domain || '') : (ownershipRecord?.host || '');
  
  // Extract subdomain from domain (e.g., "www" from "www.userdomain.com")
  const getSubdomain = (domainName) => {
    if (!domainName) return '@';
    const parts = domainName.split('.');
    if (parts.length > 2) {
      return parts[0]; // e.g., "www" from "www.userdomain.com"
    }
    return '@'; // Root domain
  };
  
  const cnameHost = getSubdomain(domain);
  const fallbackOrigin = cnameRecord?.value || 'glynk.to';

  const CopyButton = ({ value, fieldName, className = "" }) => (
    <button
      onClick={() => handleCopy(value, fieldName)}
      className={`px-3 py-1.5 bg-[#232f48] hover:bg-[#324467] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${className}`}
    >
      {copiedField === fieldName ? (
        <>
          <span className="material-symbols-outlined text-sm">check</span>
          Copied
        </>
      ) : (
        <>
          <span className="material-symbols-outlined text-sm">content_copy</span>
          Copy
        </>
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h4 className="text-lg font-bold text-white mb-2">🌐 Connect Your Custom Domain</h4>
        <p className="text-sm text-slate-400">
          Follow these steps to point your domain to our platform.
        </p>
      </div>

      {/* Step 1: Verify Ownership */}
      {ownershipRecord && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#101622] border border-[#232f48] rounded-xl p-5 space-y-4"
        >
          <div>
            <h5 className="text-base font-bold text-white mb-1">Step 1: Verify Ownership (TXT Record)</h5>
            <p className="text-sm text-slate-400 mb-4">
              You need to prove you own this domain to generate an SSL certificate.
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-500 mb-1 block">Type:</label>
                <code className="block px-3 py-2 bg-[#0b0f19] border border-[#232f48] rounded-lg text-sm text-white font-mono">
                  TXT
                </code>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <label className="text-xs text-slate-500 mb-1 block">Host/Name:</label>
                <code className="block px-3 py-2 bg-[#0b0f19] border border-[#232f48] rounded-lg text-sm text-white font-mono break-all">
                  {txtHost || ownershipRecord.host}
                </code>
              </div>
              <div className="flex-shrink-0 pt-6">
                <CopyButton value={txtHost || ownershipRecord.host} fieldName="txt-host" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <label className="text-xs text-slate-500 mb-1 block">Value:</label>
                <code className="block px-3 py-2 bg-[#0b0f19] border border-[#232f48] rounded-lg text-sm text-white font-mono break-all">
                  {ownershipRecord.value}
                </code>
              </div>
              <div className="flex-shrink-0 pt-6">
                <CopyButton value={ownershipRecord.value} fieldName="txt-value" />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Step 2: Point Traffic */}
      {cnameRecord && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#101622] border border-[#232f48] rounded-xl p-5 space-y-4"
        >
          <div>
            <h5 className="text-base font-bold text-white mb-1">Step 2: Point Traffic (CNAME Record)</h5>
            <p className="text-sm text-slate-400 mb-4">
              Connect your subdomain to our servers.
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-500 mb-1 block">Type:</label>
                <code className="block px-3 py-2 bg-[#0b0f19] border border-[#232f48] rounded-lg text-sm text-white font-mono">
                  CNAME
                </code>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <label className="text-xs text-slate-500 mb-1 block">Host/Name:</label>
                <code className="block px-3 py-2 bg-[#0b0f19] border border-[#232f48] rounded-lg text-sm text-white font-mono break-all">
                  {cnameHost}
                </code>
                <p className="text-xs text-slate-500 mt-1">(e.g., "www" or "links")</p>
              </div>
              <div className="flex-shrink-0 pt-6">
                <CopyButton value={cnameHost} fieldName="cname-host" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <label className="text-xs text-slate-500 mb-1 block">Target/Value:</label>
                <code className="block px-3 py-2 bg-[#0b0f19] border border-[#232f48] rounded-lg text-sm text-white font-mono break-all">
                  {fallbackOrigin}
                </code>
                <p className="text-xs text-slate-500 mt-1">(Your Fallback Origin)</p>
              </div>
              <div className="flex-shrink-0 pt-6">
                <CopyButton value={fallbackOrigin} fieldName="cname-value" />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Common Pitfalls */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
        <h6 className="text-sm font-bold text-yellow-400 mb-2">⚠️ Common Pitfalls to Avoid:</h6>
        <ul className="space-y-2 text-xs text-slate-300">
          <li>
            <strong>Double Domain Names:</strong> In the "Host" field, do not include your full domain. For example, use <code className="bg-[#0b0f19] px-1 py-0.5 rounded text-yellow-300">_cf-custom-hostname.www</code> instead of <code className="bg-[#0b0f19] px-1 py-0.5 rounded text-yellow-300">_cf-custom-hostname.www.tipul4u.com</code>.
          </li>
          <li>
            <strong>Propagation Time:</strong> DNS changes usually take 5–10 minutes but can take up to 24 hours in some cases.
          </li>
          <li>
            <strong>Cloudflare Users:</strong> If you are using Cloudflare for your own DNS, ensure the CNAME record is set to DNS Only (Grey Cloud), not Proxied.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default DNSRecordsDisplay;

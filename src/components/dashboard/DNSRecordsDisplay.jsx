import React, { useState } from 'react';
import { motion } from 'framer-motion';

// Extract host from full Cloudflare hostname
// This handles complex domains like co.il, com.au, etc.
// It removes only the root domain, keeping subdomains (like www) intact
const extractDnsHost = (fullCfhName, userDomainInput) => {
  if (!fullCfhName || !userDomainInput) return '';

  // 1. Trim whitespace and trailing dots
  const full = fullCfhName.trim().replace(/\.$/, '');
  const input = userDomainInput.trim().replace(/\.$/, '');

  // 2. Extract root domain from user input (e.g., "site.com" from "www.site.com")
  // Handle complex TLDs like co.il, com.au, etc.
  const domainParts = input.split('.');
  const isComplexTld = ['co.il', 'org.il', 'com.au', 'co.uk', 'net.au', 'org.uk'].some(
    (tld) => input.endsWith(`.${tld}`) || input === tld
  );
  const rootDomain = domainParts.slice(isComplexTld ? -3 : -2).join('.');

  // 3. Remove only the root domain from the end, keeping subdomains
  const suffixToRemove = `.${rootDomain}`;

  if (full.endsWith(suffixToRemove)) {
    return full.slice(0, -suffixToRemove.length);
  }

  // Fallback: if the full string doesn't end with root domain, return as-is
  return full;
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

  const normalizedRecords = (records || []).map((record, index) => {
    const rawHost = record?.host || record?.name || '';
    const displayHost = rawHost ? extractDnsHost(rawHost, domain || '') : '';
    return {
      id: `${record?.type || 'record'}-${index}`,
      type: (record?.type || 'TXT').toUpperCase(),
      host: displayHost || rawHost || '@',
      value: record?.value || '',
    };
  });

  const CopyButton = ({ value, fieldName, className = '' }) => (
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
          Add all records exactly as shown below.
        </p>
        <p className="text-xs text-primary mt-2 font-semibold">
          Total records: {normalizedRecords.length}
        </p>
      </div>

      {normalizedRecords.length > 0 ? (
        <div className="space-y-4">
          {normalizedRecords.map((record, index) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#101622] border border-[#232f48] rounded-xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h5 className="text-base font-bold text-white">Record {index + 1}</h5>
                <span className="px-2.5 py-1 rounded-md bg-primary/20 text-primary border border-primary/30 text-xs font-bold">
                  {record.type}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <label className="text-xs text-slate-500 mb-1 block">Host/Name:</label>
                    <code className="block px-3 py-2 bg-[#0b0f19] border border-[#232f48] rounded-lg text-sm text-white font-mono break-all">
                      {record.host}
                    </code>
                  </div>
                  <div className="flex-shrink-0 pt-6">
                    <CopyButton value={record.host} fieldName={`record-${index}-host`} />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <label className="text-xs text-slate-500 mb-1 block">Value:</label>
                    <code className="block px-3 py-2 bg-[#0b0f19] border border-[#232f48] rounded-lg text-sm text-white font-mono break-all">
                      {record.value}
                    </code>
                  </div>
                  <div className="flex-shrink-0 pt-6">
                    <CopyButton value={record.value} fieldName={`record-${index}-value`} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#101622]/50 border border-dashed border-[#232f48] rounded-xl p-6 text-center"
        >
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-primary animate-pulse text-3xl">
              pending
            </span>
            <div>
              <p className="text-white font-bold text-sm">Generating DNS Records...</p>
              <p className="text-slate-400 text-xs mt-1">
                Cloudflare is preparing your records. This can take up to 60 seconds.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Common Pitfalls */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
        <h6 className="text-sm font-bold text-yellow-400 mb-2">⚠️ Common Pitfalls to Avoid:</h6>
        <ul className="space-y-2 text-xs text-slate-300">
          <li>
            <strong>Double Domain Names:</strong> In the "Host" field, do not include your full
            domain. For example, use{' '}
            <code className="bg-[#0b0f19] px-1 py-0.5 rounded text-yellow-300">
              _cf-custom-hostname.www
            </code>{' '}
            instead of{' '}
            <code className="bg-[#0b0f19] px-1 py-0.5 rounded text-yellow-300">
              _cf-custom-hostname.www.tipul4u.com
            </code>
            .
          </li>
          <li>
            <strong>Propagation Time:</strong> DNS changes usually take 5–10 minutes but can take up
            to 24 hours in some cases.
          </li>
          <li>
            <strong>Cloudflare Users:</strong> If you are using Cloudflare for your own DNS, ensure
            the CNAME record is set to DNS Only (Grey Cloud), not Proxied.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default DNSRecordsDisplay;

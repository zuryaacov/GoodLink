import React, { useState } from "react";
import { motion } from "framer-motion";

// Extract host from full Cloudflare hostname
// This handles complex domains like co.il, com.au, etc.
// It removes only the root domain, keeping subdomains (like www) intact
const extractDnsHost = (fullCfhName, userDomainInput) => {
  if (!fullCfhName || !userDomainInput) return "";

  // 1. Trim whitespace and trailing dots
  const full = fullCfhName.trim().replace(/\.$/, "");
  const input = userDomainInput.trim().replace(/\.$/, "");

  // 2. Extract root domain from user input (e.g., "site.com" from "www.site.com")
  // Handle complex TLDs like co.il, com.au, etc.
  const domainParts = input.split(".");
  const isComplexTld = [
    "co.il",
    "org.il",
    "com.au",
    "co.uk",
    "net.au",
    "org.uk",
  ].some((tld) => input.endsWith(`.${tld}`) || input === tld);
  const rootDomain = domainParts.slice(isComplexTld ? -3 : -2).join(".");

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
      console.error("Failed to copy:", err);
    }
  };

  // Debug: Log the records we receive
  console.log('🔵 [DNSRecordsDisplay] All records:', records);
  console.log('🔵 [DNSRecordsDisplay] Domain:', domain);

  // Find TXT records - identify by their content/host instead of just index
  const txtRecords =
    records?.filter((r) => r.type?.toUpperCase() === "TXT") || [];
  
  // Ownership record typically starts with _cf-custom-hostname
  const ownershipRecord = txtRecords.find(r => 
    r.host?.toLowerCase().includes('_cf-custom-hostname') || 
    r.name?.toLowerCase().includes('_cf-custom-hostname')
  ) || txtRecords[0];

  // SSL record starts with _acme-challenge
  const sslRecord = txtRecords.find(r => 
    r.host?.toLowerCase().includes('_acme-challenge') || 
    r.name?.toLowerCase().includes('_acme-challenge')
  );
  
  console.log('🔵 [DNSRecordsDisplay] TXT records found:', txtRecords.length);
  console.log('🔵 [DNSRecordsDisplay] Ownership record:', ownershipRecord);
  console.log('🔵 [DNSRecordsDisplay] SSL record:', sslRecord);

  // Find CNAME record (also case-insensitive)
  const cnameRecord = records?.find((r) => r.type?.toUpperCase() === "CNAME");

  // Extract host for ownership TXT record
  const ownershipHost = ownershipRecord?.host
    ? extractDnsHost(ownershipRecord.host, domain || "")
    : ownershipRecord?.host || "";

  // Extract host for SSL TXT record
  const sslHost = sslRecord?.host
    ? extractDnsHost(sslRecord.host, domain || "")
    : sslRecord?.host || "";

  // Extract subdomain from domain (e.g., "www" from "www.userdomain.com")
  const getSubdomain = (domainName) => {
    if (!domainName) return "@";
    const parts = domainName.split(".");
    if (parts.length > 2) {
      return parts[0]; // e.g., "www" from "www.userdomain.com"
    }
    return "@"; // Root domain
  };

  const cnameHost = getSubdomain(domain);
  const fallbackOrigin = "www.glynk.to";

  const CopyButton = ({ value, fieldName, className = "" }) => (
    <button
      onClick={() => handleCopy(value, fieldName)}
      className={`px-3 py-1.5 bg-[#584674] hover:bg-[#6b5a87] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${className}`}
    >
      {copiedField === fieldName ? (
        <>
          <span className="material-symbols-outlined text-sm">check</span>
          Copied
        </>
      ) : (
        <>
          <span className="material-symbols-outlined text-sm">
            content_copy
          </span>
          Copy
        </>
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h4 className="text-lg font-bold text-white mb-2">
          🌐 Connect Your Custom Domain
        </h4>
        <p className="text-sm text-slate-400">
          Follow these steps to point your domain to our platform.
        </p>
      </div>

      {/* Step 1: Verify Ownership */}
      {ownershipRecord && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1e152f] border border-[#584674] rounded-xl p-5 space-y-4"
        >
          <div>
            <h5 className="text-base font-bold text-white mb-1">
              Step 1: Verify Ownership (TXT Record)
            </h5>
            <p className="text-sm text-slate-400 mb-4">
              You need to prove you own this domain to generate an SSL
              certificate.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-500 mb-1 block">
                  Type:
                </label>
                <code className="block px-3 py-2 bg-[#1e152f] border border-[#584674] rounded-lg text-sm text-white font-mono">
                  TXT
                </code>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <label className="text-xs text-slate-500 mb-1 block">
                  Host/Name:
                </label>
                <code className="block px-3 py-2 bg-[#1e152f] border border-[#584674] rounded-lg text-sm text-white font-mono break-all">
                  {ownershipHost || ownershipRecord.host}
                </code>
              </div>
              <div className="flex-shrink-0 pt-6">
                <CopyButton
                  value={ownershipHost || ownershipRecord.host}
                  fieldName="ownership-host"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <label className="text-xs text-slate-500 mb-1 block">
                  Value:
                </label>
                <code className="block px-3 py-2 bg-[#1e152f] border border-[#584674] rounded-lg text-sm text-white font-mono break-all">
                  {ownershipRecord.value}
                </code>
              </div>
              <div className="flex-shrink-0 pt-6">
                <CopyButton
                  value={ownershipRecord.value}
                  fieldName="ownership-value"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Step 2: SSL Verification */}
      {sslRecord ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1e152f] border border-[#584674] rounded-xl p-5 space-y-4"
        >
          <div>
            <h5 className="text-base font-bold text-white mb-1">
              Step 2: SSL Verification (TXT Record)
            </h5>
            <p className="text-sm text-slate-400 mb-4">
              Add this TXT record to enable SSL certificate generation.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-500 mb-1 block">
                  Type:
                </label>
                <code className="block px-3 py-2 bg-[#1e152f] border border-[#584674] rounded-lg text-sm text-white font-mono">
                  TXT
                </code>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <label className="text-xs text-slate-500 mb-1 block">
                  Host/Name:
                </label>
                <code className="block px-3 py-2 bg-[#1e152f] border border-[#584674] rounded-lg text-sm text-white font-mono break-all">
                  {sslHost || sslRecord.host}
                </code>
              </div>
              <div className="flex-shrink-0 pt-6">
                <CopyButton
                  value={sslHost || sslRecord.host}
                  fieldName="ssl-host"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <label className="text-xs text-slate-500 mb-1 block">
                  Value:
                </label>
                <code className="block px-3 py-2 bg-[#1e152f] border border-[#584674] rounded-lg text-sm text-white font-mono break-all">
                  {sslRecord.value}
                </code>
              </div>
              <div className="flex-shrink-0 pt-6">
                <CopyButton
                  value={sslRecord.value}
                  fieldName="ssl-value"
                />
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="bg-[#1e152f]/50 border border-dashed border-[#584674] rounded-xl p-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-primary animate-pulse text-3xl">pending</span>
            <div>
              <p className="text-white font-bold text-sm">Generating SSL Records...</p>
              <p className="text-slate-400 text-xs mt-1">
                Cloudflare is preparing your certificate. This usually takes 30-60 seconds.
              </p>
              <p className="text-primary text-[10px] uppercase tracking-wider font-bold mt-2">
                Wait a moment and click "Refresh Records" above
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Point Traffic */}
      {cnameRecord && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1e152f] border border-[#584674] rounded-xl p-5 space-y-4"
        >
          <div>
            <h5 className="text-base font-bold text-white mb-1">
              Step 3: Point Traffic (CNAME Record)
            </h5>
            <p className="text-sm text-slate-400 mb-4">
              Connect your subdomain to our servers.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-500 mb-1 block">
                  Type:
                </label>
                <code className="block px-3 py-2 bg-[#1e152f] border border-[#584674] rounded-lg text-sm text-white font-mono">
                  CNAME
                </code>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <label className="text-xs text-slate-500 mb-1 block">
                  Host/Name:
                </label>
                <code className="block px-3 py-2 bg-[#1e152f] border border-[#584674] rounded-lg text-sm text-white font-mono break-all">
                  {cnameHost}
                </code>
                <p className="text-xs text-slate-500 mt-1">
                  (e.g., "www" or "links")
                </p>
              </div>
              <div className="flex-shrink-0 pt-6">
                <CopyButton value={cnameHost} fieldName="cname-host" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <label className="text-xs text-slate-500 mb-1 block">
                  Target/Value:
                </label>
                <code className="block px-3 py-2 bg-[#1e152f] border border-[#584674] rounded-lg text-sm text-white font-mono break-all">
                  {fallbackOrigin}
                </code>
                <p className="text-xs text-slate-500 mt-1">
                  (Your Fallback Origin)
                </p>
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
        <h6 className="text-sm font-bold text-yellow-400 mb-2">
          ⚠️ Common Pitfalls to Avoid:
        </h6>
        <ul className="space-y-2 text-xs text-slate-300">
          <li>
            <strong>Double Domain Names:</strong> In the "Host" field, do not
            include your full domain. For example, use{" "}
            <code className="bg-[#1e152f] px-1 py-0.5 rounded text-yellow-300">
              _cf-custom-hostname.www
            </code>{" "}
            instead of{" "}
            <code className="bg-[#1e152f] px-1 py-0.5 rounded text-yellow-300">
              _cf-custom-hostname.www.tipul4u.com
            </code>
            .
          </li>
          <li>
            <strong>Propagation Time:</strong> DNS changes usually take 5–10
            minutes but can take up to 24 hours in some cases.
          </li>
          <li>
            <strong>Cloudflare Users:</strong> If you are using Cloudflare for
            your own DNS, ensure the CNAME record is set to DNS Only (Grey
            Cloud), not Proxied.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default DNSRecordsDisplay;

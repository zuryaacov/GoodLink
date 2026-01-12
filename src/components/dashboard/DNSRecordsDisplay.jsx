import React, { useState } from 'react';
import { motion } from 'framer-motion';

const DNSRecordsDisplay = ({ records }) => {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleCopy = async (value, index) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Mobile: Cards layout
  // Desktop: Table layout
  return (
    <>
      {/* Desktop: Table Layout */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#232f48]">
              <th className="text-left py-3 px-4 text-sm font-bold text-white">Type</th>
              <th className="text-left py-3 px-4 text-sm font-bold text-white">Host/Name</th>
              <th className="text-left py-3 px-4 text-sm font-bold text-white">Value</th>
              <th className="text-left py-3 px-4 text-sm font-bold text-white">Action</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <tr key={index} className="border-b border-[#232f48] hover:bg-[#101622]">
                <td className="py-3 px-4 text-sm text-white font-medium">{record.type}</td>
                <td className="py-3 px-4 text-sm text-slate-300 font-mono">{record.host}</td>
                <td className="py-3 px-4 text-sm text-slate-300 font-mono">{record.value}</td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => handleCopy(record.value, index)}
                    className="px-3 py-1.5 bg-[#232f48] hover:bg-[#324467] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    {copiedIndex === index ? (
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: Card Layout */}
      <div className="md:hidden space-y-3">
        {records.map((record, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#101622] border border-[#232f48] rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase">{record.type} Record</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-slate-500">Name: </span>
                  <span className="text-sm text-white font-mono font-bold break-all">{record.host}</span>
                </div>
                <button
                  onClick={() => handleCopy(record.host, `host-${index}`)}
                  className="px-2 py-1 bg-[#232f48] hover:bg-[#324467] text-white text-xs rounded-lg transition-colors flex-shrink-0"
                >
                  {copiedIndex === `host-${index}` ? (
                    <span className="material-symbols-outlined text-sm">check</span>
                  ) : (
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-slate-500">Value: </span>
                  <span className="text-sm text-white font-mono font-bold break-all">{record.value}</span>
                </div>
                <button
                  onClick={() => handleCopy(record.value, index)}
                  className="px-2 py-1 bg-[#232f48] hover:bg-[#324467] text-white text-xs rounded-lg transition-colors flex-shrink-0"
                >
                  {copiedIndex === index ? (
                    <span className="material-symbols-outlined text-sm">check</span>
                  ) : (
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </>
  );
};

export default DNSRecordsDisplay;

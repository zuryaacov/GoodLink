import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import countriesData from '../../data/countries.json';

const CountryPickerBottomSheet = ({ isOpen, onClose, onSelect, selectedCountry }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCountries = countriesData.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setSearchQuery(''); // Reset search when closing
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSelect = (countryCode) => {
    onSelect(countryCode);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Bottom Sheet */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="relative w-full bg-[#101622] rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col border-t border-[#232f48]"
        >
          {/* Handle Bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-slate-600 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-4 pb-3 border-b border-[#232f48]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white">Select Country</h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xl">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#0b0f19] border border-[#232f48] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
                autoFocus
              />
            </div>
          </div>

          {/* Countries List */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {filteredCountries.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm">No countries found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    onClick={() => handleSelect(country.code)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                      selectedCountry === country.code
                        ? 'bg-primary/20 border border-primary'
                        : 'bg-[#0b0f19] border border-transparent hover:bg-[#1a1f2e]'
                    }`}
                  >
                    <span className="text-2xl flex-shrink-0">{getCountryFlag(country.code)}</span>
                    <span className={`flex-1 text-left font-medium ${
                      selectedCountry === country.code ? 'text-white' : 'text-slate-300'
                    }`}>
                      {country.name}
                    </span>
                    <span className={`text-xs font-mono ${
                      selectedCountry === country.code ? 'text-primary' : 'text-slate-500'
                    }`}>
                      {country.code}
                    </span>
                    {selectedCountry === country.code && (
                      <span className="material-symbols-outlined text-primary text-xl">
                        check_circle
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// Helper function to get country flag emoji from country code
function getCountryFlag(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

export default CountryPickerBottomSheet;

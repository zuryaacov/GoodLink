import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import countriesData from '../../../data/countries.json';
import { validateUrl } from '../../../lib/urlValidation';
import Modal from '../../common/Modal';

const botActionOptions = [
  { value: 'block', label: 'Block', icon: '🚫', description: 'Block the request completely' },
  { value: 'redirect', label: 'Redirect', icon: '🔄', description: 'Send bots to a different link' },
  { value: 'no-tracking', label: 'No Tracking', icon: '⚡', description: 'Allow but skip pixel firing' },
];

const Step3Security = ({ formData, updateFormData }) => {
  const [showGeoRuleForm, setShowGeoRuleForm] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [editingRuleIndex, setEditingRuleIndex] = useState(null);
  const [newGeoRule, setNewGeoRule] = useState({ country: '', url: '' });
  const [geoRuleErrors, setGeoRuleErrors] = useState({ country: null, url: null });
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const countryPickerRef = useRef(null);
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'error',
    title: '',
    message: '',
    onConfirm: null,
    isLoading: false,
  });

  // Filter countries based on search query
  const filteredCountries = countriesData.filter(country =>
    country.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
    country.code.toLowerCase().includes(countrySearchQuery.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (countryPickerRef.current && !countryPickerRef.current.contains(event.target)) {
        setShowCountryPicker(false);
        setCountrySearchQuery('');
      }
    };

    if (showCountryPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCountryPicker]);

  const handleAddGeoRule = () => {
    // Clear previous errors
    setGeoRuleErrors({ country: null, url: null });

    // Validate country
    if (!newGeoRule.country || !newGeoRule.country.trim()) {
      setGeoRuleErrors({ country: 'Please select a country', url: null });
      return;
    }

    // Validate URL
    if (!newGeoRule.url || !newGeoRule.url.trim()) {
      setGeoRuleErrors({ country: null, url: 'Please enter a URL' });
      return;
    }

    // Validate URL format using the same validation as Step1
    const urlValidation = validateUrl(newGeoRule.url);
    if (!urlValidation.isValid) {
      setGeoRuleErrors({ country: null, url: urlValidation.error || 'Invalid URL format' });
      return;
    }

    // All validations passed
    const currentRules = Array.isArray(formData.geoRules) ? formData.geoRules : [];
    
    if (editingRuleIndex !== null) {
      // Edit existing rule
      const updatedRules = [...currentRules];
      updatedRules[editingRuleIndex] = { country: newGeoRule.country, url: urlValidation.normalizedUrl || newGeoRule.url };
      updateFormData('geoRules', updatedRules);
      setEditingRuleIndex(null);
    } else {
      // Add new rule
      updateFormData('geoRules', [...currentRules, { country: newGeoRule.country, url: urlValidation.normalizedUrl || newGeoRule.url }]);
    }
    
    setNewGeoRule({ country: '', url: '' });
    setGeoRuleErrors({ country: null, url: null });
    setShowGeoRuleForm(false);
  };

  const handleRemoveGeoRule = (index) => {
    const currentRules = Array.isArray(formData.geoRules) ? formData.geoRules : [];
    const updatedRules = currentRules.filter((_, i) => i !== index);
    updateFormData('geoRules', updatedRules);
  };

  const handleEditGeoRule = (index) => {
    const currentRules = Array.isArray(formData.geoRules) ? formData.geoRules : [];
    const rule = currentRules[index];
    setNewGeoRule({ country: rule.country, url: rule.url });
    setEditingRuleIndex(index);
    setShowGeoRuleForm(true);
  };


  const getCountryName = (countryCode) => {
    const country = countriesData.find(c => c.code === countryCode);
    return country ? country.name : countryCode;
  };

  const getCountryFlag = (countryCode) => {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 sm:space-y-8"
    >
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Security & Logic</h3>
        <p className="text-slate-400 text-sm">Smart Rules & Protection</p>
      </div>

      {/* Bot Action - Dropdown with Icons */}
      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Bot Detection Action
        </label>
        <p className="text-xs text-slate-500 mb-4">
          What should happen when a bot is detected?
        </p>
        <div className="space-y-2">
          {botActionOptions.map((option) => {
            const isSelected = formData.botAction === option.value;
            return (
              <button
                key={option.value}
                onClick={() => updateFormData('botAction', option.value)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-[#232f48] bg-[#0b0f19] hover:border-[#324467]'
                }`}
              >
                <div className="text-2xl">{option.icon}</div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">{option.label}</p>
                    {isSelected && (
                      <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs mt-1">{option.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Geo-Targeting - Mobile-First Card Design */}
      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Geo-Targeting Rules <span className="text-slate-500">(Optional)</span>
        </label>
        <p className="text-xs text-slate-500 mb-4">
          Set up routing rules based on visitor location
        </p>
        
        <div className="space-y-3 sm:space-y-4">
          {/* Default Link Card - Always First */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 sm:p-5 bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/30 rounded-xl"
          >
            <div className="flex items-start gap-3">
              <div className="px-3 py-1 bg-primary/20 text-primary rounded-lg font-bold text-xs sm:text-sm flex-shrink-0">
                Default
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm sm:text-base mb-1">
                  All other countries
                </p>
                <p className="text-slate-400 text-xs sm:text-sm truncate font-mono">
                  {formData.targetUrl || 'Default target URL'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Dynamic Rules */}
          {Array.isArray(formData.geoRules) && formData.geoRules.length > 0 && (
            <div className="space-y-3">
              {formData.geoRules.map((rule, index) => (
                // Hide the card if it's being edited (editingRuleIndex === index)
                editingRuleIndex === index ? null : (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative p-4 sm:p-5 bg-[#0b0f19] border border-[#232f48] rounded-xl hover:border-primary/30 transition-colors"
                >
                  {/* Delete Button - Top Right */}
                  <button
                    onClick={() => handleRemoveGeoRule(index)}
                    className="absolute top-3 right-3 text-[#FF10F0] hover:text-[#e00ed0] transition-colors p-1.5"
                    title="Delete rule"
                  >
                    <span className="material-symbols-outlined text-lg sm:text-xl">delete</span>
                  </button>

                  <div className="pr-10">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="px-3 py-1 bg-primary/20 text-primary rounded-lg font-bold text-xs sm:text-sm flex-shrink-0">
                        If
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm sm:text-base mb-2">
                          Country is
                        </p>
                        <button
                          onClick={() => handleEditGeoRule(index)}
                          className="flex items-center gap-2 px-3 py-2 bg-[#101622] border border-[#232f48] rounded-lg hover:border-primary transition-colors w-full text-left"
                        >
                          <span className="text-2xl">{getCountryFlag(rule.country)}</span>
                          <span className="text-white font-medium flex-1">{getCountryName(rule.country)}</span>
                          <span className="text-slate-500 text-xs font-mono">{rule.country}</span>
                          <span className="material-symbols-outlined text-slate-500 text-lg">edit</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg font-bold text-xs sm:text-sm flex-shrink-0">
                        Then
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm sm:text-base mb-2">
                          Go to URL
                        </p>
                        <input
                          type="url"
                          value={rule.url}
                          readOnly
                          className="w-full px-3 py-2 bg-[#101622] border border-[#232f48] rounded-lg text-white text-xs sm:text-sm font-mono truncate focus:outline-none"
                          onClick={() => handleEditGeoRule(index)}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
                )
              ))}
            </div>
          )}

          {/* Add New Rule Form */}
          {showGeoRuleForm ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-4 sm:p-5 bg-[#0b0f19] border-2 border-primary/50 rounded-xl space-y-4"
            >
              <div className="relative" ref={countryPickerRef}>
                <label className="block text-sm font-medium text-white mb-2">
                  If Country is
                </label>
                <button
                  onClick={() => setShowCountryPicker(!showCountryPicker)}
                  className={`w-full flex items-center gap-3 px-4 py-3 bg-[#101622] border rounded-xl transition-colors text-left ${
                    newGeoRule.country
                      ? 'border-primary'
                      : 'border-[#232f48] hover:border-primary/50'
                  }`}
                >
                  {newGeoRule.country ? (
                    <>
                      <span className="text-2xl">{getCountryFlag(newGeoRule.country)}</span>
                      <span className="text-white font-medium flex-1">{getCountryName(newGeoRule.country)}</span>
                      <span className="text-slate-500 text-xs font-mono">{newGeoRule.country}</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-slate-500">public</span>
                      <span className="text-slate-400 flex-1">Select country...</span>
                    </>
                  )}
                  <span className={`material-symbols-outlined text-slate-500 transition-transform ${showCountryPicker ? 'rotate-180' : ''}`}>arrow_drop_down</span>
                </button>
                {geoRuleErrors.country && (
                  <p className="text-red-400 text-xs mt-1">{geoRuleErrors.country}</p>
                )}
                
                {/* Dropdown Menu */}
                {showCountryPicker && (
                  <div className="absolute z-50 w-full mt-2 bg-[#101622] border border-[#232f48] rounded-xl shadow-2xl max-h-64 overflow-hidden flex flex-col">
                    {/* Search Input */}
                    <div className="p-3 border-b border-[#232f48]">
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                          search
                        </span>
                        <input
                          type="text"
                          value={countrySearchQuery}
                          onChange={(e) => setCountrySearchQuery(e.target.value)}
                          placeholder="Search country..."
                          className="w-full pl-10 pr-4 py-2 bg-[#0b0f19] border border-[#232f48] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors text-sm"
                          autoFocus
                        />
                      </div>
                    </div>
                    
                    {/* Countries List */}
                    <div className="overflow-y-auto max-h-48">
                      {filteredCountries.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-sm">No countries found</div>
                      ) : (
                        <div className="p-1">
                          {filteredCountries.map((country) => (
                            <button
                              key={country.code}
                              onClick={() => {
                                setNewGeoRule({ ...newGeoRule, country: country.code });
                                setShowCountryPicker(false);
                                setCountrySearchQuery('');
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                                newGeoRule.country === country.code
                                  ? 'bg-primary/20 border border-primary'
                                  : 'hover:bg-[#0b0f19] border border-transparent'
                              }`}
                            >
                              <span className="text-xl flex-shrink-0">{getCountryFlag(country.code)}</span>
                              <span className={`flex-1 font-medium ${
                                newGeoRule.country === country.code ? 'text-white' : 'text-slate-300'
                              }`}>
                                {country.name}
                              </span>
                              <span className={`text-xs font-mono ${
                                newGeoRule.country === country.code ? 'text-primary' : 'text-slate-500'
                              }`}>
                                {country.code}
                              </span>
                              {newGeoRule.country === country.code && (
                                <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Then go to URL
                </label>
                <input
                  type="url"
                  value={newGeoRule.url}
                  onChange={(e) => {
                    setNewGeoRule({ ...newGeoRule, url: e.target.value });
                    if (geoRuleErrors.url) setGeoRuleErrors({ ...geoRuleErrors, url: null });
                  }}
                  placeholder="https://example.com"
                  className={`w-full px-4 py-3 bg-[#101622] border rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none transition-colors ${
                    geoRuleErrors.url
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-[#232f48] focus:border-primary'
                  }`}
                />
                {geoRuleErrors.url && (
                  <p className="text-red-400 text-xs mt-1">{geoRuleErrors.url}</p>
                )}
              </div>

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={handleAddGeoRule}
                  disabled={!newGeoRule.country || !newGeoRule.url}
                  className="flex-1 px-4 py-2.5 sm:py-3 bg-[#FF10F0] hover:bg-[#e00ed0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm sm:text-base"
                >
                  {editingRuleIndex !== null ? 'Update Rule' : 'Add Rule'}
                </button>
                <button
                  onClick={() => {
                    setShowGeoRuleForm(false);
                    setNewGeoRule({ country: '', url: '' });
                    setEditingRuleIndex(null);
                    setGeoRuleErrors({ country: null, url: null });
                  }}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-[#232f48] hover:bg-[#324467] text-white font-medium rounded-xl transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          ) : (
            <button
              onClick={() => setShowGeoRuleForm(true)}
              className="w-full px-4 py-3 sm:py-4 border-2 border-dashed border-[#324467] text-slate-400 hover:text-white hover:border-[#FF10F0] rounded-xl transition-colors text-sm sm:text-base font-medium flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-xl sm:text-2xl">add</span>
              Add Geo-Rule
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500 mt-3">
          Example: "If visitor is from USA, redirect to URL A, otherwise redirect to default URL"
        </p>
      </div>

      {/* Error Modal */}
      <Modal
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        isLoading={modalState.isLoading}
      />
    </motion.div>
  );
};

export default Step3Security;

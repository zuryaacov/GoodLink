import React, { useState } from 'react';
import { motion } from 'framer-motion';
import countriesData from '../../../data/countries.json';
import CountryPickerBottomSheet from '../../common/CountryPickerBottomSheet';

const fraudShieldOptions = [
  { value: 'none', label: 'Off', description: 'No additional protection' },
  { value: 'standard', label: 'Standard', description: 'Turnstile CAPTCHA verification' },
  { value: 'aggressive', label: 'Aggressive', description: 'IPQS fraud detection + Turnstile' },
];

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

  const handleFraudShieldChange = (value) => {
    updateFormData('fraudShield', value);
  };

  const handleAddGeoRule = () => {
    if (newGeoRule.country && newGeoRule.url) {
      const currentRules = Array.isArray(formData.geoRules) ? formData.geoRules : [];
      
      if (editingRuleIndex !== null) {
        // Edit existing rule
        const updatedRules = [...currentRules];
        updatedRules[editingRuleIndex] = { ...newGeoRule };
        updateFormData('geoRules', updatedRules);
        setEditingRuleIndex(null);
      } else {
        // Add new rule
        updateFormData('geoRules', [...currentRules, { ...newGeoRule }]);
      }
      
      setNewGeoRule({ country: '', url: '' });
      setShowGeoRuleForm(false);
    }
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

  const handleSelectCountry = (countryCode) => {
    setNewGeoRule({ ...newGeoRule, country: countryCode });
    setShowCountryPicker(false);
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

  const getFraudShieldIndex = () => {
    return fraudShieldOptions.findIndex(opt => opt.value === formData.fraudShield);
  };

  const currentFraudShieldIndex = getFraudShieldIndex() >= 0 ? getFraudShieldIndex() : 0;

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

      {/* Fraud Shield - Slider */}
      <div>
        <label className="block text-sm font-medium text-white mb-4">
          Fraud Shield Protection
        </label>
        <div className="relative">
          {/* Slider Track */}
          <div className="relative h-16 bg-[#0b0f19] border-2 border-[#232f48] rounded-2xl p-2">
            <div className="relative h-full flex items-center">
              {/* Slider Handle */}
              <motion.div
                className="absolute top-0 bottom-0 w-1/3 bg-primary/20 rounded-xl"
                initial={false}
                animate={{
                  left: `${(currentFraudShieldIndex / (fraudShieldOptions.length - 1)) * 100}%`,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
              
              {/* Options */}
              <div className="relative w-full flex justify-between items-center h-full px-2">
                {fraudShieldOptions.map((option, index) => {
                  const isSelected = formData.fraudShield === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleFraudShieldChange(option.value)}
                      className={`flex-1 flex flex-col items-center justify-center h-full rounded-lg transition-all ${
                        isSelected
                          ? 'bg-primary/30 text-white scale-105'
                          : 'text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full mb-1 ${
                        isSelected ? 'bg-primary' : 'bg-slate-600'
                      }`} />
                      <span className="text-xs font-bold">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Selected Option Description */}
          <motion.div
            key={formData.fraudShield}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3 bg-[#0b0f19] border border-[#232f48] rounded-xl"
          >
            <p className="text-sm text-slate-300">
              {fraudShieldOptions[currentFraudShieldIndex]?.description}
            </p>
          </motion.div>
        </div>
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
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  If Country is
                </label>
                <button
                  onClick={() => setShowCountryPicker(true)}
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
                  <span className="material-symbols-outlined text-slate-500">arrow_drop_down</span>
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Then go to URL
                </label>
                <input
                  type="url"
                  value={newGeoRule.url}
                  onChange={(e) => setNewGeoRule({ ...newGeoRule, url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 bg-[#101622] border border-[#232f48] rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
                />
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

      {/* Country Picker Bottom Sheet */}
      <CountryPickerBottomSheet
        isOpen={showCountryPicker}
        onClose={() => setShowCountryPicker(false)}
        onSelect={handleSelectCountry}
        selectedCountry={newGeoRule.country}
      />
    </motion.div>
  );
};

export default Step3Security;

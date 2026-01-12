import React, { useState } from 'react';
import { motion } from 'framer-motion';

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
  const [newGeoRule, setNewGeoRule] = useState({ country: '', url: '' });

  const handleFraudShieldChange = (value) => {
    updateFormData('fraudShield', value);
  };

  const handleAddGeoRule = () => {
    if (newGeoRule.country && newGeoRule.url) {
      // Ensure geoRules is always an array
      const currentRules = Array.isArray(formData.geoRules) ? formData.geoRules : [];
      const updatedRules = [...currentRules, { ...newGeoRule }];
      updateFormData('geoRules', updatedRules);
      setNewGeoRule({ country: '', url: '' });
      setShowGeoRuleForm(false);
    }
  };

  const handleRemoveGeoRule = (index) => {
    // Ensure geoRules is always an array
    const currentRules = Array.isArray(formData.geoRules) ? formData.geoRules : [];
    const updatedRules = currentRules.filter((_, i) => i !== index);
    updateFormData('geoRules', updatedRules);
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
      className="space-y-8"
    >
      {/* Header */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white mb-2">Security & Logic</h3>
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

      {/* Geo-Targeting - If/Then Structure */}
      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Geo-Targeting Rules <span className="text-slate-500">(Optional)</span>
        </label>
        <p className="text-xs text-slate-500 mb-4">
          Set up routing rules based on visitor location
        </p>
        
        <div className="space-y-4">
          {/* Existing Rules */}
          {Array.isArray(formData.geoRules) && formData.geoRules.length > 0 ? (
            formData.geoRules.map((rule, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-[#0b0f19] border border-[#232f48] rounded-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-primary/20 text-primary rounded-lg font-bold text-sm">
                      If
                    </div>
                    <span className="text-white font-medium">Country is</span>
                    <div className="px-3 py-1 bg-slate-700 text-white rounded-lg font-mono text-sm">
                      {rule.country}
                    </div>
                    <span className="text-slate-400">→</span>
                    <span className="text-white font-medium">Go to</span>
                    <div className="px-3 py-1 bg-slate-700 text-white rounded-lg font-mono text-sm max-w-xs truncate">
                      {rule.url}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveGeoRule(index)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="p-6 bg-[#0b0f19] border border-dashed border-[#232f48] rounded-xl text-center">
              <p className="text-slate-500 text-sm">
                No geo-rules configured. All visitors will use the default target URL.
              </p>
            </div>
          )}

          {/* Add New Rule Form */}
          {showGeoRuleForm ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-4 bg-[#0b0f19] border border-primary/50 rounded-xl space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-primary/20 text-primary rounded-lg font-bold text-sm">
                  If
                </div>
                <span className="text-white font-medium">Country is</span>
                <input
                  type="text"
                  value={newGeoRule.country}
                  onChange={(e) => setNewGeoRule({ ...newGeoRule, country: e.target.value.toUpperCase() })}
                  placeholder="USA"
                  className="flex-1 px-3 py-1 bg-[#101622] border border-[#232f48] rounded-lg text-white text-sm focus:outline-none focus:border-primary transition-colors"
                  maxLength={3}
                />
                <span className="text-slate-400">→</span>
                <span className="text-white font-medium">Go to</span>
                <input
                  type="url"
                  value={newGeoRule.url}
                  onChange={(e) => setNewGeoRule({ ...newGeoRule, url: e.target.value })}
                  placeholder="https://example.com"
                  className="flex-1 px-3 py-1 bg-[#101622] border border-[#232f48] rounded-lg text-white text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddGeoRule}
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors"
                >
                  Add Rule
                </button>
                <button
                  onClick={() => {
                    setShowGeoRuleForm(false);
                    setNewGeoRule({ country: '', url: '' });
                  }}
                  className="px-4 py-2 bg-[#232f48] hover:bg-[#324467] text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          ) : (
            <button
              onClick={() => setShowGeoRuleForm(true)}
              className="w-full px-4 py-3 border-2 border-dashed border-[#324467] text-slate-400 hover:text-white hover:border-primary rounded-xl transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">add</span>
              Add Geo-Rule
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500 mt-3">
          Example: "If visitor is from USA, redirect to URL A, otherwise redirect to default URL"
        </p>
      </div>
    </motion.div>
  );
};

export default Step3Security;


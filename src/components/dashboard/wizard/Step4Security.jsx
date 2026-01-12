import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Modal from '../../common/Modal';

const Step4Security = ({ formData, updateFormData }) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Step 4: Security & Routing</h3>
        <p className="text-slate-400 text-sm">Advanced protection and routing options (Pro Features)</p>
      </div>

      {/* Fraud Shield */}
      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Fraud Shield Protection
        </label>
        <div className="space-y-2">
          {[
            { value: 'none', label: 'None', description: 'No additional protection' },
            { value: 'basic', label: 'Basic', description: 'Turnstile CAPTCHA verification' },
            { value: 'advanced', label: 'Advanced', description: 'IPQS fraud detection + Turnstile' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => updateFormData('fraudShield', option.value)}
              className={`w-full flex items-start justify-between p-4 rounded-xl border transition-colors text-left ${
                formData.fraudShield === option.value
                  ? 'border-primary bg-primary/10'
                  : 'border-[#232f48] bg-[#0b0f19] hover:border-[#324467]'
              }`}
            >
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    formData.fraudShield === option.value
                      ? 'border-primary bg-primary'
                      : 'border-slate-500'
                  }`}>
                    {formData.fraudShield === option.value && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <p className="text-white font-medium">{option.label}</p>
                </div>
                <p className="text-slate-500 text-xs ml-7">{option.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bot Action */}
      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Bot Detection Action
        </label>
        <p className="text-xs text-slate-500 mb-3">
          What should happen when a bot is detected?
        </p>
        <div className="space-y-2">
          {[
            { value: 'block', label: 'Block', description: 'Block the request completely' },
            { value: 'redirect', label: 'Redirect to Alternative URL', description: 'Send bots to a different link' },
            { value: 'no-tracking', label: 'Forward Without Tracking', description: 'Allow but skip pixel firing' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => updateFormData('botAction', option.value)}
              className={`w-full flex items-start justify-between p-4 rounded-xl border transition-colors text-left ${
                formData.botAction === option.value
                  ? 'border-primary bg-primary/10'
                  : 'border-[#232f48] bg-[#0b0f19] hover:border-[#324467]'
              }`}
            >
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    formData.botAction === option.value
                      ? 'border-primary bg-primary'
                      : 'border-slate-500'
                  }`}>
                    {formData.botAction === option.value && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <p className="text-white font-medium">{option.label}</p>
                </div>
                <p className="text-slate-500 text-xs ml-7">{option.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Geo-Targeting */}
      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Geo-Targeting Rules <span className="text-slate-500">(Optional)</span>
        </label>
        <div className="p-4 bg-[#0b0f19] border border-[#232f48] rounded-xl">
          <p className="text-slate-400 text-sm mb-4">
            Set up routing rules based on visitor location
          </p>
          <div className="space-y-3">
            {formData.geoRules && formData.geoRules.length > 0 ? (
              formData.geoRules.map((rule, index) => (
                <div key={index} className="p-3 bg-[#101622] rounded-lg border border-[#232f48]">
                  <p className="text-white text-sm font-medium">{rule.country} → {rule.url}</p>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-xs text-center py-4">
                No geo-rules configured. All visitors will use the default target URL.
              </p>
            )}
            <button
              onClick={() => {
                setModalOpen(true);
              }}
              className="w-full px-4 py-2 border border-dashed border-[#324467] text-slate-400 hover:text-white hover:border-primary rounded-lg transition-colors text-sm"
            >
              + Add Geo-Rule
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Example: "If visitor is from USA, redirect to URL A, otherwise redirect to URL B"
        </p>
      </div>

      {/* Info Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Coming Soon"
        message="Geo-targeting rule editor coming soon. For now, all visitors will use the default target URL."
        type="info"
      />
    </motion.div>
  );
};

export default Step4Security;



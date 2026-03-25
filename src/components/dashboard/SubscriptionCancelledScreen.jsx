import React from 'react';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Full-page screen shown when subscription_status === 'cancelled'.
 * Same visual style as "Unlock …" paywalls: blurred background, centered card.
 * Title: subscription cancelled; message: data saved, features frozen until renewal.
 */
const SubscriptionCancelledScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-[480px] w-full flex items-center justify-center p-6 overflow-hidden bg-white rounded-2xl border border-dashed border-card-border">
      <div className="absolute inset-0 opacity-[0.18] blur-[3px] pointer-events-none select-none p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="h-10 bg-[#141b2e] rounded-md w-1/3 mb-8" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 bg-[#141b2e] rounded-xl" />
            ))}
          </div>
          <div className="h-56 bg-[#141b2e] rounded-xl w-full" />
        </div>
      </div>
      <div className="relative z-10 max-w-xl w-full bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-3xl p-8 md:p-10 text-center">
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-400 blur-2xl opacity-25 animate-pulse" />
            <div className="relative bg-gradient-to-br from-amber-400 to-amber-500 p-4 rounded-2xl shadow-lg shadow-amber-500/40">
              <Lock className="w-8 h-8 text-[#1b1b1b]" />
            </div>
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-[#1b1b1b] mb-4 tracking-tight">
          Subscription Cancelled
        </h2>
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
          Your data is saved. Some features are temporarily frozen until you renew your subscription.
        </p>
        <button
          onClick={() => navigate('/dashboard/settings')}
          className="w-full inline-flex items-center justify-center gap-2 bg-[#a855f7] text-white font-bold py-3.5 px-8 rounded-2xl transition-all hover:bg-[#9333ea] shadow-xl shadow-[#a855f7]/30"
        >
          Renew in Account Settings
        </button>
      </div>
    </div>
  );
};

export default SubscriptionCancelledScreen;

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { checkForMaliciousInput, sanitizeInput } from '../../lib/inputSanitization';
import Modal from '../../components/common/Modal';

const PLAN_FEATURES = {
  free: {
    maxLinks: 50,
    maxClicks: '10K',
    domains: 0,
    pixels: 0,
    support: 'Community',
  },
  start: {
    maxLinks: 100,
    maxClicks: '50K',
    domains: 1,
    pixels: 2,
    support: 'Email',
  },
  advanced: {
    maxLinks: 500,
    maxClicks: '250K',
    domains: 3,
    pixels: 5,
    support: 'Priority',
  },
  pro: {
    maxLinks: 'Unlimited',
    maxClicks: '1M',
    domains: 5,
    pixels: 10,
    support: 'Priority',
  },
};

const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Jerusalem', label: 'Jerusalem (IST)' },
  { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
  { value: 'America/Denver', label: 'Denver (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
];

export default function AccountSettingsPage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState('UTC');

  // Password Change State
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState(null);

  // Usage counts (from DB, not profiles table)
  const [linksCount, setLinksCount] = useState(0);
  const [monthlyClicksCount, setMonthlyClicksCount] = useState(0);
  const [domainsCount, setDomainsCount] = useState(0);

  // Cancel subscription confirmation modal
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      // Get profile for extra data (plan, timezone, etc.)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData || {});
      setFullName(profileData?.full_name?.trim() || user.user_metadata?.full_name || '');
      setEmail(user.email || '');
      setTimezone(profileData?.timezone || 'UTC');

      // Fetch usage counts from actual tables
      const [linksRes, clicksRes, domainsRes] = await Promise.all([
        supabase
          .from('links')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .neq('status', 'deleted'),
        (() => {
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          const endOfMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59,
            999
          ).toISOString();
          return supabase
            .from('clicks')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('clicked_at', startOfMonth)
            .lte('clicked_at', endOfMonth);
        })(),
        supabase
          .from('custom_domains')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .neq('status', 'deleted'),
      ]);

      setLinksCount(linksRes?.count ?? 0);
      setMonthlyClicksCount(clicksRes?.count ?? 0);
      setDomainsCount(domainsRes?.count ?? 0);
    } catch (err) {
      console.error('Error fetching user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Validate User Input
      if (!fullName.trim() || fullName.length < 2) {
        throw new Error('Full name must be at least 2 characters.');
      }

      const nameCheck = sanitizeInput(fullName);
      if (!nameCheck.safe) throw new Error(nameCheck.error);

      // 2. Update Auth Metadata (Name, Email)
      const updates = {
        data: { full_name: nameCheck.sanitized || fullName },
      };

      // Only if email changed (requires email verification usually)
      if (email !== user.email) {
        updates.email = email;
      }

      const { error: authError } = await supabase.auth.updateUser(updates);
      if (authError) throw authError;

      // 3. Update Profile Table (full_name, timezone) – use UPDATE only; RLS allows UPDATE, not INSERT
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: nameCheck.sanitized || fullName.trim(),
          timezone: timezone,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // 4. Update Password (if requested)
      if (showPasswordChange && newPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error('New passwords do not match.');
        }
        if (newPassword.length < 8) {
          throw new Error('Password must be at least 8 characters long.');
        }
        const { error: passError } = await supabase.auth.updateUser({ password: newPassword });
        if (passError) throw passError;

        // Clear password fields on success
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordChange(false);
      }

      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(null), 3000);

      // Refresh user data
      fetchUserData();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPaywall = () => {
    // Trigger Paywall Modal (To be implemented or connected to context)
    console.log('Open Paywall Modal');
    // window.dispatchEvent(new CustomEvent('open-paywall')); // Example event
    alert('Upgrade flow coming soon! (Paywall Modal)');
  };

  const handleCancelSubscription = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'cancelled',
          subscription_cancelled_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (updateError) throw updateError;
      setShowCancelConfirmModal(false);
      setSuccess('Subscription marked as canceled.');
      setTimeout(() => setSuccess(null), 5000);
      fetchUserData();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update subscription.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[#1b1b1b]">
        <span className="material-symbols-outlined animate-spin text-4xl text-[#135bec]">
          refresh
        </span>
      </div>
    );
  }

  const isGoogleUser = user?.app_metadata?.provider === 'google';
  const currentPlan = profile?.plan_type || 'free'; // default to free
  const planDetails = PLAN_FEATURES[currentPlan] || PLAN_FEATURES.free;
  const portalUrl = profile?.lemon_squeezy_customer_portal_url;
  const hasPaidPlan = currentPlan !== 'free' && (currentPlan === 'start' || currentPlan === 'starter' || currentPlan === 'advanced' || currentPlan === 'pro');
  const currentPlanDisplay = currentPlan === 'start' || currentPlan === 'starter' ? 'Starter' : currentPlan === 'advanced' ? 'Advanced' : currentPlan === 'pro' ? 'Pro' : 'Free';

  const SETTINGS_PLANS = [
    { name: 'STARTER', price: '5', priceNum: 5, originalPrice: '10', description: 'Perfect for getting started', features: ['Unlimited Links', 'Unlimited QR Codes', 'Unlimited Clicks', 'Standard Analytics', 'Email Support'], highlighted: false, checkoutUrl: 'https://goodlink.lemonsqueezy.com/checkout/buy/54a3e3e3-3618-4922-bce6-a0617252f1ae?embed=1', buttonText: 'Get Started' },
    { name: 'ADVANCED', price: '10', priceNum: 10, originalPrice: '26', description: 'For growing businesses', features: ['Unlimited Links', '10 Custom Domains', 'Unlimited QR Codes', 'Unlimited Clicks', 'Workspaces, Campaigns and Groups', 'Bot Protection', 'UTM Presets', 'Advanced Analytics', 'Email Support'], highlighted: true, checkoutUrl: 'https://goodlink.lemonsqueezy.com/checkout/buy/81876116-924c-44f7-b61c-f4a8a93e83f1?embed=1', buttonText: 'Go Advanced' },
    { name: 'PRO', price: '20', priceNum: 20, originalPrice: '62', description: 'For power users', features: ['Unlimited Links', 'Unlimited Custom Domains', 'Unlimited QR Codes', 'Unlimited Clicks', 'Workspaces, Campaigns and Groups', 'Bot Protection', 'Conversion API & S2S tracking', 'UTM Presets', 'Pro Analytics', 'Expedited Support'], highlighted: false, checkoutUrl: 'https://goodlink.lemonsqueezy.com/checkout/buy/924daf77-b7b3-405d-a94a-2ad2cc476da4?embed=1', buttonText: 'Go Pro' },
  ];
  const isCancelled = profile?.subscription_status === 'cancelled';
  const isFreeTrial = profile?.subscription_status === 'free_trial';
  const currentPlanKey = isCancelled ? null : (currentPlan === 'start' || currentPlan === 'starter' ? 'starter' : currentPlan === 'advanced' ? 'advanced' : currentPlan === 'pro' ? 'pro' : null);
  const currentPlanPrice = currentPlanKey === 'starter' ? 5 : currentPlanKey === 'advanced' ? 10 : currentPlanKey === 'pro' ? 20 : 0;
  const planKeyFromName = (name) => name === 'STARTER' ? 'starter' : name === 'ADVANCED' ? 'advanced' : 'pro';

  const openCheckout = (plan) => {
    if (!user) return;
    const baseUrl = plan.checkoutUrl.split('?')[0];
    const q = [];
    const emailToUse = (profile?.email || user.email || '').trim();
    if (emailToUse) {
      q.push(`checkout[email]=${encodeURIComponent(emailToUse)}`);
    }
    q.push(`checkout[custom][user_id]=${encodeURIComponent(user.id)}`);
    q.push('embed=1');
    const targetUrl = `${baseUrl}?${q.join('&')}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto pb-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#1b1b1b] mb-2">Account Settings</h1>
          <p className="text-[#1b1b1b]">Manage your profile, preferences, and subscription.</p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Profile & Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Profile Card */}
            <div className="bg-card-bg border border-card-border rounded-2xl p-6 hover:shadow-card-mint transition-all">
              <h2 className="text-xl font-bold text-[#1b1b1b] mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#135bec]">person</span>
                Personal Information
              </h2>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-[#1b1b1b] mb-2">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[#1b1b1b] focus:outline-none focus:border-primary transition-all"
                    placeholder="Your Name"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-sm font-medium text-[#1b1b1b] mb-2">
                    Email Address
                  </label>
                  <input
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isGoogleUser} // Locked for Google users
                    className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[#1b1b1b] focus:outline-none focus:border-primary transition-all ${isGoogleUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="name@example.com"
                  />
                  {isGoogleUser && (
                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">info</span>
                      Managed by Google Sign-In
                    </p>
                  )}
                </div>

                {/* Timezone Selector */}
                <div>
                  <label className="block text-sm font-medium text-[#1b1b1b] mb-2">Timezone</label>
                  <div className="relative">
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[#1b1b1b] appearance-none focus:outline-none focus:border-primary transition-all cursor-pointer"
                    >
                      {COMMON_TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#1b1b1b] pointer-events-none">
                      expand_more
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Used for analytics reports and scheduled events.
                  </p>
                </div>

                {/* Save Button */}
                <div className="pt-4 flex items-center justify-between">
                  {success && (
                    <div className="text-green-400 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined">check_circle</span>
                      {success}
                    </div>
                  )}
                  {error && (
                    <div className="text-red-400 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined">error</span>
                      {error}
                    </div>
                  )}
                  <div className="flex-1"></div> {/* Spacer */}
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#6358de] hover:bg-[#5348c7] text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-[0_0_15px_rgba(99,88,222,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving && (
                      <span className="material-symbols-outlined animate-spin text-sm">
                        refresh
                      </span>
                    )}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Plan Status */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card-bg border border-card-border rounded-2xl p-6 relative overflow-hidden hover:shadow-card-mint transition-all">
              {/* Status Badge */}
              <div className="absolute top-4 right-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    isCancelled
                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                      : 'bg-[#6358de]/10 text-[#6358de] border-[#6358de]/30'
                  }`}
                >
                  {isCancelled ? 'Cancelled' : isFreeTrial ? 'Free Trial' : `${currentPlanDisplay} Plan`}
                </span>
              </div>

              <h2 className="text-xl font-bold text-[#1b1b1b] mb-1 mt-10">Subscription</h2>
              <p className="text-[#1b1b1b] text-sm mb-6">Your current plan status.</p>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-3">
                  <span className="text-[#1b1b1b]">Links Created</span>
                  <span className="text-[#1b1b1b] font-mono">
                    {linksCount} / {planDetails.maxLinks}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-3">
                  <span className="text-[#1b1b1b]">Monthly Clicks</span>
                  <span className="text-[#1b1b1b] font-mono">
                    {monthlyClicksCount.toLocaleString()} / {planDetails.maxClicks}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-3">
                  <span className="text-[#1b1b1b]">Custom Domains</span>
                  <span className="text-[#1b1b1b] font-mono">
                    {domainsCount} / {planDetails.domains}
                  </span>
                </div>
              </div>

              {!isCancelled && (
                <button
                  type="button"
                  onClick={() => setShowCancelConfirmModal(true)}
                  className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-[#6358de] to-[#7c6ee8] p-[1px]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#6358de] to-[#7c6ee8] opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className="relative w-full bg-white rounded-[11px] px-6 py-3 flex items-center justify-center gap-2 group-hover:bg-opacity-90 transition-colors">
                    <span className="font-semibold text-[#6358de]">Cancel subscription</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pricing cards (same layout and styling as homepage CTASection) */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-[#1b1b1b] dark:text-[#1b1b1b] mb-6">Plans</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {SETTINGS_PLANS.map((plan) => {
              const planKey = planKeyFromName(plan.name);
              const isCurrentPlan = currentPlanKey != null && planKey === currentPlanKey;
              const planPriceNum = plan.priceNum;
              const isDowngrade = currentPlanKey && planPriceNum < currentPlanPrice;
              let buttonLabel = plan.buttonText;
              if (isCurrentPlan) buttonLabel = 'Your current plan';
              else if (isDowngrade) buttonLabel = 'Switch to this plan';

              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative flex flex-col rounded-xl border-2 transition-all duration-300 w-full md:max-w-md md:mx-auto lg:max-w-none lg:mx-0 ${
                    plan.highlighted
                      ? 'border-[#c0ffa5] bg-[#c0ffa5]/10 shadow-2xl scale-105 lg:scale-110'
                      : 'border-slate-200 dark:border-slate-200 bg-white dark:bg-white hover:border-[#c0ffa5]/50 hover:shadow-xl'
                  }`}
                >
                  {plan.highlighted && (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#c0ffa5] text-[#1b1b1b] text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider z-10">
                      Most Popular
                    </span>
                  )}
                  <div className="p-8 flex flex-col gap-6">
                    <div className={`-mx-8 -mt-8 px-8 pt-8 pb-6 ${plan.highlighted ? 'bg-[#0b996f]/15' : 'bg-[#0b996f]/15'}`}>
                      <h3 className="text-slate-900 dark:text-[#1b1b1b] text-2xl font-black">{plan.name}</h3>
                      <p className="text-slate-500 dark:text-[#1b1b1b] text-sm">{plan.description}</p>
                      <div className="flex items-baseline gap-2 flex-wrap mt-4">
                        {plan.originalPrice && (
                          <span className="text-slate-500 dark:text-slate-400 text-5xl font-black line-through">${plan.originalPrice}</span>
                        )}
                        <span className="text-slate-900 dark:text-[#1b1b1b] text-5xl font-black">${plan.price}</span>
                        <span className="text-slate-500 dark:text-[#1b1b1b] text-lg font-medium">/month</span>
                      </div>
                      <button
                        type="button"
                        disabled={isCurrentPlan}
                        onClick={() => !isCurrentPlan && openCheckout(plan)}
                        className={`mt-6 w-full py-4 px-6 rounded-lg font-bold text-base transition-all text-center ${
                          isCurrentPlan
                            ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                            : 'bg-[#c0ffa5] hover:bg-[#b0ef95] text-[#1b1b1b] shadow-lg shadow-[#c0ffa5]/20'
                        }`}
                      >
                        {buttonLabel}
                      </button>
                    </div>
                    <ul className="flex flex-col gap-4 mt-4">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <Check className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#6358de] font-bold stroke-[2.5]" />
                          <span className="text-slate-700 dark:text-slate-300 text-base font-bold leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Security (below Pricing) - Only for Email Users */}
        {!isGoogleUser && (
          <div className="mt-12 bg-card-bg border border-card-border rounded-2xl p-6 hover:shadow-card-mint transition-all max-w-2xl">
            <h2 className="text-xl font-bold text-[#1b1b1b] mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#135bec]">lock</span>
              Security
            </h2>

            {!showPasswordChange ? (
              <button
                onClick={() => setShowPasswordChange(true)}
                className="flex items-center gap-2 text-slate-300 hover:text-[#1b1b1b] transition-colors border border-slate-200 hover:border-slate-500 rounded-lg px-4 py-2"
              >
                Change Password
              </button>
            ) : (
              <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200">
                <h3 className="text-[#1b1b1b] font-semibold mb-2">Change Password</h3>

                <div>
                  <label className="block text-xs font-medium text-[#1b1b1b] mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-[#1b1b1b] text-sm focus:outline-none focus:border-primary"
                    placeholder="Min. 8 characters"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#1b1b1b] mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-[#1b1b1b] text-sm focus:outline-none focus:border-primary ${
                      confirmPassword && newPassword !== confirmPassword ? 'border-red-500' : ''
                    }`}
                    placeholder="Retype password"
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="text-[#1b1b1b] hover:text-[#1b1b1b] text-xs px-3 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateProfile}
                    disabled={
                      !newPassword || newPassword !== confirmPassword || newPassword.length < 8
                    }
                    className="bg-[#135bec] text-[#1b1b1b] text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    Update Password
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      <Modal
        isOpen={showCancelConfirmModal}
        onClose={() => setShowCancelConfirmModal(false)}
        title="Cancel subscription?"
        message="If you cancel your subscription, all your links will stop working."
        type="confirm"
        confirmText="Confirm"
        cancelText="Cancel"
        onConfirm={handleCancelSubscription}
        isLoading={saving}
      />
    </div>
  );
}

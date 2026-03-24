import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { checkForMaliciousInput, sanitizeInput } from '../../lib/inputSanitization';
import Modal from '../../components/common/Modal';
import { useToast } from '../../components/common/ToastProvider.jsx';

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
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Usage counts (from DB, not profiles table)
  const [linksCount, setLinksCount] = useState(0);
  const [capiCount, setCapiCount] = useState(0);
  const [domainsCount, setDomainsCount] = useState(0);

  // Cancel subscription confirmation modal
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);

  const { showToast } = useToast();

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
      const [linksRes, capiRes, domainsRes] = await Promise.all([
        supabase
          .from('links')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .neq('status', 'deleted'),
        supabase
          .from('pixels')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .neq('status', 'deleted'),
        supabase
          .from('custom_domains')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .neq('status', 'deleted'),
      ]);

      setLinksCount(linksRes?.count ?? 0);
      setCapiCount(capiRes?.count ?? 0);
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
      // 1. Validate User Input (allow any language + @)
      const trimmedName = fullName.trim();
      if (!trimmedName || trimmedName.length < 2) {
        throw new Error('Full name must be at least 2 characters.');
      }

      // 2. Update Auth Metadata (Name only – email is not editable)
      const updates = {
        data: { full_name: trimmedName },
      };

      const { error: authError } = await supabase.auth.updateUser(updates);
      if (authError) throw authError;

      // 3. Update Profile Table (full_name, timezone) – keep profiles in sync with auth
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: trimmedName,
          timezone: timezone,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // 4. Notify other UI parts (e.g., sidebar greeting) that the name changed
      try {
        window.dispatchEvent(
          new CustomEvent('goodlink:user:name-updated', { detail: trimmedName })
        );
      } catch (e) {
        // Ignore if dispatch fails (e.g., SSR)
      }

      let didChangePassword = false;

      // 4. Update Password (if requested)
      if (showPasswordChange && newPassword) {
        setPasswordError(null);

        // Require current password
        if (!currentPassword || currentPassword.length < 1) {
          const msg = 'Please enter your current password.';
          setPasswordError(msg);
          throw new Error(msg);
        }

        // Password validation – same rules as signup
        if (newPassword.length < 8) {
          const msg = 'Password must be at least 8 characters long';
          setPasswordError(msg);
          throw new Error(msg);
        }

        if (newPassword.length > 15) {
          const msg = 'Password cannot exceed 15 characters';
          setPasswordError(msg);
          throw new Error(msg);
        }

        const hasUpper = /[A-Z]/.test(newPassword);
        const hasLower = /[a-z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);

        if (!hasUpper) {
          const msg = 'Password must contain at least one uppercase letter (A-Z)';
          setPasswordError(msg);
          throw new Error(msg);
        }
        if (!hasLower) {
          const msg = 'Password must contain at least one lowercase letter (a-z)';
          setPasswordError(msg);
          throw new Error(msg);
        }
        if (!hasNumber) {
          const msg = 'Password must contain at least one number';
          setPasswordError(msg);
          throw new Error(msg);
        }
        if (newPassword !== confirmPassword) {
          const msg = 'New passwords do not match.';
          setPasswordError(msg);
          throw new Error(msg);
        }

        // Verify current password with Supabase (re-auth)
        const { error: reauthError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });
        if (reauthError) {
          const msg = 'Current password is incorrect.';
          setPasswordError(msg);
          throw new Error(msg);
        }

        const { error: passError } = await supabase.auth.updateUser({ password: newPassword });
        if (passError) {
          setPasswordError(passError.message || 'Failed to update password.');
          throw passError;
        }

        // Clear password fields on success
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordChange(false);
        setPasswordError(null);
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        didChangePassword = true;
        setSuccess('Password updated successfully!');
        showToast({
          type: 'success',
          title: 'Password changed',
          message: 'Your password was updated successfully.',
        });
      } else {
        setSuccess('Profile updated successfully!');
        showToast({
          type: 'success',
          title: 'Profile updated',
          message: 'Your personal details were saved.',
        });
      }
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
      showToast({
        type: 'success',
        title: 'Subscription cancelled',
        message: 'Your subscription has been marked as cancelled.',
      });
      fetchUserData();

      // If user is on a paid plan (not free trial / free), also open Lemon Squeezy customer portal
      const isFreePlan = currentPlan === 'free';
      if (!isFreeTrial && !isFreePlan && portalUrl) {
        window.open(portalUrl, '_blank', 'noopener,noreferrer');
      }
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

  // Detect auth provider as stored in Supabase
  const primaryProvider =
    user?.app_metadata?.provider || (Array.isArray(user?.identities) ? user.identities[0]?.provider : undefined);
  const isEmailUser = primaryProvider === 'email';
  const currentPlan = profile?.plan_type || 'free'; // default to free
  const planDetails = PLAN_FEATURES[currentPlan] || PLAN_FEATURES.free;
  const portalUrl = profile?.lemon_squeezy_customer_portal_url;
  const hasPaidPlan = currentPlan !== 'free' && (currentPlan === 'start' || currentPlan === 'starter' || currentPlan === 'advanced' || currentPlan === 'pro');
  const currentPlanDisplay = currentPlan === 'start' || currentPlan === 'starter' ? 'Starter' : currentPlan === 'advanced' ? 'Advanced' : currentPlan === 'pro' ? 'Pro' : 'Free';

  const SETTINGS_PLANS = [
    { name: 'STARTER', price: '5', priceNum: 5, originalPrice: '10', description: 'Perfect for getting started', features: ['Unlimited Links', 'Unlimited QR Codes', 'Unlimited Clicks', 'Standard Analytics', 'Email Support'], highlighted: false, checkoutUrl: 'https://goodlink.lemonsqueezy.com/checkout/buy/54a3e3e3-3618-4922-bce6-a0617252f1ae?embed=1', buttonText: 'Get Started' },
    { name: 'ADVANCED', price: '10', priceNum: 10, originalPrice: '26', description: 'For growing businesses', features: ['Unlimited Links', 'Unlimited QR Codes', 'Unlimited Clicks', 'Email Support', '10 Custom Domains', 'Workspaces, Campaigns and Groups', 'Bot Protection', 'UTM Presets', 'Advanced Analytics'], highlighted: true, checkoutUrl: 'https://goodlink.lemonsqueezy.com/checkout/buy/81876116-924c-44f7-b61c-f4a8a93e83f1?embed=1', buttonText: 'Go Advanced' },
    { name: 'PRO', price: '20', priceNum: 20, originalPrice: '62', description: 'For power users', features: ['Unlimited Links', 'Unlimited QR Codes', 'Unlimited Clicks', 'Workspaces, Campaigns and Groups', 'Bot Protection', 'UTM Presets', 'Unlimited Custom Domains', 'Geo Redirect', 'Conversion API & S2S tracking', 'Pro Analytics', 'Expedited Support'], highlighted: false, checkoutUrl: 'https://goodlink.lemonsqueezy.com/checkout/buy/924daf77-b7b3-405d-a94a-2ad2cc476da4?embed=1', buttonText: 'Go Pro' },
  ];
  const isCancelled = profile?.subscription_status === 'cancelled';
  const isFreeTrial = profile?.subscription_status === 'free_trial';
  const currentPlanKey =
    isCancelled || isFreeTrial
      ? null
      : currentPlan === 'start' || currentPlan === 'starter'
        ? 'starter'
        : currentPlan === 'advanced'
          ? 'advanced'
          : currentPlan === 'pro'
            ? 'pro'
            : null;
  const currentPlanPrice = currentPlanKey === 'starter' ? 5 : currentPlanKey === 'advanced' ? 10 : currentPlanKey === 'pro' ? 20 : 0;
  const planKeyFromName = (name) => name === 'STARTER' ? 'starter' : name === 'ADVANCED' ? 'advanced' : 'pro';

  const openCheckout = (plan) => {
    if (!user) return;
    const baseUrl = plan.checkoutUrl.split('?')[0];
    const q = [];
    const emailToUse = (profile?.email || user.email || '').trim();
    console.log('[LS Checkout][Settings] emailToUse=', emailToUse, 'user.email=', user?.email, 'profile.email=', profile?.email);
    if (emailToUse) {
      q.push(`checkout[email]=${encodeURIComponent(emailToUse)}`);
    }
    q.push(`checkout[custom][user_id]=${encodeURIComponent(user.id)}`);
    q.push('embed=1');
    const targetUrl = `${baseUrl}?${q.join('&')}`;
    console.log('[LS Checkout][Settings] targetUrl=', targetUrl);
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

                {/* Email Address (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-[#1b1b1b] mb-2">
                    Email Address
                  </label>
                  <input
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    disabled
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[#1b1b1b] opacity-60 cursor-not-allowed"
                    placeholder="name@example.com"
                  />
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
                  <div className="mt-6 min-h-[2.5rem]">
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
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-8 flex justify-end">
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
                    {linksCount}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-3">
                  <span className="text-[#1b1b1b]">CAPI&apos;s</span>
                  <span className="text-[#1b1b1b] font-mono">
                    {capiCount}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-3">
                  <span className="text-[#1b1b1b]">Custom Domains</span>
                  <span className="text-[#1b1b1b] font-mono">
                    {domainsCount}
                  </span>
                </div>
              </div>

              {!isCancelled && !isFreeTrial && (
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

        {/* Pricing cards (same layout and styling as homepage CTASection).
            Temporarily hidden for users on a 30-day free trial. */}
        {!isFreeTrial && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-[#1b1b1b] dark:text-[#1b1b1b] mb-6">Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 xl:gap-10 items-stretch">
              {SETTINGS_PLANS.map((plan) => {
              const planKey = planKeyFromName(plan.name);
              const isCurrentPlan = currentPlanKey != null && planKey === currentPlanKey;
              const planPriceNum = plan.priceNum;
              const isDowngrade = currentPlanKey && planPriceNum < currentPlanPrice;
              const isFeaturedCard = isCurrentPlan || plan.highlighted;
              let buttonLabel = plan.buttonText;
              if (isCurrentPlan) buttonLabel = 'Your current plan';
              else if (isDowngrade) buttonLabel = 'Switch to this plan';

                return (
                  <motion.div
                    key={plan.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`group relative flex flex-col h-full transition-all duration-300 ${
                      isFeaturedCard
                        ? 'bg-[#c7edb8] p-8 lg:p-10 xl:p-12 rounded-[2.5rem] shadow-[0_32px_64px_rgba(74,61,196,0.12)] scale-100 xl:scale-105 z-10 border-4 border-white hover:border-[#6358de]'
                        : 'bg-[#f3f3f4] p-8 lg:p-10 rounded-[2rem] border border-[#c8c4d6]/20 hover:border-[#6358de]'
                    }`}
                  >
                    {(isCurrentPlan || plan.highlighted) && (
                      <span
                        className={`absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 text-white text-xs font-black rounded-full uppercase tracking-widest shadow-lg ${
                          isCurrentPlan ? 'bg-[#0b996f]' : 'bg-[#6358de]'
                        }`}
                      >
                        {isCurrentPlan ? 'Current Plan' : 'Most Popular'}
                      </span>
                    )}
                    <div className="flex flex-col h-full">
                      <div className="mb-8">
                        <h3
                          className={`mb-2 ${
                            isFeaturedCard
                              ? 'text-3xl font-black text-[#032102]'
                              : 'text-2xl font-bold text-slate-900'
                          }`}
                        >
                          {plan.name}
                        </h3>
                        <p
                          className={`text-sm ${
                            isFeaturedCard ? 'text-[#2f4e27] font-medium' : 'text-slate-600'
                          }`}
                        >
                          {plan.description}
                        </p>
                      </div>
                      <div className="mb-10 flex items-baseline gap-1">
                        <span
                          className={`tracking-tighter ${
                            isFeaturedCard
                              ? 'text-7xl font-extrabold text-[#032102]'
                              : 'text-5xl font-extrabold text-slate-900'
                          }`}
                        >
                          ${plan.price}
                        </span>
                        <span
                          className={`font-medium ${
                            isFeaturedCard ? 'text-[#2f4e27] font-bold' : 'text-slate-500'
                          }`}
                        >
                          /mo
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={isCurrentPlan}
                        onClick={() => !isCurrentPlan && openCheckout(plan)}
                        className={`mb-10 w-full text-center inline-block active:scale-95 transition-all ${
                          isFeaturedCard
                            ? isCurrentPlan
                              ? 'py-5 rounded-full bg-slate-300 text-slate-500 font-black text-lg cursor-not-allowed'
                              : 'py-5 rounded-full bg-[#6358de] text-white font-black text-lg shadow-xl shadow-[#4a3dc4]/30 hover:opacity-90 cursor-pointer'
                            : isCurrentPlan
                              ? 'py-4 rounded-full border border-[#787585] text-slate-500 font-bold cursor-not-allowed'
                              : 'py-4 rounded-full border border-[#787585] text-[#5549d0] font-bold hover:bg-[#eeeeee] cursor-pointer'
                        }`}
                      >
                        {buttonLabel}
                      </button>
                      <ul className="space-y-6 mb-2 flex-grow">
                        {plan.features.map((feature, i) => {
                          const purpleFeatures = ['10 Custom Domains', 'Workspaces, Campaigns and Groups', 'Bot Protection', 'UTM Presets', 'Advanced Analytics', 'Unlimited Custom Domains', 'Geo Redirect', 'Conversion API & S2S tracking', 'Pro Analytics', 'Expedited Support'];
                          const proBlackFeatures = ['Workspaces, Campaigns and Groups', 'Bot Protection', 'UTM Presets'];
                          const isBlack = plan.name === 'PRO' && proBlackFeatures.includes(feature);
                          const isPurple = !isBlack && purpleFeatures.includes(feature);
                          return (
                            <li key={i} className="flex items-start gap-3">
                              <Check
                                className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                                  isFeaturedCard ? 'text-[#032102]' : 'text-[#46673d]'
                                }`}
                              />
                              <span
                                className={`text-sm md:text-base font-semibold leading-relaxed ${
                                  isBlack
                                    ? 'text-black'
                                    : isPurple
                                      ? 'text-[#6358de]'
                                      : isFeaturedCard
                                        ? 'text-[#032102]'
                                        : 'text-slate-700'
                                }`}
                              >
                                {feature}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Security (below Pricing) - Only for Email+Password Users */}
        {isEmailUser && (
          <div className="mt-12 bg-card-bg border border-card-border rounded-2xl p-6 hover:shadow-card-mint transition-all max-w-2xl">
            <h2 className="text-xl font-bold text-[#1b1b1b] mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#135bec]">lock</span>
              Security
            </h2>

            {!showPasswordChange ? (
              <button
                onClick={() => setShowPasswordChange(true)}
                className="flex items-center gap-2 bg-[#6358de] hover:bg-[#5348c7] text-white transition-colors border border-transparent rounded-lg px-4 py-2 font-semibold shadow-md shadow-[#6358de]/30"
              >
                Change Password
              </button>
            ) : (
              <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200">
                <h3 className="text-[#1b1b1b] font-semibold mb-2">Change Password</h3>

                <div>
                  <label className="block text-xs font-medium text-[#1b1b1b] mb-1">
                    Current Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 pr-10 text-[#1b1b1b] text-sm focus:outline-none focus:border-primary"
                      placeholder="Enter your current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((v) => !v)}
                      className="absolute right-2 p-1.5 text-slate-500 hover:text-[#1b1b1b] rounded transition-colors"
                      aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showCurrentPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#1b1b1b] mb-1">
                    New Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 pr-10 text-[#1b1b1b] text-sm focus:outline-none focus:border-primary"
                      placeholder="Min. 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute right-2 p-1.5 text-slate-500 hover:text-[#1b1b1b] rounded transition-colors"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showNewPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#1b1b1b] mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full bg-white border border-slate-200 rounded-lg px-3 py-2 pr-10 text-[#1b1b1b] text-sm focus:outline-none focus:border-primary ${
                        confirmPassword && newPassword !== confirmPassword ? 'border-red-500' : ''
                      }`}
                      placeholder="Retype password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-2 p-1.5 text-slate-500 hover:text-[#1b1b1b] rounded transition-colors"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showConfirmPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                  )}
                  {passwordError && (
                    <p className="text-red-400 text-xs mt-1">{passwordError}</p>
                  )}
                </div>

                <div className="min-h-[24px] mt-1">
                  {passwordError && (
                    <p className="text-red-400 text-xs mt-1">{passwordError}</p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordError(null);
                      setShowCurrentPassword(false);
                      setShowNewPassword(false);
                      setShowConfirmPassword(false);
                    }}
                    className="text-[#1b1b1b] hover:text-[#1b1b1b] text-xs px-3 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateProfile}
                    disabled={
                      !currentPassword ||
                      !newPassword ||
                      newPassword !== confirmPassword ||
                      newPassword.length < 8
                    }
                    className="bg-[#6358de] hover:bg-[#5348c7] text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
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

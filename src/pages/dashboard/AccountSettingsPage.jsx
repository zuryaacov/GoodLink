import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { checkForMaliciousInput, sanitizeInput } from '../../lib/inputSanitization';

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-white">
        <span className="material-symbols-outlined animate-spin text-4xl text-[#135bec]">
          refresh
        </span>
      </div>
    );
  }

  const isGoogleUser = user?.app_metadata?.provider === 'google';
  const currentPlan = profile?.plan_type || 'free'; // default to free
  const planDetails = PLAN_FEATURES[currentPlan] || PLAN_FEATURES.free;

  return (
    <div className="p-6 max-w-4xl mx-auto pb-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Account Settings</h1>
          <p className="text-slate-400">Manage your profile, preferences, and subscription.</p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Profile & Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Profile Card */}
            <div className="bg-[#101622] border border-[#232f48] rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#135bec]">person</span>
                Personal Information
              </h2>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#0a0f18] border border-[#232f48] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#135bec] transition-all"
                    placeholder="Your Name"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Email Address
                  </label>
                  <input
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isGoogleUser} // Locked for Google users
                    className={`w-full bg-[#0a0f18] border border-[#232f48] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#135bec] transition-all ${isGoogleUser ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  <label className="block text-sm font-medium text-slate-400 mb-2">Timezone</label>
                  <div className="relative">
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full bg-[#0a0f18] border border-[#232f48] rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:border-[#135bec] transition-all cursor-pointer"
                    >
                      {COMMON_TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
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
                    className="bg-[#135bec] hover:bg-[#135bec]/90 text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-[0_0_15px_rgba(19,91,236,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

            {/* Password Change Section (Only for Email Users) */}
            {!isGoogleUser && (
              <div className="bg-[#101622] border border-[#232f48] rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#135bec]">lock</span>
                  Security
                </h2>

                {!showPasswordChange ? (
                  <button
                    onClick={() => setShowPasswordChange(true)}
                    className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors border border-[#232f48] hover:border-slate-500 rounded-lg px-4 py-2"
                  >
                    Change Password
                  </button>
                ) : (
                  <div className="space-y-4 bg-[#0a0f18] p-4 rounded-xl border border-[#232f48]">
                    <h3 className="text-white font-semibold mb-2">Change Password</h3>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-[#101622] border border-[#232f48] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#135bec]"
                        placeholder="Min. 8 characters"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full bg-[#101622] border border-[#232f48] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#135bec] ${
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
                        className="text-slate-400 hover:text-white text-xs px-3 py-2"
                      >
                        Cancel
                      </button>
                      <button // Note: Actual save happens in main form submit for simplicity, or could handle separately
                        type="button"
                        onClick={handleUpdateProfile} // Re-using main submit logic
                        disabled={
                          !newPassword || newPassword !== confirmPassword || newPassword.length < 8
                        }
                        className="bg-[#135bec] text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-50"
                      >
                        Update Password
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Plan Status */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gradient-to-b from-[#101622] to-[#0a0f18] border border-[#232f48] rounded-2xl p-6 relative overflow-hidden">
              {/* Status Badge */}
              <div className="absolute top-4 right-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    currentPlan === 'pro'
                      ? 'bg-[#FF10F0]/10 text-[#FF10F0] border border-[#FF10F0]/30'
                      : 'bg-slate-700/30 text-slate-300 border border-slate-600/30'
                  }`}
                >
                  {currentPlan} Plan
                </span>
              </div>

              <h2 className="text-xl font-bold text-white mb-1">Subscription</h2>
              <p className="text-slate-400 text-sm mb-6">Your current plan status.</p>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center text-sm border-b border-[#232f48] pb-3">
                  <span className="text-slate-400">Links Created</span>
                  <span className="text-white font-mono">
                    {linksCount} / {planDetails.maxLinks}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-[#232f48] pb-3">
                  <span className="text-slate-400">Monthly Clicks</span>
                  <span className="text-white font-mono">
                    {monthlyClicksCount.toLocaleString()} / {planDetails.maxClicks}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-[#232f48] pb-3">
                  <span className="text-slate-400">Custom Domains</span>
                  <span className="text-white font-mono">
                    {domainsCount} / {planDetails.domains}
                  </span>
                </div>
              </div>

              {currentPlan !== 'pro' ? (
                <button
                  onClick={handleOpenPaywall}
                  className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-[#FF10F0] to-[#bc13fe] p-[1px]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FF10F0] to-[#bc13fe] opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className="relative bg-[#101622] rounded-[11px] px-6 py-3 flex items-center justify-center gap-2 group-hover:bg-opacity-90 transition-colors">
                    <span className="material-symbols-outlined text-[#FF10F0] group-hover:scale-110 transition-transform">
                      rocket_launch
                    </span>
                    <span className="font-bold text-white">Upgrade to Pro</span>
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = '/#pricing';
                  }}
                  className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-[#FF10F0] to-[#bc13fe] p-[1px]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FF10F0] to-[#bc13fe] opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className="relative w-full bg-[#101622] rounded-[11px] px-6 py-3 flex items-center justify-center gap-2 group-hover:bg-opacity-90 transition-colors">
                    <span className="font-semibold text-[#FF10F0]">Manage Subscription</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

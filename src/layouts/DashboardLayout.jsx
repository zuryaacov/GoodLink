import React, { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/dashboard/Sidebar';
import { supabase } from '../lib/supabase';

const DashboardLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [impersonationBanner, setImpersonationBanner] = useState(null);

  // Ensure page starts at top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;
    let mounted = true;

    const readImpersonationState = async () => {
      const backupRaw = localStorage.getItem('goodlink:impersonation_backup');
      if (!backupRaw) {
        if (mounted) setImpersonationBanner(null);
        return;
      }

      let backup = null;
      try {
        backup = JSON.parse(backupRaw);
      } catch {
        localStorage.removeItem('goodlink:impersonation_backup');
        if (mounted) setImpersonationBanner(null);
        return;
      }

      const { data } = await supabase.auth.getUser();
      const currentEmail = (data?.user?.email || '').toLowerCase();
      const adminEmail = (backup?.adminEmail || '').toLowerCase();
      const targetEmail = (backup?.targetEmail || '').toLowerCase();
      const isUrlImpersonator = new URL(window.location.href).searchParams.get('impersonator') === 'true';

      // Mark this browser session as active impersonation only when magic-link callback contains impersonator=true
      if (isUrlImpersonator && currentEmail && adminEmail && currentEmail !== adminEmail) {
        localStorage.setItem('goodlink:impersonation_active', 'true');
      }

      const isActive = localStorage.getItem('goodlink:impersonation_active') === 'true';
      const isExpectedTarget = !targetEmail || currentEmail === targetEmail;
      const isImpersonating = Boolean(isActive && currentEmail && adminEmail && currentEmail !== adminEmail && isExpectedTarget);

      if (mounted) {
        setImpersonationBanner(
          isImpersonating
            ? {
                adminEmail: backup?.adminEmail || null,
                targetEmail: backup?.targetEmail || data?.user?.email || null,
              }
            : null
        );
      }
    };

    readImpersonationState();
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('goodlink:impersonation_active');
        localStorage.removeItem('goodlink:impersonation_backup');
        setImpersonationBanner(null);
        return;
      }

      readImpersonationState();
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  const exitImpersonation = async () => {
    if (!supabase) return;
    const backupRaw = localStorage.getItem('goodlink:impersonation_backup');
    if (!backupRaw) return;

    try {
      const backup = JSON.parse(backupRaw);
      if (!backup?.accessToken || !backup?.refreshToken) {
        throw new Error('Missing admin session backup.');
      }

      const { error } = await supabase.auth.setSession({
        access_token: backup.accessToken,
        refresh_token: backup.refreshToken,
      });
      if (error) throw error;

      localStorage.removeItem('goodlink:impersonation_backup');
      localStorage.removeItem('goodlink:impersonation_active');
      setImpersonationBanner(null);

      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('impersonator');
      cleanUrl.searchParams.delete('impersonating');
      window.history.replaceState({}, '', cleanUrl.toString());
      window.location.assign('/dashboard/admin');
    } catch (err) {
      console.error('Failed to exit impersonation mode:', err);
      alert('Failed to exit impersonation mode. Please login again.');
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-50">
        <Sidebar className="w-64" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-40">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-5 sm:size-8 text-primary flex-shrink-0">
              <svg fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                  stroke="#6358de"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                ></path>
                <path
                  d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                  stroke="#6358de"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                ></path>
              </svg>
            </div>
            <h2 className="text-xl font-black leading-tight tracking-tight text-[#6358de]">
              GoodLink
            </h2>
          </Link>

          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-[#1b1b1b] p-2">
            <span className="material-symbols-outlined">{isMobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </header>

        {/* Mobile Sidebar Overlay with Smooth Animations */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <div className="lg:hidden fixed inset-0 z-50">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setIsMobileMenuOpen(false)}
              />

              {/* Sidebar Container */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="absolute left-0 top-0 bottom-0 w-64 bg-nav-bg shadow-2xl flex flex-col border-r border-slate-200"
              >
                <div className="flex justify-between items-center p-4 border-b border-slate-200 flex-shrink-0">
                  <span className="text-[#1b1b1b] font-bold ml-2">Menu</span>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-slate-500 hover:text-[#1b1b1b]"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <Sidebar
                    className="w-full h-full border-none pt-2"
                    onLinkClick={() => setIsMobileMenuOpen(false)}
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto overflow-x-hidden w-full lg:pt-6 pt-20">
          {impersonationBanner && (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm sm:text-base font-semibold text-amber-900">
                {'⚠️'} You are in impersonation mode ({impersonationBanner.targetEmail}).
              </p>
              <button
                type="button"
                onClick={exitImpersonation}
                className="px-3 py-2 rounded-lg border border-amber-400 text-amber-900 text-sm font-bold hover:bg-amber-100 transition-colors"
              >
                Exit Impersonation
              </button>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AccessibilityFooterRestore from '../accessibility/AccessibilityFooterRestore';
import {
  GL_ACC_PREFS_CHANGED_EVENT,
  GL_ACC_STORAGE_KEY,
  loadAccessibilityPreferences,
} from '../../lib/accessibilityPreferences';

const sidebarLinks = [
  { name: 'Link Manager', href: '/dashboard/links', icon: 'link' },
  { name: 'Custom Domains', href: '/dashboard/domains', icon: 'public' },
  { name: 'CAPI Manager', href: '/dashboard/pixels', icon: 'ads_click' },
  { name: 'UTM Preset', href: '/dashboard/utm-presets', icon: 'campaign' },
  { name: 'Analytics', href: '/dashboard', icon: 'insights' },
  { name: 'Account Settings', href: '/dashboard/settings', icon: 'manage_accounts' },
];

const adminLink = { name: 'Admin Panel', href: '/dashboard/admin', icon: 'admin_panel_settings' };

const Sidebar = ({ className = '', onLinkClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState('');
  const [planType, setPlanType] = useState('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [customerPortalUrl, setCustomerPortalUrl] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [widgetHidden, setWidgetHidden] = useState(() => {
    try {
      return Boolean(loadAccessibilityPreferences().widgetHidden);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const syncWidgetHidden = () => {
      try {
        setWidgetHidden(Boolean(loadAccessibilityPreferences().widgetHidden));
      } catch {
        setWidgetHidden(false);
      }
    };
    const onStorage = (e) => {
      if (e.key === GL_ACC_STORAGE_KEY) syncWidgetHidden();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(GL_ACC_PREFS_CHANGED_EVENT, syncWidgetHidden);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(GL_ACC_PREFS_CHANGED_EVENT, syncWidgetHidden);
    };
  }, []);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Get user profile (full_name, plan, customer portal URL)
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('full_name, plan_type, lemon_squeezy_customer_portal_url, role, subscription_status')
          .eq('user_id', user.id)
          .single();

        const displayName =
          (profile?.full_name && profile.full_name.trim()) ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          '';
        setUserName(displayName.trim() || user.email || '');

        if (!error && profile) {
          if (profile?.plan_type) {
            setPlanType(profile.plan_type);
          } else {
            setPlanType('free');
          }
          setSubscriptionStatus(profile?.subscription_status ?? null);
          if (profile?.lemon_squeezy_customer_portal_url) {
            setCustomerPortalUrl(profile.lemon_squeezy_customer_portal_url);
          } else {
            setCustomerPortalUrl(null);
          }
          setUserRole(profile?.role === 'admin' ? 'admin' : 'user');
        } else {
          setPlanType('free');
          setSubscriptionStatus(null);
          setCustomerPortalUrl(null);
          setUserRole('user');
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        setPlanType('free');
        setSubscriptionStatus(null);
        setCustomerPortalUrl(null);
        setUserRole('user');
      }
    };

    fetchUserInfo();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchUserInfo();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleNameUpdated = (event) => {
      const next = String(event.detail || '').trim();
      if (next) {
        setUserName(next);
      }
    };
    window.addEventListener('goodlink:user:name-updated', handleNameUpdated);
    return () => {
      window.removeEventListener('goodlink:user:name-updated', handleNameUpdated);
    };
  }, []);

  // Format plan name for display
  const getPlanDisplayName = (plan) => {
    switch (plan) {
      case 'start':
        return 'START Plan';
      case 'advanced':
        return 'ADVANCED Plan';
      case 'pro':
        return 'PRO Plan';
      default:
        return 'Free Plan';
    }
  };

  // Get initials for avatar (from name or fallback to email)
  const getInitials = (nameOrEmail) => {
    if (!nameOrEmail) return 'U';
    const trimmed = nameOrEmail.trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    if (trimmed.includes('@')) {
      const username = trimmed.split('@')[0];
      return username.length >= 2
        ? username.substring(0, 2).toUpperCase()
        : username.charAt(0).toUpperCase();
    }
    return trimmed.length >= 2
      ? trimmed.substring(0, 2).toUpperCase()
      : trimmed.charAt(0).toUpperCase();
  };

  const handleLogout = async () => {
    // Always clear any impersonation leftovers before logout
    localStorage.removeItem('goodlink:impersonation_backup');
    localStorage.removeItem('goodlink:impersonation_active');

    // Close mobile menu if open
    if (onLinkClick) {
      onLinkClick();
    }
    // Navigate to homepage first to avoid ProtectedRoute redirecting to /login
    navigate('/');
    try {
      await supabase.auth.signOut();
    } finally {
      // Defensive cleanup even if signOut throws
      localStorage.removeItem('goodlink:impersonation_backup');
      localStorage.removeItem('goodlink:impersonation_active');
    }
    // Refresh the page after logout
    window.location.reload();
  };

  // Base classes with default width if not overridden
  const baseClasses = `flex flex-col bg-nav-bg border-r border-slate-200 pt-6 ${className.includes('w-') ? '' : 'w-64'} ${className.includes('h-') ? '' : 'h-screen'} ${className}`;

  return (
    <aside className={baseClasses}>
      <div className="px-6 mb-8 hidden lg:block">
        <Link
          to="/"
          className="flex items-center gap-3 text-[#1b1b1b] transition-opacity hover:opacity-80"
        >
          {/* Link-shape icon hidden by request (kept in code, do not delete)
          <div className="size-5 sm:size-8 text-primary flex-shrink-0" aria-hidden="true">
            <svg fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                stroke="#a855f7"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              ></path>
              <path
                d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                stroke="#a855f7"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              ></path>
            </svg>
          </div>
          */}
          <span className="text-3xl font-black leading-tight tracking-tight text-[#a855f7]">
            GoodLink
          </span>
        </Link>
      </div>

      <nav aria-label="Dashboard" className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto">
        {[...sidebarLinks, ...(userRole === 'admin' ? [adminLink] : [])].map((link) => (
          <NavLink
            key={link.name}
            to={link.href}
            end={true}
            onClick={onLinkClick}
            className={({ isActive }) => {
              const analyticsActive =
                link.href === '/dashboard' &&
                (location.pathname === '/dashboard' ||
                  location.pathname === '/dashboard/analytics');
              const active = link.href === '/dashboard' ? analyticsActive : isActive;
              return `flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
                active
                  ? 'bg-secondary-green text-[#1b1b1b] shadow-lg shadow-secondary-green/20'
                  : 'text-slate-600 hover:text-[#1b1b1b] hover:bg-slate-100'
              }`;
            }}
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{link.icon}</span>
            {link.name}
          </NavLink>
        ))}
        <button
          onClick={handleLogout}
          className="lg:hidden flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium transition-all duration-200 text-slate-600 hover:text-[#1b1b1b] hover:bg-slate-100 w-full text-left"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">logout</span>
          Logout
        </button>
      </nav>

      {widgetHidden && (
        <div className="px-3 py-2 shrink-0 border-t border-slate-200 lg:border-t-0 lg:px-4 lg:pb-2 lg:pt-1">
          <AccessibilityFooterRestore
            onAfterClick={onLinkClick}
            className="!text-xs !font-medium text-slate-600 hover:text-[#a855f7] text-left !no-underline hover:!underline block w-full"
          />
        </div>
      )}

      <div className="p-4 border-t border-slate-200 flex flex-col gap-2 hidden lg:block">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="size-8 rounded-full bg-gradient-to-tr from-primary to-secondary-green flex items-center justify-center text-[#1b1b1b] font-bold text-xs" aria-hidden="true">
            {getInitials(userName)}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-base font-bold text-[#1b1b1b] truncate">
              {userName ? `Hello, ${userName}` : 'Hello'}
            </span>
            <span className="text-xs text-slate-500">{subscriptionStatus === 'cancelled' ? 'Cancelled' : getPlanDisplayName(planType)}</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="hidden lg:flex items-center justify-center gap-3 px-3 py-2 w-full text-slate-600 hover:text-[#1b1b1b] hover:bg-slate-100 rounded-xl transition-all duration-200 text-base font-medium"
        >
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

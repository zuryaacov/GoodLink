import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AccessibilityFooterRestore from '../accessibility/AccessibilityFooterRestore';
import {
  GL_ACC_PREFS_CHANGED_EVENT,
  GL_ACC_STORAGE_KEY,
  loadAccessibilityPreferences,
} from '../../lib/accessibilityPreferences';
import { useLanguage } from '../../i18n/LanguageContext';

const Sidebar = ({ className = '', onLinkClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
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

  const sidebarLinks = [
    { nameKey: 'dashNavLinkManager', href: '/dashboard/links', icon: 'link' },
    { nameKey: 'dashNavCustomDomains', href: '/dashboard/domains', icon: 'public' },
    { nameKey: 'dashNavCapiManager', href: '/dashboard/pixels', icon: 'ads_click' },
    { nameKey: 'dashNavUtmPreset', href: '/dashboard/utm-presets', icon: 'campaign' },
    { nameKey: 'dashNavAnalytics', href: '/dashboard', icon: 'insights' },
    { nameKey: 'dashNavAccountSettings', href: '/dashboard/settings', icon: 'manage_accounts' },
  ];

  const adminLink = { nameKey: 'dashNavAdminPanel', href: '/dashboard/admin', icon: 'admin_panel_settings' };

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
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

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

  const getPlanDisplayName = (plan) => {
    switch (plan) {
      case 'start':
      case 'starter':
        return t('dashPlanStart');
      case 'advanced':
        return t('dashPlanAdvanced');
      case 'pro':
        return t('dashPlanPro');
      default:
        return t('dashPlanFree');
    }
  };

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
    localStorage.removeItem('goodlink:impersonation_backup');
    localStorage.removeItem('goodlink:impersonation_active');

    if (onLinkClick) {
      onLinkClick();
    }
    navigate('/');
    try {
      await supabase.auth.signOut();
    } finally {
      localStorage.removeItem('goodlink:impersonation_backup');
      localStorage.removeItem('goodlink:impersonation_active');
    }
    window.location.reload();
  };

  const baseClasses = `flex flex-col bg-nav-bg border-e border-slate-200 pt-6 ${className.includes('w-') ? '' : 'w-64'} ${className.includes('h-') ? '' : 'h-screen'} ${className}`;

  return (
    <aside className={baseClasses}>
      <div className="px-6 mb-8 hidden lg:block">
        <Link
          to="/"
          className="flex items-center gap-3 text-[#1b1b1b] transition-colors hover:text-[#0b996f]"
        >
          <span className="brand-logo text-3xl font-black leading-tight tracking-tight text-inherit">
            GoodLink
          </span>
        </Link>
      </div>

      <nav aria-label={t('dashNavAria')} className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto">
        {[...sidebarLinks, ...(userRole === 'admin' ? [adminLink] : [])].map((link) => (
          <NavLink
            key={link.href}
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
            {t(link.nameKey)}
          </NavLink>
        ))}
        <button
          onClick={handleLogout}
          className="lg:hidden flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium transition-all duration-200 text-slate-600 hover:text-[#1b1b1b] hover:bg-slate-100 w-full text-start"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">logout</span>
          {t('logout')}
        </button>
      </nav>

      {widgetHidden && (
        <div className="px-3 py-2 shrink-0 border-t border-slate-200 lg:border-t-0 lg:px-4 lg:pb-2 lg:pt-1">
          <AccessibilityFooterRestore
            onAfterClick={onLinkClick}
            className="!text-xs !font-medium text-slate-600 hover:text-[#a855f7] text-start !no-underline hover:!underline block w-full"
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
              {userName ? t('dashHelloName').replace('{name}', userName) : t('dashHello')}
            </span>
            <span className="text-xs text-slate-500">
              {subscriptionStatus === 'cancelled' ? t('dashPlanCancelled') : getPlanDisplayName(planType)}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="hidden lg:flex items-center justify-center gap-3 px-3 py-2 w-full text-slate-600 hover:text-[#1b1b1b] hover:bg-slate-100 rounded-xl transition-all duration-200 text-base font-medium"
        >
          {t('logout')}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

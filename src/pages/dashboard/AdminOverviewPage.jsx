import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { deleteLinkFromRedis } from '../../lib/redisCache';

const VALID_VIEWS = new Set(['overview', 'new-links', 'users', 'custom-domains']);

const StatCard = ({ title, value, icon, iconBgClass = 'bg-[#135bec]/10', iconColorClass = 'text-[#135bec]' }) => (
  <div className="bg-card-bg border border-card-border rounded-2xl p-5 transition-all hover:shadow-card-mint">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2 rounded-lg ${iconBgClass} ${iconColorClass}`}>
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
    </div>
    <div className="space-y-1">
      <h3 className="text-[#1b1b1b] text-xs uppercase font-bold tracking-widest">{title}</h3>
      <p className="text-3xl font-extrabold text-[#1b1b1b]">{value}</p>
    </div>
  </div>
);

const AdminOverviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const WORKER_BASE_URL = (import.meta.env.VITE_WORKER_URL || 'https://glynk.to').replace(/\/$/, '');
  const initialView = searchParams.get('view');
  const [activeView, setActiveView] = useState(
    VALID_VIEWS.has(initialView) ? initialView : 'overview'
  ); // 'overview' | 'new-links' | 'users' | 'custom-domains'
  const [pendingLinks, setPendingLinks] = useState([]);
  const [users, setUsers] = useState([]);
  const [customDomains, setCustomDomains] = useState([]);
  const [overviewStats, setOverviewStats] = useState({
    newLinks: 0,
    links: 0,
    users: 0,
    customDomains: 0,
    capi: 0,
    cleanClicks: 0,
    bots: 0,
  });
  const [loading, setLoading] = useState(true); // new-links loading
  const [usersLoading, setUsersLoading] = useState(false);
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // link id being approved/rejected
  const [impersonatingUserId, setImpersonatingUserId] = useState(null);
  const overviewNavButtonClass =
    'ml-3 px-4 py-2.5 rounded-xl bg-[#6358de] text-white text-base font-bold hover:bg-[#5348c7] transition-colors';

  const changeView = (view) => {
    if (!VALID_VIEWS.has(view)) return;
    const nextPath = view === 'overview' ? '/dashboard/admin' : `/dashboard/admin?view=${view}`;
    navigate(nextPath);
  };

  const fetchPendingLinks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('links')
        .select('id, name, short_url, target_url, fallback_url, geo_rules, created_at, user_id, domain, slug')
        .eq('review_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingLinks(data || []);
    } catch (err) {
      console.error('Error fetching pending links:', err);
      setPendingLinks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingLinks();
    fetchOverviewStats();
  }, []);

  const fetchOverviewStats = async () => {
    try {
      const [
        pendingLinksRes,
        linksRes,
        usersRes,
        customDomainsRes,
        capiRes,
        totalClicksRes,
        cleanClicksRes,
      ] = await Promise.all([
        supabase.from('links').select('*', { count: 'exact', head: true }).eq('review_status', 'pending'),
        supabase.from('links').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .neq('email', 'hello@goodlink.ai'),
        supabase.from('custom_domains').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('pixels').select('*', { count: 'exact', head: true }),
        supabase.from('clicks').select('*', { count: 'exact', head: true }),
        supabase.from('clicks').select('*', { count: 'exact', head: true }).eq('verdict', 'clean'),
      ]);

      const errors = [
        pendingLinksRes.error,
        linksRes.error,
        usersRes.error,
        customDomainsRes.error,
        capiRes.error,
        totalClicksRes.error,
        cleanClicksRes.error,
      ].filter(Boolean);
      if (errors.length > 0) {
        throw new Error(errors.map((e) => e.message).join(' | '));
      }

      const totalClicks = totalClicksRes.count || 0;
      const cleanClicks = cleanClicksRes.count || 0;
      setOverviewStats({
        newLinks: pendingLinksRes.count || 0,
        links: linksRes.count || 0,
        users: usersRes.count || 0,
        customDomains: customDomainsRes.count || 0,
        capi: capiRes.count || 0,
        cleanClicks,
        bots: Math.max(0, totalClicks - cleanClicks),
      });
    } catch (err) {
      console.error('Error fetching admin overview stats:', err);
      setOverviewStats({
        newLinks: 0,
        links: 0,
        users: 0,
        customDomains: 0,
        capi: 0,
        cleanClicks: 0,
        bots: 0,
      });
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, plan_type, role, created_at')
        .neq('email', 'hello@goodlink.ai')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'users') {
      fetchUsers();
    }
  }, [activeView]);

  useEffect(() => {
    const view = searchParams.get('view');
    setActiveView(VALID_VIEWS.has(view) ? view : 'overview');
  }, [location.search, searchParams]);

  const fetchCustomDomains = async () => {
    setDomainsLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_domains')
        .select('id, domain, status, created_at, user_id')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCustomDomains(data || []);
    } catch (err) {
      console.error('Error fetching custom domains:', err);
      setCustomDomains([]);
    } finally {
      setDomainsLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'custom-domains') {
      fetchCustomDomains();
    }
  }, [activeView]);

  const setLinkStatus = async (link, action) => {
    const linkId = link.id;
    setActionLoading(linkId);
    try {
      const payload =
        action === 'active'
          ? { review_status: 'active', updated_at: new Date().toISOString() }
          : { review_status: 'rejected', status: 'rejected', updated_at: new Date().toISOString() };
      const { error } = await supabase.from('links').update(payload).eq('id', linkId);

      if (error) throw error;

      if (action === 'rejected' && link.domain && link.slug) {
        try {
          await deleteLinkFromRedis(link.domain, link.slug);
        } catch (redisErr) {
          console.warn('⚠️ [Admin] Failed to remove link from Upstash after reject:', redisErr);
        }
      }

      setPendingLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch (err) {
      console.error('Error updating link status:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const loginAsUser = async (user) => {
    const targetEmail = user?.email?.trim();
    if (!targetEmail) {
      alert('Cannot impersonate user without email.');
      return;
    }

    setImpersonatingUserId(user.user_id);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const session = sessionData?.session;
      if (!session?.access_token || !session?.refresh_token) {
        throw new Error('Admin session not found. Please login again.');
      }

      const backupSession = {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        adminEmail: session.user?.email || null,
        targetEmail,
        startedAt: new Date().toISOString(),
      };
      localStorage.setItem('goodlink:impersonation_backup', JSON.stringify(backupSession));
      // Mark impersonation intent before redirecting to magic link callback.
      localStorage.setItem('goodlink:impersonation_active', 'true');

      const response = await fetch(`${WORKER_BASE_URL}/api/admin/impersonate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ targetEmail }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to create impersonation login link.');
      }
      if (!payload?.loginUrl) {
        throw new Error('Impersonation link was not returned by server.');
      }

      window.location.assign(payload.loginUrl);
    } catch (err) {
      console.error('Error impersonating user:', err);
      alert(err?.message || 'Failed to login as user.');
      localStorage.removeItem('goodlink:impersonation_backup');
      localStorage.removeItem('goodlink:impersonation_active');
    } finally {
      setImpersonatingUserId(null);
    }
  };

  const geoRulesList = (geoRules) => {
    if (!Array.isArray(geoRules) || geoRules.length === 0) return null;
    return geoRules.map((rule, i) => (
      <div
        key={i}
        className="text-base text-slate-700 pl-3 border-l-2 border-slate-300 mt-2 break-words"
      >
        <span className="font-bold text-slate-800">{rule.country || 'Country'}</span>
        {' → '}
        <a
          href={rule.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline break-all"
          style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
        >
          {rule.url}
        </a>
      </div>
    ));
  };

  const urlBlock = (label, url, required = false) => {
    if (!required && !url) return null;
    return (
      <div className="mt-3">
        <span className="block text-sm font-bold text-slate-700 mb-1">{label}</span>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-medium text-primary hover:underline break-all block"
            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
          >
            {url}
          </a>
        ) : (
          <span className="text-base font-medium text-slate-500">—</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1b1b1b]">Admin Panel</h1>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        {activeView === 'overview' ? (
          <>
            <h2 className="text-lg font-bold text-[#1b1b1b] mb-2">System Management</h2>
            <p className="text-slate-600 mb-6 text-base">
              Welcome to the admin overview. Here you can manage users, view global analytics, and
              monitor system health.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
              <StatCard
                title="New Links"
                value={overviewStats.newLinks}
                icon="link"
                iconBgClass="bg-[#6358de]/10"
                iconColorClass="text-[#6358de]"
              />
              <StatCard
                title="Users"
                value={overviewStats.users}
                icon="group"
                iconBgClass="bg-[#135bec]/10"
                iconColorClass="text-[#135bec]"
              />
              <StatCard
                title="Links"
                value={overviewStats.links}
                icon="link"
                iconBgClass="bg-[#4a3dc4]/10"
                iconColorClass="text-[#4a3dc4]"
              />
              <StatCard
                title="Custom Domains"
                value={overviewStats.customDomains}
                icon="dns"
                iconBgClass="bg-[#0b996f]/10"
                iconColorClass="text-[#0b996f]"
              />
              <StatCard
                title="CAPI"
                value={overviewStats.capi}
                icon="bolt"
                iconBgClass="bg-[#7c6ee8]/10"
                iconColorClass="text-[#7c6ee8]"
              />
              <StatCard
                title="Clicks"
                value={overviewStats.cleanClicks}
                icon="ads_click"
                iconBgClass="bg-[#10b981]/10"
                iconColorClass="text-[#10b981]"
              />
              <StatCard
                title="Bots"
                value={overviewStats.bots}
                icon="smart_toy"
                iconBgClass="bg-red-500/10"
                iconColorClass="text-red-600"
              />
            </div>
            <button
              type="button"
              onClick={() => changeView('new-links')}
              className="px-4 py-2.5 rounded-xl bg-[#6358de] text-white text-base font-bold hover:bg-[#5348c7] transition-colors"
            >
              New Links
            </button>
            <button
              type="button"
              onClick={() => changeView('users')}
              className={overviewNavButtonClass}
            >
              Users
            </button>
            <button
              type="button"
              onClick={() => changeView('custom-domains')}
              className={overviewNavButtonClass}
            >
              Custom Domain
            </button>
          </>
        ) : activeView === 'new-links' ? (
          <>
            <div className="mb-4">
              <button
                type="button"
                onClick={() => changeView('overview')}
                className="mb-3 px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-[#1b1b1b] hover:bg-slate-100"
              >
                Back
              </button>
              <h3 className="text-lg font-bold text-[#1b1b1b]">New Links</h3>
            </div>
            {loading ? (
              <p className="text-slate-500 text-base font-medium">Loading...</p>
            ) : pendingLinks.length === 0 ? (
              <p className="text-slate-500 text-base font-medium">No pending links.</p>
            ) : (
              <ul className="space-y-5">
                {pendingLinks.map((link) => (
                  <li
                    key={link.id}
                    className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="min-w-0 flex-1 w-full">
                        <p
                          className="text-lg font-bold text-[#1b1b1b] mb-2 break-words"
                          title={link.name}
                        >
                          {link.name || 'Unnamed link'}
                        </p>
                        <div className="space-y-0">
                          <span className="block text-sm font-bold text-slate-700 mt-2">Short URL</span>
                          <a
                            href={link.short_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-base font-medium text-primary hover:underline break-all block mt-0.5"
                            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                          >
                            {link.short_url}
                          </a>
                        </div>
                        {urlBlock('Target URL', link.target_url, true)}
                        {urlBlock('Fallback / Redirect URL', link.fallback_url)}
                        {geoRulesList(link.geo_rules)}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 sm:pl-4 border-t border-slate-200 sm:border-t-0 sm:border-l sm:border-slate-200">
                        <button
                          type="button"
                          onClick={() => setLinkStatus(link, 'active')}
                          disabled={actionLoading === link.id}
                          className="px-4 py-2.5 rounded-xl bg-secondary-green text-[#1b1b1b] text-base font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                          {actionLoading === link.id ? '…' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setLinkStatus(link, 'rejected')}
                          disabled={actionLoading === link.id}
                          className="px-4 py-2.5 rounded-xl border-2 border-red-400 text-red-600 text-base font-bold hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          {actionLoading === link.id ? '…' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : activeView === 'users' ? (
          <>
            <div className="mb-4">
              <button
                type="button"
                onClick={() => changeView('overview')}
                className="mb-3 px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-[#1b1b1b] hover:bg-slate-100"
              >
                Back
              </button>
              <h3 className="text-lg font-bold text-[#1b1b1b]">Users</h3>
            </div>
            {usersLoading ? (
              <p className="text-slate-500 text-base font-medium">Loading...</p>
            ) : users.length === 0 ? (
              <p className="text-slate-500 text-base font-medium">No users found.</p>
            ) : (
              <ul className="space-y-3">
                {users.map((u) => (
                  <li
                    key={u.user_id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#1b1b1b] break-all">
                        {u.email?.trim() || 'No email'}
                      </p>
                      <p className="text-base font-bold text-[#1b1b1b] break-all">
                        {u.full_name?.trim() || 'Unnamed user'}
                      </p>
                      <p className="text-xs text-slate-500 break-all">{u.user_id}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        Plan: {(u.plan_type || 'free').toUpperCase()} | Role:{' '}
                        {(u.role || 'user').toUpperCase()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => loginAsUser(u)}
                      disabled={impersonatingUserId === u.user_id}
                      className="px-4 py-2.5 rounded-xl bg-[#6358de] text-white text-sm font-bold hover:bg-[#5348c7] disabled:opacity-60 transition-colors"
                    >
                      {impersonatingUserId === u.user_id ? 'Opening…' : 'Login as User'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <div className="mb-4">
              <button
                type="button"
                onClick={() => changeView('overview')}
                className="mb-3 px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-[#1b1b1b] hover:bg-slate-100"
              >
                Back
              </button>
              <h3 className="text-lg font-bold text-[#1b1b1b]">Custom Domains</h3>
            </div>
            {domainsLoading ? (
              <p className="text-slate-500 text-base font-medium">Loading...</p>
            ) : customDomains.length === 0 ? (
              <p className="text-slate-500 text-base font-medium">No custom domains found.</p>
            ) : (
              <ul className="space-y-3">
                {customDomains.map((d) => (
                  <li
                    key={d.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-base font-bold text-[#1b1b1b] break-all">{d.domain || '-'}</p>
                      <p className="text-xs text-slate-500 break-all">{d.user_id || '-'}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Created:{' '}
                        {d.created_at ? new Date(d.created_at).toLocaleString() : '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full border border-slate-300 text-xs font-bold text-slate-700 uppercase tracking-wide">
                        {d.status || 'unknown'}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard/admin/custom-domains/${d.id}`)}
                        className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-[#1b1b1b] hover:bg-slate-100 transition-colors"
                      >
                        Details
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminOverviewPage;

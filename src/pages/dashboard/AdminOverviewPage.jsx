import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const AdminOverviewPage = () => {
  const [pendingLinks, setPendingLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // link id being approved/rejected

  const fetchPendingLinks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('links')
        .select('id, name, short_url, target_url, fallback_url, geo_rules, created_at, user_id')
        .eq('status', 'pending')
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
  }, []);

  const setLinkStatus = async (linkId, newStatus) => {
    setActionLoading(linkId);
    try {
      const { error } = await supabase
        .from('links')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', linkId);

      if (error) throw error;
      setPendingLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch (err) {
      console.error('Error updating link status:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const geoRulesList = (geoRules) => {
    if (!Array.isArray(geoRules) || geoRules.length === 0) return null;
    return geoRules.map((rule, i) => (
      <div key={i} className="text-sm text-slate-600 pl-2 border-l-2 border-slate-200 mt-1">
        <span className="font-medium text-slate-700">{rule.country || 'Country'}</span>
        {' → '}
        <a
          href={rule.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline break-all"
        >
          {rule.url}
        </a>
      </div>
    ));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1b1b1b]">Admin Panel</h1>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1b1b1b] mb-2">System Management</h2>
        <p className="text-slate-600 mb-6">
          Welcome to the admin overview. Here you can manage users, view global analytics, and
          monitor system health. Use the section below to approve or reject pending links.
        </p>

        <h3 className="text-base font-semibold text-[#1b1b1b] mb-3">Pending links</h3>
        {loading ? (
          <p className="text-slate-500">Loading...</p>
        ) : pendingLinks.length === 0 ? (
          <p className="text-slate-500">No pending links.</p>
        ) : (
          <ul className="space-y-4">
            {pendingLinks.map((link) => (
              <li
                key={link.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#1b1b1b] truncate" title={link.name}>
                      {link.name || 'Unnamed link'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Short:{' '}
                      <a
                        href={link.short_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {link.short_url}
                      </a>
                    </p>
                    <p className="text-sm text-slate-700 mt-2">
                      <span className="font-medium">Target URL:</span>{' '}
                      <a
                        href={link.target_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline break-all"
                      >
                        {link.target_url || '—'}
                      </a>
                    </p>
                    {link.fallback_url && (
                      <p className="text-sm text-slate-700 mt-1">
                        <span className="font-medium">Fallback / Redirect URL:</span>{' '}
                        <a
                          href={link.fallback_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline break-all"
                        >
                          {link.fallback_url}
                        </a>
                      </p>
                    )}
                    {geoRulesList(link.geo_rules)}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setLinkStatus(link.id, 'active')}
                      disabled={actionLoading === link.id}
                      className="px-4 py-2 rounded-xl bg-secondary-green text-[#1b1b1b] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {actionLoading === link.id ? '…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLinkStatus(link.id, 'rejected')}
                      disabled={actionLoading === link.id}
                      className="px-4 py-2 rounded-xl border border-red-300 text-red-600 font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === link.id ? '…' : 'Reject'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminOverviewPage;

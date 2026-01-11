import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import NewLinkWizard from '../../components/dashboard/NewLinkWizard';

const LinkManager = () => {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Error fetching links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const truncateText = (text, maxLength = 40) => {
    if (!text) return '—';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };


  const handleToggleStatus = async (linkId, currentStatus) => {
    try {
      // Toggle between 'active' and 'PAUSED'
      // If status is 'active' -> change to 'PAUSED', otherwise change to 'active'
      const newStatus = (currentStatus === 'active') ? 'PAUSED' : 'active';
      
      const { error } = await supabase
        .from('links')
        .update({ status: newStatus })
        .eq('id', linkId);

      if (error) {
        throw error;
      }
      fetchLinks(); // Refresh the list
    } catch (error) {
      console.error('Error updating link status:', error);
      alert('Error updating link status. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-8 w-full h-full items-center justify-center">
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-4xl text-slate-600 animate-spin">refresh</span>
          <p className="text-slate-400 mt-4">Loading links...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Link Manager</h1>
          <p className="text-sm md:text-base text-slate-400">Create and manage your smart links</p>
        </div>
        <button
          onClick={() => setIsWizardOpen(true)}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 md:py-2.5 bg-primary hover:bg-primary/90 active:bg-primary/80 text-white font-bold rounded-xl transition-colors shadow-lg shadow-primary/30 text-base md:text-sm"
        >
          <span className="material-symbols-outlined text-xl md:text-base">add</span>
          New Link
        </button>
      </div>

      {/* Links List */}
      {links.length === 0 ? (
        <div className="bg-[#101622] border border-[#232f48] rounded-2xl p-4 md:p-6 w-full">
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-slate-600 mb-4">link_off</span>
            <p className="text-slate-400 text-lg mb-2">No links yet</p>
            <p className="text-slate-500 text-sm">Create your first smart link to get started</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {links.map((link) => (
            <div
              key={link.id}
              className="bg-[#101622] border border-[#232f48] rounded-xl p-5 transition-all hover:bg-white/5 hover:border-primary/30 flex flex-col gap-4"
            >
              {/* Name & Destination */}
              <div className="flex flex-col gap-2 min-w-0 flex-1">
                <span className="text-lg font-bold text-white break-words line-clamp-2" title={link.name || 'Untitled'}>
                  {link.name || 'Untitled'}
                </span>
                <span className="text-slate-500 text-sm truncate" title={link.target_url}>
                  {truncateText(link.target_url, 60)}
                </span>
              </div>

              {/* Short URL */}
              <div className="flex items-center gap-2 min-w-0 p-3 bg-[#0b0f19] rounded-lg border border-[#232f48]">
                <span className="text-primary font-mono text-sm truncate flex-1 min-w-0" title={link.short_url}>
                  {link.short_url}
                </span>
                <button
                  onClick={() => handleCopy(link.short_url)}
                  className="text-slate-400 hover:text-primary transition-colors p-1.5 rounded flex-shrink-0"
                  title="Copy URL"
                >
                  <span className="material-symbols-outlined text-base">content_copy</span>
                </button>
              </div>

              {/* Status & Actions */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#232f48]">
                {/* Status */}
                <button
                  onClick={() => handleToggleStatus(link.id, link.status || 'active')}
                  className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                    (link.status === 'active') ? 'bg-primary' : 'bg-[#232f48]'
                  }`}
                  aria-label="Toggle link status"
                  title={link.status === 'active' ? 'Active - Click to pause' : 'Paused - Click to activate'}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      (link.status === 'active') ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>

                {/* Actions */}
                <div className="ml-auto">
                  <LinkActionsMenu 
                    link={link} 
                    onRefresh={fetchLinks}
                    onEdit={(linkToEdit) => {
                      setEditingLink(linkToEdit);
                      setIsWizardOpen(true);
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Wizard Modal */}
      {isWizardOpen && (
        <NewLinkWizard
          isOpen={isWizardOpen}
          onClose={() => {
            setIsWizardOpen(false);
            setEditingLink(null);
            fetchLinks(); // Refresh links after closing wizard
          }}
          initialData={editingLink}
        />
      )}
    </div>
  );
};

// Actions Menu Component
const LinkActionsMenu = ({ link, onRefresh }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this link?')) return;

    try {
      const { error } = await supabase
        .from('links')
        .delete()
        .eq('id', link.id);

      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Error deleting link:', error);
      alert('Error deleting link. Please try again.');
    }
  };

  const handleDuplicate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('links')
        .insert({
          user_id: user.id,
          name: `${link.name} (Copy)`,
          target_url: link.target_url,
          domain: link.domain,
          slug: `${link.slug}-copy-${Date.now()}`,
          short_url: `https://${link.domain}/${link.slug}-copy-${Date.now()}`,
          utm_source: link.utm_source,
          utm_medium: link.utm_medium,
          utm_campaign: link.utm_campaign,
          utm_content: link.utm_content,
          parameter_pass_through: link.parameter_pass_through,
          pixels: link.pixels,
          server_side_tracking: link.server_side_tracking,
          custom_script: link.custom_script,
          fraud_shield: link.fraud_shield,
          bot_action: link.bot_action,
          geo_rules: link.geo_rules,
        });

      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Error duplicating link:', error);
      alert('Error duplicating link. Please try again.');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-slate-400 hover:text-white transition-colors p-2"
        aria-label="Actions menu"
      >
        <span className="material-symbols-outlined">more_vert</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-[#101622] border border-[#232f48] rounded-xl shadow-2xl z-20 overflow-hidden min-w-max">
            <button
              onClick={() => {
                setIsOpen(false);
                onEdit(link);
              }}
              className="w-full px-4 py-3 text-left text-white hover:bg-white/5 transition-colors flex items-center gap-3 text-sm"
            >
              <span className="material-symbols-outlined text-base">edit</span>
              Edit
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                // TODO: Navigate to analytics page
                alert('Analytics page coming soon');
              }}
              className="w-full px-4 py-3 text-left text-white hover:bg-white/5 transition-colors flex items-center gap-3 text-sm"
            >
              <span className="material-symbols-outlined text-base">insights</span>
              Analytics
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                handleDuplicate();
              }}
              className="w-full px-4 py-3 text-left text-white hover:bg-white/5 transition-colors flex items-center gap-3 text-sm"
            >
              <span className="material-symbols-outlined text-base">content_copy</span>
              Duplicate
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                handleDelete();
              }}
              className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-3 text-sm"
            >
              <span className="material-symbols-outlined text-base">delete</span>
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LinkManager;

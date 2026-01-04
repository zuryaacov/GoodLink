import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import NewLinkWizard from '../../components/dashboard/NewLinkWizard';

const LinkManager = () => {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
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

  const getTrafficQualityColor = (link) => {
    // TODO: Implement actual traffic quality logic based on IPQS/Turnstile
    // For now, return a default color
    return 'green';
  };

  const getPixelIcons = (pixels) => {
    if (!pixels || pixels.length === 0) return null;
    
    // For now, show a generic pixel icon for each pixel ID
    // TODO: Map pixel IDs to actual pixel types/icons when pixel data is available
    return (
      <div className="flex gap-1.5">
        {pixels.map((pixelId, index) => (
          <span 
            key={index} 
            className="material-symbols-outlined text-lg md:text-base text-slate-400" 
            title={`Pixel ${pixelId}`}
          >
            ads_click
          </span>
        ))}
      </div>
    );
  };

  const handleToggleStatus = async (linkId, currentStatus) => {
    try {
      // Default to true (active) if status is undefined/null
      const newStatus = currentStatus === false ? true : false;
      
      const { error } = await supabase
        .from('links')
        .update({ status: newStatus })
        .eq('id', linkId);

      if (error) {
        // If status column doesn't exist, ignore the error for now
        if (!error.message.includes('column "status"')) {
          throw error;
        }
      }
      fetchLinks(); // Refresh the list
    } catch (error) {
      console.error('Error updating link status:', error);
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
        <div className="flex flex-col gap-4 lg:gap-0 w-full">
          <div className="overflow-x-auto -mx-4 md:-mx-6 px-4 md:px-6 lg:mx-0 lg:px-0 w-full">
            {/* Desktop Header - Grid (hidden on mobile/tablet, shown on large screens) */}
            <div className="hidden lg:grid lg:grid-cols-12 gap-3 xl:gap-4 bg-[#0b0f19] border border-[#232f48] rounded-t-xl px-4 py-3 font-bold text-slate-400 text-xs uppercase tracking-wider min-w-full">
            <div className="col-span-3">Name & Destination</div>
            <div className="col-span-2">Short URL</div>
            <div className="col-span-1 text-right">Clicks</div>
            <div className="col-span-1 text-center">Quality</div>
            <div className="col-span-1 text-center">Pixels</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-2 text-center">Actions</div>
          </div>

          {/* Links List */}
          {links.map((link, index) => (
            <div
              key={link.id}
              className={`bg-[#101622] border border-[#232f48] lg:border-b lg:border-x-0 lg:border-t-0 p-4 sm:p-5 lg:p-4 rounded-xl lg:rounded-none transition-all hover:bg-white/5 lg:grid lg:grid-cols-12 lg:gap-3 xl:gap-4 lg:items-center ${
                index === links.length - 1 ? 'lg:rounded-b-xl' : ''
              }`}
            >
              {/* Name & Destination */}
              <div className="flex flex-col gap-2 mb-4 lg:mb-0 lg:col-span-3 min-w-0">
                <span className="text-xs uppercase text-slate-500 font-bold lg:hidden">Name & Destination</span>
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-lg sm:text-xl lg:text-base font-bold text-white break-words overflow-hidden text-ellipsis line-clamp-2" title={link.name || 'Untitled'}>
                    {link.name || 'Untitled'}
                  </span>
                  <span className="text-slate-500 text-xs sm:text-sm lg:text-xs truncate" title={link.target_url}>
                    {truncateText(link.target_url, 50)}
                  </span>
                </div>
              </div>

              {/* Short URL */}
              <div className="flex flex-col gap-2 mb-4 lg:mb-0 lg:col-span-2">
                <span className="text-xs uppercase text-slate-500 font-bold lg:hidden">Short URL</span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-primary font-mono text-base sm:text-lg lg:text-sm truncate flex-1 min-w-0" title={link.short_url}>
                    {link.short_url}
                  </span>
                  <button
                    onClick={() => handleCopy(link.short_url)}
                    className="text-slate-400 hover:text-primary transition-colors p-2 lg:p-1 bg-[#0b0f19] lg:bg-transparent rounded-lg lg:rounded flex-shrink-0"
                    title="Copy URL"
                  >
                    <span className="material-symbols-outlined text-base sm:text-lg lg:text-base">content_copy</span>
                  </button>
                </div>
              </div>

              {/* Clicks */}
              <div className="flex flex-col gap-2 mb-4 lg:mb-0 lg:col-span-1 lg:text-right">
                <span className="text-xs uppercase text-slate-500 font-bold lg:hidden">Clicks</span>
                <div className="flex flex-col lg:items-end">
                  <span className="text-xl sm:text-2xl lg:text-base font-bold text-white">0 / 0</span>
                  <span className="text-xs text-slate-500">24h / Total</span>
                </div>
              </div>

              {/* Traffic Quality */}
              <div className="flex flex-col gap-2 mb-4 lg:mb-0 lg:col-span-1 lg:text-center">
                <span className="text-xs uppercase text-slate-500 font-bold lg:hidden">Quality</span>
                <div className="flex items-center lg:justify-center">
                  <span className="material-symbols-outlined text-green-400 text-lg sm:text-xl lg:text-base" title="Traffic Quality: Good">
                    speed
                  </span>
                </div>
              </div>

              {/* Pixels */}
              <div className="flex flex-col gap-2 mb-4 lg:mb-0 lg:col-span-1 lg:text-center">
                <span className="text-xs uppercase text-slate-500 font-bold lg:hidden">Pixels</span>
                <div className="flex items-center lg:justify-center flex-wrap gap-1">
                  {getPixelIcons(link.pixels)}
                  {(!link.pixels || link.pixels.length === 0) && (
                    <span className="text-slate-600">—</span>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between lg:justify-center gap-4 mb-4 lg:mb-0 lg:col-span-2">
                <span className="text-xs uppercase text-slate-500 font-bold lg:hidden">Status</span>
                <button
                  onClick={() => handleToggleStatus(link.id, link.status !== false)}
                  className={`relative w-14 h-7 lg:w-12 lg:h-6 rounded-full transition-colors flex-shrink-0 ${
                    (link.status === undefined || link.status !== false) ? 'bg-primary' : 'bg-[#232f48]'
                  }`}
                  aria-label="Toggle link status"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 lg:top-1 lg:left-1 w-6 h-6 lg:w-4 lg:h-4 bg-white rounded-full transition-transform ${
                      (link.status === undefined || link.status !== false) ? 'translate-x-7 lg:translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between lg:justify-center gap-4 lg:col-span-2">
                <span className="text-xs uppercase text-slate-500 font-bold lg:hidden">Actions</span>
                <div className="ml-auto lg:ml-0">
                  <LinkActionsMenu link={link} onRefresh={fetchLinks} />
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* Wizard Modal */}
      {isWizardOpen && (
        <NewLinkWizard
          isOpen={isWizardOpen}
          onClose={() => {
            setIsWizardOpen(false);
            fetchLinks(); // Refresh links after closing wizard
          }}
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
                // TODO: Implement edit functionality
                alert('Edit functionality coming soon');
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

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/common/Modal';
import { updateLinkInRedis, deleteLinkFromRedis } from '../../lib/redisCache';

const PLATFORMS = {
  meta: { name: 'Meta (FB/IG)', colorClass: 'text-blue-400 bg-blue-400/10' },
  google: { name: 'Google Ads', colorClass: 'text-emerald-400 bg-emerald-400/10' },
  tiktok: { name: 'TikTok Ads', colorClass: 'text-pink-400 bg-pink-400/10' },
  taboola: { name: 'Taboola', colorClass: 'text-orange-400 bg-orange-400/10' },
  outbrain: { name: 'Outbrain', colorClass: 'text-indigo-400 bg-indigo-400/10' }
};

const LinkManager = () => {
  const navigate = useNavigate();
  const [links, setLinks] = useState([]);
  const [presetsMap, setPresetsMap] = useState({}); // Map of preset ID to preset data
  const [loading, setLoading] = useState(true);
  const [utmPresetsModal, setUtmPresetsModal] = useState({
    isOpen: false,
    link: null,
  });
  
  // Modal states
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    onConfirm: null,
    isLoading: false,
  });

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch links
      const { data: linksData, error: linksError } = await supabase
        .from('links')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });

      if (linksError) throw linksError;
      
      // Collect all unique preset IDs from all links
      const presetIds = new Set();
      (linksData || []).forEach(link => {
        if (Array.isArray(link.utm_presets)) {
          link.utm_presets.forEach(id => presetIds.add(id));
        }
      });

      // Fetch all presets if there are any
      let presetsDataMap = {};
      if (presetIds.size > 0) {
        const { data: presetsData, error: presetsError } = await supabase
          .from('utm_presets')
          .select('*')
          .in('id', Array.from(presetIds))
          .eq('user_id', user.id);

        if (!presetsError && presetsData) {
          presetsDataMap = presetsData.reduce((acc, preset) => {
            acc[preset.id] = preset;
            return acc;
          }, {});
        }
      }

      setPresetsMap(presetsDataMap);
      setLinks(linksData || []);
    } catch (error) {
      console.error('Error fetching links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (url, copyBtnId = null) => {
    try {
      await navigator.clipboard.writeText(url);
      // You could add a toast notification here
      if (copyBtnId) {
        // Visual feedback for preset copy
        const element = document.getElementById(copyBtnId);
        if (element) {
          const originalText = element.innerHTML;
          element.innerHTML = '<span class="material-symbols-outlined text-base">check</span>';
          setTimeout(() => {
            element.innerHTML = originalText;
          }, 1000);
        }
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const buildPresetUrl = (link, preset) => {
    const baseUrl = link.short_url || '';
    if (!preset || !baseUrl) return baseUrl;

    const params = [];
    if (preset.utm_source) params.push(`utm_source=${preset.utm_source}`);
    if (preset.utm_medium) params.push(`utm_medium=${preset.utm_medium}`);
    if (preset.utm_campaign) params.push(`utm_campaign=${preset.utm_campaign}`);
    if (preset.utm_content) params.push(`utm_content=${preset.utm_content}`);
    if (preset.utm_term) params.push(`utm_term=${preset.utm_term}`);

    return params.length > 0 ? `${baseUrl}?${params.join('&')}` : baseUrl;
  };

  const renderUtmPresetsList = (link) => {
    if (!link?.utm_presets || !Array.isArray(link.utm_presets) || link.utm_presets.length === 0) {
      return null;
    }

    return (
      <div className="space-y-2">
        {link.utm_presets.map((presetId) => {
          const preset = presetsMap[presetId];
          if (!preset) return null;

          const platformInfo = PLATFORMS[preset.platform] || {
            name: preset.platform,
            colorClass: 'text-slate-400 bg-slate-400/10'
          };

          const presetUrl = buildPresetUrl(link, preset);
          const copyBtnId = `copy-btn-${link.id}-${presetId}`;

          return (
            <div
              key={presetId}
              className="p-3 bg-[#0b0f19] rounded-lg border border-[#232f48] space-y-2"
            >
              {/* Preset Header */}
              <div className="flex items-center gap-2">
                <div className={`px-2 py-1 rounded text-xs font-bold ${platformInfo.colorClass}`}>
                  {platformInfo.name}
                </div>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs text-slate-300 font-medium truncate flex-1" title={preset.name}>
                  {preset.name}
                </span>
                <span className="text-xs text-slate-500">({link.domain})</span>
              </div>

              {/* Preset URL */}
              <div className="flex items-start gap-2 min-w-0">
                <span
                  className="font-mono text-base font-bold text-emerald-400 flex-1 min-w-0 break-all whitespace-normal"
                  title={presetUrl}
                  style={{ fontWeight: '700' }}
                >
                  {presetUrl}
                </span>
                <button
                  id={copyBtnId}
                  onClick={() => handleCopy(presetUrl, copyBtnId)}
                  className="text-slate-400 hover:text-primary transition-colors p-1.5 rounded flex-shrink-0 mt-0.5"
                  title="Copy Preset URL"
                >
                  <span className="material-symbols-outlined text-base">content_copy</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
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

      // Best-effort: keep Redis in sync as well
      try {
        const linkToUpdate = links.find((l) => l.id === linkId);
        if (linkToUpdate) {
          await updateLinkInRedis({ ...linkToUpdate, status: newStatus }, supabase);
        }
      } catch (redisError) {
        console.warn('⚠️ [LinkManager] Failed to sync Redis after status toggle:', redisError);
      }

      fetchLinks(); // Refresh the list
    } catch (error) {
      console.error('Error updating link status:', error);
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error updating link status. Please try again.',
        onConfirm: null,
        isLoading: false,
      });
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
          onClick={() => navigate('/dashboard/links/new')}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 md:py-2.5 text-white font-bold rounded-xl transition-colors shadow-lg text-base md:text-sm bg-[#FF10F0] hover:bg-[#e00ed0]"
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
                <span className="font-mono font-bold truncate flex-1 min-w-0" style={{ color: "#10b981", fontSize: "1.2em" }} title={link.short_url}>
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

              {/* UTM Presets */}
              <div className="pt-2 border-t border-[#232f48]">
                <div className="flex items-center justify-between gap-3">
                  <div
                    className={`text-xs font-medium ${
                      link.utm_presets && Array.isArray(link.utm_presets) && link.utm_presets.length > 0
                        ? 'text-emerald-400 font-bold'
                        : 'text-slate-500'
                    }`}
                  >
                    UTM Preset Links:
                  </div>
                  {link.utm_presets && Array.isArray(link.utm_presets) && link.utm_presets.length > 0 && (
                    <button
                      onClick={() => setUtmPresetsModal({ isOpen: true, link })}
                      className="p-2 rounded-lg border border-[#232f48] bg-[#FF10F0] hover:bg-[#e00ed0] text-white transition-colors shadow-lg"
                      title="Open UTM preset links"
                    >
                      <span className="material-symbols-outlined text-base leading-none">open_in_new</span>
                    </button>
                  )}
                </div>

                {(!link.utm_presets || !Array.isArray(link.utm_presets) || link.utm_presets.length === 0) && (
                  <div className="pt-2 text-xs text-slate-400">
                    NO UTM Preset
                  </div>
                )}
              </div>

              {/* Status & Actions */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#232f48]">
                {/* Status */}
                <div className="flex items-center gap-2">
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
                  <span className="text-sm text-slate-400 font-medium">
                    {link.status === 'active' ? 'ACTIVE' : 'PAUSED'}
                  </span>
                </div>

                {/* Actions */}
                <div className="ml-auto">
                  <LinkActionsMenu 
                    link={link} 
                    onRefresh={fetchLinks}
                    onEdit={(linkToEdit) => {
                      navigate(`/dashboard/links/edit/${linkToEdit.id}`);
                    }}
                    onDuplicate={(linkToDuplicate) => {
                      navigate(`/dashboard/links/new?duplicate=${linkToDuplicate.id}`);
                    }}
                    onShowModal={(modalConfig) => {
                      setModalState(modalConfig);
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error/Alert Modal */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onConfirm={modalState.onConfirm}
        isLoading={modalState.isLoading}
      />

      {/* UTM Presets Modal */}
      <Modal
        isOpen={utmPresetsModal.isOpen}
        onClose={() => setUtmPresetsModal({ isOpen: false, link: null })}
        title="UTM Preset Links"
        message={
          <div className="space-y-3">
            {utmPresetsModal.link ? (
              <>
                <div className="text-sm text-slate-700">
                  <span className="font-semibold">Link:</span>{' '}
                  <span className="font-mono break-all">{utmPresetsModal.link.short_url}</span>
                </div>
                {renderUtmPresetsList(utmPresetsModal.link)}
              </>
            ) : (
              <div className="text-sm text-slate-700">No data.</div>
            )}
          </div>
        }
        type="info"
      />
    </div>
  );
};

// Actions Menu Component
const LinkActionsMenu = ({ link, onRefresh, onEdit, onDuplicate, onShowModal }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const deletedAt = new Date().toISOString();
      const { error } = await supabase
        .from('links')
        .update({ 
          status: 'deleted',
          deleted_at: deletedAt
        })
        .eq('id', link.id);

      if (error) throw error;

      // Delete from Redis cache so redirects stop immediately
      try {
        await deleteLinkFromRedis(link.domain, link.slug);
      } catch (redisError) {
        console.warn('⚠️ [LinkManager] Failed to delete from Redis:', redisError);
      }
      
      setDeleteModalOpen(false);
      setIsOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Error deleting link:', error);
      setDeleteModalOpen(false);
      setIsDeleting(false);
      // Show error modal - we'll need to pass a callback to show modal
      // For now, we'll use a simple alert as fallback
      alert('Error deleting link. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = () => {
    setIsOpen(false);
    // Call the parent's onDuplicate handler to open the wizard
    if (onDuplicate) {
      onDuplicate(link);
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
                if (onShowModal) {
                  onShowModal({
                    isOpen: true,
                    type: 'info',
                    title: 'Coming Soon',
                    message: 'Analytics page is coming soon. Stay tuned!',
                    onConfirm: null,
                    isLoading: false,
                  });
                }
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
                setDeleteModalOpen(true);
              }}
              className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-3 text-sm"
            >
              <span className="material-symbols-outlined text-base">delete</span>
              Delete
            </button>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
        title="Delete this link?"
        message={
          <>
            Are you sure you want to delete <strong>{link.short_url}</strong>? This will stop all traffic to this destination.
          </>
        }
        type="delete"
        confirmText="Delete Link"
        cancelText="Cancel"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default LinkManager;

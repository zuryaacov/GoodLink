import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/common/Modal';
import { updateLinkInRedis, deleteLinkFromRedis } from '../../lib/redisCache';
import { LayoutGrid, Folder, ChevronRight, Home, LinkIcon } from 'lucide-react';

const PLATFORMS = {
  meta: { name: 'Meta (FB/IG)', colorClass: 'text-blue-400 bg-blue-400/10' },
  google: { name: 'Google Ads', colorClass: 'text-emerald-400 bg-emerald-400/10' },
  tiktok: { name: 'TikTok Ads', colorClass: 'text-pink-400 bg-pink-400/10' },
  taboola: { name: 'Taboola', colorClass: 'text-orange-400 bg-orange-400/10' },
  outbrain: { name: 'Outbrain', colorClass: 'text-indigo-400 bg-indigo-400/10' },
};

const linkClickKey = (link) => `${link.domain ?? ''}/${link.slug ?? ''}`;

const KIND_BY_LEVEL = {
  0: 'workspace',
  1: 'campaign',
  2: 'group',
};

const KIND_LABEL = {
  workspace: 'Workspace',
  campaign: 'Campaign',
  group: 'Group',
};

const KIND_LABEL_PLURAL = {
  workspace: 'Workspaces',
  campaign: 'Campaigns',
  group: 'Groups',
};

const SPACE_NAME_REGEX = /^[A-Za-z0-9 !@#$%^&*()\-\+=}{\[\]]+$/;

const LinkManager = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [userId, setUserId] = useState(null);
  const [links, setLinks] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [currentSpaceId, setCurrentSpaceId] = useState(null);
  const [presetsMap, setPresetsMap] = useState({}); // Map of preset ID to preset data
  const [clickCountsMap, setClickCountsMap] = useState({}); // key: domain/slug -> count
  const [loading, setLoading] = useState(true);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [openSpaceMenuId, setOpenSpaceMenuId] = useState(null);
  const [spaceModal, setSpaceModal] = useState({
    isOpen: false,
    mode: 'create', // 'create' | 'edit'
    spaceId: null,
    kind: null,
    name: '',
    error: null,
    isLoading: false,
  });
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
    fetchData();
  }, []);

  // Sync current space from URL query (supports refresh/back/forward)
  useEffect(() => {
    const querySpaceId = searchParams.get('space_id') || null;
    setCurrentSpaceId((prev) => (prev === querySpaceId ? prev : querySpaceId));
  }, [searchParams]);

  const fetchData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

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
      (linksData || []).forEach((link) => {
        if (Array.isArray(link.utm_presets)) {
          link.utm_presets.forEach((id) => presetIds.add(id));
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

      // Fetch click counts per link (clicks match by domain + slug)
      const { data: clicksData, error: clicksError } = await supabase
        .from('clicks')
        .select('domain, slug')
        .eq('user_id', user.id);

      const counts = {};
      if (!clicksError && clicksData) {
        clicksData.forEach((c) => {
          const key = `${c.domain ?? ''}/${c.slug ?? ''}`;
          counts[key] = (counts[key] || 0) + 1;
        });
      }

      // Fetch hierarchy spaces (workspace/campaign/group)
      // If table doesn't exist yet, we keep dashboard fully functional with links only.
      let spacesData = [];
      const { data: fetchedSpaces, error: spacesError } = await supabase
        .from('link_spaces')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!spacesError && fetchedSpaces) {
        spacesData = fetchedSpaces;
      } else if (spacesError) {
        console.warn('[LinkManager] link_spaces table not ready yet:', spacesError.message);
      }

      setSpaces(spacesData);
      setClickCountsMap(counts);
      setLinks(linksData || []);
    } catch (error) {
      console.error('Error fetching links:', error);
    } finally {
      setLoading(false);
    }
  };

  const spaceById = useMemo(
    () =>
      spaces.reduce((acc, s) => {
        acc[s.id] = s;
        return acc;
      }, {}),
    [spaces]
  );

  const currentSpace = currentSpaceId ? spaceById[currentSpaceId] || null : null;
  const currentLevel = currentSpace?.level ?? 0;
  const nextKind = KIND_BY_LEVEL[currentLevel] || null;

  const goToSpace = (spaceId) => {
    const normalized = spaceId || null;
    setCurrentSpaceId(normalized);
    const next = new URLSearchParams(searchParams);
    if (normalized) {
      next.set('space_id', normalized);
    } else {
      next.delete('space_id');
    }
    setSearchParams(next, { replace: true });
  };

  // If URL contains stale/deleted space_id, reset to root
  useEffect(() => {
    if (!loading && currentSpaceId && !spaceById[currentSpaceId]) {
      goToSpace(null);
    }
  }, [loading, currentSpaceId, spaceById]);

  const childSpaces = useMemo(() => {
    if (!nextKind) return [];
    return spaces
      .filter((s) => (s.parent_id || null) === (currentSpaceId || null) && s.kind === nextKind)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [spaces, currentSpaceId, nextKind]);

  const directLinks = useMemo(
    () => links.filter((l) => (l.space_id || null) === (currentSpaceId || null)),
    [links, currentSpaceId]
  );

  const getDescendantIds = (spaceId) => {
    const out = [];
    const stack = [spaceId];
    while (stack.length) {
      const parent = stack.pop();
      const kids = spaces.filter((s) => (s.parent_id || null) === parent);
      kids.forEach((k) => {
        out.push(k.id);
        stack.push(k.id);
      });
    }
    return out;
  };

  const getSpaceStats = (spaceId) => {
    const ids = [spaceId, ...getDescendantIds(spaceId)];
    const idsSet = new Set(ids);
    const scoped = links.filter((l) => idsSet.has(l.space_id || null));
    const clicks = scoped.reduce((sum, link) => sum + (clickCountsMap[linkClickKey(link)] ?? 0), 0);
    return { linksCount: scoped.length, clicks };
  };

  const breadcrumbs = useMemo(() => {
    if (!currentSpaceId || !currentSpace) return [];
    const out = [];
    let cursor = currentSpace;
    while (cursor) {
      out.push(cursor);
      cursor = cursor.parent_id ? spaceById[cursor.parent_id] : null;
    }
    return out.reverse();
  }, [currentSpaceId, currentSpace, spaceById]);

  const openCreateSpaceModal = (kind) => {
    setCreateMenuOpen(false);
    setSpaceModal({
      isOpen: true,
      mode: 'create',
      spaceId: null,
      kind,
      name: '',
      error: null,
      isLoading: false,
    });
  };

  const openEditSpaceModal = (space) => {
    setOpenSpaceMenuId(null);
    setSpaceModal({
      isOpen: true,
      mode: 'edit',
      spaceId: space.id,
      kind: space.kind,
      name: space.name || '',
      error: null,
      isLoading: false,
    });
  };

  const closeCreateSpaceModal = () => {
    if (spaceModal.isLoading) return;
    setSpaceModal((prev) => ({ ...prev, isOpen: false }));
  };

  const validateSpaceName = (name) => {
    const trimmed = String(name || '').trim();
    if (!trimmed) return 'Name is required.';
    if (trimmed.length < 2) return 'Name must be at least 2 characters.';
    if (trimmed.length > 80) return 'Name cannot exceed 80 characters.';
    if (!SPACE_NAME_REGEX.test(trimmed)) {
      return 'Allowed: English letters, numbers, spaces, and !@#$%^&*)(-+=}{][';
    }
    return null;
  };

  const handleSaveSpace = async () => {
    const validationError = validateSpaceName(spaceModal.name);
    if (validationError) {
      setSpaceModal((prev) => ({ ...prev, error: validationError }));
      return;
    }
    if (!userId) {
      setSpaceModal((prev) => ({ ...prev, error: 'You must be logged in.' }));
      return;
    }

    try {
      setSpaceModal((prev) => ({ ...prev, isLoading: true, error: null }));
      if (spaceModal.mode === 'edit' && spaceModal.spaceId) {
        const { error } = await supabase
          .from('link_spaces')
          .update({
            name: spaceModal.name.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', spaceModal.spaceId)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const nextLevel = currentSpaceId ? (currentSpace?.level || 0) + 1 : 1;
        if (nextLevel > 3) {
          setSpaceModal((prev) => ({
            ...prev,
            isLoading: false,
            error: 'Maximum depth reached (3 levels).',
          }));
          return;
        }
        const payload = {
          user_id: userId,
          name: spaceModal.name.trim(),
          kind: spaceModal.kind,
          level: nextLevel,
          parent_id: currentSpaceId || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase.from('link_spaces').insert(payload);
        if (error) throw error;
      }
      setSpaceModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
      await fetchData();
    } catch (error) {
      setSpaceModal((prev) => ({
        ...prev,
        isLoading: false,
        error: error?.message || 'Failed to create item. Please try again.',
      }));
    }
  };

  const handleCancelSpace = async (space) => {
    setOpenSpaceMenuId(null);
    const stats = getSpaceStats(space.id);
    if (stats.linksCount > 0) {
      setModalState({
        isOpen: true,
        type: 'alert',
        title: 'Cannot cancel this item',
        message:
          'This item contains links. You cannot cancel it until you move or delete all links inside it.',
        onConfirm: null,
        isLoading: false,
      });
      return;
    }
    setModalState({
      isOpen: true,
      type: 'delete',
      title: `Delete ${KIND_LABEL[space.kind] || 'item'}?`,
      message: (
        <>
          Are you sure you want to delete <strong>{space.name}</strong>?
        </>
      ),
      onConfirm: async () => {
        setModalState((prev) => ({ ...prev, isLoading: true }));
        try {
          const { error } = await supabase
            .from('link_spaces')
            .delete()
            .eq('id', space.id)
            .eq('user_id', userId);
          if (error) throw error;

          if (currentSpaceId === space.id) {
            goToSpace(space.parent_id || null);
          }
          setModalState((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          await fetchData();
        } catch (error) {
          setModalState({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: error?.message || 'Failed to delete item. Please try again.',
            onConfirm: null,
            isLoading: false,
          });
        }
      },
      isLoading: false,
    });
  };

  const handleCreateOption = (option) => {
    setCreateMenuOpen(false);
    if (option === 'link') {
      const query = currentSpaceId ? `?space_id=${encodeURIComponent(currentSpaceId)}` : '';
      navigate(`/dashboard/links/new${query}`);
      return;
    }
    openCreateSpaceModal(option);
  };

  const createOptions = useMemo(() => {
    const options = [{ id: 'link', label: 'New Link' }];
    if (nextKind) options.push({ id: nextKind, label: `New ${KIND_LABEL[nextKind]}` });
    return options;
  }, [nextKind]);

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
            colorClass: 'text-slate-400 bg-slate-400/10',
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
                <span
                  className="text-xs text-slate-300 font-medium truncate flex-1"
                  title={preset.name}
                >
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
    const newStatus = currentStatus === 'active' ? 'PAUSED' : 'active';

    // Optimistic update: change UI immediately so the toggle moves right away
    setLinks((prev) => prev.map((l) => (l.id === linkId ? { ...l, status: newStatus } : l)));

    try {
      const { error } = await supabase.from('links').update({ status: newStatus }).eq('id', linkId);

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
    } catch (error) {
      console.error('Error updating link status:', error);
      // Revert optimistic update on error
      setLinks((prev) => prev.map((l) => (l.id === linkId ? { ...l, status: currentStatus } : l)));
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to change link state (Active/Paused). Please try again.',
        onConfirm: null,
        isLoading: false,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-8 w-full h-full items-center justify-center">
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-4xl text-slate-600 animate-spin">
            refresh
          </span>
          <p className="text-slate-400 mt-4">Loading links...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-bold text-white">My Workspace</h1>
          <p className="text-sm md:text-base text-slate-400">
            Active Grid hierarchy: Workspaces → Campaigns → Groups
          </p>
        </div>
        <div className="relative w-full sm:w-auto">
          <button
            onClick={() =>
              createOptions.length === 1 ? handleCreateOption('link') : setCreateMenuOpen((v) => !v)
            }
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 md:py-2.5 text-white font-bold rounded-xl transition-colors shadow-lg text-base md:text-sm bg-[#FF10F0] hover:bg-[#e00ed0]"
          >
            <span className="material-symbols-outlined text-xl md:text-base">add</span>
            {createOptions.length === 1 ? 'New Link' : 'Create'}
          </button>
          {createMenuOpen && createOptions.length > 1 && (
            <>
              <button
                className="fixed inset-0 z-10"
                aria-label="Close create menu"
                onClick={() => setCreateMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 z-20 rounded-xl border border-[#2a3552] bg-[#101622] shadow-2xl overflow-hidden">
                {createOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleCreateOption(option.id)}
                    className="w-full px-4 py-3 text-left text-white hover:bg-white/5 transition-colors flex items-center justify-between"
                  >
                    <span>{option.label}</span>
                    <span className="material-symbols-outlined text-base text-slate-400">
                      chevron_right
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
        <button
          type="button"
          onClick={() => goToSpace(null)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#2a3552] bg-[#101622] hover:bg-[#151d2d] transition-colors"
        >
          <Home size={13} />
          Root
        </button>
        {breadcrumbs.map((b) => (
          <React.Fragment key={b.id}>
            <ChevronRight size={12} className="text-slate-500" />
            <button
              type="button"
              onClick={() => goToSpace(b.id)}
              className="px-3 py-1.5 rounded-lg border border-[#2a3552] bg-[#101622] hover:bg-[#151d2d] transition-colors"
            >
              {b.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Active Grid cards for current level children */}
      {childSpaces.length > 0 && (
        <div className="flex flex-col gap-6 w-full">
          <div className="relative flex items-center gap-6 py-4">
            <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-[#FF00E5]/40 to-[#FF00E5]"></div>
            <div className="px-8 py-2 rounded-full border border-[#FF00E5]/30 bg-[#161C2C] shadow-[0_0_30px_rgba(255,0,229,0.2)]">
              <span className="text-[12px] font-black text-white tracking-[0.5em] whitespace-nowrap">
                {KIND_LABEL_PLURAL[nextKind] || 'SPACES'}
              </span>
            </div>
            <div className="h-[2px] flex-1 bg-gradient-to-r from-[#FF00E5] via-[#FF00E5]/40 to-transparent"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {childSpaces.map((space) => {
              const stats = getSpaceStats(space.id);
              const kindLabel = KIND_LABEL[space.kind] || 'Campaign';
              return (
                <div
                  key={space.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => goToSpace(space.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      goToSpace(space.id);
                    }
                  }}
                  className="group relative text-left bg-[#101622] border border-[#232f48] rounded-[1.25rem] p-6 flex flex-col min-h-[240px] transition-all duration-300 hover:border-[#FF00E5] hover:shadow-[0_12px_30px_rgba(255,0,229,0.18)]"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold mb-1 group-hover:text-[#FF00E5] transition-colors">
                        {space.name}
                      </h3>
                      <div className="flex items-center gap-2 text-[#00F0FF] text-xs font-bold uppercase tracking-widest opacity-80">
                        <LayoutGrid size={14} />
                        <span>{kindLabel} Space</span>
                      </div>
                    </div>
                    <div className="mr-12 bg-[#FF00E5]/10 p-3 rounded-2xl text-[#FF00E5] shadow-[0_0_15px_rgba(255,0,229,0.1)] transition-all">
                      <Folder size={24} fill="currentColor" fillOpacity={0.2} />
                    </div>
                  </div>
                  <div className="absolute top-4 right-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenSpaceMenuId((prev) => (prev === space.id ? null : space.id));
                      }}
                      className="p-2 rounded-lg bg-[#0b0f19] border border-[#232f48] text-slate-300 hover:text-white hover:border-[#FF00E5]/40 transition-colors"
                      aria-label="Space actions"
                    >
                      <span className="material-symbols-outlined text-base">more_vert</span>
                    </button>
                    {openSpaceMenuId === space.id && (
                      <div
                        className="absolute right-0 mt-2 w-40 rounded-xl border border-[#2a3552] bg-[#101622] shadow-2xl overflow-hidden z-20"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => openEditSpaceModal(space)}
                          className="w-full px-4 py-2.5 text-left text-white hover:bg-white/5 transition-colors text-sm"
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelSpace(space)}
                          className="w-full px-4 py-2.5 text-left text-red-400 hover:bg-red-400/10 transition-colors text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="bg-[#0b0f19] border border-[#232f48] rounded-xl p-4 mb-6">
                    <div className="text-[10px] text-gray-500 font-bold uppercase mb-1 tracking-widest">
                      Total {kindLabel} Clicks
                    </div>
                    <div className="text-2xl font-extrabold text-white">
                      {new Intl.NumberFormat('en-US').format(stats.clicks)}
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-[#232f48]">
                    <div className="text-xs font-bold text-white">
                      {new Intl.NumberFormat('en-US').format(stats.linksCount)} Links Inside
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#00F2B5]">
                      <div className="w-2 h-2 rounded-full bg-[#00F2B5] animate-pulse shadow-[0_0_8px_#00F2B5]"></div>
                      ACTIVE
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {openSpaceMenuId && (
        <button
          type="button"
          aria-label="Close space menu"
          className="fixed inset-0 z-10"
          onClick={() => setOpenSpaceMenuId(null)}
        />
      )}

      {/* Individual links divider */}
      {directLinks.length > 0 && (
        <div className="relative flex items-center gap-6 py-4">
          <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-[#FF00E5]/40 to-[#FF00E5]"></div>
          <div className="px-8 py-2 rounded-full border border-[#FF00E5]/30 bg-[#161C2C] shadow-[0_0_30px_rgba(255,0,229,0.2)]">
            <span className="text-[12px] font-black text-white tracking-[0.5em] whitespace-nowrap">
              Links
            </span>
          </div>
          <div className="h-[2px] flex-1 bg-gradient-to-r from-[#FF00E5] via-[#FF00E5]/40 to-transparent"></div>
        </div>
      )}

      {/* Links List */}
      {directLinks.length === 0 && childSpaces.length === 0 ? (
        <div className="bg-[#101622] border border-[#232f48] rounded-2xl p-4 md:p-6 w-full">
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-slate-600 mb-4">link_off</span>
            <p className="text-slate-400 text-lg mb-2">No items yet</p>
            <p className="text-slate-500 text-sm">
              Create a new workspace/campaign/group, or add a link directly here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {directLinks.map((link) => {
            const isActive = link.status === 'active';
            return (
              <div
                key={link.id}
                className={`relative bg-[#101622] border border-[#232f48] rounded-[1.25rem] p-6 flex flex-col h-full transition-all duration-300 ease-out overflow-hidden ${
                  !isActive ? 'opacity-70' : ''
                } ${isActive ? 'hover:border-[#135bec] hover:shadow-[0_12px_30px_rgba(19,91,236,0.15)]' : ''}`}
              >
                {/* Header: title, destination, menu */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3
                      className="text-4xl font-bold text-white mb-1 break-words"
                      title={link.name || 'Untitled'}
                    >
                      {link.name || 'Untitled'}
                    </h3>
                    <p className="text-xs text-gray-500 truncate" title={link.target_url}>
                      {truncateText(link.target_url, 60)}
                    </p>
                  </div>
                  <div className="mr-12 bg-[#00F0FF]/10 p-4 rounded-3xl text-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.15)] -rotate-3">
                    <LinkIcon size={24} />
                  </div>
                </div>
                <LinkActionsMenu
                  className="absolute top-4 right-4"
                  hoverBorderClass="hover:border-[#135bec]/60"
                  link={link}
                  onRefresh={fetchData}
                  onEdit={(linkToEdit) => navigate(`/dashboard/links/edit/${linkToEdit.id}`)}
                  onDuplicate={(linkToDuplicate) =>
                    navigate(
                      `/dashboard/links/new?duplicate=${linkToDuplicate.id}${currentSpaceId ? `&space_id=${encodeURIComponent(currentSpaceId)}` : ''}`
                    )
                  }
                  onAnalytics={(linkForAnalytics) =>
                    navigate(
                      `/dashboard/analytics?domain=${encodeURIComponent(linkForAnalytics.domain || '')}&slug=${encodeURIComponent(linkForAnalytics.slug || '')}`
                    )
                  }
                  onShowModal={(modalConfig) => setModalState(modalConfig)}
                />

                {/* Short Link box */}
                <div className="bg-[#0b0f19] border border-[#232f48] rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[10px] text-gray-500 font-bold uppercase mb-1 tracking-widest">
                        Short Link
                      </span>
                      <span
                        className={`font-bold text-lg tracking-wide break-all whitespace-normal ${isActive ? 'text-[#FF10F0]' : 'text-gray-500'}`}
                        title={link.short_url}
                      >
                        {link.short_url}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(link.short_url)}
                      className="copy-btn p-2 bg-[#232f48] hover:bg-gray-600 text-gray-300 rounded-lg transition-all flex-shrink-0 active:scale-90"
                      title="Copy to clipboard"
                    >
                      <span className="material-symbols-outlined text-base">content_copy</span>
                    </button>
                  </div>
                </div>

                {/* Footer: toggle + status, clicks */}
                <div className="mt-auto flex justify-between items-center pt-4 border-t border-[#232f48]">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-block w-11 h-6 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => handleToggleStatus(link.id, link.status || 'active')}
                        className="absolute opacity-0 w-0 h-0 peer"
                        aria-label="Toggle link status"
                      />
                      <span className="absolute inset-0 rounded-full bg-[#374151] transition-colors peer-checked:bg-[#10b981]" />
                      <span className="absolute left-[3px] bottom-[3px] w-[18px] h-[18px] bg-white rounded-full transition-transform pointer-events-none peer-checked:translate-x-5" />
                    </label>
                    <span
                      className={`text-sm font-semibold ${isActive ? 'text-gray-300' : 'text-gray-500'}`}
                    >
                      {isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-2 ${isActive ? 'text-gray-500' : 'text-gray-600'}`}
                  >
                    <span className="material-symbols-outlined text-base">bar_chart</span>
                    <span className="text-xs font-bold">
                      {new Intl.NumberFormat('en-US').format(
                        clickCountsMap[linkClickKey(link)] ?? 0
                      )}{' '}
                      Clicks
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
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

      {/* Create Workspace / Campaign / Group modal */}
      <Modal
        isOpen={spaceModal.isOpen}
        onClose={closeCreateSpaceModal}
        title={`${spaceModal.mode === 'edit' ? 'Update' : 'Create'} ${spaceModal.kind ? KIND_LABEL[spaceModal.kind] : 'Item'}`}
        type="confirm"
        confirmText={spaceModal.mode === 'edit' ? 'Update' : 'Create'}
        cancelText="Cancel"
        onConfirm={handleSaveSpace}
        isLoading={spaceModal.isLoading}
        message={
          <div className="space-y-3 text-left">
            <p className="text-sm text-slate-700">
              {spaceModal.mode === 'edit'
                ? 'Update the name.'
                : `Name your new ${spaceModal.kind ? KIND_LABEL[spaceModal.kind].toLowerCase() : 'item'}.`}
            </p>
            <input
              type="text"
              value={spaceModal.name}
              onChange={(e) =>
                setSpaceModal((prev) => ({ ...prev, name: e.target.value, error: null }))
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder={`Enter ${spaceModal.kind ? KIND_LABEL[spaceModal.kind] : 'item'} name`}
            />
            <p className="text-xs text-slate-500">
              {'Allowed: English letters, numbers, spaces, and !@#$%^&*)(-+=}{]['}
            </p>
            {spaceModal.error ? <p className="text-sm text-red-500">{spaceModal.error}</p> : null}
          </div>
        }
      />
    </div>
  );
};

// Actions Menu Component
const LinkActionsMenu = ({
  link,
  onRefresh,
  onEdit,
  onDuplicate,
  onAnalytics,
  onShowModal,
  className = '',
  hoverBorderClass = 'hover:border-[#FF00E5]/40',
}) => {
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
          deleted_at: deletedAt,
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
    <div className={`z-10 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg bg-[#0b0f19] border border-[#232f48] text-slate-300 hover:text-white ${hoverBorderClass} transition-colors`}
        aria-label="Actions menu"
      >
        <span className="material-symbols-outlined text-base">more_vert</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
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
                if (onAnalytics) onAnalytics(link);
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
            Are you sure you want to delete <strong>{link.short_url}</strong>? This will stop all
            traffic to this destination.
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

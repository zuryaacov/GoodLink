import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/common/Modal';
import PixelModal from '../../components/dashboard/PixelModal';

const PixelManager = () => {
  const [pixels, setPixels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPixel, setEditingPixel] = useState(null);
  
  // Modal states for delete confirmation
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    pixelId: null,
    pixelName: '',
    isLoading: false,
  });

  // Modal states for errors/alerts
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    onConfirm: null,
    isLoading: false,
  });

  useEffect(() => {
    fetchPixels();
  }, []);

  const fetchPixels = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('pixels')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'deleted') // Don't fetch deleted pixels
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPixels(data || []);
    } catch (error) {
      console.error('Error fetching pixels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModalState.pixelId) return;
    
    setDeleteModalState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const { error } = await supabase
        .from('pixels')
        .update({ 
          status: 'deleted',
          deleted_at: new Date().toISOString()
        })
        .eq('id', deleteModalState.pixelId);

      if (error) throw error;
      
      setDeleteModalState({ isOpen: false, pixelId: null, pixelName: '', isLoading: false });
      fetchPixels();
    } catch (error) {
      console.error('Error deleting pixel:', error);
      setDeleteModalState(prev => ({ ...prev, isLoading: false }));
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error deleting pixel. Please try again.',
        onConfirm: null,
        isLoading: false,
      });
    }
  };

  const handleToggleStatus = async (pixelId, currentStatus) => {
    try {
      // Toggle between 'active' and 'PAUSED'
      const newStatus = (currentStatus === 'active') ? 'PAUSED' : 'active';
      
      const { error } = await supabase
        .from('pixels')
        .update({ status: newStatus })
        .eq('id', pixelId);

      if (error) {
        throw error;
      }
      fetchPixels(); // Refresh the list
    } catch (error) {
      console.error('Error updating pixel status:', error);
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error updating pixel status. Please try again.',
        onConfirm: null,
        isLoading: false,
      });
    }
  };

  const maskPixelId = (pixelId) => {
    if (!pixelId) return '';
    if (pixelId.length <= 8) return '••••••••';
    // Show first 4 and last 4 characters, mask the middle
    const start = pixelId.substring(0, 4);
    const end = pixelId.substring(pixelId.length - 4);
    const masked = '•'.repeat(Math.min(8, pixelId.length - 8));
    return `${start}${masked}${end}`;
  };

  const getPlatformLogo = (platform) => {
    switch (platform) {
      case 'meta':
        return (
          <div className="w-10 h-10 rounded-lg bg-[#1877F2] flex items-center justify-center">
            <span className="text-white font-bold text-sm">f</span>
          </div>
        );
      case 'tiktok':
        return (
          <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center">
            <span className="text-white font-bold text-xs">TT</span>
          </div>
        );
      case 'google':
        return (
          <div className="w-10 h-10 rounded-lg bg-[#4285F4] flex items-center justify-center">
            <span className="text-white font-bold text-xs">G</span>
          </div>
        );
      case 'snapchat':
        return (
          <div className="w-10 h-10 rounded-lg bg-[#FFFC00] flex items-center justify-center">
            <span className="text-black font-bold text-xs">S</span>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-lg bg-[#232f48] flex items-center justify-center">
            <span className="text-slate-400 text-xs">?</span>
          </div>
        );
    }
  };

  const getPlatformName = (platform) => {
    switch (platform) {
      case 'meta': return 'Meta (Facebook)';
      case 'tiktok': return 'TikTok';
      case 'google': return 'Google Ads';
      case 'snapchat': return 'Snapchat';
      default: return platform;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-8 w-full h-full items-center justify-center">
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-4xl text-slate-600 animate-spin">refresh</span>
          <p className="text-slate-400 mt-4">Loading pixels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Pixel Manager</h1>
          <p className="text-sm md:text-base text-slate-400">Manage your tracking pixels</p>
        </div>
        <button
          onClick={() => {
            setEditingPixel(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 md:py-2.5 text-white font-bold rounded-xl transition-colors shadow-lg text-base md:text-sm"
          style={{
            backgroundColor: "#FF10F0",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#e00ed0";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#FF10F0";
          }}
        >
          <span className="material-symbols-outlined text-xl md:text-base">add</span>
          New Pixel
        </button>
      </div>

      {/* Pixels List */}
      {pixels.length === 0 ? (
        <div className="bg-[#101622] border border-[#232f48] rounded-2xl p-4 md:p-6 w-full">
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-slate-600 mb-4">ads_click</span>
            <p className="text-slate-400 text-lg mb-2">No pixels yet</p>
            <p className="text-slate-500 text-sm">Create your first tracking pixel to get started</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {pixels.map((pixel) => (
            <div
              key={pixel.id}
              className="bg-[#101622] border border-[#232f48] rounded-xl p-5 transition-all hover:bg-white/5 hover:border-primary/30 flex flex-col gap-4"
            >
              {/* Header with Logo and Name */}
              <div className="flex items-start gap-3">
                {getPlatformLogo(pixel.platform)}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white break-words line-clamp-2">
                    {pixel.name}
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">
                    {getPlatformName(pixel.platform)}
                  </p>
                </div>
              </div>

              {/* Pixel ID (Masked) */}
              <div className="p-3 bg-[#0b0f19] rounded-lg border border-[#232f48]">
                <p className="text-xs text-slate-500 mb-1">Pixel ID</p>
                <p className="font-mono text-sm text-slate-300 break-all">
                  {maskPixelId(pixel.pixel_id)}
                </p>
              </div>

              {/* Event Info */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Event:</span>
                <span className="text-slate-300 font-medium">
                  {pixel.event_type === 'custom' ? pixel.custom_event_name : pixel.event_type}
                </span>
              </div>

              {/* Status & Actions */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#232f48]">
                {/* Status */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStatus(pixel.id, pixel.status || 'active')}
                    className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                      (pixel.status === 'active') ? 'bg-primary' : 'bg-[#232f48]'
                    }`}
                    aria-label="Toggle pixel status"
                    title={pixel.status === 'active' ? 'Active - Click to pause' : 'Paused - Click to activate'}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        (pixel.status === 'active') ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-slate-400 font-medium">
                    {pixel.status === 'active' ? 'ACTIVE' : 'PAUSED'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingPixel(pixel);
                      setIsModalOpen(true);
                    }}
                    className="text-slate-400 hover:text-primary transition-colors p-2"
                    title="Edit pixel"
                  >
                    <span className="material-symbols-outlined text-base">edit</span>
                  </button>
                  <button
                    onClick={() => {
                      setDeleteModalState({
                        isOpen: true,
                        pixelId: pixel.id,
                        pixelName: pixel.name,
                        isLoading: false,
                      });
                    }}
                    className="text-slate-400 hover:text-red-400 transition-colors p-2"
                    title="Delete pixel"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pixel Modal */}
      {isModalOpen && (
        <PixelModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingPixel(null);
            fetchPixels();
          }}
          initialData={editingPixel}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalState.isOpen}
        onClose={() => !deleteModalState.isLoading && setDeleteModalState({ ...deleteModalState, isOpen: false })}
        title="Delete this pixel?"
        message={
          <>
            Are you sure you want to delete <strong>{deleteModalState.pixelName}</strong>? This action cannot be undone.
          </>
        }
        type="delete"
        confirmText="Delete Pixel"
        cancelText="Cancel"
        onConfirm={handleDelete}
        isLoading={deleteModalState.isLoading}
      />

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
    </div>
  );
};

export default PixelManager;

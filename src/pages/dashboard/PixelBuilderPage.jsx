import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { refreshRedisForLinksUsingPixel } from '../../lib/redisCache';
import { validatePixelPayload } from '../../lib/pixelValidation';
import { ArrowLeft } from 'lucide-react';
import Modal from '../../components/common/Modal';
import PixelWizardOnePerPage from '../../components/dashboard/PixelWizardOnePerPage';

const PixelBuilderPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const [initialData, setInitialData] = useState(null);
  const [initialLoading, setInitialLoading] = useState(!!id);
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

  useEffect(() => {
    if (id) fetchPixel();
  }, [id]);

  const fetchPixel = async () => {
    try {
      setInitialLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate('/dashboard/pixels');
        return;
      }
      const { data, error } = await supabase
        .from('pixels')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      if (!data) {
        navigate('/dashboard/pixels');
        return;
      }
      setInitialData({
        name: data.name || '',
        platform: data.platform || 'meta',
        pixelId: data.pixel_id || '',
        capiToken: data.capi_token || '',
        eventType: data.event_type || 'PageView',
        customEventName: data.custom_event_name || '',
      });
    } catch (err) {
      console.error('Error fetching pixel:', err);
      navigate('/dashboard/pixels');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSave = async (payload) => {
    const v = validatePixelPayload(payload);
    if (!v.valid) throw new Error(v.message);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be logged in to save pixels');

    const trimmedName = payload.name.trim();
    const { data: existingPixels } = await supabase
      .from('pixels')
      .select('id')
      .eq('user_id', user.id)
      .ilike('name', trimmedName)
      .neq('status', 'deleted');
    const isDuplicate =
      existingPixels?.length > 0 &&
      (isEditMode && id ? existingPixels.some((p) => p.id !== id) : true);
    if (isDuplicate) throw new Error('A pixel with this name already exists.');

    const normalizedPixelId =
      payload.platform === 'tiktok' ? payload.pixelId.trim().toUpperCase() : payload.pixelId.trim();
    const pixelData = {
      user_id: user.id,
      name: trimmedName,
      platform: payload.platform,
      pixel_id: normalizedPixelId,
      capi_token: payload.capiToken?.trim() || null,
      event_type:
        payload.platform === 'taboola' || payload.platform === 'outbrain'
          ? payload.eventType?.trim()
          : payload.eventType === 'custom'
            ? 'custom'
            : payload.eventType,
      custom_event_name:
        payload.platform === 'taboola' || payload.platform === 'outbrain'
          ? null
          : payload.eventType === 'custom'
            ? payload.customEventName?.trim()
            : null,
      is_active: true,
    };

    let savedPixelId = id;
    if (isEditMode) {
      const { error } = await supabase.from('pixels').update(pixelData).eq('id', id);
      if (error) throw error;
    } else {
      const { data: upserted, error } = await supabase
        .from('pixels')
        .upsert(pixelData, { onConflict: 'user_id,pixel_id,platform', ignoreDuplicates: false })
        .select('id')
        .single();
      if (error) throw error;
      if (upserted?.id) savedPixelId = upserted.id;
    }

    try {
      await refreshRedisForLinksUsingPixel(savedPixelId, supabase);
    } catch (redisErr) {
      console.warn('⚠️ [PixelBuilder] Redis refresh:', redisErr);
    }
    navigate('/dashboard/pixels');
  };

  if (initialLoading || (id && !initialData)) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-slate-600 animate-spin">
            refresh
          </span>
          <p className="text-slate-400 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col">
      <div className="flex-shrink-0 z-10 bg-[#0b0f19] border-b border-slate-800 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/pixels')}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-white">{id ? 'Edit Pixel' : 'Create New Pixel'}</h1>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <PixelWizardOnePerPage
          initialData={id ? initialData : null}
          onSave={handleSave}
          onBack={() => navigate('/dashboard/pixels')}
          isEdit={!!id}
        />
      </div>
      <Modal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
        title="Error"
        message={errorModal.message}
        type="error"
      />
    </div>
  );
};

export default PixelBuilderPage;

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { refreshRedisForLinksUsingPixel } from '../../lib/redisCache';
import { ArrowLeft } from 'lucide-react';
import Modal from '../../components/common/Modal';
import PixelWizardOnePerPage from '../../components/dashboard/PixelWizardOnePerPage';

const validatePixelId = (pixelId, platform) => {
  const trimmed = pixelId.trim();
  switch (platform) {
    case 'meta':
    case 'instagram':
      return /^\d{15,16}$/.test(trimmed);
    case 'tiktok':
      return /^[A-Z0-9]{18}$/.test(trimmed.toUpperCase());
    case 'snapchat':
      return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(trimmed);
    case 'google':
      return /^G-[a-zA-Z0-9]{8,15}$/.test(trimmed);
    case 'outbrain':
      return /^[a-f0-9]{32}$/.test(trimmed);
    case 'taboola':
      return /^\d{6,8}$/.test(trimmed);
    default:
      return false;
  }
};

const validateCapiToken = (token, platform) => {
  if (!token || token.trim() === '') return { isValid: true, error: null };
  const trimmed = token.trim();
  switch (platform) {
    case 'meta':
    case 'instagram':
      if (trimmed.length < 180 || trimmed.length > 250)
        return { isValid: false, error: 'Access Token must be 180-250 characters' };
      if (!/^[a-zA-Z0-9]+$/.test(trimmed))
        return { isValid: false, error: 'Access Token must contain only letters and numbers' };
      return { isValid: true, error: null };
    case 'tiktok':
      if (trimmed.length !== 64)
        return { isValid: false, error: 'TikTok Access Token must be 64 characters' };
      if (!/^[a-zA-Z0-9]+$/.test(trimmed))
        return {
          isValid: false,
          error: 'TikTok Access Token must contain only letters and numbers',
        };
      return { isValid: true, error: null };
    case 'google':
      if (trimmed.length !== 22)
        return { isValid: false, error: 'Google Api_Secret must be exactly 22 characters' };
      if (!/^[a-zA-Z0-9_-]+$/.test(trimmed))
        return {
          isValid: false,
          error: 'Google Api_Secret must contain only letters, numbers, underscores and hyphens',
        };
      return { isValid: true, error: null };
    case 'snapchat':
      if (!/^[a-zA-Z0-9_\-]+$/.test(trimmed))
        return {
          isValid: false,
          error:
            'Snapchat Access Token must contain only letters, numbers, underscores and hyphens',
        };
      return { isValid: true, error: null };
    case 'outbrain':
      if (trimmed.length < 30 || trimmed.length > 40)
        return { isValid: false, error: 'Outbrain Access Token must be 30-40 characters' };
      if (!/^[a-zA-Z0-9]+$/.test(trimmed))
        return {
          isValid: false,
          error: 'Outbrain Access Token must contain only letters and numbers',
        };
      return { isValid: true, error: null };
    case 'taboola':
      if (trimmed.length < 30 || trimmed.length > 45)
        return { isValid: false, error: 'Taboola Client Secret must be 30-45 characters' };
      if (!/^[a-zA-Z0-9]+$/.test(trimmed))
        return {
          isValid: false,
          error: 'Taboola Client Secret must contain only letters and numbers',
        };
      return { isValid: true, error: null };
    default:
      return { isValid: true, error: null };
  }
};

const getPixelIdLabel = (platform) =>
  platform === 'google'
    ? 'Measurement_Id'
    : platform === 'taboola'
      ? 'Account Id'
      : platform === 'outbrain'
        ? 'Outbrain Pixel ID'
        : 'Pixel ID';

const PLATFORMS = [
  { value: 'meta', label: 'Facebook', validate: (id) => validatePixelId(id, 'meta') },
  { value: 'instagram', label: 'Instagram', validate: (id) => validatePixelId(id, 'instagram') },
  { value: 'tiktok', label: 'TikTok', validate: (id) => validatePixelId(id, 'tiktok') },
  { value: 'google', label: 'Google Ads', validate: (id) => validatePixelId(id, 'google') },
  { value: 'snapchat', label: 'Snapchat', validate: (id) => validatePixelId(id, 'snapchat') },
  { value: 'outbrain', label: 'Outbrain', validate: (id) => validatePixelId(id, 'outbrain') },
  { value: 'taboola', label: 'Taboola', validate: (id) => validatePixelId(id, 'taboola') },
];

function validatePayload(data) {
  if (!data.name?.trim()) return { valid: false, message: 'Friendly name is required' };
  if (!data.pixelId?.trim())
    return { valid: false, message: `${getPixelIdLabel(data.platform)} is required` };
  const platform = PLATFORMS.find((p) => p.value === data.platform);
  if (platform && !platform.validate(data.pixelId)) {
    let msg = `Invalid ${platform.label} ${getPixelIdLabel(data.platform)} format. `;
    if (data.platform === 'meta' || data.platform === 'instagram')
      msg += 'Must be exactly 15 or 16 digits.';
    else if (data.platform === 'tiktok')
      msg += 'Must be exactly 18 characters (uppercase A-Z and 0-9).';
    else if (data.platform === 'google')
      msg += 'Must start with G- followed by 8–15 letters and numbers.';
    else if (data.platform === 'snapchat') msg += 'Must be a valid UUID (36 characters).';
    else if (data.platform === 'outbrain') msg += 'Must be exactly 32 lowercase hex characters.';
    else if (data.platform === 'taboola') msg += 'Must be between 6 and 8 digits.';
    else msg += 'Please check the format.';
    return { valid: false, message: msg };
  }
  if (data.platform === 'taboola' && !data.eventType?.trim())
    return { valid: false, message: 'Name is required' };
  if (data.platform === 'outbrain' && !data.eventType?.trim())
    return { valid: false, message: 'Conversion Name is required' };
  if (data.eventType === 'custom' && !data.customEventName?.trim())
    return { valid: false, message: 'Custom event name is required' };
  if (data.capiToken?.trim()) {
    const capi = validateCapiToken(data.capiToken, data.platform);
    if (!capi.isValid) return { valid: false, message: capi.error };
  }
  return { valid: true, message: null };
}

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
    const v = validatePayload(payload);
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

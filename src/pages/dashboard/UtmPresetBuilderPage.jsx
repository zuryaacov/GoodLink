import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft } from 'lucide-react';
import UtmPresetWizardOnePerPage from '../../components/dashboard/UtmPresetWizardOnePerPage';

const UtmPresetBuilderPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initialData, setInitialData] = useState(null);
  const [initialLoading, setInitialLoading] = useState(!!id);

  useEffect(() => {
    if (id) fetchPreset();
  }, [id]);

  const fetchPreset = async () => {
    try {
      setInitialLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate('/dashboard/utm-presets');
        return;
      }
      const { data, error } = await supabase
        .from('utm_presets')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      if (!data) {
        navigate('/dashboard/utm-presets');
        return;
      }
      setInitialData({
        name: data.name || '',
        platform: data.platform || 'meta',
        utm_source: data.utm_source || '',
        utm_medium: data.utm_medium || '',
        utm_campaign: data.utm_campaign || '',
        utm_content: data.utm_content || '',
        utm_term: data.utm_term || '',
      });
    } catch (err) {
      console.error('Error fetching preset:', err);
      navigate('/dashboard/utm-presets');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSave = async (presetData) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const trimmedName = (presetData.name || '').trim();
    if (!trimmedName) throw new Error('Preset name is required');

    const { data: existingPresets } = await supabase
      .from('utm_presets')
      .select('id')
      .eq('user_id', user.id)
      .ilike('name', trimmedName);
    const isDuplicate =
      existingPresets?.length > 0 && (id ? existingPresets.some((p) => p.id !== id) : true);
    if (isDuplicate)
      throw new Error(
        'A UTM preset with this name already exists. Please choose a different name.'
      );

    const payload = {
      name: trimmedName,
      platform: presetData.platform || 'meta',
      slug: null,
      link_id: null,
      utm_source: presetData.utm_source || null,
      utm_medium: presetData.utm_medium || null,
      utm_campaign: presetData.utm_campaign || null,
      utm_content: presetData.utm_content || null,
      utm_term: presetData.utm_term || null,
    };

    if (id) {
      const { error } = await supabase.from('utm_presets').update(payload).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('utm_presets')
        .insert([{ ...payload, user_id: user.id }]);
      if (error) throw error;
    }
    navigate('/dashboard/utm-presets');
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
            onClick={() => navigate('/dashboard/utm-presets')}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-white">
            {id ? 'Edit UTM Preset' : 'Create New UTM Preset'}
          </h1>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <UtmPresetWizardOnePerPage
          initialData={id ? initialData : null}
          onSave={handleSave}
          onBack={() => navigate('/dashboard/utm-presets')}
          isEdit={!!id}
        />
      </div>
    </div>
  );
};

export default UtmPresetBuilderPage;

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, CheckCircle2, Zap } from 'lucide-react';

const getPlatformLogo = (platform) => {
  switch (platform) {
    case 'meta':
      // Facebook/Meta logo
      return (
        <div className="w-12 h-12 rounded-lg bg-[#1877F2] flex items-center justify-center">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        </div>
      );
    case 'google':
      // Google Ads logo
      return (
        <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center">
          <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        </div>
      );
    case 'tiktok':
      // TikTok logo
      return (
        <div className="w-12 h-12 rounded-lg bg-black flex items-center justify-center">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
          </svg>
        </div>
      );
    case 'taboola':
      return (
        <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center overflow-hidden border border-slate-700">
          <svg viewBox="0 0 100 100" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" fill="#3568F6"/>
            <text x="50" y="65" fontSize="45" fontWeight="bold" fill="white" textAnchor="middle" fontFamily="Arial, sans-serif">t</text>
          </svg>
        </div>
      );
    case 'outbrain':
      return (
        <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden border border-slate-700">
          <img 
            src="/src/assets/outbrain-logo.png" 
            alt="Outbrain" 
            className="w-full h-full object-cover" 
          />
        </div>
      );
    case 'snapchat':
      // Snapchat logo
      return (
        <div className="w-12 h-12 rounded-lg bg-[#FFFC00] flex items-center justify-center">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="black" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2.979c-2.32 0-4.085 1.705-4.085 4.084 0 .393.048.775.14 1.144-.816.143-1.632.39-2.222.95-.29.274-.467.575-.544.896-.062.257-.04.516.066.764.123.284.348.513.626.657.34.175.71.258 1.05.28l.19.012c.07.004.143.007.222.01l.013.25c.012.247.025.513.04.79v.117c0 .633.435.986.974 1.15.54.164 1.25.164 1.83.164.083 0 .167 0 .252-.002l.144 1.15c.08.647.284.974.606 1.15.32.176.716.216 1.08.216h1.22c.365 0 .76-.04 1.08-.216.32-.176.526-.503.606-1.15l.144-1.15c.085.002.169.002.252.002.58 0 1.29 0 1.83-.164.54-.164.975-.517.975-1.15v-.117c.015-.277.026-.543.04-.79l.012-.25c.08-.003.153-.006.223-.01l.19-.012c.34-.022.71-.105 1.05-.28.278-.144.503-.373.626-.657.106-.248.128-.507.066-.764-.077-.321-.254-.622-.544-.896-.59-.56-1.406-.807-2.222-.95.093-.369.14-.75.14-1.144 0-2.379-1.765-4.084-4.085-4.084z"/>
          </svg>
        </div>
      );
    default:
      return (
        <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center">
          <span className="text-slate-400 text-xs">?</span>
        </div>
      );
  }
};

const PLATFORMS = {
  meta: {
    id: 'meta',
    name: "Meta (FB/IG)",
    color: "blue",
  },
  google: {
    id: 'google',
    name: "Google Ads",
    color: "emerald",
  },
  tiktok: {
    id: 'tiktok',
    name: "TikTok Ads",
    color: "pink",
  },
  taboola: {
    id: 'taboola',
    name: "Taboola",
    color: "orange",
  },
  outbrain: {
    id: 'outbrain',
    name: "Outbrain",
    color: "indigo",
  },
  snapchat: {
    id: 'snapchat',
    name: "Snapchat",
    color: "yellow",
  }
};

// UTM Options for each platform and parameter type
const UTM_OPTIONS = {
  meta: {
    source: [
      'meta_ads',
      'audience_network',
      'whatsapp_ads',
      'messenger_ads',
      'instagram_ads',
      'facebook_ads',
      '{{site_source_name}}',
      'meta',
      'instagram',
      'facebook'
    ],
    medium: [
      'video',
      'retargeting',
      'cpm',
      'cpc',
      'paidsocial'
    ],
    campaign: [
      '{{campaign.name}}',
      '{{campaign.id}}'
    ],
    content: [
      '{{ad.name}}',
      '{{ad.id}}'
    ],
    term: [
      '{{placement}}',
      '{{adset.name}}',
      '{{adset.id}}'
    ]
  },
  google: {
    source: [
      'google'
    ],
    medium: [
      'pmax',
      'shopping',
      'video',
      'display',
      'cpc'
    ],
    campaign: [
      '{campaignname}',
      '{campaignid}'
    ],
    content: [
      '{adid}',
      '{creative}',
      '{adgroupname}',
      '{adgroupid}'
    ],
    term: [
      '{loc_physical_ms}',
      '{targetid}',
      '{placement}',
      '{searchterm}',
      '{matchtype}',
      '{keyword}'
    ]
  },
  tiktok: {
    source: [
      'tiktok'
    ],
    medium: [
      'cpv',
      'cpm',
      'cpc',
      'paidsocial'
    ],
    campaign: [
      '__CAMPAIGN_ID__',
      '__CAMPAIGN_NAME__'
    ],
    content: [
      '__CID__',
      '__CID_NAME__'
    ],
    term: [
      '__PLACEMENT__',
      '__AID_NAME__',
      '__QUERY__',
      '__KEYWORD__'
    ]
  },
  taboola: {
    source: [
      'taboola'
    ],
    medium: [
      'content',
      'video',
      'paid',
      'display',
      'discovery',
      'cpc',
      'native'
    ],
    campaign: [
      '{campaign_id}',
      '{campaign_name}'
    ],
    content: [
      '{thumbnail_id}',
      '{creative_id}',
      '{ad_title}',
      '{content_item_title}'
    ],
    term: [
      '{section_id}',
      '{site_id}',
      '{site}'
    ]
  },
  outbrain: {
    source: [
      'outbrain_paid',
      'Outbrain'
    ],
    medium: [
      'content',
      'video',
      'paidsocial',
      'paid',
      'discovery',
      'cpc',
      'native'
    ],
    campaign: [
      '{{campaign_id}}',
      '{{campaign_name}}'
    ],
    content: [
      '{{promoted_link_id}}',
      '{{ad_title}}',
      '{{ad_id}}'
    ],
    term: [
      '{{publisher_name}}',
      '{{section_id}}',
      '{{section_name}}'
    ]
  },
  snapchat: {
    source: [
      'snapchat'
    ],
    medium: [
      'video',
      'display',
      'social',
      'paidsocial'
    ],
    campaign: [
      '{{campaign.id}}',
      '{{campaign.name}}'
    ],
    content: [
      '{{ad.id}}',
      '{{ad.name}}'
    ],
    term: [
      '{{adgroup.id}}',
      '{{adgroup.name}}'
    ]
  }
};

const UTM_TYPES = [
  { id: 'source', label: 'Source', key: 'utm_source' },
  { id: 'medium', label: 'Medium', key: 'utm_medium' },
  { id: 'campaign', label: 'Campaign', key: 'utm_campaign' },
  { id: 'content', label: 'Content', key: 'utm_content' },
  { id: 'term', label: 'Term', key: 'utm_term' }
];

const PARAM_COLORS = {
  utm_source: "text-blue-400",
  utm_medium: "text-purple-400",
  utm_campaign: "text-yellow-400",
  utm_content: "text-emerald-400",
  utm_term: "text-orange-400"
};

const UtmPresetBuilder = ({ isOpen, onClose, editingPreset, links }) => {
  const [selectedPlatform, setSelectedPlatform] = useState('meta');
  const [presetName, setPresetName] = useState('');
  const [params, setParams] = useState({
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_content: '',
    utm_term: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (editingPreset) {
      setPresetName(editingPreset.name || '');
      setSelectedPlatform(editingPreset.platform || 'meta');
      setParams({
        utm_source: editingPreset.utm_source || '',
        utm_medium: editingPreset.utm_medium || '',
        utm_campaign: editingPreset.utm_campaign || '',
        utm_content: editingPreset.utm_content || '',
        utm_term: editingPreset.utm_term || ''
      });
    } else {
      setPresetName('');
      setSelectedPlatform('meta');
      setParams({
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        utm_content: '',
        utm_term: ''
      });
    }
  }, [editingPreset, isOpen]);

  const handlePlatformChange = (platformId) => {
    setSelectedPlatform(platformId);
    // Reset params when changing platform
    setParams({
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_content: '',
      utm_term: ''
    });
  };

  const handleChipClick = (utmType, value) => {
    const utmKey = `utm_${utmType}`;
    // Toggle: if clicking the same chip, deselect it
    if (params[utmKey] === value) {
      setParams(prev => ({ ...prev, [utmKey]: '' }));
    } else {
      setParams(prev => ({ ...prev, [utmKey]: value }));
    }
  };

  const updateParam = (key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const buildUtmQueryString = () => {
    const queryParams = Object.entries(params)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    return queryParams;
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!presetName.trim()) {
        setError('Preset name is required');
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      const presetData = {
        name: presetName.trim(),
        platform: selectedPlatform,
        slug: null,
        link_id: null,
        utm_source: params.utm_source || null,
        utm_medium: params.utm_medium || null,
        utm_campaign: params.utm_campaign || null,
        utm_content: params.utm_content || null,
        utm_term: params.utm_term || null,
      };

      console.log('Saving preset:', presetData);

      if (editingPreset) {
        const { data, error } = await supabase
          .from('utm_presets')
          .update(presetData)
          .eq('id', editingPreset.id)
          .select();

        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        console.log('Preset updated:', data);
      } else {
        const { data, error } = await supabase
          .from('utm_presets')
          .insert([{ ...presetData, user_id: user.id }])
          .select();

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
        console.log('Preset created:', data);
      }

      onClose();
    } catch (error) {
      console.error('Error saving preset:', error);
      setError(error.message || 'Failed to save preset. Please try again.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const queryString = buildUtmQueryString();
  const platformOptions = UTM_OPTIONS[selectedPlatform] || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {editingPreset ? 'Edit UTM Preset' : 'Create New UTM Preset'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl">
            {error}
          </div>
        )}

        <div className="space-y-8">
          {/* Preset Name */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Preset Name</label>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="e.g., Summer Campaign Meta"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-primary"
            />
            <p className="text-xs text-slate-500 mt-1">This preset will be linked to a link when editing/adding a link</p>
          </div>

          {/* Step 1: Platform Selection */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Select Platform</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.values(PLATFORMS).map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePlatformChange(p.id)}
                  className={`relative group flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    selectedPlatform === p.id
                      ? `border-primary bg-primary/10 text-white`
                      : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {getPlatformLogo(p.id)}
                  <span className="font-bold text-xs text-center">{p.name}</span>
                  {selectedPlatform === p.id && (
                    <div className="absolute -top-2 -right-2 bg-primary text-white rounded-full p-1">
                      <CheckCircle2 size={14} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: UTM Parameters as Chips */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Select UTM Parameters</h3>
            </div>
            
            {UTM_TYPES.map((utmType) => {
              const utmKey = utmType.key;
              const value = params[utmKey] || '';
              const options = platformOptions[utmType.id] || [];
              
              if (options.length === 0) return null;
              
              return (
                <div key={utmType.id} className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-slate-300 uppercase">{utmType.label}</label>
                    {value && (
                      <span className="text-xs text-emerald-400 font-medium">Selected: {value}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {options.map((option) => {
                      const isSelected = params[utmKey] === option;
                      const isDynamic = option.includes('{') || option.includes('__');
                      
                      return (
                        <button
                          key={option}
                          onClick={() => handleChipClick(utmType.id, option)}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                            isSelected
                              ? "bg-primary text-white border-primary shadow-lg scale-105"
                              : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600 hover:bg-slate-750"
                          }`}
                        >
                          {option}
                          {isDynamic && !isSelected && (
                            <span className="ml-2 text-[10px] text-yellow-400">⚡</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Step 3: Preview URL */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Preview Query String</h3>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
              <div className="font-mono text-sm break-all text-slate-300" dir="ltr">
                <span className="text-slate-500">https://glynk.to/</span>
                <span className="text-primary font-bold">your-slug</span>
                {queryString && <span className="text-slate-600">?</span>}
                {Object.entries(params).map(([key, value], index) => {
                  if (!value) return null;
                  const filteredParams = Object.entries(params).filter(([_, v]) => v);
                  const paramIndex = filteredParams.findIndex(([k]) => k === key);
                  
                  return (
                    <span key={key} className="inline-block">
                      <span className={PARAM_COLORS[key] || "text-slate-300"}>
                        {key}
                        <span className="text-slate-600">=</span>
                        <span className={value.includes('{') || value.includes('__') ? "font-bold underline decoration-slate-600" : ""}>
                          {value}
                        </span>
                      </span>
                      {paramIndex < filteredParams.length - 1 && (
                        <span className="text-slate-600 mx-1">&</span>
                      )}
                    </span>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-3">Preview shows UTM parameters. This preset will be linked to a specific link when editing/adding a link.</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Create/Update button clicked');
                handleSave();
              }}
              disabled={loading || !presetName.trim()}
              className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">refresh</span>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  {editingPreset ? 'Update Preset' : 'Create Preset'}
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UtmPresetBuilder;

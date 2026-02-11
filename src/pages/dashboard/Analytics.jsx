import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/common/Modal';

// Country name/code to flag emoji (regional indicators: A=0x1F1E6)
const countryToFlag = (country) => {
  if (!country || country === 'Unknown') return '🌐';
  const nameToCode = {
    'United States': 'US',
    USA: 'US',
    America: 'US',
    Israel: 'IL',
    'United Kingdom': 'GB',
    UK: 'GB',
    Germany: 'DE',
    France: 'FR',
    Canada: 'CA',
    India: 'IN',
    Australia: 'AU',
    Netherlands: 'NL',
    Spain: 'ES',
    Italy: 'IT',
    Brazil: 'BR',
    Russia: 'RU',
    Japan: 'JP',
    China: 'CN',
    Mexico: 'MX',
    Poland: 'PL',
    Sweden: 'SE',
  };
  const code = nameToCode[country] || (country.length === 2 ? country.toUpperCase() : null);
  if (code && code.length === 2) {
    return code
      .split('')
      .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
      .join('');
  }
  return '🌐';
};

// Relative time
const relativeTime = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const now = new Date();
  const sec = Math.floor((now - date) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} mins ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} days ago`;
  return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const KPICard = ({ title, value, change, trend, icon, iconBgClass, iconColorClass }) => (
  <div className="bg-[#101622] border border-[#232f48] rounded-2xl p-5 transition-all hover:border-[#135bec] hover:shadow-[0_4px_20px_rgba(19,91,236,0.1)]">
    <div className="flex justify-between items-start mb-4">
      <div
        className={`p-2 rounded-lg ${iconBgClass || 'bg-[#135bec]/10'} ${iconColorClass || 'text-[#135bec]'}`}
      >
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      {change != null && change !== '' && (
        <span
          className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            trend === 'up' ? 'text-[#10b981] bg-[#10b981]/10' : 'text-red-500 bg-red-500/10'
          }`}
        >
          <span className="material-symbols-outlined text-[12px]">trending_up</span>
          {change}
        </span>
      )}
    </div>
    <div className="space-y-1">
      <h3 className="text-gray-400 text-xs uppercase font-bold tracking-widest">{title}</h3>
      <p className="text-3xl font-extrabold text-white">{value}</p>
    </div>
  </div>
);

const HumanVsBotCard = ({ humanCount, botCount, unknownCount }) => {
  const total = humanCount + botCount + unknownCount;
  const humanPct = total ? (humanCount / total) * 100 : 0;
  const botPct = total ? (botCount / total) * 100 : 0;
  const unknownPct = total ? (unknownCount / total) * 100 : 0;
  return (
    <div className="bg-[#101622] border border-[#232f48] rounded-2xl p-6 flex flex-col items-center transition-all hover:border-[#135bec] hover:shadow-[0_4px_20px_rgba(19,91,236,0.1)] lg:col-span-1">
      <div className="w-full flex justify-between items-center mb-6">
        <h3 className="text-sm font-bold text-gray-200">Human vs. Bot Ratio</h3>
        <button type="button" className="text-gray-500 hover:text-white p-1">
          <span className="material-symbols-outlined text-lg">more_horiz</span>
        </button>
      </div>
      <div className="relative mb-6">
        <div
          className="w-40 h-40 rounded-full flex items-center justify-center"
          style={{
            background: `conic-gradient(#135bec 0% ${humanPct}%, #FF10F0 ${humanPct}% ${humanPct + botPct}%, #374151 ${humanPct + botPct}% 100%)`,
          }}
        >
          <div className="w-[120px] h-[120px] bg-[#101622] rounded-full flex items-center justify-center">
            <div className="text-center">
              <span className="block text-2xl font-bold text-white">{Math.round(humanPct)}%</span>
              <span className="block text-[10px] text-gray-500 uppercase font-bold">Human</span>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full grid grid-cols-2 gap-4 mt-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#135bec] shrink-0" />
          <span className="text-xs text-gray-400">Human ({humanCount})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#FF10F0] shrink-0" />
          <span className="text-xs text-gray-400">Bot ({botCount})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-gray-600 shrink-0" />
          <span className="text-xs text-gray-400">Unknown ({unknownCount})</span>
        </div>
      </div>
    </div>
  );
};

const GeoProgressCard = ({ geographic }) => {
  const total = geographic.reduce((s, i) => s + i.value, 0);
  const colors = ['#135bec', '#FF10F0', '#10b981', '#eab308'];
  return (
    <div className="bg-[#101622] border border-[#232f48] rounded-2xl p-6 transition-all hover:border-[#135bec] hover:shadow-[0_4px_20px_rgba(19,91,236,0.1)] lg:col-span-2">
      <div className="w-full flex justify-between items-center mb-6">
        <h3 className="text-sm font-bold text-gray-200">Geographic Distribution (Top 15)</h3>
        <button type="button" className="text-[#135bec] text-xs font-bold hover:underline">
          View Map
        </button>
      </div>
      <div className="space-y-5">
        {geographic.length === 0 ? (
          <p className="text-gray-500 text-sm">No geographic data yet</p>
        ) : (
          geographic.slice(0, 15).map((item, i) => {
            const pct = total ? Math.round((item.value / total) * 100) : 0;
            const flag = item.name.includes(',')
              ? countryToFlag(item.name.split(',')[1]?.trim() || item.name)
              : countryToFlag(item.name);
            return (
              <div key={item.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="flex items-center gap-2 text-white font-medium">
                    {flag} {item.name}
                  </span>
                  <span className="text-gray-400">
                    {item.value} click{item.value !== 1 ? 's' : ''} ({pct}%)
                  </span>
                </div>
                <div className="h-2 bg-[#1f2937] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-1000"
                    style={{ width: `${pct}%`, backgroundColor: colors[i % colors.length] }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const Analytics = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const linkDomain = searchParams.get('domain');
  const linkSlug = searchParams.get('slug');
  const isSingleLink = Boolean(
    linkDomain != null && linkSlug != null && linkDomain !== '' && linkSlug !== ''
  );

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClicks: 0,
    uniqueVisitors: 0,
    activeLinks: 0,
    botDetected: 0,
  });
  const [chartData, setChartData] = useState({
    humanVsBot: { human: 0, bot: 0, unknown: 0 },
    geographic: [],
  });
  const [trafficData, setTrafficData] = useState([]);
  const [loadingTraffic, setLoadingTraffic] = useState(false);
  const [selectedClick, setSelectedClick] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [linkDomain, linkSlug]);

  const fetchStats = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      let query = supabase
        .from('clicks')
        .select('*')
        .eq('user_id', user.id)
        .order('clicked_at', { ascending: false });
      if (isSingleLink) {
        query = query.eq('domain', linkDomain).eq('slug', linkSlug);
      }
      const { data: allClicks, error: clicksError } = await query;

      if (clicksError) {
        console.error('Error fetching clicks:', clicksError);
        setLoading(false);
        return;
      }

      const clicks = allClicks || [];
      const totalClicks = clicks.length;

      const botDetected = clicks.filter(
        (click) =>
          click.is_bot === true ||
          (click.verdict && click.verdict.toLowerCase().includes('bot')) ||
          (click.fraud_score && click.fraud_score > 80)
      ).length;

      const uniqueVisitors = new Set(
        clicks.map((c) => c.session_id || c.ip_address).filter(Boolean)
      ).size;

      const { count: activeLinksCount } = await supabase
        .from('links')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active')
        .neq('status', 'deleted');

      setStats({
        totalClicks,
        uniqueVisitors,
        activeLinks: activeLinksCount || 0,
        botDetected,
      });

      let humanCount = 0;
      let botCount = 0;
      let unknownCount = 0;
      clicks.forEach((click) => {
        const isBot =
          click.is_bot === true ||
          (click.verdict && click.verdict.toLowerCase().includes('bot')) ||
          (click.fraud_score && click.fraud_score > 80);
        if (isBot) botCount++;
        else if (click.is_bot === false || click.verdict) humanCount++;
        else unknownCount++;
      });

      setChartData((prev) => ({
        ...prev,
        humanVsBot: { human: humanCount, bot: botCount, unknown: unknownCount },
      }));

      const geoMap = new Map();
      clicks.forEach((click) => {
        const country = click.country || 'Unknown';
        const city = click.city || '';
        const key = city ? `${city}, ${country}` : country;
        geoMap.set(key, (geoMap.get(key) || 0) + 1);
      });
      const geographic = Array.from(geoMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 15);

      setChartData((prev) => ({ ...prev, geographic }));
      setTrafficData(clicks);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExpandClick = async (clickId) => {
    try {
      setLoadingTraffic(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('clicks')
        .select('*')
        .eq('id', clickId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setSelectedClick(data);
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching click details:', error);
    } finally {
      setLoadingTraffic(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getDeviceOsLabel = (click) => {
    const device =
      click.device_type ||
      (click.user_agent && /mobile/i.test(click.user_agent) ? 'Mobile' : 'Desktop');
    const os = click.os ? (click.os_version ? `${click.os} ${click.os_version}` : click.os) : '—';
    const browser = click.browser || '';
    if (device.toLowerCase() === 'mobile' || device.toLowerCase() === 'smartphone')
      return `${click.device_type || 'Smartphone'} • ${os}`;
    if (browser && os !== '—') return `${browser} • ${os}`;
    return `${device} • ${os}`;
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return new Intl.NumberFormat('en-US').format(num);
  };

  const conversionEst =
    stats.totalClicks > 0 && stats.uniqueVisitors > 0
      ? `${((stats.uniqueVisitors / stats.totalClicks) * 100).toFixed(1)}%`
      : '—';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Loading analytics...</div>
      </div>
    );
  }

  const singleLinkUrl = isSingleLink ? `https://${linkDomain}/${linkSlug}` : null;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        {isSingleLink ? (
          <p className="text-slate-400 text-sm">
            Data for this link only:{' '}
            <span className="font-mono text-white break-all">{singleLinkUrl}</span>
            {' · '}
            <button
              type="button"
              className="text-[#135bec] hover:underline bg-transparent border-none cursor-pointer p-0"
              onClick={() => navigate('/dashboard/analytics')}
            >
              View all links
            </button>
          </p>
        ) : (
          <p className="text-slate-400 text-sm">
            Welcome back! Here&apos;s what&apos;s happening with your links.
          </p>
        )}
      </div>

      {/* KPI Cards - 4 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Clicks"
          value={formatNumber(stats.totalClicks)}
          icon="ads_click"
          iconBgClass="bg-[#135bec]/10"
          iconColorClass="text-[#135bec]"
        />
        <KPICard
          title="Unique Visitors"
          value={formatNumber(stats.uniqueVisitors)}
          icon="group"
          iconBgClass="bg-[#FF10F0]/10"
          iconColorClass="text-[#FF10F0]"
        />
        <KPICard
          title="Bot Traffic"
          value={formatNumber(stats.botDetected)}
          change={
            stats.totalClicks
              ? `${Math.round((stats.botDetected / stats.totalClicks) * 100)}%`
              : '0%'
          }
          trend={stats.botDetected > 0 ? 'down' : 'up'}
          icon="smart_toy"
          iconBgClass="bg-yellow-500/10"
          iconColorClass="text-yellow-500"
        />
        <KPICard
          title="Conversion Est."
          value={conversionEst}
          icon="attach_money"
          iconBgClass="bg-[#10b981]/10"
          iconColorClass="text-[#10b981]"
        />
      </div>

      {/* Middle Row: Human vs Bot + Geographic */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <HumanVsBotCard
          humanCount={chartData.humanVsBot.human}
          botCount={chartData.humanVsBot.bot}
          unknownCount={chartData.humanVsBot.unknown}
        />
        <GeoProgressCard geographic={chartData.geographic} />
      </div>

      {/* Traffic Log */}
      <div className="bg-[#101622] border border-[#232f48] rounded-2xl flex flex-col transition-all hover:border-[#135bec] hover:shadow-[0_4px_20px_rgba(19,91,236,0.1)]">
        <div className="p-6 border-b border-[#232f48] flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-200">Traffic Log</h3>
          <div className="flex gap-2">
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-white hover:bg-[#232f48] rounded-lg transition-colors"
              title="Filter"
            >
              <span className="material-symbols-outlined text-lg">filter_list</span>
            </button>
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-white hover:bg-[#232f48] rounded-lg transition-colors"
              title="Download"
            >
              <span className="material-symbols-outlined text-lg">download</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {trafficData.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-6xl text-slate-600 mb-4 block">
                traffic
              </span>
              <p className="text-slate-400 text-lg mb-2">No traffic data yet</p>
              <p className="text-slate-500 text-sm">
                Traffic will appear here once users click your links
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-[#232f48] bg-[#0b0f19]/50">
                  <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-wider">Time</th>
                  <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-wider">
                    Device / OS
                  </th>
                  <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-wider text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232f48]">
                {trafficData.map((click) => {
                  const isBot =
                    click.is_bot === true ||
                    (click.verdict && click.verdict.toLowerCase().includes('bot')) ||
                    (click.fraud_score && click.fraud_score > 80);
                  const location = [click.city, click.country].filter(Boolean).join(', ') || '—';
                  const flag = countryToFlag(click.country);
                  return (
                    <tr
                      key={click.id}
                      className="border-b border-[#232f48] transition-colors hover:bg-[rgba(19,91,236,0.05)] last:border-b-0"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                        {relativeTime(click.clicked_at || click.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center gap-2">
                          <span className="text-lg">{flag}</span>
                          <span className="text-white font-medium">{location}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-gray-400">
                          <span className="material-symbols-outlined text-base">
                            {/(mobile|phone|iphone|android)/i.test(
                              click.device_type || click.user_agent || ''
                            )
                              ? 'smartphone'
                              : 'monitor'}
                          </span>
                          <span>{getDeviceOsLabel(click)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            isBot
                              ? 'bg-[#FF10F0]/10 text-[#FF10F0] border-[#FF10F0]/20'
                              : 'bg-[#135bec]/10 text-[#135bec] border-[#135bec]/20'
                          }`}
                        >
                          {isBot ? 'Bot (Blocked)' : 'Human'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => handleExpandClick(click.id)}
                          className="bg-transparent border border-[#232f48] text-gray-400 hover:border-[#135bec] hover:text-white hover:bg-[rgba(19,91,236,0.1)] px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        >
                          More Information
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {trafficData.length > 0 && (
          <div className="p-4 border-t border-[#232f48] flex justify-center">
            <button
              type="button"
              className="text-xs text-gray-500 hover:text-white transition-colors font-medium"
            >
              View All Logs
            </button>
          </div>
        )}
      </div>

      {/* Click Details Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedClick(null);
        }}
        title="Click Details"
        message={
          selectedClick ? (
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <span className="text-xs font-medium text-gray-500">Date & Time</span>
                <span className="text-sm text-gray-900 font-mono">
                  {formatDateTime(selectedClick.clicked_at || selectedClick.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <span className="text-xs font-medium text-gray-500">Domain</span>
                <span className="text-sm text-gray-900">{selectedClick.domain || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <span className="text-xs font-medium text-gray-500">SLUG</span>
                <span className="text-sm text-gray-900 font-mono">{selectedClick.slug || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <span className="text-xs font-medium text-gray-500">IP Address</span>
                <span className="text-sm text-gray-900 font-mono">
                  {selectedClick.ip_address || '—'}
                </span>
              </div>
              <div className="flex items-start justify-between py-2 border-b border-gray-200">
                <span className="text-xs font-medium text-gray-500">User Agent</span>
                <span className="text-sm text-gray-900 break-all text-right max-w-[70%]">
                  {selectedClick.user_agent || '—'}
                </span>
              </div>
              <div className="flex items-start justify-between py-2 border-b border-gray-200">
                <span className="text-xs font-medium text-gray-500">Referrer</span>
                <span className="text-sm text-gray-900 break-all text-right max-w-[70%]">
                  {selectedClick.referer || selectedClick.referrer || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <span className="text-xs font-medium text-gray-500">Country</span>
                <span className="text-sm text-gray-900">{selectedClick.country || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <span className="text-xs font-medium text-gray-500">City</span>
                <span className="text-sm text-gray-900">{selectedClick.city || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <span className="text-xs font-medium text-gray-500">Device Type</span>
                <span className="text-sm text-gray-900">{selectedClick.device_type || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <span className="text-xs font-medium text-gray-500">OS</span>
                <span className="text-sm text-gray-900">
                  {selectedClick.os || '—'} {selectedClick.os_version || ''}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <span className="text-xs font-medium text-gray-500">Browser</span>
                <span className="text-sm text-gray-900">{selectedClick.browser || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <span className="text-xs font-medium text-gray-500">Is Bot</span>
                <span
                  className={`text-sm font-bold ${selectedClick.is_bot ? 'text-red-600' : 'text-green-600'}`}
                >
                  {selectedClick.is_bot ? 'Yes' : 'No'}
                </span>
              </div>
              {selectedClick.fraud_score !== null && selectedClick.fraud_score !== undefined && (
                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <span className="text-xs font-medium text-gray-500">Fraud Score</span>
                  <span
                    className={`text-sm font-bold ${selectedClick.fraud_score > 80 ? 'text-red-600' : selectedClick.fraud_score > 50 ? 'text-yellow-600' : 'text-green-600'}`}
                  >
                    {selectedClick.fraud_score}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <span className="text-xs font-medium text-gray-500">VPN</span>
                <span
                  className={`text-sm font-bold ${selectedClick.is_vpn ? 'text-yellow-600' : 'text-gray-600'}`}
                >
                  {selectedClick.is_vpn ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <span className="text-xs font-medium text-gray-500">Proxy</span>
                <span
                  className={`text-sm font-bold ${selectedClick.is_proxy ? 'text-yellow-600' : 'text-gray-600'}`}
                >
                  {selectedClick.is_proxy ? 'Yes' : 'No'}
                </span>
              </div>
              {selectedClick.verdict && (
                <div className="flex items-start justify-between py-2 border-b border-gray-200">
                  <span className="text-xs font-medium text-gray-500">Verdict</span>
                  <span className="text-sm text-gray-900 text-right max-w-[70%]">
                    {selectedClick.verdict}
                  </span>
                </div>
              )}
              {selectedClick.target_url && (
                <div className="flex items-start justify-between py-2 border-b border-gray-200">
                  <span className="text-xs font-medium text-gray-500">Target URL</span>
                  <span className="text-sm text-gray-900 break-all text-right max-w-[70%] font-mono">
                    {selectedClick.target_url}
                  </span>
                </div>
              )}
              {selectedClick.query_params && (
                <div className="flex items-start justify-between py-2 border-b border-gray-200">
                  <span className="text-xs font-medium text-gray-500">Query Params</span>
                  <span className="text-sm text-gray-900 break-all text-right max-w-[70%] font-mono">
                    {typeof selectedClick.query_params === 'string'
                      ? selectedClick.query_params
                      : JSON.stringify(selectedClick.query_params)}
                  </span>
                </div>
              )}
              {selectedClick.session_id && (
                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <span className="text-xs font-medium text-gray-500">Session ID</span>
                  <span className="text-sm text-gray-900 font-mono">
                    {selectedClick.session_id}
                  </span>
                </div>
              )}
            </div>
          ) : null
        }
        type="info"
      />
    </div>
  );
};

export default Analytics;

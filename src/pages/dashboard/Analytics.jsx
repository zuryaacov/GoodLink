import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import Modal from '../../components/common/Modal';

const StatCard = ({ title, value, change, icon, trend }) => (
  <div className="bg-[#101622] border border-[#232f48] rounded-2xl p-6 relative overflow-hidden group hover:border-[#324467] transition-colors">
     <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
           <span className="material-symbols-outlined text-[24px]">{icon}</span>
        </div>
        {change && (
           <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
             {change}
           </span>
        )}
     </div>
     <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
     <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
  </div>
);

const DonutChartComponent = ({ data, title, colors }) => {
  const COLORS = colors || ['#135bec', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  return (
    <div className="bg-[#101622] border border-[#232f48] rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={110}
            innerRadius={60}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#101622', 
              border: '1px solid #232f48',
              borderRadius: '8px',
              color: '#fff'
            }}
            formatter={(value) => [`${value} (${((value / total) * 100).toFixed(1)}%)`, '']}
          />
          <Legend 
            wrapperStyle={{ color: '#fff', paddingTop: '20px' }}
            formatter={(value) => <span style={{ color: '#fff' }}>{value}</span>}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClicks: 0,
    activeLinks: 0,
    botDetected: 0,
  });
  const [chartData, setChartData] = useState({
    humanVsBot: [],
    proxyVpn: [],
    deviceOS: [],
    geographic: [],
  });
  const [trafficData, setTrafficData] = useState([]);
  const [loadingTraffic, setLoadingTraffic] = useState(false);
  const [selectedClick, setSelectedClick] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch all clicks data for charts
      const { data: allClicks, error: clicksError } = await supabase
        .from('clicks')
        .select('*')
        .eq('user_id', user.id)
        .order('clicked_at', { ascending: false });

      if (clicksError) {
        console.error('Error fetching clicks:', clicksError);
        setLoading(false);
        return;
      }

      // Calculate stats
      const totalClicks = allClicks?.length || 0;
      const botDetected = allClicks?.filter(click => {
        return (
          click.is_bot === true ||
          (click.verdict && click.verdict.toLowerCase().includes('bot')) ||
          (click.fraud_score && click.fraud_score > 80)
        );
      }).length || 0;

      // Fetch Active Links count
      const { count: activeLinksCount, error: linksError } = await supabase
        .from('links')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active')
        .neq('status', 'deleted');

      setStats({
        totalClicks,
        activeLinks: activeLinksCount || 0,
        botDetected,
      });

      // Process chart data
      processChartData(allClicks || []);

      // Set traffic data (for table)
      setTrafficData(allClicks || []);

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExpandClick = async (clickId) => {
    try {
      setLoadingTraffic(true);
      const { data: { user } } = await supabase.auth.getUser();
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
    const date = new Date(dateString);
    return date.toLocaleString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const processChartData = (clicks) => {
    // 1. Human vs. Bot Ratio
    let humanCount = 0;
    let botCount = 0;
    
    clicks.forEach(click => {
      const isBot = (
        click.is_bot === true ||
        (click.verdict && click.verdict.toLowerCase().includes('bot')) ||
        (click.fraud_score && click.fraud_score > 80)
      );
      if (isBot) {
        botCount++;
      } else {
        humanCount++;
      }
    });

    setChartData(prev => ({
      ...prev,
      humanVsBot: [
        { name: 'Human', value: humanCount },
        { name: 'Bot/Fraud', value: botCount },
      ],
    }));

    // 2. Proxy/VPN detection
    let proxyVpnCount = 0;
    let normalCount = 0;
    
    clicks.forEach(click => {
      if (click.is_vpn === true || click.is_proxy === true) {
        proxyVpnCount++;
      } else {
        normalCount++;
      }
    });

    setChartData(prev => ({
      ...prev,
      proxyVpn: [
        { name: 'Proxy/VPN', value: proxyVpnCount },
        { name: 'Direct', value: normalCount },
      ],
    }));

    // 3. Device & OS (with iOS focus)
    const deviceOSMap = new Map();
    clicks.forEach(click => {
      const os = click.os || 'Unknown';
      const osVersion = click.os_version || '';
      const deviceType = click.device_type || 'unknown';
      
      let key = os;
      if (os.toLowerCase() === 'ios' && osVersion) {
        key = `iOS ${osVersion}`;
      } else if (os && deviceType) {
        key = `${os} (${deviceType})`;
      }
      
      deviceOSMap.set(key, (deviceOSMap.get(key) || 0) + 1);
    });

    const deviceOSArray = Array.from(deviceOSMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10

    setChartData(prev => ({
      ...prev,
      deviceOS: deviceOSArray,
    }));

    // 4. Geographic (Country/City)
    const geoMap = new Map();
    clicks.forEach(click => {
      const country = click.country || 'Unknown';
      const city = click.city || '';
      const key = city ? `${city}, ${country}` : country;
      
      geoMap.set(key, (geoMap.get(key) || 0) + 1);
    });

    const geoArray = Array.from(geoMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15); // Top 15

    setChartData(prev => ({
      ...prev,
      geographic: geoArray,
    }));
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400">Welcome back! Here's what's happening with your links.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <StatCard 
          title="Total Clicks" 
          value={formatNumber(stats.totalClicks)}
          icon="ads_click" 
        />
        <StatCard 
          title="Bot Detected" 
          value={formatNumber(stats.botDetected)}
          icon="security" 
        />
        <StatCard 
          title="Active Links" 
          value={formatNumber(stats.activeLinks)}
          icon="link" 
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Human vs. Bot Ratio */}
        <DonutChartComponent 
          data={chartData.humanVsBot}
          title="Human vs. Bot Ratio"
          colors={['#135bec', '#f59e0b']}
        />

        {/* Proxy/VPN Detection */}
        <DonutChartComponent 
          data={chartData.proxyVpn}
          title="Proxy/VPN Detection"
          colors={['#135bec', '#10b981']}
        />
      </div>

      {/* Device & OS Chart */}
      <DonutChartComponent 
        data={chartData.deviceOS}
        title="Device & OS Distribution"
        colors={['#135bec', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']}
      />

      {/* Geographic Bar Chart */}
      <div className="bg-[#101622] border border-[#232f48] rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Geographic Distribution (Top 15)</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData.geographic}>
            <CartesianGrid strokeDasharray="3 3" stroke="#232f48" />
            <XAxis 
              dataKey="name" 
              stroke="#94a3b8"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
            />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#101622', 
                border: '1px solid #232f48',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Bar dataKey="value" fill="#135bec" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Traffic Table */}
      <div className="bg-[#101622] border border-[#232f48] rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Traffic Log</h3>
        {trafficData.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-slate-600 mb-4">traffic</span>
            <p className="text-slate-400 text-lg mb-2">No traffic data yet</p>
            <p className="text-slate-500 text-sm">Traffic will appear here once users click your links</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#232f48]">
                  <th className="text-left py-3 px-4 text-sm font-bold text-slate-400">Date & Time</th>
                  <th className="text-left py-3 px-4 text-sm font-bold text-slate-400">Domain</th>
                  <th className="text-left py-3 px-4 text-sm font-bold text-slate-400">SLUG</th>
                  <th className="text-left py-3 px-4 text-sm font-bold text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {trafficData.map((click) => (
                  <tr key={click.id} className="border-b border-[#232f48] hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-sm text-white">{formatDateTime(click.clicked_at || click.created_at)}</td>
                    <td className="py-3 px-4 text-sm text-slate-300">{click.domain || '—'}</td>
                    <td className="py-3 px-4 text-sm text-slate-300 font-mono">{click.slug || '—'}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleExpandClick(click.id)}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-lg transition-colors"
                      >
                        Expand
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              <div className="flex items-center justify-between py-2 border-b border-[#232f48]">
                <span className="text-xs font-medium text-slate-400">Date & Time</span>
                <span className="text-sm text-white font-mono">{formatDateTime(selectedClick.clicked_at || selectedClick.created_at)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#232f48]">
                <span className="text-xs font-medium text-slate-400">Domain</span>
                <span className="text-sm text-white">{selectedClick.domain || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#232f48]">
                <span className="text-xs font-medium text-slate-400">SLUG</span>
                <span className="text-sm text-white font-mono">{selectedClick.slug || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#232f48]">
                <span className="text-xs font-medium text-slate-400">IP Address</span>
                <span className="text-sm text-white font-mono">{selectedClick.ip_address || '—'}</span>
              </div>
              <div className="flex items-start justify-between py-2 border-b border-[#232f48]">
                <span className="text-xs font-medium text-slate-400">User Agent</span>
                <span className="text-sm text-white break-all text-right max-w-[70%]">{selectedClick.user_agent || '—'}</span>
              </div>
              <div className="flex items-start justify-between py-2 border-b border-[#232f48]">
                <span className="text-xs font-medium text-slate-400">Referrer</span>
                <span className="text-sm text-white break-all text-right max-w-[70%]">{selectedClick.referer || selectedClick.referrer || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#232f48]">
                <span className="text-xs font-medium text-slate-400">Country</span>
                <span className="text-sm text-white">{selectedClick.country || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#232f48]">
                <span className="text-xs font-medium text-slate-400">City</span>
                <span className="text-sm text-white">{selectedClick.city || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#232f48]">
                <span className="text-xs font-medium text-slate-400">Device Type</span>
                <span className="text-sm text-white">{selectedClick.device_type || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#232f48]">
                <span className="text-xs font-medium text-slate-400">OS</span>
                <span className="text-sm text-white">{selectedClick.os || '—'} {selectedClick.os_version || ''}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#232f48]">
                <span className="text-xs font-medium text-slate-400">Browser</span>
                <span className="text-sm text-white">{selectedClick.browser || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#232f48]">
                <span className="text-xs font-medium text-slate-400">Is Bot</span>
                <span className={`text-sm font-bold ${selectedClick.is_bot ? 'text-red-400' : 'text-green-400'}`}>
                  {selectedClick.is_bot ? 'Yes' : 'No'}
                </span>
              </div>
              {selectedClick.fraud_score !== null && selectedClick.fraud_score !== undefined && (
                <div className="flex items-center justify-between py-2 border-b border-[#232f48]">
                  <span className="text-xs font-medium text-slate-400">Fraud Score</span>
                  <span className={`text-sm font-bold ${selectedClick.fraud_score > 80 ? 'text-red-400' : selectedClick.fraud_score > 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {selectedClick.fraud_score}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 border-b border-[#232f48]">
                <span className="text-xs font-medium text-slate-400">VPN</span>
                <span className={`text-sm font-bold ${selectedClick.is_vpn ? 'text-yellow-400' : 'text-slate-400'}`}>
                  {selectedClick.is_vpn ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#232f48]">
                <span className="text-xs font-medium text-slate-400">Proxy</span>
                <span className={`text-sm font-bold ${selectedClick.is_proxy ? 'text-yellow-400' : 'text-slate-400'}`}>
                  {selectedClick.is_proxy ? 'Yes' : 'No'}
                </span>
              </div>
              {selectedClick.verdict && (
                <div className="flex items-start justify-between py-2 border-b border-[#232f48]">
                  <span className="text-xs font-medium text-slate-400">Verdict</span>
                  <span className="text-sm text-white text-right max-w-[70%]">{selectedClick.verdict}</span>
                </div>
              )}
              {selectedClick.target_url && (
                <div className="flex items-start justify-between py-2 border-b border-[#232f48]">
                  <span className="text-xs font-medium text-slate-400">Target URL</span>
                  <span className="text-sm text-white break-all text-right max-w-[70%] font-mono">{selectedClick.target_url}</span>
                </div>
              )}
              {selectedClick.query_params && (
                <div className="flex items-start justify-between py-2 border-b border-[#232f48]">
                  <span className="text-xs font-medium text-slate-400">Query Params</span>
                  <span className="text-sm text-white break-all text-right max-w-[70%] font-mono">{typeof selectedClick.query_params === 'string' ? selectedClick.query_params : JSON.stringify(selectedClick.query_params)}</span>
                </div>
              )}
              {selectedClick.session_id && (
                <div className="flex items-center justify-between py-2 border-b border-[#232f48]">
                  <span className="text-xs font-medium text-slate-400">Session ID</span>
                  <span className="text-sm text-white font-mono">{selectedClick.session_id}</span>
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

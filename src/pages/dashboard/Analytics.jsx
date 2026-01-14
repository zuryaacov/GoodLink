import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DonutChart, BarChart, Card, Title } from '@tremor/react';

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
        .select('is_bot, verdict, fraud_score, is_vpn, is_proxy, device_type, os, os_version, country, city')
        .eq('user_id', user.id);

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

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
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
        { name: 'Human', clicks: humanCount },
        { name: 'Bot/Fraud', clicks: botCount },
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
        { name: 'Proxy/VPN', clicks: proxyVpnCount },
        { name: 'Direct', clicks: normalCount },
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
      .map(([name, clicks]) => ({ name, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
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
      .map(([name, clicks]) => ({ name, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
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
        <Card className="bg-[#101622] border-[#232f48]">
          <Title className="text-white mb-4">Human vs. Bot Ratio</Title>
          <DonutChart
            data={chartData.humanVsBot}
            category="clicks"
            index="name"
            colors={['blue', 'orange']}
            className="h-72"
          />
        </Card>

        {/* Proxy/VPN Detection */}
        <Card className="bg-[#101622] border-[#232f48]">
          <Title className="text-white mb-4">Proxy/VPN Detection</Title>
          <DonutChart
            data={chartData.proxyVpn}
            category="clicks"
            index="name"
            colors={['blue', 'emerald']}
            className="h-72"
          />
        </Card>
      </div>

      {/* Device & OS Chart */}
      <Card className="bg-[#101622] border-[#232f48]">
        <Title className="text-white mb-4">Device & OS Distribution</Title>
        <DonutChart
          data={chartData.deviceOS}
          category="clicks"
          index="name"
          colors={['blue', 'emerald', 'amber', 'rose', 'violet', 'fuchsia', 'cyan', 'lime']}
          className="h-72"
        />
      </Card>

      {/* Geographic Bar Chart */}
      <Card className="bg-[#101622] border-[#232f48]">
        <Title className="text-white mb-4">Geographic Distribution (Top 15)</Title>
        <BarChart
          data={chartData.geographic}
          index="name"
          categories={['clicks']}
          colors={['blue']}
          className="h-80"
          showLegend={false}
        />
      </Card>
    </div>
  );
};

export default Analytics;

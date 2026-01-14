import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

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

      // Fetch Total Clicks
      const { count: totalClicksCount, error: clicksError } = await supabase
        .from('clicks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (clicksError) {
        console.error('Error fetching total clicks:', clicksError);
      }

      // Fetch Active Links count
      const { count: activeLinksCount, error: linksError } = await supabase
        .from('links')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active')
        .neq('status', 'deleted');

      if (linksError) {
        console.error('Error fetching active links:', linksError);
      }

      // Fetch Bot Detected clicks count
      // Bot is detected if: is_bot = true OR verdict contains 'bot' OR fraud_score > 80
      // Note: Supabase PostgREST doesn't support complex OR conditions with different operators in a single query
      // We'll need to fetch and filter client-side, or use multiple queries
      const { data: allClicks, error: clicksDataError } = await supabase
        .from('clicks')
        .select('is_bot, verdict, fraud_score')
        .eq('user_id', user.id);

      let botDetectedCount = 0;
      if (!clicksDataError && allClicks) {
        botDetectedCount = allClicks.filter(click => {
          return (
            click.is_bot === true ||
            (click.verdict && click.verdict.toLowerCase().includes('bot')) ||
            (click.fraud_score && click.fraud_score > 80)
          );
        }).length;
      }

      if (clicksDataError) {
        console.error('Error fetching bot detected clicks:', clicksDataError);
      }

      setStats({
        totalClicks: totalClicksCount || 0,
        activeLinks: activeLinksCount || 0,
        botDetected: botDetectedCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
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
    </div>
  );
};

export default Analytics;

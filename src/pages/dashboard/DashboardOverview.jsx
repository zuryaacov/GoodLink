import React from 'react';

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

const DashboardOverview = () => {
  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400">Welcome back! Here's what's happening with your links.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <StatCard 
          title="Total Clicks" 
          value="12,543" 
          change="+12.5%" 
          trend="up" 
          icon="ads_click" 
        />
        <StatCard 
          title="Est. Conversions" 
          value="842" 
          change="+5.2%" 
          trend="up" 
          icon="trending_up" 
        />
        <StatCard 
          title="Active Links" 
          value="24" 
          icon="link" 
        />
      </div>

      {/* Top Links Section */}
      <div className="bg-[#101622] border border-[#232f48] rounded-2xl p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
           <h2 className="text-xl font-bold text-white">Top Performing Links</h2>
           <button className="text-primary text-sm font-bold hover:underline">View All</button>
        </div>
        
        <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse">
              <thead>
                 <tr className="border-b border-[#232f48] text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-4 font-medium">Link Name</th>
                    <th className="p-4 font-medium text-right md:text-left">Clicks</th>
                    <th className="p-4 font-medium hidden md:table-cell">Conversions</th>
                    <th className="p-4 font-medium hidden md:table-cell">Status</th>
                 </tr>
              </thead>
              <tbody className="text-sm">
                 <tr className="border-b border-[#232f48]/50 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                       <div className="flex flex-col">
                          <span className="text-white font-bold">Summer Sale Campaign</span>
                          <span className="text-slate-500 text-xs truncate max-w-[150px] md:max-w-none">goodlink.ai/summer24</span>
                       </div>
                    </td>
                    <td className="p-4 text-white text-right md:text-left">4,231</td>
                    <td className="p-4 text-white hidden md:table-cell">312</td>
                    <td className="p-4 hidden md:table-cell"><span className="text-green-400 bg-green-400/10 px-2 py-1 rounded text-xs font-bold">Active</span></td>
                 </tr>
                 <tr className="border-b border-[#232f48]/50 hover:bg-white/5 transition-colors">
                     <td className="p-4">
                       <div className="flex flex-col">
                          <span className="text-white font-bold">Instagram Bio</span>
                          <span className="text-slate-500 text-xs truncate max-w-[150px] md:max-w-none">goodlink.ai/ig-bio</span>
                       </div>
                    </td>
                    <td className="p-4 text-white text-right md:text-left">2,105</td>
                    <td className="p-4 text-white hidden md:table-cell">156</td>
                    <td className="p-4 hidden md:table-cell"><span className="text-green-400 bg-green-400/10 px-2 py-1 rounded text-xs font-bold">Active</span></td>
                 </tr>
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;

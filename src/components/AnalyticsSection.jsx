import React from 'react';

const AnalyticsSection = () => {
  return (
    <section id="resources" className="py-16 px-6 bg-slate-100 dark:bg-[#0c101a] border-y border-slate-200 dark:border-[#232f48]">
      <div className="mx-auto max-w-[1200px] flex flex-col lg:flex-row gap-12 items-center">
        {/* Text Side */}
        <div className="flex-1 flex flex-col gap-6">
          <h2 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-bold leading-tight">
            Analytics You Can Trust
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Stop flying blind. Our dashboard gives you a granular view of every interaction. Visualize trends, spot anomalies, and optimize your ROI in real-time.
          </p>
          <ul className="flex flex-col gap-4 mt-2">
            <li className="flex items-center gap-3">
              <span className="material-symbols-outlined text-green-500">check</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">Click-level fraud detection</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="material-symbols-outlined text-green-500">check</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">Bot filtering & exclusion</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="material-symbols-outlined text-green-500">check</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">Exportable raw data logs</span>
            </li>
          </ul>
        </div>
        {/* Chart Component Side */}
        <div className="flex-1 w-full">
          <div className="rounded-xl border border-slate-200 dark:border-[#324467] bg-white dark:bg-[#192233] p-6 shadow-2xl">
            <div className="flex flex-col gap-2 mb-6">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Link Click Performance</p>
              <div className="flex items-baseline justify-between">
                <p className="text-slate-900 dark:text-white text-4xl font-bold tracking-tight">1.2M <span className="text-lg font-normal text-slate-500">Clicks</span></p>
                <div className="flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded">
                  <span className="material-symbols-outlined text-green-500 text-sm">trending_up</span>
                  <p className="text-green-600 dark:text-green-400 text-sm font-bold">+12.5%</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm">Last 30 Days</p>
            </div>
            {/* Chart SVG */}
            <div className="w-full h-[200px] relative">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 478 150">
                <defs>
                  <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#135bec" stopOpacity="0.2"></stop>
                    <stop offset="100%" stopColor="#135bec" stopOpacity="0"></stop>
                  </linearGradient>
                </defs>
                <path d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25V150H0V109Z" fill="url(#chartGradient)"></path>
                <path d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25" fill="none" stroke="#135bec" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"></path>
              </svg>
            </div>
            <div className="flex justify-between mt-6 px-2">
              <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase">Mon</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase">Tue</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase">Wed</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase">Thu</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase">Fri</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase">Sat</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase">Sun</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AnalyticsSection;

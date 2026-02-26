import React from 'react';

const AdminOverviewPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1b1b1b]">Admin Panel</h1>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1b1b1b] mb-2">System Management</h2>
        <p className="text-slate-600">
          Welcome to the admin overview. Here you can manage users, view global analytics, and monitor system health.
          Additional admin features can be added in future phases.
        </p>
      </div>
    </div>
  );
};

export default AdminOverviewPage;

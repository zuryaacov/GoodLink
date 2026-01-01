import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Homepage from './pages/Homepage';
import AuthPage from './pages/AuthPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardOverview from './pages/dashboard/DashboardOverview';
import { supabase } from './lib/supabase';

const ProtectedRoute = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="h-screen w-full bg-[#0b0f19] flex items-center justify-center text-white">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
};

function App() {
  if (!supabase) {
    // ... existing configuration check ...
    return (
      <div className="h-screen w-full bg-[#101622] flex items-center justify-center text-white px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Configuration Required</h1>
          <p className="text-slate-400 mb-6">
            Supabase credentials are missing. Please add 
            <code className="bg-slate-800 px-2 py-1 rounded text-primary mx-1">VITE_SUPABASE_URL</code>
            and
            <code className="bg-slate-800 px-2 py-1 rounded text-primary mx-1">VITE_SUPABASE_ANON_KEY</code>
            to your Vercel project settings.
          </p>
          <a href="https://vercel.com/docs/projects/environment-variables" className="text-primary hover:underline" target="_blank">View Vercel Documentation &rarr;</a>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/login" element={<AuthPage />} />
      
      {/* Dashboard Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<DashboardOverview />} />
        {/* Placeholders for future phases */}
        <Route path="links" element={<div className="text-white">Link Manager (Coming Soon)</div>} />
        <Route path="pixels" element={<div className="text-white">Pixels Manager (Coming Soon)</div>} />
        <Route path="domains" element={<div className="text-white">Custom Domains (Coming Soon)</div>} />
        <Route path="analytics" element={<div className="text-white">Analytics Reports (Coming Soon)</div>} />
      </Route>
    </Routes>
  );
}

export default App;

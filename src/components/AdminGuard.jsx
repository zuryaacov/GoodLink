import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Renders children only if the current user has role === 'admin' in profiles.
 * Otherwise redirects to /dashboard.
 */
const AdminGuard = ({ children }) => {
  const [status, setStatus] = useState('loading'); // 'loading' | 'admin' | 'forbidden'

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setStatus('forbidden');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      if (!cancelled) {
        setStatus(profile?.role === 'admin' ? 'admin' : 'forbidden');
      }
    };

    check();
    return () => { cancelled = true; };
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }
  if (status === 'forbidden') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

export default AdminGuard;

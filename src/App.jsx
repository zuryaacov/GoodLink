import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import Homepage from "./pages/Homepage";
import AuthPage from "./pages/AuthPage";
import DashboardLayout from "./layouts/DashboardLayout";
import Analytics from "./pages/dashboard/Analytics";
import LinkManager from "./pages/dashboard/LinkManager";
import UtmPresetManager from "./pages/dashboard/UtmPresetManager";
import UtmPresetBuilderPage from "./pages/dashboard/UtmPresetBuilderPage";
import PixelManager from "./pages/dashboard/PixelManager";
import PixelBuilderPage from "./pages/dashboard/PixelBuilderPage";
import CustomDomainsManager from "./pages/dashboard/CustomDomainsManager";
import AddDomainPage from "./pages/dashboard/AddDomainPage";
import LinkBuilderPage from "./pages/dashboard/LinkBuilderPage";
import { supabase } from "./lib/supabase";

const ProtectedRoute = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#1e152f] flex items-center justify-center text-white">
        Loading...
      </div>
    );
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
      <div className="h-screen w-full bg-[#1e152f] flex items-center justify-center text-white px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">
            Configuration Required
          </h1>
          <p className="text-slate-400 mb-6">
            Supabase credentials are missing. Please add
            <code className="bg-slate-800 px-2 py-1 rounded text-primary mx-1">
              VITE_SUPABASE_URL
            </code>
            and
            <code className="bg-slate-800 px-2 py-1 rounded text-primary mx-1">
              VITE_SUPABASE_ANON_KEY
            </code>
            to your Vercel project settings.
          </p>
          <a
            href="https://vercel.com/docs/projects/environment-variables"
            className="text-primary hover:underline"
            target="_blank"
          >
            View Vercel Documentation &rarr;
          </a>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/login" element={<AuthPage />} />

      {/* Dashboard Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Analytics />} />
        {/* Placeholders for future phases */}
        <Route path="links" element={<LinkManager />} />
        <Route path="utm-presets" element={<UtmPresetManager />} />
        <Route path="pixels" element={<PixelManager />} />
        <Route path="domains" element={<CustomDomainsManager />} />
      </Route>

      {/* UTM Preset Builder Routes (without DashboardLayout/navbar) */}
      <Route
        path="/dashboard/utm-presets/new"
        element={
          <ProtectedRoute>
            <UtmPresetBuilderPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/utm-presets/edit/:id"
        element={
          <ProtectedRoute>
            <UtmPresetBuilderPage />
          </ProtectedRoute>
        }
      />

      {/* Pixel Builder Routes (without DashboardLayout/navbar) */}
      <Route
        path="/dashboard/pixels/new"
        element={
          <ProtectedRoute>
            <PixelBuilderPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/pixels/edit/:id"
        element={
          <ProtectedRoute>
            <PixelBuilderPage />
          </ProtectedRoute>
        }
      />

      {/* Custom Domain Routes (without DashboardLayout/navbar) */}
      <Route
        path="/dashboard/domains/new"
        element={
          <ProtectedRoute>
            <AddDomainPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/domains/edit/:id"
        element={
          <ProtectedRoute>
            <AddDomainPage />
          </ProtectedRoute>
        }
      />

      {/* Link Builder Routes (without DashboardLayout/navbar) */}
      <Route
        path="/dashboard/links/new"
        element={
          <ProtectedRoute>
            <LinkBuilderPage />
          </ProtectedRoute>
        }
      />
        <Route
        path="/dashboard/links/edit/:id"
          element={
          <ProtectedRoute>
            <LinkBuilderPage />
          </ProtectedRoute>
          }
        />
    </Routes>
  );
}

export default App;

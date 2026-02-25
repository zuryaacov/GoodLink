import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import AnalyticsSection from '../components/AnalyticsSection';
import CTASection from '../components/CTASection';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabase';

const Homepage = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (window.location.hash === '#pricing') {
      const el = document.getElementById('pricing');
      if (el) {
        // שימוש ב-timeout קטן כדי לוודא שה‑DOM מוכן
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, []);

  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero user={user} />
        <Features />
        <AnalyticsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Homepage;

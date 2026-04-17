import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import AnalyticsSection from '../components/AnalyticsSection';
import CTASection from '../components/CTASection';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabase';

const Homepage = () => {
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    const hash = location.hash.slice(1);
    if (!hash) return;

    const scrollToHashTarget = () => {
      const el = document.getElementById(hash);
      const header = document.querySelector('header');
      if (!el) return;

      const headerOffset = header ? header.getBoundingClientRect().height + 12 : 88;
      const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;

      window.scrollTo({
        top: Math.max(top, 0),
        behavior: 'smooth',
      });
    };

    const timeoutId = window.setTimeout(scrollToHashTarget, 100);
    return () => window.clearTimeout(timeoutId);
  }, [location.hash]);

  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" className="flex-1">
        <Hero user={user} />
        <CTASection />
        <Features />
        <AnalyticsSection />
      </main>
      <Footer />
    </div>
  );
};

export default Homepage;

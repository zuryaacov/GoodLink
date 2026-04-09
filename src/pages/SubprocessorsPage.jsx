import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Server } from 'lucide-react';

const SUBPROCESSORS = [
  {
    id: 'vercel',
    name: 'Vercel',
    purpose: 'Server hosting',
    location: 'US',
    reference: 'DPA',
  },
  {
    id: 'upstash',
    name: 'Upstash',
    purpose: 'Redis caching & queuing infrastructure',
    location: 'US, EU, Singapore',
    reference: 'Trust Center',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    purpose: 'Image hosting and CDN',
    location: 'US',
    reference: 'DPA',
  },
  {
    id: 'lemon-squeezy',
    name: 'Lemon Squeezy',
    purpose: 'Payment processing',
    location: 'US',
    reference: 'DPA',
  },
  {
    id: 'brevo',
    name: 'Brevo',
    purpose: 'Email sending',
    location: 'France',
    reference: 'DPA',
  },
  {
    id: 'axiom',
    name: 'Axiom',
    purpose: 'Logging',
    location: 'US',
    reference: 'Security',
  },
];

const SubprocessorsPage = () => {
  const [activeSection, setActiveSection] = useState('vercel');

  const sections = SUBPROCESSORS.map((s) => ({
    id: s.id,
    title: s.name,
    icon: <Server className="w-4 h-4" />,
  }));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150;
      for (const section of [...sections].reverse()) {
        const element = document.getElementById(section.id);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(section.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 100,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="sticky top-0 z-40 border-b border-slate-200 py-4 px-6 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="max-w-3xl mx-auto flex items-center justify-center">
          <Link
            to="/"
            className="flex items-center gap-3 text-black transition-opacity hover:opacity-80 w-fit"
          >
            {/* Link-shape icon hidden by request (kept in code, do not delete)
            <div className="size-5 sm:size-7 text-primary flex-shrink-0">
              <svg fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                  stroke="#a855f7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                />
                <path
                  d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                  stroke="#a855f7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                />
              </svg>
            </div>
            */}
            <span className="text-2xl font-black leading-tight tracking-tight text-[#a855f7]">
              GoodLink
            </span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-16">
        <aside className="hidden lg:block">
          <div className="sticky top-32">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 px-3">
              Table of Contents
            </p>
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeSection === section.id
                      ? 'bg-slate-50 text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50/50 hover:text-slate-900'
                  }`}
                >
                  <span
                    className={
                      activeSection === section.id ? 'text-[#00F59B]' : 'text-slate-300'
                    }
                  >
                    {section.icon}
                  </span>
                  {section.title}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <article className="max-w-3xl">
          <header className="mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F59B]/10 text-[#001E22] text-xs font-bold mb-6">
              <Shield className="w-3 h-3" />
              LEGAL / COMPLIANCE
            </div>
            <h1 className="text-5xl font-black tracking-tight text-slate-900 mb-4">
              List of Subprocessors
            </h1>
            <p className="text-lg text-slate-500">Last updated: February 24, 2026</p>
          </header>

          <div className="prose prose-slate prose-lg max-w-none prose-headings:scroll-mt-32 prose-p:text-slate-600 prose-p:leading-relaxed">
            {SUBPROCESSORS.map((sub) => (
              <section
                key={sub.id}
                id={sub.id}
                className="mb-16 border-b border-slate-100 pb-12 last:border-0"
              >
                <h2 className="text-2xl font-black text-slate-900 mb-6">{sub.name}</h2>
                <dl className="grid gap-3 text-slate-600">
                  <div className="flex flex-wrap gap-2">
                    <dt className="font-semibold text-slate-700 min-w-[100px]">Purpose:</dt>
                    <dd>{sub.purpose}</dd>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <dt className="font-semibold text-slate-700 min-w-[100px]">Location:</dt>
                    <dd>{sub.location}</dd>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <dt className="font-semibold text-slate-700 min-w-[100px]">Reference:</dt>
                    <dd>{sub.reference}</dd>
                  </div>
                </dl>
              </section>
            ))}
          </div>
        </article>
      </main>
    </div>
  );
};

export default SubprocessorsPage;

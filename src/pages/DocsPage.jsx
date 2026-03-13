import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Compass, LayoutDashboard, WandSparkles, Lightbulb } from 'lucide-react';

const DocsPage = () => {
  const [activeSection, setActiveSection] = useState('intro');

  const sections = [
    { id: 'intro', title: 'Introduction', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'quick-start', title: 'Quick Start', icon: <Compass className="w-4 h-4" /> },
    { id: 'dashboard', title: 'Dashboard Pages', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'wizards', title: 'Wizards', icon: <WandSparkles className="w-4 h-4" /> },
    { id: 'best-practices', title: 'Best Practices', icon: <Lightbulb className="w-4 h-4" /> },
  ];

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
      <header className="border-b border-slate-200 py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-3 text-black transition-opacity hover:opacity-80 w-fit"
          >
            <div className="size-5 sm:size-7 text-primary flex-shrink-0">
              <svg fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                  stroke="#6358de"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                />
                <path
                  d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                  stroke="#6358de"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                />
              </svg>
            </div>
            <span className="text-2xl font-black leading-tight tracking-tight text-[#6358de]">
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
                  <span className={activeSection === section.id ? 'text-[#00F59B]' : 'text-slate-300'}>
                    {section.icon}
                  </span>
                  {section.title}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <article className="max-w-3xl prose prose-slate prose-lg">
          <header id="intro" className="not-prose mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F59B]/10 text-[#001E22] text-xs font-bold mb-6">
              <BookOpen className="w-3 h-3" />
              PRODUCT DOCUMENTATION
            </div>
            <h1 className="text-5xl font-black tracking-tight text-slate-900 mb-4">GoodLink Docs</h1>
            <p className="text-lg text-slate-500">
              A complete guide to every page and wizard in the platform.
            </p>
          </header>

          <section id="quick-start">
            <h2>Quick Start</h2>
            <ol>
              <li>Go to <code>/login</code> and sign in (or create an account).</li>
              <li>Open <code>/dashboard/links</code>.</li>
              <li>Click <strong>New Link</strong> and complete the Link Wizard.</li>
              <li>Copy your short URL and monitor performance in <code>/dashboard/analytics</code>.</li>
            </ol>
          </section>

          <section id="dashboard">
            <h2>Dashboard Pages</h2>
            <ul>
              <li><code>/dashboard</code> - analytics overview, traffic quality, geolocation, and traffic log.</li>
              <li><code>/dashboard/links</code> - create, edit, duplicate, pause/resume, move, and delete links.</li>
              <li><code>/dashboard/utm-presets</code> - manage reusable UTM templates.</li>
              <li><code>/dashboard/pixels</code> - manage CAPI profiles and events.</li>
              <li><code>/dashboard/domains</code> - add domains, configure DNS, and verify status.</li>
              <li><code>/dashboard/settings</code> - personal settings, password, subscription, and usage.</li>
            </ul>
          </section>

          <section id="wizards">
            <h2>Wizards</h2>
            <h3>Link Wizard</h3>
            <p>
              Typical flow: <strong>Name</strong> - <strong>Target URL</strong> - <strong>Domain</strong> -
              <strong>Slug</strong> - <strong>Bot Protection</strong> - <strong>Geo</strong> -
              <strong>CAPI</strong> - <strong>Review</strong>.
            </p>
            <h3>UTM Preset Wizard</h3>
            <p>
              Build platform-aware UTM templates with a live query-string preview.
            </p>
            <h3>CAPI Wizard</h3>
            <p>
              Configure a CAPI profile: name, platform, pixel ID, token, and default event.
            </p>
            <h3>Domain Wizard</h3>
            <p>
              Add custom domain, set optional root redirect, apply DNS records, then verify.
            </p>
          </section>

          <section id="best-practices">
            <h2>Best Practices</h2>
            <ul>
              <li>Use consistent naming conventions for links and presets.</li>
              <li>Prefer UTM presets over manual parameter typing.</li>
              <li>Attach CAPI profiles to performance-critical links.</li>
              <li>Review analytics daily during active campaigns.</li>
              <li>Use custom domains for brand trust and stronger CTR.</li>
            </ul>
          </section>
        </article>
      </main>
    </div>
  );
};

export default DocsPage;


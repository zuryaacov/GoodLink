import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  UserCircle,
  Layers,
  Link2,
  Globe2,
  Radar,
  Megaphone,
  BookOpen,
} from 'lucide-react';

const DOC_SECTIONS = [
  { id: 'create-account', title: 'Create Your GoodLink Account', Icon: UserCircle },
  { id: 'workspaces', title: 'Workspaces, Campaigns and groups', Icon: Layers },
  { id: 'links', title: 'Links', Icon: Link2 },
  { id: 'custom-domains', title: 'Custom domains', Icon: Globe2 },
  { id: 'capi', title: 'Capi (S2S Tracking)', Icon: Radar },
  { id: 'utm-presets', title: 'UTM Presets', Icon: Megaphone },
];

const DocsPage = () => {
  const [activeSection, setActiveSection] = useState('create-account');

  const sectionIds = useMemo(() => DOC_SECTIONS.map((s) => s.id), []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150;
      for (const id of [...sectionIds].reverse()) {
        const element = document.getElementById(id);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sectionIds]);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 100,
        behavior: 'smooth',
      });
    }
  };

  const NavButtons = ({ className = '' }) => (
    <nav className={`space-y-1 ${className}`}>
      {DOC_SECTIONS.map(({ id, title, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => scrollToSection(id)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all duration-200 ${
            activeSection === id
              ? 'bg-slate-50 text-slate-900 shadow-sm'
              : 'text-slate-500 hover:bg-slate-50/50 hover:text-slate-900'
          }`}
        >
          <span className={activeSection === id ? 'text-[#00F59B]' : 'text-slate-300'}>
            <Icon className="w-4 h-4 shrink-0" />
          </span>
          {title}
        </button>
      ))}
    </nav>
  );

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
            <NavButtons />
          </div>
        </aside>

        <div className="lg:col-span-1 min-w-0">
          <div className="lg:hidden mb-10 p-4 rounded-2xl border border-slate-200 bg-slate-50/80">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-1">
              Jump to section
            </p>
            <NavButtons />
          </div>

          <article className="max-w-3xl prose prose-slate prose-lg prose-headings:scroll-mt-32 prose-li:text-slate-700 prose-p:text-slate-600">
            <header className="not-prose mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F59B]/10 text-[#001E22] text-xs font-bold mb-6">
                <BookOpen className="w-3 h-3" />
                PRODUCT DOCUMENTATION
              </div>
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-2">GoodLink Docs</p>
            </header>

            <section id="create-account" className="scroll-mt-32 not-prose mb-16">
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 mb-4">
                How to Create Your GoodLink Account
              </h1>
              <p className="text-lg text-slate-500 mb-8 max-w-2xl">
                Start here: create your account, then use the sections on the left to learn about workspaces, links,
                domains, CAPI, and UTM presets.
              </p>
              <div className="prose prose-slate prose-lg prose-li:text-slate-700 prose-p:text-slate-600 max-w-none">
              <p>
                Open the <strong>Auth</strong> page at <code>/login</code>. You can sign in with an existing account or
                create a new one.
              </p>
              <h3>Create a new account</h3>
              <ol>
                <li>Choose <strong>Create Account</strong> (or equivalent).</li>
                <li>Enter your full name, email, and password, then confirm the password.</li>
                <li>Complete any security verification shown on the page.</li>
                <li>Submit the form. After signup succeeds, you can sign in and use the dashboard.</li>
              </ol>
              <h3>Other options on the auth page</h3>
              <ul>
                <li>
                  <strong>Sign in:</strong> email and password for returning users.
                </li>
                <li>
                  <strong>Google (or other providers):</strong> if enabled, use the social button to sign up or sign in
                  with your provider account.
                </li>
                <li>
                  <strong>Forgot password:</strong> submit your email to receive a reset link.
                </li>
              </ul>
              <p>
                If you see a database or signup error, confirm your Supabase project is configured correctly (including
                triggers that create your profile row for new users).
              </p>
              </div>
            </section>

            <section id="workspaces" className="scroll-mt-32">
              <h2>Workspaces, Campaigns and groups</h2>
              <p>
                On supported plans, the Link Manager uses a <strong>hierarchy</strong> so you can organize many links
                cleanly.
              </p>
              <ul>
                <li>
                  <strong>Workspace</strong> — top-level container (e.g. brand or client).
                </li>
                <li>
                  <strong>Campaign</strong> — lives under a workspace (e.g. a specific promotion).
                </li>
                <li>
                  <strong>Group</strong> — optional nested level under campaigns for finer grouping.
                </li>
              </ul>
              <p>
                Use the sidebar and folder navigation in <code>/dashboard/links</code> to switch workspace, open
                campaigns, and drill into groups. This keeps reporting and day-to-day operations easier at scale.
              </p>
            </section>

            <section id="links" className="scroll-mt-32">
              <h2>Links</h2>
              <p>
                <code>/dashboard/links</code> is where you create and manage short links. Use <strong>New Link</strong>{' '}
                to open the Link Wizard.
              </p>
              <h3>Actions on each link</h3>
              <ul>
                <li>
                  <strong>Edit</strong> — change configuration.
                </li>
                <li>
                  <strong>Duplicate</strong> — copy settings for a new link.
                </li>
                <li>
                  <strong>Analytics</strong> — open analytics filtered to that link.
                </li>
                <li>
                  <strong>Details</strong> — view full link metadata (where available).
                </li>
                <li>
                  <strong>Copy / QR</strong> — share the short URL or export a QR code.
                </li>
                <li>
                  <strong>Delete</strong> — remove the link when you no longer need it.
                </li>
              </ul>
              <h3>Link Wizard (overview)</h3>
              <p>The wizard is plan-aware: simpler plans see fewer steps; higher tiers unlock more controls.</p>
              <ul>
                <li>
                  <strong>Name</strong> — internal label; duplicate names may be blocked.
                </li>
                <li>
                  <strong>Target URL</strong> — destination; validated automatically.
                </li>
                <li>
                  <strong>Domain &amp; slug</strong> — choose host and path (custom domains on eligible plans).
                </li>
                <li>
                  <strong>Bot protection</strong> — allow, block, or redirect bots (where enabled).
                </li>
                <li>
                  <strong>Geo targeting</strong> — country-based routing (Pro, where enabled).
                </li>
                <li>
                  <strong>CAPI</strong> — attach pixel profiles for server-side events (custom domain required where
                  applicable).
                </li>
                <li>
                  <strong>Review</strong> — confirm everything, then complete setup.
                </li>
              </ul>
            </section>

            <section id="custom-domains" className="scroll-mt-32">
              <h2>Custom domains</h2>
              <p>
                Manage branded domains at <code>/dashboard/domains</code>. Verified custom domains improve trust and are
                required for some features (e.g. CAPI on certain setups).
              </p>
              <h3>Typical actions</h3>
              <ul>
                <li>Add a new domain</li>
                <li>Set or edit root redirect</li>
                <li>Open domain details and required DNS records</li>
                <li>Refresh or re-check DNS verification</li>
                <li>Remove a domain you no longer use</li>
              </ul>
              <h3>Domain wizard flow</h3>
              <ol>
                <li>
                  <strong>Domain</strong> — enter the exact hostname you will use.
                </li>
                <li>
                  <strong>Root redirect</strong> — optional default URL for the bare domain.
                </li>
                <li>
                  <strong>DNS</strong> — add the records at your DNS host exactly as shown.
                </li>
                <li>
                  <strong>Verify</strong> — wait for propagation, then verify. Retry if records are not live yet.
                </li>
              </ol>
            </section>

            <section id="capi" className="scroll-mt-32">
              <h2>Capi (S2S Tracking)</h2>
              <p>
                Server-side (CAPI) profiles live under <code>/dashboard/pixels</code>. Attach them to links so
                conversion-related events can be sent from GoodLink to your ad platforms.
              </p>
              <h3>Manager page</h3>
              <ul>
                <li>Create, edit, pause, and remove CAPI profiles.</li>
                <li>Each profile shows platform, pixel or measurement identifiers, and event configuration.</li>
              </ul>
              <h3>CAPI wizard (typical steps)</h3>
              <ol>
                <li>Name</li>
                <li>Platform (e.g. Meta family, TikTok)</li>
                <li>Pixel ID or measurement ID</li>
                <li>Access token or secret (as required by the platform)</li>
                <li>Event type or custom event name</li>
              </ol>
              <p>Validation rules depend on the platform. Follow on-screen errors if a step cannot proceed.</p>
            </section>

            <section id="utm-presets" className="scroll-mt-32">
              <h2>UTM Presets</h2>
              <p>
                Reusable UTM templates live at <code>/dashboard/utm-presets</code>. They help you keep campaign
                parameters consistent and avoid typos.
              </p>
              <h3>Manager</h3>
              <ul>
                <li>Create, edit, copy, and delete presets.</li>
                <li>Cards usually show the platform and the generated query string preview.</li>
              </ul>
              <h3>Typical wizard steps</h3>
              <ol>
                <li>Name</li>
                <li>Platform</li>
                <li>Source, medium, campaign</li>
                <li>Content and term (when needed)</li>
              </ol>
              <p>Platform-specific choices reduce formatting mistakes; use the live preview to confirm the final string.</p>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
};

export default DocsPage;

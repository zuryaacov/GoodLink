import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Compass,
  Globe,
  LayoutDashboard,
  ChartNoAxesCombined,
  Link2,
  WandSparkles,
  Megaphone,
  Radar,
  Globe2,
  Settings,
  ShieldCheck,
  CircleHelp,
  Lightbulb,
} from 'lucide-react';

const DocsPage = () => {
  const [activeSection, setActiveSection] = useState('intro');

  const sections = [
    { id: 'intro', title: 'Introduction', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'quick-start', title: 'Quick Start', icon: <Compass className="w-4 h-4" /> },
    { id: 'public-pages', title: 'Public Pages', icon: <Globe className="w-4 h-4" /> },
    {
      id: 'dashboard-navigation',
      title: 'Dashboard Navigation',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'analytics-page',
      title: 'Analytics Page',
      icon: <ChartNoAxesCombined className="w-4 h-4" />,
    },
    { id: 'link-manager-page', title: 'Link Manager', icon: <Link2 className="w-4 h-4" /> },
    { id: 'link-wizard', title: 'Link Wizard', icon: <WandSparkles className="w-4 h-4" /> },
    { id: 'utm-presets', title: 'UTM Presets', icon: <Megaphone className="w-4 h-4" /> },
    { id: 'capi-manager', title: 'CAPI Manager', icon: <Radar className="w-4 h-4" /> },
    { id: 'domains-manager', title: 'Custom Domains', icon: <Globe2 className="w-4 h-4" /> },
    { id: 'account-settings', title: 'Account Settings', icon: <Settings className="w-4 h-4" /> },
    { id: 'admin-panel', title: 'Admin Panel', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'troubleshooting', title: 'Troubleshooting', icon: <CircleHelp className="w-4 h-4" /> },
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

        <article className="max-w-3xl prose prose-slate prose-lg prose-headings:scroll-mt-32 prose-li:text-slate-700 prose-p:text-slate-600">
          <header id="intro" className="not-prose mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F59B]/10 text-[#001E22] text-xs font-bold mb-6">
              <BookOpen className="w-3 h-3" />
              PRODUCT DOCUMENTATION
            </div>
            <h1 className="text-5xl font-black tracking-tight text-slate-900 mb-4">GoodLink Docs</h1>
            <p className="text-lg text-slate-500">
              A complete, page-by-page and step-by-step guide to using GoodLink.
            </p>
          </header>

          <section id="quick-start">
            <h2>Quick Start</h2>
            <p>
              New user? Follow this exact flow and you will create your first production-ready short link.
            </p>
            <ol>
              <li>
                Go to <code>/login</code> and sign in (or create an account).
              </li>
              <li>
                Open <code>/dashboard/links</code> and click <strong>New Link</strong>.
              </li>
              <li>
                Complete the Link Wizard from name to final review.
              </li>
              <li>
                Copy your short URL and publish it in your ad or campaign.
              </li>
              <li>
                Monitor performance in <code>/dashboard/analytics</code>.
              </li>
            </ol>
          </section>

          <section id="public-pages">
            <h2>Public Pages</h2>
            <h3>Homepage (<code>/</code>)</h3>
            <ul>
              <li>Use it to understand product value, pricing, and navigation to login.</li>
              <li>Primary action for most users: move to account creation or sign in.</li>
            </ul>
            <h3>Auth Page (<code>/login</code>)</h3>
            <ul>
              <li><strong>Sign In:</strong> email + password login.</li>
              <li>
                <strong>Create Account:</strong> full name, email, password, confirm password, and security verification.
              </li>
              <li><strong>Forgot Password:</strong> submit email to receive reset link.</li>
            </ul>
            <h3>Contact (<code>/contact</code>)</h3>
            <ul>
              <li>Submit support/business requests with your email and message.</li>
            </ul>
            <h3>Abuse / DMCA (<code>/abuse</code>)</h3>
            <ul>
              <li>Report abusive, spam, phishing, or copyright-violating links.</li>
              <li>Provide reported URL, category, optional details, and contact email.</li>
              <li>Complete security verification before submit.</li>
            </ul>
            <h3>Legal / Trust Pages</h3>
            <ul>
              <li><code>/terms</code> - Terms of Service</li>
              <li><code>/privacy</code> - Privacy Policy</li>
              <li><code>/subprocessors</code> - Subprocessors</li>
              <li><code>/dpa</code> - DPA</li>
            </ul>
          </section>

          <section id="dashboard-navigation">
            <h2>Dashboard Navigation</h2>
            <p>
              After login, the left sidebar is your main control panel.
            </p>
            <ul>
              <li><code>/dashboard</code> - analytics and traffic quality.</li>
              <li><code>/dashboard/links</code> - create and manage links.</li>
              <li><code>/dashboard/utm-presets</code> - reusable UTM templates.</li>
              <li><code>/dashboard/pixels</code> - CAPI profiles and event setup.</li>
              <li><code>/dashboard/domains</code> - custom domain and DNS status.</li>
              <li><code>/dashboard/settings</code> - profile and subscription settings.</li>
            </ul>
          </section>

          <section id="analytics-page">
            <h2>Analytics Page (<code>/dashboard</code>)</h2>
            <h3>What each block means</h3>
            <ul>
              <li><strong>Total Clicks:</strong> all tracked clicks.</li>
              <li><strong>Unique Visitors:</strong> deduplicated audience estimate.</li>
              <li><strong>Bot Traffic:</strong> suspicious/automated click volume.</li>
              <li><strong>Conversion Est.:</strong> modeled conversion signal.</li>
              <li><strong>Human vs Bot:</strong> quality ratio view.</li>
              <li><strong>Geographic Distribution:</strong> top countries and share.</li>
              <li><strong>Traffic Log:</strong> click-level table with time, location, device, and status.</li>
            </ul>
            <h3>What to do here</h3>
            <ul>
              <li>Detect traffic anomalies (bot spikes, strange locations, low-quality devices).</li>
              <li>Use <strong>More Information</strong> to inspect suspicious clicks.</li>
              <li>Track trends by checking log pages regularly.</li>
            </ul>
          </section>

          <section id="link-manager-page">
            <h2>Link Manager (<code>/dashboard/links</code>)</h2>
            <p>
              This is the operational center for all your short links.
            </p>
            <h3>Core actions on each link</h3>
            <ul>
              <li><strong>Edit:</strong> update configuration.</li>
              <li><strong>Duplicate:</strong> clone settings for faster production.</li>
              <li><strong>Analytics:</strong> open analytics filtered to this link.</li>
              <li><strong>Pause/Active toggle:</strong> control serving status.</li>
              <li><strong>Copy:</strong> copy short URL instantly.</li>
              <li><strong>QR:</strong> open QR modal and export PNG/SVG.</li>
              <li><strong>Delete:</strong> remove link from active list.</li>
            </ul>
            <h3>Hierarchy mode (plan-based)</h3>
            <ul>
              <li><strong>Workspace</strong> - top-level container.</li>
              <li><strong>Campaign</strong> - grouped under a workspace.</li>
              <li><strong>Group</strong> - nested level under campaigns.</li>
            </ul>
            <p>
              Use hierarchy for cleaner reporting and easier operations at scale.
            </p>
          </section>

          <section id="link-wizard">
            <h2>Link Wizard (<code>/dashboard/links/new</code>)</h2>
            <p>
              The wizard is plan-aware. Free/Starter sees a shorter flow; Advanced/Pro unlocks additional control steps.
            </p>
            <h3>Step 1: Name</h3>
            <ul>
              <li>Enter a clear internal name for this link.</li>
              <li>Duplicate name checks run before you can continue.</li>
            </ul>
            <h3>Step 2: Target URL</h3>
            <ul>
              <li>Enter the final destination URL.</li>
              <li>URL format and safety checks run automatically.</li>
            </ul>
            <h3>Step 3: Domain (Advanced/Pro)</h3>
            <ul>
              <li>Select a domain (default or custom).</li>
              <li>Prefer verified custom domains for production traffic.</li>
            </ul>
            <h3>Step 4: Slug</h3>
            <ul>
              <li>Choose a readable slug (short path after the domain).</li>
              <li>Availability validation helps prevent conflicts.</li>
            </ul>
            <h3>Step 5: Bot Protection (Advanced/Pro)</h3>
            <ul>
              <li><strong>Allow</strong> - normal handling.</li>
              <li><strong>Block</strong> - block detected bots.</li>
              <li><strong>Redirect</strong> - send bots to fallback URL.</li>
            </ul>
            <h3>Step 6: Geo Targeting (Pro)</h3>
            <ul>
              <li>Add country-based routing rules.</li>
              <li>One rule per country, each with dedicated destination URL.</li>
            </ul>
            <h3>Step 7: CAPI Select (Pro)</h3>
            <ul>
              <li>Attach one or more CAPI profiles.</li>
            </ul>
            <h3>Step 8: Final Review</h3>
            <ul>
              <li>Validate full summary and click <strong>Complete Setup</strong>.</li>
            </ul>
          </section>

          <section id="utm-presets">
            <h2>UTM Presets (<code>/dashboard/utm-presets</code>)</h2>
            <h3>Manager page</h3>
            <ul>
              <li>Create, edit, copy, and delete reusable UTM templates.</li>
              <li>Each preset card shows platform and generated query string.</li>
            </ul>
            <h3>UTM Preset Wizard steps</h3>
            <ol>
              <li>Name</li>
              <li>Platform</li>
              <li>Source</li>
              <li>Medium</li>
              <li>Campaign</li>
              <li>Content</li>
              <li>Term</li>
            </ol>
            <ul>
              <li>Choices are platform-specific to reduce formatting errors.</li>
              <li>Live preview shows exactly what your final query will look like.</li>
            </ul>
          </section>

          <section id="capi-manager">
            <h2>CAPI Manager (<code>/dashboard/pixels</code>)</h2>
            <h3>Manager page</h3>
            <ul>
              <li>Create, edit, pause, and delete CAPI profiles.</li>
              <li>Each card shows platform, pixel ID, and event setup.</li>
            </ul>
            <h3>CAPI Wizard steps</h3>
            <ol>
              <li>Name</li>
              <li>Platform</li>
              <li>Pixel ID / Measurement ID</li>
              <li>CAPI token / secret</li>
              <li>Event type (or custom event)</li>
            </ol>
            <ul>
              <li>Validation is platform-specific and strict.</li>
              <li>When selecting custom event, provide a clean event name.</li>
            </ul>
          </section>

          <section id="domains-manager">
            <h2>Custom Domains (<code>/dashboard/domains</code>)</h2>
            <h3>Manager page</h3>
            <ul>
              <li>Add domain</li>
              <li>Edit root redirect</li>
              <li>Open domain details and DNS records</li>
              <li>Refresh DNS records</li>
              <li>Verify DNS status</li>
              <li>Delete domain</li>
            </ul>
            <h3>Domain Wizard steps</h3>
            <ol>
              <li><strong>Domain</strong> - enter exact host to use.</li>
              <li><strong>Root Redirect</strong> - optional default destination.</li>
              <li><strong>DNS Setup</strong> - apply records at registrar.</li>
              <li><strong>Verify</strong> - confirm propagation and activation.</li>
            </ol>
            <p>
              DNS propagation may take time. If verification fails, wait and retry.
            </p>
          </section>

          <section id="account-settings">
            <h2>Account Settings (<code>/dashboard/settings</code>)</h2>
            <ul>
              <li>Update full name and timezone.</li>
              <li>Change password with current-password verification.</li>
              <li>Review plan usage counters (links, CAPI profiles, domains).</li>
              <li>Manage subscription and plan upgrades.</li>
            </ul>
          </section>

          <section id="admin-panel">
            <h2>Admin Panel (<code>/dashboard/admin</code>)</h2>
            <ul>
              <li>View pending links requiring moderation.</li>
              <li>Approve valid links.</li>
              <li>Reject non-compliant links.</li>
            </ul>
          </section>

          <section id="troubleshooting">
            <h2>Troubleshooting</h2>
            <h3>Cannot move to next step in a wizard</h3>
            <ul>
              <li>Check validation messages under the active input.</li>
              <li>Ensure required fields are not empty.</li>
              <li>Fix duplicate-name issues if shown.</li>
            </ul>
            <h3>Domain verification still pending</h3>
            <ul>
              <li>Confirm every DNS record exactly matches the required values.</li>
              <li>Wait for DNS propagation and verify again.</li>
            </ul>
            <h3>Feature not visible</h3>
            <ul>
              <li>Some pages or options are plan-gated.</li>
              <li>Check subscription state in Account Settings.</li>
            </ul>
          </section>

          <section id="best-practices">
            <h2>Best Practices</h2>
            <ul>
              <li>Use strict naming conventions for links, presets, and campaigns.</li>
              <li>Reuse UTM presets instead of manual query typing.</li>
              <li>Attach CAPI profiles to high-value conversion links.</li>
              <li>Audit analytics regularly for traffic quality issues.</li>
              <li>Use branded custom domains for trust and higher CTR.</li>
              <li>Keep folder hierarchy simple and consistent.</li>
            </ul>
          </section>
        </article>
      </main>
    </div>
  );
};

export default DocsPage;


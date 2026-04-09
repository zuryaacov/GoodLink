import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { UserCircle, Layers, Link2, Globe2, Radar, Megaphone, BookOpen } from 'lucide-react';

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
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-base sm:text-[1.05rem] font-medium text-left transition-all duration-200 leading-snug ${
            activeSection === id
              ? 'bg-slate-50 text-slate-900 shadow-sm'
              : 'text-slate-500 hover:bg-slate-50/50 hover:text-slate-900'
          }`}
        >
          <span className={activeSection === id ? 'text-[#00F59B]' : 'text-slate-300'}>
            <Icon className="w-5 h-5 shrink-0" />
          </span>
          {title}
        </button>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="sticky top-0 z-40 border-b border-slate-200 py-4 px-6 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="max-w-3xl mx-auto flex items-center justify-center">
          <Link
            to="/"
            className="flex items-center gap-3 text-black transition-colors hover:text-[#0b996f] w-fit"
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
            <span className="text-2xl sm:text-3xl font-black leading-tight tracking-tight text-inherit">
              GoodLink
            </span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 grid grid-cols-1 lg:grid-cols-[minmax(280px,320px)_1fr] gap-10 lg:gap-16">
        <aside className="hidden lg:block">
          <div className="sticky top-32">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 px-3">
              Table of Contents
            </p>
            <NavButtons />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="lg:hidden mb-10 p-4 rounded-2xl border border-slate-200 bg-slate-50/80">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 px-1">
              Jump to section
            </p>
            <NavButtons />
          </div>

          <article className="max-w-4xl prose prose-slate prose-base sm:prose-lg lg:prose-xl prose-headings:scroll-mt-32 prose-li:text-slate-700 prose-p:text-slate-600 prose-p:leading-relaxed prose-li:leading-relaxed [&_code]:text-[0.95em]">
            <header className="not-prose mb-10 sm:mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00F59B]/10 text-[#001E22] text-sm font-bold mb-6">
                <BookOpen className="w-4 h-4" />
                PRODUCT DOCUMENTATION
              </div>
              <p className="text-base sm:text-lg font-semibold text-slate-400 uppercase tracking-widest mb-2">
                GoodLink Docs
              </p>
            </header>

            <section id="create-account" className="scroll-mt-32 not-prose mb-16 sm:mb-20">
              <div className="max-w-[800px] mx-auto bg-white rounded-2xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] border border-slate-100 p-6 sm:p-8 md:p-10 text-[#1f2937] leading-relaxed">
                <h1 className="text-center text-[#1f2937] text-3xl sm:text-4xl md:text-[2.5rem] font-bold mb-4">
                  How to Create Your Account
                </h1>
                <p className="text-center text-[#6b7280] text-base sm:text-[1.1rem] mb-10 max-w-2xl mx-auto">
                  Getting started with GoodLink is simple. You can join our community either by using your existing
                  Google account or by creating a traditional email-based account. Follow the steps below to set up
                  your profile.
                </p>

                <div className="border-2 border-[#f3f4f6] rounded-xl p-5 sm:p-6 mb-8 transition-colors duration-200 hover:border-[#a855f7]">
                  <h2 className="flex items-center gap-2.5 text-[#1f2937] text-xl sm:text-2xl font-bold mt-0 mb-4">
                    <span className="text-[1.2rem] leading-none" aria-hidden>
                      ✦
                    </span>
                    Option 1: Sign Up with Email and Password
                  </h2>
                  <p className="text-[#1f2937] mb-6">To create a dedicated GoodLink account, follow these steps:</p>

                  <div className="space-y-5">
                    <div className="relative pl-8">
                      <span
                        className="absolute left-0 top-2.5 w-2 h-2 rounded-full bg-[#a855f7]"
                        aria-hidden
                      />
                      <p className="font-bold text-[#1f2937] text-[1.05rem] mb-1">1. Enter Your Details</p>
                      <p className="text-[#6b7280]">Go to the Sign Up page and fill in the following information:</p>
                      <ul className="text-[#6b7280] pl-5 mt-2 list-disc space-y-1">
                        <li>
                          <span className="font-semibold text-[#1f2937]">Full Name:</span> Your first and last name for
                          your profile.
                        </li>
                        <li>
                          <span className="font-semibold text-[#1f2937]">Email Address:</span> A valid email you have
                          access to.
                        </li>
                        <li>
                          <span className="font-semibold text-[#1f2937]">Password:</span> Create a strong password and
                          enter it twice.
                        </li>
                      </ul>
                    </div>

                    <div className="relative pl-8">
                      <span
                        className="absolute left-0 top-2.5 w-2 h-2 rounded-full bg-[#a855f7]"
                        aria-hidden
                      />
                      <p className="font-bold text-[#1f2937] text-[1.05rem] mb-2">2. Password Requirements</p>
                      <div className="bg-[#d7fec8] rounded-lg p-5 text-[0.95rem] sm:text-base text-[#1f2937]">
                        <p>For your security, your password must meet the following criteria:</p>
                        <ul className="mt-2.5 pl-5 list-disc space-y-1">
                          <li>At least 8 characters long</li>
                          <li>At least one uppercase letter (A-Z)</li>
                          <li>At least one lowercase letter (a-z)</li>
                          <li>At least one number (0-9)</li>
                        </ul>
                      </div>
                    </div>

                    <div className="relative pl-8">
                      <span
                        className="absolute left-0 top-2.5 w-2 h-2 rounded-full bg-[#a855f7]"
                        aria-hidden
                      />
                      <p className="font-bold text-[#1f2937] text-[1.05rem] mb-1">3. Verify Your Email</p>
                      <p className="text-[#6b7280]">
                        Once you click &quot;Create Account,&quot; we will send a confirmation link to your inbox.
                      </p>
                      <p className="italic text-[#6b7280] text-sm sm:text-[0.9rem] mt-2">
                        Open the email from GoodLink and click the <span className="font-bold not-italic">Verify Email Address</span>{' '}
                        button. If you don&apos;t see it, check your Spam folder.
                      </p>
                    </div>

                    <div className="relative pl-8">
                      <span
                        className="absolute left-0 top-2.5 w-2 h-2 rounded-full bg-[#a855f7]"
                        aria-hidden
                      />
                      <p className="font-bold text-[#1f2937] text-[1.05rem] mb-1">4. Welcome Aboard</p>
                      <p className="text-[#6b7280]">
                        After verification, you&apos;ll be redirected to your dashboard to build your first link!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-2 border-[#f3f4f6] rounded-xl p-5 sm:p-6 mb-8 transition-colors duration-200 hover:border-[#a855f7]">
                  <h2 className="flex items-center gap-2.5 text-[#1f2937] text-xl sm:text-2xl font-bold mt-0 mb-4">
                    <span className="text-[1.2rem] leading-none" aria-hidden>
                      ✦
                    </span>
                    Option 2: Sign Up with Google
                  </h2>
                  <p className="text-[#1f2937] mb-6">
                    If you prefer a faster way to join without managing another password, you can use Single Sign-On
                    (SSO):
                  </p>
                  <div className="space-y-5">
                    <div className="relative pl-8">
                      <span
                        className="absolute left-0 top-2.5 w-2 h-2 rounded-full bg-[#a855f7]"
                        aria-hidden
                      />
                      <p className="font-bold text-[#1f2937] text-[1.05rem] mb-1">1. Connect Account</p>
                      <p className="text-[#6b7280]">
                        On the Sign Up page, click the &quot;Google&quot; button and choose the account you wish to
                        link.
                      </p>
                    </div>
                    <div className="relative pl-8">
                      <span
                        className="absolute left-0 top-2.5 w-2 h-2 rounded-full bg-[#a855f7]"
                        aria-hidden
                      />
                      <p className="font-bold text-[#1f2937] text-[1.05rem] mb-1">2. Instant Access</p>
                      <p className="text-[#6b7280]">
                        Since your identity is verified by Google, you won&apos;t need to wait for a verification email.
                        You will be logged in immediately.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-6 sm:pt-8 mt-10 border-t border-[#eee]">
                  <h3 className="text-lg sm:text-xl font-bold text-[#1f2937] mb-3">Need Help?</h3>
                  <p className="text-[#6b7280] text-base sm:text-[1.05rem]">
                    If you encounter any issues during registration, please contact our support team at{' '}
                    <a
                      href="mailto:hello@goodlink.ai"
                      className="text-[#a855f7] font-bold no-underline hover:underline"
                    >
                      hello@goodlink.ai
                    </a>
                  </p>
                </div>
              </div>
            </section>

            <section id="workspaces" className="scroll-mt-32 not-prose mb-16 sm:mb-20">
              <div className="max-w-[800px] mx-auto bg-white rounded-2xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] border border-slate-100 p-6 sm:p-8 md:p-10 text-[#1f2937] leading-relaxed">
                <h1 className="text-center text-[#1f2937] text-3xl sm:text-4xl md:text-[2.2rem] font-bold mb-5">
                  Organizing Your Content: Workspaces, Campaigns, and Groups
                </h1>

                <p className="text-center text-[#6b7280] text-base sm:text-[1.1rem] mb-10 max-w-2xl mx-auto">
                  To help you keep your links organized and your data clear, GoodLink offers a powerful hierarchical
                  structure. Whether you are an individual creator, a marketing agency, or a business owner, these
                  tools allow you to categorize your links perfectly.
                </p>

                <h2 className="text-[#1f2937] text-2xl sm:text-[1.6rem] font-bold border-b-2 border-[#d7fec8] pb-2 mb-6">
                  The Hierarchy Explained
                </h2>
                <div className="border border-[#e5e7eb] rounded-xl p-5 sm:p-6 mb-8 bg-white">
                  <div className="space-y-5">
                    <div className="pl-5 border-l-4 border-[#a855f7]">
                      <p className="text-[#a855f7] text-[1.1rem] font-bold mb-1">1. Workspaces</p>
                      <p className="text-[#1f2937]">
                        This is your top-level container. Use this for broad topics, different brands, or if you are an
                        agency, use a separate Workspace for each client.
                      </p>
                    </div>
                    <div className="pl-5 border-l-4 border-[#a855f7]">
                      <p className="text-[#a855f7] text-[1.1rem] font-bold mb-1">2. Campaigns</p>
                      <p className="text-[#1f2937]">
                        Located inside a Workspace. Group your links by specific marketing goals, seasons, or product
                        launches (for example, &quot;Summer Sale 2026&quot;).
                      </p>
                    </div>
                    <div className="pl-5 border-l-4 border-[#a855f7]">
                      <p className="text-[#a855f7] text-[1.1rem] font-bold mb-1">3. Groups</p>
                      <p className="text-[#1f2937]">
                        Located inside a Campaign. If you need to split your campaign into smaller segments, such as
                        different social media platforms or ad sets, use Groups to keep them separated.
                      </p>
                    </div>
                  </div>
                </div>

                <h2 className="text-[#1f2937] text-2xl sm:text-[1.6rem] font-bold border-b-2 border-[#d7fec8] pb-2 mb-4">
                  How to Create and Manage
                </h2>
                <p className="text-[#1f2937] mb-5">Setting up your structure is intuitive and takes only a few seconds:</p>

                <div className="bg-[#f9fafb] rounded-xl p-5 sm:p-6 mb-8">
                  <div className="space-y-4">
                    {[
                      {
                        title: 'Navigate to Link Manager',
                        text: 'From your dashboard, click on the "Link Manager" tab.',
                      },
                      {
                        title: 'Create New',
                        text: 'Click the "Create" button. Based on your current view, you will see options to create a New Workspace, New Campaign, or New Group.',
                      },
                      {
                        title: 'Name Your Item',
                        text: 'Once selected, a modal window will appear. Simply enter the desired name and click Create.',
                      },
                      {
                        title: 'Add Links',
                        text: 'You can now start adding links directly into your new container.',
                      },
                    ].map((step, i) => (
                      <div key={step.title} className="flex items-start">
                        <div className="bg-[#a855f7] text-white min-w-6 h-6 rounded-full flex items-center justify-center mr-3.5 text-xs font-bold">
                          {i + 1}
                        </div>
                        <div className="text-[#1f2937]">
                          <span className="font-bold">{step.title}:</span> {step.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <h2 className="text-[#1f2937] text-2xl sm:text-[1.6rem] font-bold border-b-2 border-[#d7fec8] pb-2 mb-4">
                  Tracking Performance at a Glance
                </h2>
                <p className="text-[#1f2937] mb-5">
                  Each Workspace, Campaign, and Group is displayed as a dedicated card on your screen. These cards
                  provide instant insights without needing to click into each one.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-7">
                  <div className="bg-[#d7fec8] rounded-lg p-4 text-center text-[0.95rem] text-[#1f2937]">
                    <span className="block font-bold">Name</span>
                    Easily identify the category.
                  </div>
                  <div className="bg-[#d7fec8] rounded-lg p-4 text-center text-[0.95rem] text-[#1f2937]">
                    <span className="block font-bold">Link Count</span>
                    See exactly how many links are stored inside.
                  </div>
                  <div className="bg-[#d7fec8] rounded-lg p-4 text-center text-[0.95rem] text-[#1f2937]">
                    <span className="block font-bold">Total Clicks</span>
                    View the aggregated number of clicks for all links within that specific container.
                  </div>
                </div>

                <p className="mt-7 text-center italic text-[#6b7280]">
                  This organization ensures that you spend less time searching for links and more time analyzing your
                  success!
                </p>
              </div>
            </section>

            <section id="links" className="scroll-mt-32 not-prose mb-16 sm:mb-20">
              <div className="max-w-[900px] mx-auto bg-white rounded-2xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] border border-slate-100 p-6 sm:p-8 md:p-10 text-[#1f2937] leading-relaxed">
                <h1 className="text-center text-[#1f2937] text-3xl sm:text-4xl md:text-[2.2rem] font-bold mb-10">
                  Creating and Managing Links
                </h1>
                <p className="text-center text-[#6b7280] text-base sm:text-[1.05rem] mb-10 max-w-2xl mx-auto">
                  Learn how to create links based on your subscription plan and maximize your marketing impact.
                </p>

                <section className="mb-10">
                  <span className="inline-block px-3 py-1 rounded-full text-[0.85rem] font-bold uppercase tracking-wide bg-[#e2e8f0] text-[#475569] mb-4">
                    Starter Plan
                  </span>
                  <h2 className="text-[#1f2937] text-2xl sm:text-[1.6rem] font-bold border-b-2 border-[#d7fec8] pb-2 mb-5">
                    Basic Link Creation
                  </h2>
                  <div className="border border-[#e5e7eb] rounded-xl p-6 sm:p-8 bg-white">
                    <p className="mb-5">
                      On the <strong>Starter</strong> plan, you can quickly create essential tracking links directly from
                      your dashboard.
                    </p>
                    <ul className="list-none p-0 m-0 space-y-3">
                      {[
                        <>
                          <strong>Navigation:</strong> Go to &quot;Link Manager&quot; and click the <strong>New Link</strong>{' '}
                          button.
                        </>,
                        <>
                          <strong>Link Name:</strong> Give your link a recognizable name for internal tracking.
                        </>,
                        <>
                          <strong>Target URL:</strong> The destination where the user should land.
                        </>,
                        <>
                          <strong>Custom Slug:</strong> The unique name after the domain (for example, if you enter
                          &quot;iphone&quot;, your link will be <em>glynk.to/iphone</em>).
                        </>,
                      ].map((content, i) => (
                        <li
                          key={i}
                          className="relative pl-8 text-[#1f2937] before:content-['→'] before:absolute before:left-0 before:text-[#a855f7] before:font-bold"
                        >
                          {content}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-5 text-sm italic text-[#6b7280]">
                      Note: Workspaces, Campaigns and Groups are not available on the Starter plan.
                    </p>
                  </div>
                </section>

                <section className="mb-10">
                  <span className="inline-block px-3 py-1 rounded-full text-[0.85rem] font-bold uppercase tracking-wide bg-[#fef9c3] text-[#854d0e] mb-4">
                    Advanced Plan
                  </span>
                  <h2 className="text-[#1f2937] text-2xl sm:text-[1.6rem] font-bold border-b-2 border-[#d7fec8] pb-2 mb-5">
                    Advanced Customization &amp; Security
                  </h2>
                  <div className="border border-[#e5e7eb] rounded-xl p-6 sm:p-8 bg-white">
                    <ul className="list-none p-0 m-0 space-y-3">
                      <li className="relative pl-8 text-[#1f2937] before:content-['→'] before:absolute before:left-0 before:text-[#a855f7] before:font-bold">
                        <strong>Navigation:</strong> Go to &quot;Link Manager&quot;, click <strong>Create</strong>, and select{' '}
                        <strong>New Link</strong>.
                      </li>
                      <li className="relative pl-8 text-[#1f2937] before:content-['→'] before:absolute before:left-0 before:text-[#a855f7] before:font-bold">
                        <strong>Custom Domains:</strong> Choose between the default <em>glynk.to</em> or your own connected
                        Custom Domain.
                      </li>
                      <li className="relative pl-8 text-[#1f2937] before:content-['→'] before:absolute before:left-0 before:text-[#a855f7] before:font-bold">
                        <strong>Bot Protection:</strong> Protect your data integrity. If a click is identified as a bot,
                        you can choose to:
                        <ul className="mt-2 ml-4 list-disc text-[#6b7280] space-y-1">
                          <li>Allow it to the Target URL</li>
                          <li>Block the click entirely</li>
                          <li>Redirect to a different URL</li>
                        </ul>
                      </li>
                    </ul>
                  </div>
                </section>

                <section className="mb-10">
                  <span className="inline-block px-3 py-1 rounded-full text-[0.85rem] font-bold uppercase tracking-wide bg-[#d7fec8] text-[#166534] mb-4">
                    Pro Plan
                  </span>
                  <h2 className="text-[#1f2937] text-2xl sm:text-[1.6rem] font-bold border-b-2 border-[#d7fec8] pb-2 mb-5">
                    Professional Targeting &amp; Automation
                  </h2>
                  <div className="border border-[#e5e7eb] rounded-xl p-6 sm:p-8 bg-white">
                    <p className="mb-5">
                      The <strong>Pro</strong> plan includes everything in Advanced, plus high-end marketing tools:
                    </p>
                    <ul className="list-none p-0 m-0 space-y-3">
                      <li className="relative pl-8 text-[#1f2937] before:content-['→'] before:absolute before:left-0 before:text-[#a855f7] before:font-bold">
                        <strong>Geo-Targeting:</strong> Route users by country. For example, redirect French visitors to a
                        French version of your site. You can add multiple routing rules.
                      </li>
                      <li className="relative pl-8 text-[#1f2937] before:content-['→'] before:absolute before:left-0 before:text-[#a855f7] before:font-bold">
                        <strong>CAPI Select (Server-Side Tracking):</strong> When using a <strong>Custom Domain</strong>,
                        you can automatically send conversion data (CAPI) directly to Facebook, Instagram, or TikTok
                        servers.
                      </li>
                    </ul>
                  </div>
                </section>

                <section className="mb-8">
                  <h2 className="text-[#1f2937] text-2xl sm:text-[1.6rem] font-bold border-b-2 border-[#d7fec8] pb-2 mb-5">
                    Link Management &amp; QR Codes
                  </h2>
                  <div className="border border-[#e5e7eb] rounded-xl p-6 sm:p-8 bg-white">
                    <p className="mb-5">
                      Every link created on GoodLink—regardless of your plan—comes with a{' '}
                      <strong>built-in QR Code</strong> for offline marketing.
                    </p>
                    <div className="border border-dashed border-[#a855f7] rounded-lg p-5 mt-5 bg-[#fafafa]">
                      <p className="font-bold text-[#a855f7] mb-2">What&apos;s inside your Link Card?</p>
                      <ul className="mt-2.5 pl-5 list-disc text-[#1f2937] space-y-1">
                        <li>
                          <strong>Link Status:</strong> See if your link is Active, Paused, or Rejected.
                        </li>
                        <li>
                          <strong>Quick Actions:</strong> Use the &quot;Quick Copy&quot; button for your short link or download
                          the QR code.
                        </li>
                        <li>
                          <strong>Analytics:</strong> View the real-time click count directly on the card.
                        </li>
                        <li>
                          <strong>Details:</strong> View the Link Name and Redirect Address at a glance.
                        </li>
                      </ul>
                    </div>
                  </div>
                </section>

                <div className="bg-[#d7fec8] rounded-xl py-5 px-4 text-center font-semibold text-[#1f2937] mt-8">
                  ✨ Every link automatically generates a unique QR Code!
                </div>
              </div>
            </section>

            <section id="custom-domains" className="scroll-mt-32 not-prose mb-16 sm:mb-20">
              <div className="max-w-[900px] mx-auto bg-white rounded-2xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] border border-slate-100 p-6 sm:p-8 md:p-10 text-[#1f2937] leading-relaxed">
                <div className="text-center mb-2">
                  <span className="inline-block bg-[#d7fec8] text-[#166534] px-3 py-1 rounded-full text-[0.85rem] font-bold uppercase tracking-wide">
                    Advanced &amp; Pro Feature
                  </span>
                </div>
                <h1 className="text-center text-[#1f2937] text-3xl sm:text-4xl md:text-[2.2rem] font-bold mb-2.5">
                  Custom Domain Setup
                </h1>
                <p className="text-center text-[#6b7280] text-base sm:text-[1.05rem] mb-8 max-w-3xl mx-auto">
                  Branding your links with your own domain improves trust, click-through rates, and enables CAPI
                  features.
                </p>

                <h2 className="text-[#1f2937] text-2xl sm:text-[1.6rem] font-bold border-b-2 border-[#d7fec8] pb-2 mb-5">
                  Phase 1: Getting Started
                </h2>
                <div className="border border-[#e5e7eb] rounded-xl p-6 sm:p-8 bg-white mb-6">
                  <div className="bg-[#f9fafb] p-4 rounded-lg border-l-4 border-[#a855f7] mb-6 font-semibold">
                    In the <strong>Custom Domains</strong> tab, click the <strong>New Domain</strong> button to begin.
                  </div>

                  <div className="flex items-center font-bold mb-2 text-[#1f2937]">
                    <span className="bg-[#a855f7] text-white w-7 h-7 rounded-full inline-flex items-center justify-center mr-3 text-sm">
                      1
                    </span>
                    Enter Your Domain
                  </div>
                  <p>Enter your custom domain name (e.g., <code>mybrand.com</code>) in the provided field.</p>

                  <div className="flex items-center font-bold mb-2 mt-6 text-[#1f2937]">
                    <span className="bg-[#a855f7] text-white w-7 h-7 rounded-full inline-flex items-center justify-center mr-3 text-sm">
                      2
                    </span>
                    Root Redirect (Optional)
                  </div>
                  <p>
                    Decide where to send visitors who open the domain without a specific slug or with an undefined slug
                    (for example, when someone visits just <code>mybrand.com</code>).
                  </p>
                </div>

                <h2 className="text-[#1f2937] text-2xl sm:text-[1.6rem] font-bold border-b-2 border-[#d7fec8] pb-2 mb-5">
                  Phase 2: DNS Configuration
                </h2>
                <div className="border border-[#e5e7eb] rounded-xl p-6 sm:p-8 bg-white mb-6">
                  <div className="flex items-center font-bold mb-2 text-[#1f2937]">
                    <span className="bg-[#a855f7] text-white w-7 h-7 rounded-full inline-flex items-center justify-center mr-3 text-sm">
                      3
                    </span>
                    Add Records to Your Registrar
                  </div>
                  <p>
                    To connect your domain, you must add the required DNS records at your domain registrar. The system
                    will provide you with both <strong>TXT</strong> and <strong>CNAME</strong> records.
                  </p>
                  <p>
                    <strong>Important:</strong> You must set up records for both the root domain (without www) and the{' '}
                    <code>www</code> version to ensure all traffic is correctly captured.
                  </p>

                  <div className="bg-[#f0f9ff] border-l-4 border-[#0ea5e9] p-5 rounded-lg mt-5">
                    <h3 className="m-0 text-[1.1rem] font-bold">Practical Example: Namecheap</h3>
                    <ol className="mt-3 ml-5 list-decimal space-y-1">
                      <li>Login to your <strong>Namecheap</strong> account.</li>
                      <li>
                        Go to <strong>Domain List</strong> and click <strong>Manage</strong> next to your domain.
                      </li>
                      <li>
                        Click the <strong>Advanced DNS</strong> tab.
                      </li>
                      <li>
                        Click <strong>Add New Record</strong> for each record provided by GoodLink:
                        <ul className="mt-2 ml-4 list-disc">
                          <li>
                            <strong>Type:</strong> Select CNAME or TXT.
                          </li>
                          <li>
                            <strong>Host:</strong> Use <code>@</code> for root and <code>www</code> for the subdomain.
                          </li>
                          <li>
                            <strong>Value:</strong> Paste the values from your GoodLink dashboard.
                          </li>
                        </ul>
                      </li>
                      <li>Save all changes.</li>
                    </ol>
                  </div>
                </div>

                <h2 className="text-[#1f2937] text-2xl sm:text-[1.6rem] font-bold border-b-2 border-[#d7fec8] pb-2 mb-5">
                  Phase 3: Verify &amp; Activate
                </h2>
                <div className="border border-[#e5e7eb] rounded-xl p-6 sm:p-8 bg-white mb-6">
                  <div className="flex items-center font-bold mb-2 text-[#1f2937]">
                    <span className="bg-[#a855f7] text-white w-7 h-7 rounded-full inline-flex items-center justify-center mr-3 text-sm">
                      4
                    </span>
                    Verify Configuration
                  </div>
                  <p>
                    Click the <strong>Verify DNS Records</strong> button to confirm your setup. Note that DNS
                    propagation may take a few minutes to several hours.
                  </p>
                  <p>If you prefer to wait, you can click <strong>Done</strong> to exit. You can always verify later:</p>
                  <ol className="ml-5 list-decimal space-y-1">
                    <li>
                      Go to the <strong>Custom Domains</strong> dashboard.
                    </li>
                    <li>
                      Click the <strong>Three Dots (⋮)</strong> on your domain card.
                    </li>
                    <li>
                      Select <strong>Details</strong> to view DNS settings and the <strong>Verify</strong> button.
                    </li>
                  </ol>
                </div>

                <h2 className="text-[#1f2937] text-2xl sm:text-[1.6rem] font-bold border-b-2 border-[#d7fec8] pb-2 mb-5">
                  Domain Status
                </h2>
                <div className="border border-[#e5e7eb] rounded-xl p-6 sm:p-8 bg-white">
                  <p>The status on your domain card indicates your progress:</p>
                  <ul className="list-disc ml-5 space-y-2">
                    <li>
                      <span className="px-2.5 py-0.5 rounded-xl text-xs font-bold uppercase bg-[#dcfce7] text-[#166534]">
                        Active
                      </span>{' '}
                      - Domain is verified and ready for use.
                    </li>
                    <li>
                      <span className="px-2.5 py-0.5 rounded-xl text-xs font-bold uppercase bg-[#fef3c7] text-[#92400e]">
                        Pending
                      </span>{' '}
                      - DNS records are not yet detected or propagation is in progress.
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="capi" className="scroll-mt-32 not-prose mb-16 sm:mb-20">
              <div className="max-w-[900px] mx-auto bg-white rounded-2xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] border border-slate-100 p-6 sm:p-8 md:p-10 text-[#1f2937] leading-relaxed">
                <div className="text-center mb-2">
                  <span className="inline-block bg-[#d7fec8] text-[#166534] px-3 py-1 rounded-full text-[0.85rem] font-bold uppercase tracking-wide">
                    Pro Plan Only
                  </span>
                </div>
                <h1 className="text-center text-[#1f2937] text-3xl sm:text-4xl md:text-[2.2rem] font-bold mb-2.5">
                  CAPI (Conversions API) Setup Guide
                </h1>
                <p className="text-center text-[#6b7280] text-base sm:text-[1.05rem] mb-8 max-w-3xl mx-auto">
                  Direct server-to-server tracking to improve attribution and bypass tracking limitations.
                </p>

                <div className="bg-[#fef2f2] border-2 border-[#dc2626] rounded-xl p-6 mb-8 text-[#991b1b]">
                  <h4 className="m-0 mb-2.5 flex items-center text-xl font-extrabold">⚠️ CRITICAL REQUIREMENT</h4>
                  <p className="text-[1.1rem] font-bold mb-2">Accuracy is mandatory.</p>
                  <p className="m-0">
                    You must ensure that the <strong>Pixel ID/Dataset ID</strong> and <strong>Access Token</strong>{' '}
                    are entered with 100% precision. Incorrect information will cause CAPI transmissions to fail,
                    resulting in a <strong>permanent loss of data</strong>. All configuration is the sole responsibility
                    of the user. GoodLink is not liable for data loss due to incorrect setup.
                  </p>
                </div>

                <h2 className="text-[#1f2937] text-2xl sm:text-[1.6rem] font-bold border-b-2 border-[#d7fec8] pb-2 mb-5">
                  1. Creating a CAPI Profile
                </h2>
                <div className="border border-[#e5e7eb] rounded-xl p-6 sm:p-8 bg-white mb-6">
                  <p>
                    To begin, navigate to the <strong>CAPI Manager</strong> tab in your dashboard and click the{' '}
                    <strong>New CAPI</strong> button.
                  </p>
                  <div className="mt-5 space-y-3">
                    {[
                      'Name your CAPI: Provide a friendly name for internal identification (e.g., "Main Facebook Dataset").',
                      'Select Company: Choose the platform for this profile. Currently supported: Facebook, Instagram, and TikTok.',
                      'Report ID: Enter your Dataset ID (for Meta) or Pixel ID (for TikTok).',
                      'Report Token: Enter your CAPI Token (for Meta) or TikTok Events API Token.',
                      'Event Type: Select the conversion event you wish to send (e.g., PageView, Purchase, Lead).',
                    ].map((text, i) => (
                      <p key={text} className="m-0">
                        <strong>
                          <span className="inline-flex items-center justify-center bg-[#a855f7] text-white w-7 h-7 rounded-full mr-2.5 text-sm">
                            {i + 1}
                          </span>
                          {text.split(':')[0]}:
                        </strong>{' '}
                        {text.split(':').slice(1).join(':').trim()}
                      </p>
                    ))}
                  </div>

                  <div className="bg-[#f0fdf4] border-l-4 border-[#22c55e] rounded-md p-4 mt-5 text-[0.95rem]">
                    <strong>Pro Tip:</strong> Once defined, you can attach these CAPI profiles to any link using a
                    Custom Domain during the Add or Edit link process.
                  </div>
                </div>

                <h2 className="text-[#1f2937] text-2xl sm:text-[1.6rem] font-bold border-b-2 border-[#d7fec8] pb-2 mb-5">
                  2. Finding Your IDs &amp; Tokens
                </h2>
                <div className="border border-[#e5e7eb] rounded-xl p-6 sm:p-8 bg-white mb-6">
                  <h3 className="text-xl mt-0 text-[#1f2937] border-l-4 border-[#a855f7] pl-2.5">Facebook &amp; Instagram (Meta)</h3>
                  <div className="bg-[#f9fafb] p-5 rounded-lg my-4">
                    <p>
                      <strong className="text-[#a855f7]">How to find the Dataset ID:</strong> Go to <em>Meta Events Manager</em>{' '}
                      → <em>Data Sources</em>. Select your Dataset/Pixel. The ID is displayed below the name or in the
                      &quot;Settings&quot; tab.
                    </p>
                    <p>
                      <strong className="text-[#a855f7]">How to find the CAPI Token:</strong>
                    </p>
                    <ol className="mt-2 ml-5 list-decimal">
                      <li>In <em>Events Manager</em>, navigate to the <strong>Settings</strong> tab of your Dataset.</li>
                      <li>Scroll to the <strong>Conversions API</strong> section.</li>
                      <li>Click <strong>&quot;Generate access token&quot;</strong> and copy the string.</li>
                    </ol>
                  </div>

                  <h3 className="text-xl mt-6 text-[#1f2937] border-l-4 border-[#a855f7] pl-2.5">TikTok</h3>
                  <div className="bg-[#f9fafb] p-5 rounded-lg my-4">
                    <p>
                      <strong className="text-[#a855f7]">How to find the Pixel ID:</strong> Go to <em>TikTok Ads Manager</em>{' '}
                      → <em>Assets</em> → <em>Events</em> → <em>Web Events</em>. Click &quot;Manage&quot; on your pixel.
                      The ID is shown at the top of the interface.
                    </p>
                    <p>
                      <strong className="text-[#a855f7]">How to find the Events API Token:</strong>
                    </p>
                    <ol className="mt-2 ml-5 list-decimal">
                      <li>Inside your specific Pixel management page, go to the <strong>Settings</strong> tab.</li>
                      <li>Scroll down to the <strong>Events API</strong> section.</li>
                      <li>Click <strong>&quot;Generate Access Token&quot;</strong> and copy it.</li>
                    </ol>
                  </div>
                </div>

                <h2 className="text-[#1f2937] text-2xl sm:text-[1.6rem] font-bold border-b-2 border-[#d7fec8] pb-2 mb-5">
                  3. CAPI Profile Management
                </h2>
                <div className="border border-[#e5e7eb] rounded-xl p-6 sm:p-8 bg-white">
                  <p>
                    Your <strong>CAPI Manager</strong> screen displays all your profiles as individual cards. Each card
                    contains:
                  </p>
                  <ul className="text-[#6b7280] mt-3 list-disc ml-5 space-y-1">
                    <li>
                      <strong className="text-[#1f2937]">Profile Name:</strong> Your custom label.
                    </li>
                    <li>
                      <strong className="text-[#1f2937]">Platform:</strong> The connected service (Facebook, Instagram, or
                      TikTok).
                    </li>
                    <li>
                      <strong className="text-[#1f2937]">Pixel/Dataset ID:</strong> The active tracking ID.
                    </li>
                    <li>
                      <strong className="text-[#1f2937]">Event:</strong> The specific reported conversion event.
                    </li>
                    <li>
                      <strong className="text-[#1f2937]">Status:</strong> You can toggle between{' '}
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-[#dcfce7] text-[#166534]">
                        Active
                      </span>{' '}
                      and{' '}
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-[#fee2e2] text-[#991b1b]">
                        Paused
                      </span>
                      . When paused, no data will be sent for this profile.
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="utm-presets" className="scroll-mt-32 not-prose mb-16 sm:mb-20">
              <div className="max-w-[900px] mx-auto bg-white rounded-2xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] border border-slate-100 p-6 sm:p-8 md:p-10 text-[#1f2937] leading-relaxed">
                <div className="text-center mb-2">
                  <span className="inline-block bg-[#d7fec8] text-[#166534] px-3 py-1 rounded-full text-[0.85rem] font-bold uppercase tracking-wide">
                    Advanced &amp; Pro Feature
                  </span>
                </div>
                <h1 className="text-center text-[#1f2937] text-3xl sm:text-4xl md:text-[2.2rem] font-bold mb-2.5">
                  UTM Presets Manager
                </h1>

                <div className="bg-[#d7fec8] border-l-[5px] border-[#a855f7] rounded-xl p-6 mb-8 text-[#166534]">
                  <h3 className="mt-0 mb-2 text-[#1f2937] text-xl font-bold">Efficiency &amp; Accuracy</h3>
                  <p className="mb-0 text-[1.05rem]">
                    GoodLink provides <strong>UTM Presets</strong> as a specialized service to help you maintain
                    consistency across all campaigns. Define your tracking parameters once, then easily copy the preset
                    and apply it to your desired advertising platform. This ensures your tracking is set up{' '}
                    <strong>quickly, easily, and without manual errors.</strong>
                  </p>
                </div>

                <h2 className="text-[#1f2937] text-2xl sm:text-[1.6rem] font-bold border-b-2 border-[#d7fec8] pb-2 mb-5">
                  1. Creating a New UTM Preset
                </h2>
                <div className="border border-[#e5e7eb] rounded-xl p-6 sm:p-8 bg-white mb-6">
                  <p>
                    Navigate to the <strong>UTM Preset</strong> tab in your dashboard and click the{' '}
                    <strong>New UTM Preset</strong> button.
                  </p>

                  <div className="mt-6 space-y-6">
                    <div>
                      <div className="flex items-center font-bold mb-2">
                        <span className="bg-[#a855f7] text-white w-7 h-7 rounded-full inline-flex items-center justify-center mr-3 text-sm">
                          1
                        </span>
                        Name Your Preset
                      </div>
                      <p>
                        Give your preset a clear, descriptive name (e.g., &quot;Meta Retargeting Campaign&quot;) to
                        identify it later in your list.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center font-bold mb-2">
                        <span className="bg-[#a855f7] text-white w-7 h-7 rounded-full inline-flex items-center justify-center mr-3 text-sm">
                          2
                        </span>
                        Select Company
                      </div>
                      <p>Choose the advertising platform this preset will be used for:</p>
                      <div className="mb-3 flex flex-wrap gap-2">
                        <span className="inline-block bg-[#f3f4f6] border border-[#a855f7] px-2.5 py-1 rounded-md text-[0.85rem] font-semibold">
                          Meta (FB/IG)
                        </span>
                        <span className="inline-block bg-[#f3f4f6] border border-[#e5e7eb] px-2.5 py-1 rounded-md text-[0.85rem] font-semibold">
                          Google Ads
                        </span>
                        <span className="inline-block bg-[#f3f4f6] border border-[#e5e7eb] px-2.5 py-1 rounded-md text-[0.85rem] font-semibold">
                          TikTok
                        </span>
                        <span className="inline-block bg-[#f3f4f6] border border-[#e5e7eb] px-2.5 py-1 rounded-md text-[0.85rem] font-semibold">
                          Taboola
                        </span>
                        <span className="inline-block bg-[#f3f4f6] border border-[#e5e7eb] px-2.5 py-1 rounded-md text-[0.85rem] font-semibold">
                          Outbrain
                        </span>
                        <span className="inline-block bg-[#f3f4f6] border border-[#e5e7eb] px-2.5 py-1 rounded-md text-[0.85rem] font-semibold">
                          Snapchat
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center font-bold mb-2">
                        <span className="bg-[#a855f7] text-white w-7 h-7 rounded-full inline-flex items-center justify-center mr-3 text-sm">
                          3
                        </span>
                        Configure Tracking Parameters
                      </div>
                      <p>
                        Define the values for each UTM tag (Source, Medium, Campaign, Content, Term). For each field,
                        you can choose the <strong>Preset Type</strong>.
                      </p>
                      <p>
                        <em>
                          Example: Set <strong>utm_source=facebook_ads</strong> or{' '}
                          <strong>utm_source=instagram_ads</strong> based on your Meta placement strategy.
                        </em>
                      </p>
                    </div>
                  </div>
                </div>

                <h2 className="text-[#1f2937] text-2xl sm:text-[1.6rem] font-bold border-b-2 border-[#d7fec8] pb-2 mb-5">
                  2. Managing Your Presets
                </h2>
                <div className="border border-[#e5e7eb] rounded-xl p-6 sm:p-8 bg-white">
                  <p>Every saved preset is displayed as a dedicated card in your Manager, showing:</p>
                  <ul className="list-none p-0 space-y-3">
                    <li className="relative pl-6 before:content-['✔'] before:absolute before:left-0 before:text-[#a855f7] before:font-bold">
                      <strong>Preset Name &amp; Platform</strong> (e.g., Meta, Google Ads).
                    </li>
                    <li className="relative pl-6 before:content-['✔'] before:absolute before:left-0 before:text-[#a855f7] before:font-bold">
                      <strong>Individual Parameter Mapping:</strong> See exactly what each tag represents.
                    </li>
                    <li className="relative pl-6 before:content-['✔'] before:absolute before:left-0 before:text-[#a855f7] before:font-bold">
                      <strong>The Complete String:</strong> A full preview of the final URL suffix.
                    </li>
                  </ul>

                  <div className="bg-[#1f2937] text-[#d7fec8] p-4 rounded-lg font-mono text-[0.9rem] break-all mt-4 leading-relaxed">
                    utm_source=meta_ads&amp;utm_medium=social&amp;utm_campaign={"{campaign.id}"}&amp;utm_content={"{"}
                    {"ad.id}"}&amp;utm_term={"{adset.name}"}
                  </div>
                  <span className="block mt-3 text-right text-[0.85rem] font-bold text-[#a855f7]">
                    ✨ Click the <strong>&quot;Copy UTM preset&quot;</strong> button on the card to copy the entire
                    string instantly!
                  </span>
                </div>
              </div>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
};

export default DocsPage;

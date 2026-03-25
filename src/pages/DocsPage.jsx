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
            <span className="text-2xl sm:text-3xl font-black leading-tight tracking-tight text-[#a855f7]">
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
                <h1 className="text-center text-[#a855f7] text-3xl sm:text-4xl md:text-[2.5rem] font-bold mb-4">
                  How to Create Your Account
                </h1>
                <p className="text-center text-[#6b7280] text-base sm:text-[1.1rem] mb-10 max-w-2xl mx-auto">
                  Getting started with GoodLink is simple. You can join our community either by using your existing
                  Google account or by creating a traditional email-based account. Follow the steps below to set up
                  your profile.
                </p>

                <div className="border-2 border-[#f3f4f6] rounded-xl p-5 sm:p-6 mb-8 transition-colors duration-200 hover:border-[#a855f7]">
                  <h2 className="flex items-center gap-2.5 text-[#a855f7] text-xl sm:text-2xl font-bold mt-0 mb-4">
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
                  <h2 className="flex items-center gap-2.5 text-[#a855f7] text-xl sm:text-2xl font-bold mt-0 mb-4">
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
                <h1 className="text-center text-[#a855f7] text-3xl sm:text-4xl md:text-[2.2rem] font-bold mb-5">
                  Organizing Your Content: Workspaces, Campaigns, and Groups
                </h1>

                <p className="text-center text-[#6b7280] text-base sm:text-[1.1rem] mb-10 max-w-2xl mx-auto">
                  To help you keep your links organized and your data clear, GoodLink offers a powerful hierarchical
                  structure. Whether you are an individual creator, a marketing agency, or a business owner, these
                  tools allow you to categorize your links perfectly.
                </p>

                <h2 className="text-[#a855f7] text-2xl sm:text-[1.6rem] font-bold border-b-2 border-[#d7fec8] pb-2 mb-6">
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

                <h2 className="text-[#a855f7] text-2xl sm:text-[1.6rem] font-bold border-b-2 border-[#d7fec8] pb-2 mb-4">
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

                <h2 className="text-[#a855f7] text-2xl sm:text-[1.6rem] font-bold border-b-2 border-[#d7fec8] pb-2 mb-4">
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

            {DOC_SECTIONS.slice(2).map(({ id, title }) => (
              <section
                key={id}
                id={id}
                className="not-prose scroll-mt-32 min-h-16"
                aria-label={title}
              />
            ))}
          </article>
        </div>
      </main>
    </div>
  );
};

export default DocsPage;

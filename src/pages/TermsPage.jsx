import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  ChevronRight,
  ExternalLink,
  Lock,
  Server,
  UserCheck,
  AlertCircle,
  Scale,
  CreditCard,
  Power,
  Info,
  CheckCircle2,
} from 'lucide-react';

const TermsPage = () => {
  const [activeSection, setActiveSection] = useState('intro');

  const sections = [
    { id: 'intro', title: 'Introduction', icon: <Info className="w-4 h-4" /> },
    { id: 'section-1', title: '1. GoodLink Services', icon: <Server className="w-4 h-4" /> },
    { id: 'section-2', title: '2. Data Ownership', icon: <Lock className="w-4 h-4" /> },
    { id: 'section-3', title: '3. Invoices', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'section-4', title: '4. Service Termination', icon: <Power className="w-4 h-4" /> },
    { id: 'section-5', title: '5. Changes to Terms', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'section-6', title: '6. Warranties', icon: <Shield className="w-4 h-4" /> },
    { id: 'section-7', title: '7. Disclaimer', icon: <AlertCircle className="w-4 h-4" /> },
    { id: 'section-8', title: '8. Confidentiality', icon: <Lock className="w-4 h-4" /> },
    { id: 'section-9', title: '9. Indemnification', icon: <Scale className="w-4 h-4" /> },
    { id: 'section-10', title: '10. Liability', icon: <AlertCircle className="w-4 h-4" /> },
    { id: 'section-12', title: '12. General', icon: <ExternalLink className="w-4 h-4" /> },
  ];

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
        {/* Sticky Sidebar */}
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

        {/* Content */}
        <article className="max-w-3xl">
          <header className="mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F59B]/10 text-[#001E22] text-xs font-bold mb-6">
              <Shield className="w-3 h-3" />
              LEGAL DOCUMENT
            </div>
            <h1 className="text-5xl font-black tracking-tight text-slate-900 mb-4">
              Terms of Service
            </h1>
            <p className="text-lg text-slate-500">Last updated: February 24, 2026</p>
          </header>

          <div className="prose prose-slate prose-lg max-w-none prose-headings:scroll-mt-32 prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600">
            <section id="intro" className="mb-16">
              <p className="font-medium text-slate-900 mb-6">
                Subject to these Terms of Service (this &quot;Agreement&quot;), goodlink.ai
                (&quot;goodlink&quot;, &quot;we&quot;, &quot;us&quot; and/or &quot;our&quot;)
                provides access to goodlink.ai platform as a service (collectively, the
                &quot;Services&quot;).
              </p>
              <p>
                By using or accessing the Services, you acknowledge that you have read, understand,
                and agree to be bound by this Agreement. We may revise the Agreement terms or any
                additional terms and conditions that are relevant to the goodlink.ai from time to
                time. You agree that we shall not be liable to you or to any third party for any
                modification of this Agreement.
              </p>
              <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 mt-8">
                <p className="text-sm italic">
                  If you are entering into this Agreement on behalf of a company, business or other
                  legal entity, you represent that you have the authority to bind such entity to this
                  Agreement, in which case the term &quot;you&quot; shall refer to such entity.
                </p>
              </div>
            </section>

            <section id="section-1">
              <h2 className="text-3xl font-black mb-8 border-b pb-4 border-slate-100">
                1. GoodLink Services
              </h2>

              <h3 className="text-xl font-bold mt-8 mb-4">1.1 Description of Services</h3>
              <p>
                GoodLink is a link attribution and marketing analytics platform designed to enable
                modern marketing teams to generate shortened links, monitor link performance
                analytics, and implement server-to-server Conversion API (&quot;CAPI&quot;)
                integrations.
              </p>
              <p>
                In order to utilize server-to-server tracking capabilities, you are required to
                integrate GoodLink with your own systems and infrastructure in accordance with the
                technical documentation. You acknowledge and agree that you bear sole responsibility
                for properly implementing, configuring, and maintaining such integration.
              </p>

              <h3 className="text-xl font-bold mt-8 mb-4">1.2 Account Access</h3>
              <p>
                In order to access and use the Services, the Client is required to register with
                GoodLink, create an account (the &quot;Client Account&quot;), and expressly accept
                these Terms of Service.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
                <div className="p-6 border border-slate-100 rounded-2xl bg-white shadow-sm">
                  <UserCheck className="w-8 h-8 text-[#00F59B] mb-4" />
                  <h4 className="font-bold mb-2">Authorized Users</h4>
                  <p className="text-sm">Only permitted users may access the Client Account.</p>
                </div>
                <div className="p-6 border border-slate-100 rounded-2xl bg-white shadow-sm">
                  <Lock className="w-8 h-8 text-[#00F59B] mb-4" />
                  <h4 className="font-bold mb-2">Security</h4>
                  <p className="text-sm">
                    Client is responsible for safeguarding all login credentials.
                  </p>
                </div>
              </div>

              <h3 className="text-xl font-bold mt-8 mb-4">1.3 Usage Overages</h3>
              <p>
                GoodLink establishes specific usage limits. If you exceed these thresholds and do
                not upgrade or pay overage fees, we reserve the right to suspend or restrict access
                to the Services.
              </p>

              <h3 className="text-xl font-bold mt-8 mb-4">1.5 Fair Use Policy</h3>
              <div className="bg-red-50/50 border border-red-100 p-8 rounded-[32px] space-y-4">
                <h4 className="text-red-900 font-bold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" /> Prohibited Activities:
                </h4>
                <ul className="grid grid-cols-1 gap-2 text-sm text-red-800">
                  <li className="flex items-center gap-2">
                    • Phishing, scams, or deceptive websites
                  </li>
                  <li className="flex items-center gap-2">• Adult content or pornography</li>
                  <li className="flex items-center gap-2">
                    • Intellectual property infringement
                  </li>
                  <li className="flex items-center gap-2">
                    • Reverse engineering or scraping our data
                  </li>
                </ul>
              </div>
            </section>

            <section id="section-2">
              <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
                2. Data Ownership
              </h2>
              <h3 className="text-xl font-bold mt-8 mb-4">2.2 Shortlink Ownership</h3>
              <p>
                When using a default GoodLink.ai–owned domain (e.g., glynk.to), GoodLink reserves the
                right to reclaim any shortlink if necessary to ensure brand compliance or prevent
                user confusion.
              </p>
              <h3 className="text-xl font-bold mt-8 mb-4">2.3 Intellectual Property Rights</h3>
              <p>
                The Services, including software, code, text, and layouts, are owned by GoodLink and
                protected under international copyright laws. You grant GoodLink a limited license to
                display your company name and logo in marketing materials.
              </p>
            </section>

            <section id="section-3">
              <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
                3. Invoices
              </h2>
              <p>
                Clients utilizing GoodLink Links are required to pay subscription fees. All fees are
                payable in advance, in USD, and are non-refundable. Failure to remit payment may
                result in service suspension.
              </p>
            </section>

            <section id="section-4">
              <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
                4. Service Termination
              </h2>
              <p>
                Upon termination, you will have fifteen (15) days to download your data. After this
                period, your account will be deactivated. We retain data for a minimum of thirty (30)
                days following termination.
              </p>
            </section>

            <section id="section-6">
              <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
                6. Warranties
              </h2>
              <p>
                Each party warrants it has the authority to enter this Agreement. GoodLink warrants
                it will employ commercially reasonable measures to detect and remove malicious code
                from the platform.
              </p>
            </section>

            <section id="section-10">
              <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
                10. Limitation of Liability
              </h2>
              <div className="bg-slate-900 text-white p-8 rounded-[32px] mb-8 shadow-xl">
                <p className="text-sm uppercase tracking-widest text-[#00F59B] font-bold mb-4">
                  Liability Cap
                </p>
                <p className="text-xl font-medium leading-relaxed">
                  In no event shall either party&apos;s total aggregate liability exceed the total
                  subscription fees paid during the six (6) month period preceding the claim.
                </p>
              </div>
            </section>

            <section id="section-12">
              <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
                12. General
              </h2>
              <p>
                This Agreement is governed by the laws of the State of Israel. Any disputes shall be
                subject to the exclusive jurisdiction of the courts in Tiberias, Israel.
              </p>
              <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-[#00F59B] shrink-0" />
                <p className="text-sm">
                  By using GoodLink.ai, you acknowledge that you have read these Terms of Service,
                  understood them, and agree to be bound by them.
                </p>
              </div>
            </section>
          </div>
        </article>
      </main>
    </div>
  );
};

export default TermsPage;


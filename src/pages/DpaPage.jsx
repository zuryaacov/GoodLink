import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  FileText,
  Target,
  UserCheck,
  Lock,
  Server,
  HelpCircle,
  AlertTriangle,
  Globe,
  ClipboardCheck,
  RotateCcw,
  Scale,
  Mail,
} from 'lucide-react';

const DpaPage = () => {
  const [activeSection, setActiveSection] = useState('intro');

  const sections = [
    { id: 'intro', title: 'Introduction', icon: <FileText className="w-4 h-4" /> },
    { id: 'section-1', title: '1. Definitions', icon: <FileText className="w-4 h-4" /> },
    { id: 'section-2', title: '2. Scope', icon: <Target className="w-4 h-4" /> },
    { id: 'section-3', title: '3. Customer Obligations', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'section-4', title: "4. GoodLink's Commitments", icon: <Lock className="w-4 h-4" /> },
    { id: 'section-5', title: '5. Sub-processors', icon: <Server className="w-4 h-4" /> },
    { id: 'section-6', title: '6. Assistance with Data Subject Rights', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'section-7', title: '7. Personal Data Breach', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'section-8', title: '8. International Transfers', icon: <Globe className="w-4 h-4" /> },
    { id: 'section-9', title: '9. Audit Rights', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'section-10', title: '10. Termination and Data Handling', icon: <RotateCcw className="w-4 h-4" /> },
    { id: 'section-11', title: '11. Governing Law', icon: <Scale className="w-4 h-4" /> },
    { id: 'section-12', title: '12. Contact', icon: <Mail className="w-4 h-4" /> },
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
            <span className="text-2xl font-black leading-tight tracking-tight text-black">
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
              LEGAL DOCUMENT
            </div>
            <h1 className="text-5xl font-black tracking-tight text-slate-900 mb-4">
              Data Processing Addendum (DPA)
            </h1>
            <p className="text-lg text-slate-500">Last updated: February 24, 2026</p>
          </header>

          <div className="prose prose-slate prose-lg max-w-none prose-headings:scroll-mt-32 prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600">
            <section id="intro" className="mb-16">
              <p className="font-medium text-slate-900 mb-6">
                This Data Processing Addendum (&quot;DPA&quot;) forms an integral part of the primary services agreement (the &quot;Agreement&quot;) entered into between GoodLink.ai (&quot;GoodLink,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) and the applicable customer (&quot;Customer&quot;) governing the provision of GoodLink&apos;s services (the &quot;Services&quot;).
              </p>
              <p>
                This DPA sets forth the parties&apos; respective rights and obligations with respect to the processing of Personal Data in connection with the Services.
              </p>
            </section>

            <section id="section-1">
              <h2 className="text-3xl font-black mb-8 border-b pb-4 border-slate-100">
                1. Definitions
              </h2>
              <p>For the purposes of this DPA:</p>
              <ul className="list-disc pl-6 space-y-2 my-4">
                <li><strong>Personal Data</strong> means any information relating to an identified or identifiable natural person, as defined under applicable data protection legislation.</li>
                <li><strong>Processing</strong> (or &quot;Process&quot;) means any operation performed on Personal Data, whether by automated means or otherwise, including collection, recording, organization, structuring, storage, adaptation, retrieval, consultation, use, disclosure, dissemination, restriction, deletion, or destruction.</li>
                <li><strong>Sub-processor</strong> means any third party appointed by GoodLink to process Personal Data on behalf of the Customer in connection with the Services.</li>
              </ul>
            </section>

            <section id="section-2">
              <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
                2. Scope
              </h2>
              <p>
                This DPA applies where and to the extent that GoodLink Processes Personal Data on behalf of the Customer in the course of delivering the Services.
              </p>
              <p>
                This DPA is incorporated into and subject to the terms and conditions of the Agreement and reflects the parties&apos; mutual understanding regarding the Processing of Personal Data.
              </p>
            </section>

            <section id="section-3">
              <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
                3. Customer Obligations
              </h2>
              <p>
                The Customer is solely responsible for ensuring that its use of the Services and its instructions to GoodLink comply with all applicable data protection and privacy laws and regulations.
              </p>
              <p>
                The Customer shall provide lawful, documented instructions to GoodLink concerning the Processing of Personal Data, as required by applicable law.
              </p>
            </section>

            <section id="section-4">
              <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
                4. GoodLink&apos;s Commitments
              </h2>
              <p>
                GoodLink shall Process Personal Data solely on behalf of the Customer and in accordance with the Customer&apos;s documented instructions, including those contained in the Agreement and this DPA.
              </p>
              <p>
                GoodLink shall ensure that individuals authorized to Process Personal Data are subject to appropriate confidentiality obligations, whether contractual or statutory.
              </p>
              <p>
                GoodLink shall implement and maintain suitable technical and organizational safeguards designed to protect Personal Data against unauthorized access, accidental loss, destruction, alteration, or disclosure.
              </p>
            </section>

            <section id="section-5">
              <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
                5. Sub-processors
              </h2>
              <p>
                GoodLink may appoint Sub-processors to assist in the provision of the Services. GoodLink shall ensure that any Sub-processor is bound by data protection obligations that provide a level of protection no less stringent than those set forth in this DPA.
              </p>
              <p>
                GoodLink shall remain responsible for the acts and omissions of its Sub-processors in connection with their Processing of Personal Data.
              </p>
            </section>

            <section id="section-6">
              <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
                6. Assistance with Data Subject Rights
              </h2>
              <p>
                Taking into account the nature of the Processing, GoodLink shall provide reasonable assistance to the Customer in responding to requests from individuals exercising their rights under applicable data protection laws, including rights of access, correction, deletion, restriction, and data portability.
              </p>
            </section>

            <section id="section-7">
              <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
                7. Personal Data Breach
              </h2>
              <p>
                In the event GoodLink becomes aware of a Personal Data breach affecting Customer data, GoodLink shall notify the Customer without undue delay. GoodLink shall provide sufficient information to enable the Customer to comply with any legal obligations related to notification of supervisory authorities or affected individuals.
              </p>
            </section>

            <section id="section-8">
              <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
                8. International Transfers
              </h2>
              <p>
                GoodLink shall ensure that Personal Data is not transferred outside the European Economic Area (EEA), or any other jurisdiction imposing transfer restrictions, unless appropriate safeguards are implemented in accordance with applicable law. Such safeguards may include standard contractual clauses or other approved legal mechanisms.
              </p>
            </section>

            <section id="section-9">
              <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
                9. Audit Rights
              </h2>
              <p>
                Upon reasonable notice and subject to appropriate confidentiality obligations, the Customer may verify GoodLink&apos;s compliance with this DPA, including by reviewing relevant documentation, systems, or facilities used to Process Personal Data.
              </p>
            </section>

            <section id="section-10">
              <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
                10. Termination and Data Handling
              </h2>
              <p>
                Upon termination or expiration of the Agreement, and at the Customer&apos;s written election, GoodLink shall either return or securely delete all Personal Data Processed on behalf of the Customer, unless retention is required by applicable law.
              </p>
            </section>

            <section id="section-11">
              <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
                11. Governing Law
              </h2>
              <p>
                This DPA shall be governed by and interpreted in accordance with the laws applicable to the Agreement.
              </p>
            </section>

            <section id="section-12">
              <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
                12. Contact
              </h2>
              <p>For inquiries regarding this DPA or GoodLink&apos;s data processing practices, please contact:</p>
              <div className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                <Mail className="w-6 h-6 text-[#00F59B] shrink-0" />
                <div>
                  <p className="font-medium text-slate-900">hello@goodlink.ai</p>
                </div>
              </div>
            </section>
          </div>
        </article>
      </main>
    </div>
  );
};

export default DpaPage;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  Info,
  FileText,
  Database,
  Globe,
  Server,
  Mail,
  ExternalLink,
  Users,
  RefreshCw,
} from 'lucide-react';

/** Shared Privacy Policy content (used on /privacy page and in Login/Signup modal) */
export function PrivacyContent() {
  return (
    <div className="prose prose-slate prose-lg max-w-none prose-headings:scroll-mt-32 prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600">
      <section id="intro" className="mb-16">
        <p className="font-medium text-slate-900 mb-6">
          Welcome to GoodLink.ai (the &quot;Site&quot;), operated by GoodLink (&quot;GoodLink,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). GoodLink provides a platform that allows users to create and manage shortened links (the &quot;Services&quot;).
        </p>
        <p>
          We are committed to safeguarding your privacy and protecting your personal information. This Privacy Policy explains how we collect, use, process, store, and disclose personal data when you access or use our platform.
        </p>
        <p>
          By using our Services, you acknowledge that your information will be collected and used in accordance with this Privacy Policy. Capitalized terms not otherwise defined herein shall have the meanings assigned to them in our Terms and Conditions, which, together with this Privacy Policy, form a binding agreement between you and GoodLink.
        </p>
      </section>

      <section id="section-1">
        <h2 className="text-3xl font-black mb-8 border-b pb-4 border-slate-100">
          1. Definitions
        </h2>
        <p>For purposes of this Privacy Policy:</p>
        <ul className="list-disc pl-6 space-y-2 my-4">
          <li><strong>Service</strong> refers to the GoodLink.ai website, operated by GoodLink.</li>
          <li><strong>Personal Data</strong> means any information relating to an identified or identifiable natural person.</li>
          <li><strong>Usage Data</strong> means information collected automatically through use of the Service or from the Service infrastructure (for example, page visit duration).</li>
          <li><strong>Cookies</strong> are small data files stored on your device.</li>
          <li><strong>Data Controller</strong> means the individual or legal entity that determines the purposes and means of processing personal data.</li>
          <li><strong>Data Processor (Service Provider)</strong> means a person or entity that processes data on behalf of the Data Controller.</li>
          <li><strong>Data Subject</strong> means the individual to whom Personal Data relates.</li>
          <li><strong>User</strong> means any individual who accesses or uses the Service.</li>
        </ul>
      </section>

      <section id="section-2">
        <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
          2. Information We Collect
        </h2>
        <p>We collect different categories of information to operate, maintain, and improve our Services.</p>

        <h3 className="text-xl font-bold mt-8 mb-4">Personal Data</h3>
        <p>
          When using the Service, we may request personally identifiable information, including but not limited to:
        </p>
        <ul className="list-disc pl-6 space-y-2 my-4">
          <li>Name</li>
          <li>Email address</li>
          <li>Profile image (if voluntarily provided)</li>
        </ul>
        <p>
          We may use this information to communicate with you, including sending updates, marketing materials, or promotional content. You may opt out of marketing communications at any time by using the unsubscribe link or contacting us at hello@goodlink.ai.
        </p>

        <h3 className="text-xl font-bold mt-8 mb-4">Usage Data</h3>
        <p>
          We may automatically collect technical information when you access the Service. This may include:
        </p>
        <ul className="list-disc pl-6 space-y-2 my-4">
          <li>IP address</li>
          <li>Browser type and version</li>
          <li>Pages visited</li>
          <li>Time and date of access</li>
          <li>Time spent on pages</li>
          <li>Device identifiers</li>
          <li>Diagnostic data</li>
        </ul>
        <p>
          If accessing the Service via a mobile device, we may also collect: device type, unique device ID, mobile IP address, operating system, and mobile browser type.
        </p>

        <h3 className="text-xl font-bold mt-8 mb-4">Cookies</h3>
        <p>
          We use first-party cookies to operate and secure our Service. Cookies may contain anonymous unique identifiers and are stored on your device.
        </p>
        <p>Types of cookies we use include:</p>
        <ul className="list-disc pl-6 space-y-2 my-4">
          <li>Session Cookies (to operate the Service)</li>
          <li>Preference Cookies (to remember settings and preferences)</li>
          <li>Security Cookies (for security purposes)</li>
        </ul>
        <p>We do not use third-party cookies.</p>

        <h3 className="text-xl font-bold mt-8 mb-4">Customer Data (Analytics &amp; Tracking)</h3>
        <p>
          If you use GoodLink Analytics for tracking, we may collect: browser details, device data, geographic location, referrer URL, and IP address (excluding EU users where applicable). This information is used to generate marketing analytics and is accessible only to you and authorized team members.
        </p>
      </section>

      <section id="section-3">
        <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
          3. How We Use Information
        </h2>
        <p>We process collected data to:</p>
        <ul className="list-disc pl-6 space-y-2 my-4">
          <li>Operate and maintain the Service</li>
          <li>Provide customer support</li>
          <li>Improve and optimize performance</li>
          <li>Monitor usage</li>
          <li>Detect and prevent technical issues</li>
          <li>Fulfill contractual obligations, including billing</li>
          <li>Provide account-related notifications</li>
          <li>Send updates, offers, and similar services (unless you opt out)</li>
          <li>Comply with legal obligations</li>
          <li>Carry out any purpose disclosed at the time of collection</li>
          <li>Fulfill any other purpose with your consent</li>
        </ul>
      </section>

      <section id="section-4">
        <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
          4. Data Retention
        </h2>
        <p>
          We retain Personal Data only for as long as necessary to fulfill the purposes described in this Privacy Policy, including compliance with legal obligations, dispute resolution, and enforcement of agreements.
        </p>
        <p>
          Usage Data is generally stored for shorter periods unless required for security enhancement, service improvement, or legal compliance.
        </p>
      </section>

      <section id="section-5">
        <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
          5. International Data Transfers
        </h2>
        <p>
          Your information may be transferred to and maintained on servers located outside your jurisdiction, including the United States.
        </p>
        <p>
          By submitting your information, you consent to such transfers. We implement appropriate safeguards to ensure that your data is handled securely and in accordance with this Privacy Policy.
        </p>
      </section>

      <section id="section-6">
        <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
          6. Disclosure of Information
        </h2>
        <p>We may disclose Personal Data:</p>
        <h3 className="text-xl font-bold mt-6 mb-2">Legal Requirements</h3>
        <p>If required by law or in response to lawful requests by public authorities.</p>
        <h3 className="text-xl font-bold mt-6 mb-2">Business Transactions</h3>
        <p>In connection with a merger, acquisition, restructuring, or asset sale.</p>
        <h3 className="text-xl font-bold mt-6 mb-2">Other Disclosures</h3>
        <ul className="list-disc pl-6 space-y-2 my-4">
          <li>To affiliates and subsidiaries</li>
          <li>To contractors and service providers</li>
          <li>To fulfill the purpose for which the information was provided</li>
          <li>For marketing purposes such as displaying your company logo</li>
          <li>With your consent</li>
          <li>When necessary to protect rights, property, or safety</li>
        </ul>
      </section>

      <section id="section-7">
        <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
          7. Data Security
        </h2>
        <p>
          We implement commercially reasonable safeguards to protect your Personal Data. However, no internet transmission or storage system is completely secure, and we cannot guarantee absolute security.
        </p>
      </section>

      <section id="section-8">
        <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
          8. GDPR Rights (EU/EEA Users)
        </h2>
        <p>
          If you are located in the EU or EEA, you may have the right to: access your Personal Data; correct inaccurate data; request deletion under certain conditions; restrict or object to processing; receive your data in a portable format; and withdraw consent at any time.
        </p>
        <p>
          Requests may be submitted to hello@goodlink.ai. We may verify your identity before fulfilling requests. You may also lodge a complaint with your local supervisory authority.
        </p>
        <h3 className="text-xl font-bold mt-8 mb-4">Roles Under GDPR</h3>
        <p>
          When you implement our tracking tools on your site: You act as the Data Controller. GoodLink acts as the Data Processor. You are responsible for obtaining lawful consent and responding to data subject requests. GoodLink processes data only according to your instructions and implements appropriate safeguards.
        </p>
      </section>

      <section id="section-9">
        <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
          9. Subprocessors
        </h2>
        <p>
          We may engage third-party providers to assist in delivering our Services. These entities process data solely on our behalf and are contractually obligated to protect it.
        </p>
      </section>

      <section id="section-10">
        <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
          10. External Links
        </h2>
        <p>
          Our Service may link to third-party websites. We are not responsible for the privacy practices or content of those external sites.
        </p>
      </section>

      <section id="section-11">
        <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
          11. Children&apos;s Privacy
        </h2>
        <p>
          Our Services are not intended for individuals under 18 years of age. We do not knowingly collect Personal Data from minors. If such data is identified, we will delete it promptly.
        </p>
      </section>

      <section id="section-12">
        <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
          12. Updates to This Policy
        </h2>
        <p>
          We may revise this Privacy Policy periodically. Updates will be posted on this page and may be communicated via email or prominent notice prior to taking effect. Continued use of the Service after changes become effective constitutes acceptance.
        </p>
      </section>

      <section id="section-13">
        <h2 className="text-3xl font-black mb-8 mt-16 border-b pb-4 border-slate-100">
          13. Contact
        </h2>
        <p>For questions regarding this Privacy Policy, please contact:</p>
        <div className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
          <Mail className="w-6 h-6 text-[#00F59B] shrink-0" />
          <div>
            <p className="font-medium text-slate-900">hello@goodlink.ai</p>
          </div>
        </div>
      </section>
    </div>
  );
}

const PrivacyPage = () => {
  const [activeSection, setActiveSection] = useState('intro');

  const sections = [
    { id: 'intro', title: 'Introduction', icon: <Info className="w-4 h-4" /> },
    { id: 'section-1', title: '1. Definitions', icon: <FileText className="w-4 h-4" /> },
    { id: 'section-2', title: '2. Information We Collect', icon: <Database className="w-4 h-4" /> },
    { id: 'section-3', title: '3. How We Use Information', icon: <Server className="w-4 h-4" /> },
    { id: 'section-4', title: '4. Data Retention', icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'section-5', title: '5. International Transfers', icon: <Globe className="w-4 h-4" /> },
    { id: 'section-6', title: '6. Disclosure', icon: <FileText className="w-4 h-4" /> },
    { id: 'section-7', title: '7. Data Security', icon: <Lock className="w-4 h-4" /> },
    { id: 'section-8', title: '8. GDPR Rights', icon: <Shield className="w-4 h-4" /> },
    { id: 'section-9', title: '9. Subprocessors', icon: <Users className="w-4 h-4" /> },
    { id: 'section-10', title: '10. External Links', icon: <ExternalLink className="w-4 h-4" /> },
    { id: 'section-11', title: "11. Children's Privacy", icon: <Users className="w-4 h-4" /> },
    { id: 'section-12', title: '12. Updates', icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'section-13', title: '13. Contact', icon: <Mail className="w-4 h-4" /> },
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
              Privacy Policy
            </h1>
            <p className="text-lg text-slate-500">Last updated: February 24, 2026</p>
          </header>

          <PrivacyContent />
        </article>
      </main>
    </div>
  );
};

export default PrivacyPage;

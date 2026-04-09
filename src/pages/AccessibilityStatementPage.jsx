import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

function FeatureItem({ children }) {
  return (
    <div className="pl-8 relative text-[#1f2937] text-sm md:text-base leading-relaxed">
      <span className="absolute left-0 top-0 text-[#a855f7] font-bold select-none" aria-hidden="true">
        ✦
      </span>
      {children}
    </div>
  );
}

export default function AccessibilityStatementPage() {
  useEffect(() => {
    document.title = 'GoodLink | Accessibility Statement';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#f9fafb] text-[#1f2937]">
      <header className="sticky top-0 z-40 border-b border-slate-200 py-4 px-6 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="max-w-3xl mx-auto flex items-center justify-center">
          <Link
            to="/"
            className="flex items-center gap-3 text-[#1b1b1b] transition-colors hover:text-[#0b996f] w-fit"
          >
            {/* Link-shape icon hidden by request (kept in code, do not delete)
            <div className="size-5 sm:size-7 text-primary flex-shrink-0" aria-hidden="true">
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

      <main className="px-5 py-10 md:py-12">
        <article className="max-w-[900px] mx-auto bg-white rounded-2xl shadow-md border border-slate-100 p-8 md:p-10">
          <h1 className="text-[#a855f7] text-3xl md:text-[2.2rem] font-bold text-center mb-1">
            Accessibility Statement
          </h1>
          <p className="text-center text-[#6b7280] text-sm mb-8">GoodLink.ai | Last Updated: March 2026</p>

          <div className="bg-[#f3f4f6] p-6 md:p-7 rounded-xl mb-8 border-l-[5px] border-[#a855f7] text-[1.05rem] md:text-[1.1rem] leading-relaxed">
            <strong className="text-[#1f2937]">Our Commitment:</strong>{' '}
            At GoodLink, we are committed to ensuring digital accessibility for people with disabilities. We
            are continually improving the user experience for everyone and applying the relevant accessibility
            standards to provide a seamless link-management experience.
          </div>

          <h2 className="text-[#a855f7] text-xl md:text-2xl font-bold border-b-2 border-[#d7fec8] pb-2 mt-10 mb-4">
            Compliance Status
          </h2>
          <div className="border border-[#e5e7eb] rounded-xl p-6 mb-6 bg-white">
            <span className="inline-block bg-[#d7fec8] text-[#166534] px-3 py-1 rounded-full text-xs font-bold mb-3">
              WCAG 2.2 Level AA
            </span>
            <p className="text-[#374151] leading-relaxed">
              We strive to conform to the <b>Web Content Accessibility Guidelines (WCAG) 2.2 Level AA</b>{' '}
              standards. These guidelines explain how to make web content more accessible for people with a wide
              range of disabilities, including visual, auditory, physical, speech, cognitive, language, learning,
              and neurological disabilities.
            </p>
          </div>

          <h2 className="text-[#a855f7] text-xl md:text-2xl font-bold border-b-2 border-[#d7fec8] pb-2 mt-10 mb-4">
            Accessibility Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
            <FeatureItem>
              <strong>Keyboard Navigation:</strong> All interactive elements, including our link creator and UTM
              presets, are fully operable via keyboard (Tab, Enter, Space).
            </FeatureItem>
            <FeatureItem>
              <strong>Visual Focus:</strong> A clear visual indicator (focus ring) is provided for all focused
              elements to assist navigation without a mouse.
            </FeatureItem>
            <FeatureItem>
              <strong>Screen Reader Support:</strong> We use semantic HTML and ARIA attributes to ensure screen
              readers can accurately interpret our SaaS functionality.
            </FeatureItem>
            <FeatureItem>
              <strong>Color Contrast:</strong> We maintain a contrast ratio of at least 4.5:1 for all text elements
              to ensure readability for users with low vision.
            </FeatureItem>
            <FeatureItem>
              <strong>Responsive Design:</strong> Our platform is fully functional at up to 200% zoom and optimized
              for various screen sizes without loss of information.
            </FeatureItem>
          </div>

          <h2 className="text-[#a855f7] text-xl md:text-2xl font-bold border-b-2 border-[#d7fec8] pb-2 mt-10 mb-4">
            The Accessibility Widget
          </h2>
          <div className="bg-[#d7fec8] p-6 md:p-7 rounded-xl text-[#166534]">
            <h3 className="mt-0 text-lg font-bold text-[#166534] mb-3">Customized Experience</h3>
            <p className="mb-3 leading-relaxed">
              We have integrated a specialized <b>Accessibility Widget</b> (the floating icon in the corner) to
              allow you to customize your experience:
            </p>
            <ul className="list-disc pl-5 space-y-2 mb-0">
              <li>
                <b>Customization:</b> Increase font size, switch to high-contrast mode, highlight links, and use a
                dyslexia-friendly font.
              </li>
              <li>
                <b>Hiding the Widget:</b> If the widget interferes with your view, you can select &quot;Hide
                floating button&quot; within the menu.
              </li>
              <li>
                <b>Restoring the Widget:</b> Use <b>&quot;Show accessibility menu&quot;</b> in the{' '}
                <b>dashboard sidebar</b> (above your profile when logged in), or the link in the{' '}
                <b>Homepage footer</b>.
              </li>
            </ul>
          </div>

          <h2 className="text-[#a855f7] text-xl md:text-2xl font-bold border-b-2 border-[#d7fec8] pb-2 mt-10 mb-4">
            Limitations and Alternatives
          </h2>
          <p className="text-[#374151] leading-relaxed">
            Despite our best efforts, there may be some limitations. In some cases, third-party integrations (such as
            external analytics charts) may not be fully accessible. We are working constantly to improve these
            areas.
          </p>

          <footer className="text-center mt-12 pt-8 border-t border-[#e5e7eb]">
            <h3 className="text-lg font-bold text-[#1f2937] mb-2">Feedback &amp; Contact Information</h3>
            <p className="text-[#374151] mb-2">If you encounter any accessibility barriers or need assistance, please reach out:</p>
            <a
              href="mailto:hello@goodlink.ai"
              className="text-[#a855f7] font-bold text-lg no-underline hover:underline"
            >
              hello@goodlink.ai
            </a>
            <p className="text-sm text-[#6b7280] mt-3">
              Response Time: We aim to respond within 2 business days.
            </p>
          </footer>
        </article>
      </main>
    </div>
  );
}

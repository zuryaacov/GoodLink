import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { isValidEmail } from '../lib/emailValidation';
import { validateUrl } from '../lib/urlValidation';

// Wraps the site's standard validateUrl but allows glynk.to and goodlink.ai
// since abuse reporters are expected to submit our own short-links.
function validateReportUrl(value) {
  const result = validateUrl(value);
  if (!result.isValid && result.error && result.error.includes('glynk.to')) {
    // Re-run a basic URL parse to still get a normalizedUrl
    try {
      const trimmed = (value || '').trim();
      const toParse = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      const u = new URL(toParse);
      return { isValid: true, error: null, normalizedUrl: u.toString() };
    } catch {
      return { isValid: false, error: 'Invalid URL', normalizedUrl: null };
    }
  }
  return result;
}

const CATEGORIES = [
  { value: 'phishing', label: 'Phishing' },
  { value: 'spam', label: 'Spam' },
  { value: 'adult', label: 'Adult content' },
  { value: 'copyright', label: 'Copyright (DMCA)' },
  { value: 'other', label: 'Other' },
];

const workerUrl = import.meta.env.VITE_WORKER_URL || 'https://glynk.to';

const AbuseReportPage = () => {
  const [reportedUrl, setReportedUrl] = useState('');
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [turnstileWidgetId, setTurnstileWidgetId] = useState(null);
  const turnstileContainerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let timer;
    if (typeof window !== 'undefined' && window.turnstile) {
      const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
      if (siteKey && turnstileContainerRef.current) {
        const widgetId = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: siteKey,
          language: 'auto',
          callback: (token) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(null),
        });
        setTurnstileWidgetId(widgetId);
      }
    } else {
      timer = setTimeout(() => {
        const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
        if (siteKey && turnstileContainerRef.current && window.turnstile) {
          const widgetId = window.turnstile.render(turnstileContainerRef.current, {
            sitekey: siteKey,
            language: 'auto',
            callback: (token) => setTurnstileToken(token),
            'expired-callback': () => setTurnstileToken(null),
          });
          setTurnstileWidgetId(widgetId);
        }
      }, 500);
    }
    return () => {
      if (timer) clearTimeout(timer);
      if (turnstileWidgetId && window.turnstile) {
        try {
          window.turnstile.remove(turnstileWidgetId);
        } catch (_) {}
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const urlTrimmed = reportedUrl.trim();
    const descTrimmed = description.trim();
    const emailTrimmed = reporterEmail.trim();

    if (!urlTrimmed) {
      setFieldErrors((prev) => ({ ...prev, reportedUrl: 'Please enter the offending link.' }));
      return;
    }
    const urlValidation = validateReportUrl(urlTrimmed);
    if (!urlValidation.isValid) {
      setFieldErrors((prev) => ({ ...prev, reportedUrl: urlValidation.error || 'Invalid URL.' }));
      return;
    }

    if (!emailTrimmed) {
      setFieldErrors((prev) => ({ ...prev, reporterEmail: 'Please enter your email address.' }));
      return;
    }
    if (!isValidEmail(emailTrimmed)) {
      setFieldErrors((prev) => ({ ...prev, reporterEmail: 'Please enter a valid email address.' }));
      return;
    }

    if (!turnstileToken) {
      setError('Please complete the security verification.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${workerUrl}/api/abuse-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reported_url: urlValidation.normalizedUrl || urlTrimmed,
          category,
          description: descTrimmed || null,
          reporter_email: emailTrimmed,
          turnstile_token: turnstileToken,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit report. Please try again.');
      }
      setSuccess(true);
      setReportedUrl('');
      setDescription('');
      setReporterEmail('');
      setCategory('other');
      setTurnstileToken(null);
      setError('');
      if (turnstileWidgetId && window.turnstile) {
        try {
          window.turnstile.reset(turnstileWidgetId);
        } catch (_) {}
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      if (turnstileWidgetId && window.turnstile) {
        try {
          window.turnstile.reset(turnstileWidgetId);
        } catch (_) {}
      }
      setTurnstileToken(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] text-[#1f2937]">
      <header className="sticky top-0 z-40 border-b border-slate-200 py-4 px-6 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="max-w-3xl mx-auto flex items-center justify-center">
          <Link to="/" className="flex items-center gap-3 text-black transition-opacity hover:opacity-80 w-fit">
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

      <main className="max-w-[900px] mx-auto px-5 py-8 md:py-12">
        {success ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="rounded-2xl bg-[#10b981]/20 border border-[#10b981]/40 p-10 md:p-14 max-w-xl w-full">
              <div className="flex justify-center mb-4">
                <span className="material-symbols-outlined text-[#10b981] text-5xl">check_circle</span>
              </div>
              <p className="text-black font-bold text-xl md:text-2xl">Thank you for your report.</p>
              <p className="text-black mt-4 leading-relaxed">
                We have received your submission and are handling it. Our team will review the report within 24 hours and may contact you at the email you provided if we need further information.
              </p>
              <Link
                to="/"
                className="inline-block mt-8 px-6 py-3 rounded-xl bg-[#135bec] hover:bg-[#1049c8] text-black font-semibold transition-colors"
              >
                Back to home
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="max-w-[900px] mx-auto mb-10 rounded-2xl bg-white p-8 md:p-10 shadow-md shadow-black/10">
              <h1 className="text-center text-[#a855f7] text-[1.75rem] sm:text-[2.2rem] font-bold leading-tight mb-5">
                Abuse Reporting &amp; DMCA
              </h1>

              <div className="bg-[#f3f4f6] p-6 md:p-[25px] rounded-xl mb-8 border-l-[5px] border-[#a855f7] font-medium leading-relaxed">
                Goodlink.ai takes security and intellectual property rights very seriously. If you encounter a link
                that violates our terms of service or legal requirements, please follow the guidelines below.
              </div>

              <h2 className="mt-10 text-[#a855f7] text-xl sm:text-[1.6rem] font-bold border-b-2 border-[#d7fec8] pb-2 mb-0 flex items-center">
                <span className="mr-3 text-[1.4rem] shrink-0" aria-hidden>
                  🛡️
                </span>
                A. General Abuse Reporting
              </h2>
              <div className="mt-6 border border-[#e5e7eb] rounded-xl p-6 md:p-8 mb-6 bg-white">
                <p className="leading-relaxed">
                  For reporting{' '}
                  <strong>Phishing, Malware, Spam, or Deceptive Content</strong>, please use our automated Report
                  Abuse form. Your report must include:
                </p>
                <ul className="list-none p-0 mt-4 space-y-3">
                  {[
                    'The offending Goodlink.ai URL.',
                    'The type of abuse detected.',
                    'Any additional evidence or screenshots (if applicable).',
                  ].map((item) => (
                    <li
                      key={item}
                      className="relative pl-8 before:content-['→'] before:absolute before:left-0 before:text-[#a855f7] before:font-bold"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
                <span className="block mt-2.5 text-sm text-[#6b7280] italic">
                  Note: Reports are processed by our automated safety filters and reviewed by our security team within
                  24 hours.
                </span>
              </div>

              <h2 className="mt-10 text-[#a855f7] text-xl sm:text-[1.6rem] font-bold border-b-2 border-[#d7fec8] pb-2 mb-0 flex items-center">
                <span className="mr-3 text-[1.4rem] shrink-0" aria-hidden>
                  ⚖️
                </span>
                B. Official DMCA Takedown
              </h2>
              <div className="mt-6 border border-[#e5e7eb] rounded-xl p-6 md:p-8 mb-6 bg-white">
                <span className="inline-block bg-[#fee2e2] text-[#991b1b] px-3 py-1 rounded-full text-sm font-bold mb-2.5">
                  Copyright Infringement
                </span>
                <p className="leading-relaxed mt-2">
                  If you believe content redirected by Goodlink.ai infringes upon your copyrights, you may submit a
                  notification pursuant to the{' '}
                  <strong>Digital Millennium Copyright Act (&quot;DMCA&quot;)</strong>. Please provide the following in
                  writing:
                </p>
                <ul className="list-none p-0 mt-4 space-y-3">
                  {[
                    <>
                      <strong>Work Identification:</strong> Clear identification of the copyrighted work claimed to
                      have been infringed.
                    </>,
                    <>
                      <strong>Link Identification:</strong> The specific Goodlink.ai link that is claimed to be
                      infringing.
                    </>,
                    <>
                      <strong>Contact Information:</strong> Your address, telephone number, and email address.
                    </>,
                    <>
                      <strong>Good Faith Statement:</strong> A statement that the use of the material is not authorized
                      by the owner, agent, or the law.
                    </>,
                    <>
                      <strong>Statement of Accuracy:</strong> A statement that the information is accurate, under
                      penalty of perjury.
                    </>,
                    <>
                      <strong>Authorized Signature:</strong> A physical or electronic signature of a person
                      authorized to act on behalf of the owner.
                    </>,
                  ].map((content, i) => (
                    <li
                      key={i}
                      className="relative pl-8 before:content-['→'] before:absolute before:left-0 before:text-[#a855f7] before:font-bold"
                    >
                      {content}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#d7fec8] p-5 rounded-[10px] text-center mt-8 text-[#166534] font-bold leading-relaxed">
                All compliance notices and reports can be sent to: <br />
                <a href="mailto:hello@goodlink.ai" className="text-[#a855f7] no-underline hover:underline">
                  hello@goodlink.ai
                </a>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-xl bg-red-500/20 border border-red-500/40 p-4 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Offending link <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={reportedUrl}
                  onChange={(e) => {
                    setReportedUrl(e.target.value.toLowerCase());
                    setFieldErrors((prev) => ({ ...prev, reportedUrl: null }));
                  }}
                  placeholder="https://glynk.to/xxxx or full Goodlink URL"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-black placeholder-slate-600 focus:outline-none focus:border-primary"
                />
                {fieldErrors.reportedUrl && (
                  <p className="mt-1 text-sm text-red-400">{fieldErrors.reportedUrl}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-black focus:outline-none focus:border-primary"
                >
                  {CATEGORIES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Additional details, evidence, or screenshots description"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-black placeholder-slate-600 focus:outline-none focus:border-primary resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Your email <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={reporterEmail}
                  onChange={(e) => {
                    setReporterEmail(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, reporterEmail: null }));
                  }}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-black placeholder-slate-600 focus:outline-none focus:border-primary"
                />
                {fieldErrors.reporterEmail && (
                  <p className="mt-1 text-sm text-red-400">{fieldErrors.reporterEmail}</p>
                )}
              </div>

              <div ref={turnstileContainerRef} className="flex justify-start" />

              <button
                type="submit"
                disabled={loading || !turnstileToken}
                className="w-full md:w-auto px-6 py-3 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-colors"
              >
                {loading ? 'Submitting…' : 'Submit report'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
};

export default AbuseReportPage;

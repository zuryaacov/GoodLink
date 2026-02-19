import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { validateUrl } from '../lib/urlValidation';
import { checkForMaliciousInput } from '../lib/inputSanitization';
import { isValidEmail } from '../lib/emailValidation';

const LEGAL_TEXT = `Abuse Reporting & Official DMCA Requirements

Goodlink.ai takes security and intellectual property rights very seriously. If you encounter a link that violates our terms of service or legal requirements, please follow the guidelines below:

A. General Abuse Reporting

For reporting Phishing, Malware, Spam, or Deceptive Content, please use our automated Report Abuse form located on our 404 pages or the main site.
Your report should include:

The offending Goodlink.ai URL.

The type of abuse detected.

Any additional evidence or screenshots (if applicable).
Reports are processed by our automated safety filters and reviewed by our security team within 24 hours.

B. Official DMCA Takedown (Copyright Infringement)

If you are a copyright owner or an agent thereof and believe that any content redirected by Goodlink.ai infringes upon your copyrights, you may submit a notification pursuant to the Digital Millennium Copyright Act ("DMCA") by providing our Copyright Agent with the following information in writing:

Identification of the copyrighted work claimed to have been infringed.

Identification of the Goodlink.ai link that is claimed to be infringing and information reasonably sufficient to permit Goodlink.ai to locate the material.

Contact Information: Your address, telephone number, and an electronic mail address.

A Good Faith Statement that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.

A Statement of Accuracy: That the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.

Physical or Electronic Signature of a person authorized to act on behalf of the owner.

All compliance notices can be sent to: compliance@goodlink.ai`;

const CATEGORIES = [
  { value: 'phishing', label: 'Phishing' },
  { value: 'spam', label: 'Spam' },
  { value: 'adult', label: 'Adult content' },
  { value: 'copyright', label: 'Copyright (DMCA)' },
  { value: 'other', label: 'Other' },
];

const workerUrl = import.meta.env.VITE_WORKER_URL || 'https://glynk.to';
const turnstileWorkerUrl =
  import.meta.env.VITE_TURNSTILE_WORKER_URL || 'https://turnstile-verification.fancy-sky-7888.workers.dev';

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
    const urlValidation = validateUrl(urlTrimmed);
    if (!urlValidation.isValid) {
      setFieldErrors((prev) => ({ ...prev, reportedUrl: urlValidation.error || 'Invalid URL.' }));
      return;
    }
    const maliciousUrl = checkForMaliciousInput(urlTrimmed);
    if (!maliciousUrl.safe) {
      setFieldErrors((prev) => ({ ...prev, reportedUrl: 'The link contains invalid or dangerous content.' }));
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
    const maliciousEmail = checkForMaliciousInput(emailTrimmed);
    if (!maliciousEmail.safe) {
      setFieldErrors((prev) => ({ ...prev, reporterEmail: 'Invalid characters in email.' }));
      return;
    }

    if (!turnstileToken) {
      setError('Please complete the security verification.');
      return;
    }

    setLoading(true);
    try {
      const verifyRes = await fetch(`${turnstileWorkerUrl}/api/verify-turnstile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: turnstileToken }),
      });
      if (!verifyRes.ok) {
        const errData = await verifyRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Security verification failed. Please try again.');
      }
      const verifyResult = await verifyRes.json();
      if (!verifyResult.success) {
        throw new Error('Security verification failed. Please try again.');
      }

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
    <div className="min-h-screen bg-[#0b0f19] text-white">
      <header className="border-b border-[#232f48] py-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white hover:opacity-90">
            <span className="text-2xl font-bold">
              <span className="text-[#10b981]">Good</span>
              <span className="text-[#135bec]"> Link</span>
            </span>
          </Link>
          <Link
            to="/"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">Abuse / DMCA Report</h1>

        <section className="mb-8 rounded-xl bg-[#101622] border border-[#232f48] p-5 md:p-6 whitespace-pre-line text-sm md:text-base text-slate-300 leading-relaxed">
          {LEGAL_TEXT}
        </section>

        {success ? (
          <div className="rounded-xl bg-[#10b981]/20 border border-[#10b981]/40 p-6 text-center">
            <p className="text-[#10b981] font-semibold">Thank you. Your report has been submitted.</p>
            <p className="text-slate-400 text-sm mt-2">
              Our team will review it within 24 hours. We may contact you at the email you provided.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-red-500/20 border border-red-500/40 p-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Offending link <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={reportedUrl}
                onChange={(e) => {
                  setReportedUrl(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, reportedUrl: null }));
                }}
                placeholder="https://glynk.to/xxxx or full Goodlink URL"
                className="w-full px-4 py-3 rounded-xl bg-[#0b0f19] border border-[#232f48] text-white placeholder-slate-500 focus:outline-none focus:border-[#135bec]"
              />
              {fieldErrors.reportedUrl && (
                <p className="mt-1 text-sm text-red-400">{fieldErrors.reportedUrl}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Category <span className="text-red-400">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#0b0f19] border border-[#232f48] text-white focus:outline-none focus:border-[#135bec]"
              >
                {CATEGORIES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Additional details, evidence, or screenshots description"
                className="w-full px-4 py-3 rounded-xl bg-[#0b0f19] border border-[#232f48] text-white placeholder-slate-500 focus:outline-none focus:border-[#135bec] resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Your email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={reporterEmail}
                onChange={(e) => {
                  setReporterEmail(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, reporterEmail: null }));
                }}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-[#0b0f19] border border-[#232f48] text-white placeholder-slate-500 focus:outline-none focus:border-[#135bec]"
              />
              {fieldErrors.reporterEmail && (
                <p className="mt-1 text-sm text-red-400">{fieldErrors.reporterEmail}</p>
              )}
            </div>

            <div ref={turnstileContainerRef} className="flex justify-start" />

            <button
              type="submit"
              disabled={loading || !turnstileToken}
              className="w-full md:w-auto px-6 py-3 rounded-xl bg-[#FF10F0] hover:bg-[#e00ed0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-colors"
            >
              {loading ? 'Submitting…' : 'Submit report'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
};

export default AbuseReportPage;

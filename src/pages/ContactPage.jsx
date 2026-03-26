import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { isValidEmail } from '../lib/emailValidation';

const ContactPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [turnstileWidgetId, setTurnstileWidgetId] = useState(null);
  const turnstileContainerRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if (!siteKey || !turnstileContainerRef.current || !window.turnstile) return;
    if (turnstileWidgetId) return;

    try {
      const id = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: siteKey,
        theme: 'light',
        callback: (token) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(null),
        'error-callback': () => setTurnstileToken(null),
      });
      setTurnstileWidgetId(id);
    } catch {
      setError('Could not initialize Cloudflare verification. Please refresh and try again.');
    }
  }, [turnstileWidgetId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const emailTrimmed = email.trim();
    const messageTrimmed = message.trim();

    if (!emailTrimmed) {
      setError('Please enter your email address.');
      return;
    }
    if (!isValidEmail(emailTrimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!messageTrimmed) {
      setError('Please enter your message.');
      return;
    }
    if (!turnstileToken) {
      setError('Please complete the Cloudflare human verification.');
      return;
    }

    setLoading(true);
    try {
      const { error: insertError } = await supabase.from('contact_requests').insert({
        email: emailTrimmed,
        message: messageTrimmed,
      });

      if (insertError) throw insertError;
      setSent(true);
      setEmail('');
      setMessage('');
      setTurnstileToken(null);
      if (window.turnstile && turnstileWidgetId) {
        window.turnstile.reset(turnstileWidgetId);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      if (window.turnstile && turnstileWidgetId) {
        window.turnstile.reset(turnstileWidgetId);
      }
      setTurnstileToken(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="sticky top-0 z-40 border-b border-slate-200 py-4 px-6 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="max-w-3xl mx-auto flex items-center justify-center">
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

      <main className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-4">
          How can we help?
        </h1>
        <p className="text-lg text-slate-600 mb-10">
          Send us a message and we&apos;ll get back to you as soon as we can.
        </p>

        {sent ? (
          <div className="p-6 rounded-2xl bg-[#00F59B]/10 border border-[#00F59B]/30 text-slate-800">
            <p className="font-semibold">Thank you for reaching out.</p>
            <p className="text-sm mt-1">We&apos;ve received your message and will respond to the email you provided.</p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-4 text-sm font-medium text-[#a855f7] hover:underline"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="contact-email" className="block text-sm font-semibold text-slate-900 mb-2">
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-transparent"
                disabled={loading}
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="contact-message" className="block text-sm font-semibold text-slate-900 mb-2">
                How can we help?
              </label>
              <textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Your message..."
                rows={6}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-transparent resize-y min-h-[140px]"
                disabled={loading}
              />
            </div>
            <div>
              <div ref={turnstileContainerRef} />
              {!import.meta.env.VITE_TURNSTILE_SITE_KEY && (
                <p className="text-xs text-amber-600 mt-2">
                  Cloudflare Turnstile site key is missing.
                </p>
              )}
            </div>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-4 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] text-white font-bold text-base transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
};

export default ContactPage;

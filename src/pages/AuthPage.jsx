import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get('plan');
  const [view, setView] = useState('login'); // Always start with login view
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [honeypot, setHoneypot] = useState(''); // Honeypot field for bot detection
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [turnstileWidgetId, setTurnstileWidgetId] = useState(null);
  const turnstileContainerRef = useRef(null);
  const navigate = useNavigate();

  // Plan checkout URLs mapping
  const planCheckoutUrls = {
    start: 'https://goodlink.lemonsqueezy.com/checkout/buy/54a3e3e3-3618-4922-bce6-a0617252f1ae?embed=1',
    advanced: 'https://goodlink.lemonsqueezy.com/checkout/buy/81876116-924c-44f7-b61c-f4a8a93e83f1?embed=1',
    pro: 'https://goodlink.lemonsqueezy.com/checkout/buy/924daf77-b7b3-405d-a94a-2ad2cc476da4?embed=1'
  };

  // Function to open Lemon Squeezy checkout or customer portal
  const openCheckout = async (planName) => {
    const checkoutUrl = planCheckoutUrls[planName.toLowerCase()];
    if (!checkoutUrl) return;

    // Get user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check user profile to see if they have a paid plan
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan_type, lemon_squeezy_customer_portal_url")
        .eq("user_id", user.id)
        .single();

      // If user has a paid plan (not FREE) and has customer portal URL, open it
      if (
        profile &&
        profile.plan_type !== "free" &&
        profile.lemon_squeezy_customer_portal_url
      ) {
        const portalUrl = String(profile.lemon_squeezy_customer_portal_url).trim();
        if (portalUrl) {
          window.open(portalUrl, "_blank", "noopener,noreferrer");
          return;
        }
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }

    // Otherwise, if user is on FREE plan, open checkout
    const finalUrl = `${checkoutUrl}&checkout[custom][user_id]=${user.id}`;
    window.open(finalUrl, "_blank", "noopener,noreferrer");
  };

  // Check if user is already logged in when component mounts with plan param
  useEffect(() => {
    if (!planParam || !supabase) return;

    const checkExistingUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // User is already logged in, open checkout immediately
        await openCheckout(planParam);
      }
    };

    checkExistingUser();
  }, [planParam]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Save plan to sessionStorage for OAuth redirect
      if (planParam) {
        sessionStorage.setItem('pendingPlan', planParam);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login${planParam ? `?plan=${planParam}` : ''}`
        }
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
      sessionStorage.removeItem('pendingPlan');
    } finally {
      setLoading(false);
    }
  };

  // Check for pending plan after OAuth redirect
  useEffect(() => {
    const pendingPlan = sessionStorage.getItem('pendingPlan');
    if (pendingPlan && supabase) {
      const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await openCheckout(pendingPlan);
          sessionStorage.removeItem('pendingPlan');
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }
      };
      checkUser();
    }
  }, [navigate]);

  // Initialize Turnstile widget when signup view is active
  useEffect(() => {
    let currentWidgetId = null;
    let timer = null;

    if (view !== 'signup') {
      // Cleanup when leaving signup view
      if (turnstileWidgetId && window.turnstile) {
        try {
          window.turnstile.remove(turnstileWidgetId);
        } catch (error) {
          // Ignore errors if widget already removed
        }
        setTurnstileWidgetId(null);
      }
      setTurnstileToken(null);
      return;
    }

    if (!window.turnstile) {
      console.warn('Turnstile script not loaded yet');
      return;
    }

    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if (!siteKey) {
      console.warn('Turnstile Site Key not found. Please add VITE_TURNSTILE_SITE_KEY to your environment variables.');
      return;
    }

    // Reset token when switching to signup
    setTurnstileToken(null);

    // Wait for the DOM element to be available (wait for animation to complete)
    const checkAndRender = () => {
      const container = turnstileContainerRef.current;
      if (!container) {
        // Retry after a short delay if container not found
        timer = setTimeout(checkAndRender, 100);
        return;
      }

      // Check if widget already exists in the container (cleanup first)
      const existingWidget = container.querySelector('.cf-turnstile');
      if (existingWidget) {
        try {
          // Try to get widget ID from the element
          const widgetIdAttr = existingWidget.getAttribute('data-widget-id');
          if (widgetIdAttr && window.turnstile) {
            window.turnstile.remove(widgetIdAttr);
          }
        } catch (error) {
          // Ignore errors
        }
        // Clear the container
        container.innerHTML = '';
      }

      // Also cleanup previous widget from state if exists
      if (turnstileWidgetId && window.turnstile) {
        try {
          window.turnstile.remove(turnstileWidgetId);
        } catch (error) {
          // Ignore if already removed
        }
      }

      // Render Turnstile widget with the actual HTMLElement
      try {
        const widgetId = window.turnstile.render(container, {
          sitekey: siteKey,
          callback: (token) => {
            setTurnstileToken(token);
          },
          'error-callback': () => {
            setTurnstileToken(null);
            // Don't set error here - let the user retry by resetting the widget
            // The error will be shown when they try to submit without a token
          },
          'expired-callback': () => {
            setTurnstileToken(null);
          },
        });

        currentWidgetId = widgetId;
        setTurnstileWidgetId(widgetId);
      } catch (error) {
        console.error('Error rendering Turnstile widget:', error);
      }
    };

    // Wait a bit for the animation to complete and DOM to be ready
    timer = setTimeout(checkAndRender, 350);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      // Cleanup: remove widget using the current widget ID
      if (currentWidgetId && window.turnstile) {
        try {
          window.turnstile.remove(currentWidgetId);
        } catch (error) {
          // Ignore errors if widget already removed
        }
      } else if (turnstileWidgetId && window.turnstile) {
        try {
          window.turnstile.remove(turnstileWidgetId);
        } catch (error) {
          // Ignore errors if widget already removed
        }
      }
    };
  }, [view]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (view === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        
        // If plan is present, open checkout
        if (planParam && data?.user) {
          await openCheckout(planParam);
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else {
          navigate('/dashboard');
        }
      } else if (view === 'signup') {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }

        // Honeypot check - if this field is filled, it's a bot
        if (honeypot && honeypot.trim() !== '') {
          // Silently block bot without revealing why
          console.warn('Bot detected via honeypot field');
          setError('Registration failed. Please try again.');
          return;
        }

        // Verify Turnstile token before signup
        if (!turnstileToken) {
          throw new Error("Please complete the security verification");
        }

        const turnstileWorkerUrl = import.meta.env.VITE_TURNSTILE_WORKER_URL || 'https://turnstile-verification.fancy-sky-7888.workers.dev';
        const verifyResponse = await fetch(`${turnstileWorkerUrl}/api/verify-turnstile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: turnstileToken,
          }),
        });

        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Security verification failed. Please try again.');
        }

        const verifyResult = await verifyResponse.json();
        if (!verifyResult.success) {
          throw new Error('Security verification failed. Please try again.');
        }

        // Only proceed with signup if Turnstile verification passed
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login${planParam ? `?plan=${planParam}` : ''}`,
          }
        });
        
        if (error) {
          // Check if it's an email sending error
          if (error.message && error.message.includes('confirmation email')) {
            throw new Error('Email configuration error. Please contact support or check your Supabase email settings.');
          }
          
          // Check if email already exists
          if (error.message && (
            error.message.toLowerCase().includes('already registered') ||
            error.message.toLowerCase().includes('user already exists') ||
            error.message.toLowerCase().includes('email already registered') ||
            error.message.toLowerCase().includes('user already registered') ||
            error.code === 'signup_disabled' ||
            error.status === 422
          )) {
            throw new Error('This email is already registered. Please sign in instead or use a different email address.');
          }
          
          throw error;
        }
        
        // Check if user already exists
        // Supabase behavior: 
        // - New user: returns user with no session (if email confirmation enabled)
        // - Existing confirmed user: Supabase should return an error, but if not, we check email_confirmed_at
        // - Existing unconfirmed user: Supabase might return user without error
        if (data?.user) {
          // If user has email_confirmed_at and it's not null, they already exist and are confirmed
          // But we need to be careful - a new user won't have this set
          // The safest approach: if Supabase didn't return an error, assume it's a new user
          // Only check email_confirmed_at if it's explicitly set (not null/undefined)
          
          // If we got a session from signup, user was just created and email confirmation is disabled
          if (data?.session) {
            // User is already confirmed (if email confirmation is disabled)
            navigate('/dashboard');
            return;
          }
          
          // User needs to confirm email
          // Supabase will handle duplicate emails by returning an error, so if we got here without error, it's a new user
          setMessage("Check your email for the confirmation link! If you don't receive it, check your spam folder.");
        }
        // Note: For signup, checkout will open after email confirmation when user signs in
      } else if (view === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login${planParam ? `?plan=${planParam}` : ''}`,
        });
        if (error) throw error;
        setMessage("Password reset link sent to your email.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const Logo = () => (
    <Link to="/" className="flex items-center gap-3 mb-8 transition-opacity hover:opacity-80">
      <div className="size-12 text-primary">
        <svg fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="#135bec" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4"></path>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="#10b981" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4"></path>
        </svg>
      </div>
      <h2 className="text-3xl font-bold leading-tight tracking-tight text-white">
        <b><span className="text-[#10b981]">Good</span></b>
        <b><span className="text-[#135bec]"> Link</span></b>
      </h2>
    </Link>
  );

  return (
    <div className="min-h-screen w-full bg-[#101622] flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] size-96 bg-primary/20 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] size-96 bg-[#10b981]/10 blur-[120px] rounded-full"></div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        <Logo />

        <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative">
          {planParam && (
            <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg text-center">
              <p className="text-sm text-primary font-bold">
                Complete your {planParam.toUpperCase()} plan purchase
              </p>
            </div>
          )}
          <AnimatePresence mode="wait">
            {view === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-6"
              >
                <div className="text-center mb-2">
                  <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
                  <p className="text-slate-400">Log in to your GoodLink.ai account</p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg text-center animate-in fade-in zoom-in duration-200">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-sm p-3 rounded-lg text-center animate-in fade-in zoom-in duration-200">
                    {message}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-300 ml-1">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="name@example.com"
                      className="h-12 w-full bg-[#192233] border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-primary/50 transition-colors"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-sm font-bold text-slate-300">Password</label>
                      <button 
                        type="button"
                        onClick={() => {
                          setView('forgot-password');
                          setHoneypot('');
                          setError(null);
                          setMessage(null);
                        }}
                        className="text-xs text-primary hover:text-primary/80 font-bold transition-colors"
                      >
                        Forgot?
                      </button>
                    </div>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      className="h-12 w-full bg-[#192233] border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-primary/50 transition-colors"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="h-12 w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading && <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                    Sign In
                  </button>
                </form>

                <div className="relative flex items-center justify-center my-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                  <span className="relative z-10 bg-[#161d2b] px-4 text-xs text-slate-500 font-bold uppercase tracking-widest">Or continue with</span>
                </div>

                <button 
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="h-12 w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                >
                  <svg className="size-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>

                <p className="text-center text-sm text-slate-400 mt-2">
                  Don't have an account? {' '}
                  <button onClick={() => { setView('signup'); setError(null); setMessage(null); setHoneypot(''); }} className="text-primary hover:text-primary/80 font-bold transition-colors underline-offset-4 hover:underline">
                    Create one for free
                  </button>
                </p>
              </motion.div>
            )}

            {view === 'signup' && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-6"
              >
                <div className="text-center mb-2">
                  <h1 className="text-2xl font-bold text-white mb-2">Join GoodLink.ai</h1>
                  <p className="text-slate-400">Start securing your data today</p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg text-center">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-sm p-3 rounded-lg text-center">
                    {message}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-300 ml-1">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="name@example.com"
                      className="h-12 w-full bg-[#192233] border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-primary/50 transition-colors"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-300 ml-1">Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      className="h-12 w-full bg-[#192233] border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-primary/50 transition-colors"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-300 ml-1">Confirm Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      className="h-12 w-full bg-[#192233] border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-primary/50 transition-colors"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  {/* Honeypot field - hidden from humans, traps bots */}
                  <input
                    type="text"
                    name="website"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    style={{
                      position: 'absolute',
                      left: '-9999px',
                      width: '1px',
                      height: '1px',
                      opacity: 0,
                      pointerEvents: 'none'
                    }}
                    aria-hidden="true"
                  />
                  
                  {/* Turnstile Widget - only for email signup */}
                  <div ref={turnstileContainerRef} id="turnstile-widget" className="flex justify-center min-h-[65px]"></div>
                  
                  {/* Reset Turnstile button - shown when widget fails */}
                  {!turnstileToken && turnstileWidgetId && (
                    <button
                      type="button"
                      onClick={() => {
                        // Reset the widget
                        if (window.turnstile && turnstileWidgetId) {
                          try {
                            window.turnstile.remove(turnstileWidgetId);
                          } catch (e) {
                            // Ignore
                          }
                        }
                        setTurnstileWidgetId(null);
                        setTurnstileToken(null);
                        // Force re-render by clearing the container
                        const container = turnstileContainerRef.current;
                        if (container) {
                          container.innerHTML = '';
                        }
                        // Re-render will happen automatically via useEffect
                      }}
                      className="text-xs text-primary hover:text-primary/80 font-bold transition-colors underline-offset-4 hover:underline mb-2"
                    >
                      Reset security verification
                    </button>
                  )}
                  
                  <button type="submit" disabled={loading || !turnstileToken} className="h-12 w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {loading && <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                    Create Account
                  </button>
                </form>

                <div className="relative flex items-center justify-center my-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                  <span className="relative z-10 bg-[#161d2b] px-4 text-xs text-slate-500 font-bold uppercase tracking-widest">Or join with</span>
                </div>

                <button onClick={handleGoogleLogin} disabled={loading} className="h-12 w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all disabled:opacity-50">
                  <svg className="size-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>

                <p className="text-center text-sm text-slate-400 mt-2">
                  Already have an account? {' '}
                  <button onClick={() => { setView('login'); setError(null); setMessage(null); setHoneypot(''); }} className="text-primary hover:text-primary/80 font-bold transition-colors underline-offset-4 hover:underline">
                    Sign In
                  </button>
                </p>
              </motion.div>
            )}

            {view === 'forgot-password' && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-6"
              >
                <div className="text-center mb-2">
                  <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
                  <p className="text-slate-400">We'll send you recovery instructions</p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg text-center">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-sm p-3 rounded-lg text-center">
                    {message}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-300 ml-1">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="name@example.com"
                      className="h-12 w-full bg-[#192233] border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-primary/50 transition-colors"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" disabled={loading} className="h-12 w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                    {loading && <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                    Send Link
                  </button>
                </form>

                <button 
                  onClick={() => { setView('login'); setError(null); setMessage(null); setHoneypot(''); }}
                  className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group"
                >
                  <span className="material-symbols-outlined text-sm transition-transform group-hover:-translate-x-1">arrow_back</span>
                  Back to Login
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 text-xs text-slate-500 text-center max-w-[280px]">
          By continuing, you agree to GoodLink's <a href="#" className="underline">Terms of Service</a> and <a href="#" className="underline">Privacy Policy</a>.
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

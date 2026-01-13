import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const CTASection = () => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const navigate = useNavigate();

  // פונקציה לאתחול Lemon Squeezy ברגע שהקומפוננטה עולה
  useEffect(() => {
    if (window.createLemonSqueezy) {
      window.createLemonSqueezy();
    }

    // Get current user and profile if logged in
    if (supabase) {
      const fetchUserAndProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          // Get user profile to check subscription status
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('plan_type, subscription_status, lemon_squeezy_customer_portal_url')
            .eq('user_id', user.id)
            .single();

          if (!error && profile) {
            setUserProfile(profile);
          }
        } else {
          setUserProfile(null);
        }
      };

      fetchUserAndProfile();

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          // Get user profile
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('plan_type, subscription_status, lemon_squeezy_customer_portal_url')
            .eq('user_id', currentUser.id)
            .single();

          if (!error && profile) {
            setUserProfile(profile);
          }
        } else {
          setUserProfile(null);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const plans = [
    {
      name: 'START',
      price: '9.99',
      description: 'Perfect for getting started',
      features: [
        'Basic link management',
        'Up to 1,000 clicks/month',
        'Standard analytics',
        'Email support'
      ],
      highlighted: false,
      checkoutUrl: 'https://goodlink.lemonsqueezy.com/checkout/buy/54a3e3e3-3618-4922-bce6-a0617252f1ae?embed=1',
      buttonText: 'Get Started'
    },
    {
      name: 'ADVANCED',
      price: '19.99',
      description: 'For growing businesses',
      features: [
        'Advanced link management',
        'Up to 10,000 clicks/month',
        'Real-time analytics',
        'Priority email support',
        'Custom domains',
        'Pixel tracking'
      ],
      highlighted: true,
      checkoutUrl: 'https://goodlink.lemonsqueezy.com/checkout/buy/81876116-924c-44f7-b61c-f4a8a93e83f1?embed=1',
      buttonText: 'Go Advanced'
    },
    {
      name: 'PRO',
      price: '59.99',
      description: 'For power users',
      features: [
        'Unlimited link management',
        'Unlimited clicks',
        'Advanced analytics',
        '24/7 priority support',
        'Unlimited custom domains',
        'Advanced pixel tracking',
        'API access',
        'White-label options'
      ],
      highlighted: false,
      checkoutUrl: 'https://goodlink.lemonsqueezy.com/checkout/buy/924daf77-b7b3-405d-a94a-2ad2cc476da4?embed=1',
      buttonText: 'Go Pro'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <section id="pricing" className="py-20 px-6 md:px-20 bg-background-light dark:bg-background-dark">
      <div className="mx-auto max-w-[1200px] flex flex-col gap-16">
        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center gap-4 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary border border-primary/20">
            Pricing
          </div>
          <h2 className="text-slate-900 dark:text-white tracking-tight text-3xl md:text-5xl font-black leading-tight">
            Choose Your Plan
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg md:text-xl font-normal leading-relaxed">
            Flexible pricing designed to scale with your business. Start free, upgrade when you're ready.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              variants={itemVariants}
              className={`relative flex flex-col rounded-xl border-2 transition-all duration-300 ${
                plan.highlighted
                  ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-2xl scale-105 md:scale-110'
                  : 'border-slate-200 dark:border-[#324467] bg-white dark:bg-[#192233]/50 hover:border-primary/50 hover:shadow-xl'
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider z-10">
                  Most Popular
                </span>
              )}

              <div className={`p-8 flex flex-col gap-6 ${plan.highlighted ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
                {/* Plan Header */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-slate-900 dark:text-white text-2xl font-black">{plan.name}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1">
                  <span className="text-slate-900 dark:text-white text-5xl font-black">${plan.price}</span>
                  <span className="text-slate-500 dark:text-slate-400 text-lg font-medium">/month</span>
                </div>

                {/* Features List */}
                <ul className="flex flex-col gap-4 mt-2">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        plan.highlighted ? 'text-primary' : 'text-primary'
                      }`} />
                      <span className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={async () => {
                    try {
                      if (user) {
                        // Fetch fresh profile data to ensure we have the latest subscription info
                        const { data: profile, error } = await supabase
                          .from('profiles')
                          .select('plan_type, subscription_status, lemon_squeezy_customer_portal_url')
                          .eq('user_id', user.id)
                          .single();

                        console.log('Profile data:', profile);
                        console.log('Profile error:', error);

                        // Check if user has a paid subscription (not FREE) and customer portal URL
                        if (profile && profile.plan_type !== 'free' && profile.lemon_squeezy_customer_portal_url) {
                          const portalUrl = profile.lemon_squeezy_customer_portal_url;
                          console.log('Redirecting to customer portal:', portalUrl);
                          
                          // Validate URL before redirecting
                          try {
                            new URL(portalUrl);
                            // Redirect to customer portal
                            window.location.href = portalUrl;
                            return;
                          } catch (urlError) {
                            console.error('Invalid customer portal URL:', portalUrl, urlError);
                            // Continue to checkout if URL is invalid
                          }
                        }

                        // Otherwise, open Lemon Squeezy checkout directly
                        const separator = plan.checkoutUrl.includes('?') ? '&' : '?';
                        const checkoutUrl = `${plan.checkoutUrl}${separator}checkout[custom][user_id]=${user.id}`;
                        console.log('Opening checkout:', checkoutUrl);
                        if (window.LemonSqueezy) {
                          window.LemonSqueezy.Url.Open(checkoutUrl);
                        } else {
                          window.location.href = checkoutUrl;
                        }
                      } else {
                        // If user is not logged in, redirect to login with plan parameter
                        const planName = plan.name.toLowerCase();
                        navigate(`/login?plan=${planName}`);
                      }
                    } catch (err) {
                      console.error('Error in button click:', err);
                      // Fallback to checkout if there's an error
                      if (user) {
                        const checkoutUrl = `${plan.checkoutUrl}&checkout[custom][user_id]=${user.id}`;
                        if (window.LemonSqueezy) {
                          window.LemonSqueezy.Url.Open(checkoutUrl);
                        } else {
                          window.location.href = checkoutUrl;
                        }
                      }
                    }
                  }}
                  className={`lemonsqueezy-button mt-auto w-full py-4 px-6 rounded-lg font-bold text-base transition-all text-center inline-block active:scale-95 ${
                    plan.highlighted
                      ? 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30'
                      : 'bg-slate-100 dark:bg-[#232f48] hover:bg-slate-200 dark:hover:bg-[#324467] text-slate-900 dark:text-white'
                  }`}
                >
                  {plan.buttonText}
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;

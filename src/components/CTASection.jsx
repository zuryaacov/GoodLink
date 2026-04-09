import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const CTASection = () => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const navigate = useNavigate();

  // Get current user and profile if logged in
  useEffect(() => {
    if (!supabase) return;

    // Fetch user and profile ONCE on mount
    const fetchUserAndProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan_type, lemon_squeezy_customer_portal_url, email')
          .eq('user_id', user.id)
          .single();
        setUserProfile(profile || null);
      } else {
        setUserProfile(null);
      }
    };

    fetchUserAndProfile();

    // NO onAuthStateChange at all - remove it completely for now
  }, []);

  const plans = [
    {
      name: 'STARTER',
      price: '5',
      originalPrice: '10',
      description: 'Perfect for getting started',
      features: [
        'Unlimited Links',
        'Unlimited QR Codes',
        'Unlimited Clicks',
        'Standard Analytics',
        'Email Support',
      ],
      highlighted: false,
      checkoutUrl:
        'https://goodlink.lemonsqueezy.com/checkout/buy/54a3e3e3-3618-4922-bce6-a0617252f1ae?embed=1',
      buttonText: 'Get Started',
    },
    {
      name: 'ADVANCED',
      price: '10',
      originalPrice: '26',
      description: 'For growing businesses',
      features: [
        'Unlimited Links',
        'Unlimited QR Codes',
        'Unlimited Clicks',
        'Email Support',
        '10 Custom Domains',
        'Workspaces, Campaigns and Groups',
        'Bot Protection',
        'UTM Presets',
        'Advanced Analytics',
      ],
      highlighted: true,
      checkoutUrl:
        'https://goodlink.lemonsqueezy.com/checkout/buy/81876116-924c-44f7-b61c-f4a8a93e83f1?embed=1',
      buttonText: 'Go Advanced',
    },
    {
      name: 'PRO',
      price: '20',
      originalPrice: '62',
      description: 'For power users',
      features: [
        'Unlimited Links',
        'Unlimited QR Codes',
        'Unlimited Clicks',
        'Workspaces, Campaigns and Groups',
        'Bot Protection',
        'UTM Presets',
        'Unlimited Custom Domains',
        'Geo Redirect',
        'Conversion API & S2S tracking',
        'Pro Analytics',
        'Expedited Support',
      ],
      highlighted: false,
      checkoutUrl:
        'https://goodlink.lemonsqueezy.com/checkout/buy/924daf77-b7b3-405d-a94a-2ad2cc476da4?embed=1',
      buttonText: 'Go Pro',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  };

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="scroll-mt-20 py-20 px-6 md:px-20 bg-white"
    >
      <div className="mx-auto max-w-[1440px] flex flex-col gap-16">
        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center gap-4 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center rounded-full bg-[#c0ffa5]/30 px-3 py-1 text-sm font-medium text-[#047857] border border-[#c0ffa5]/50">
            Pricing
          </div>
          <h2 id="pricing-heading" className="text-slate-900 dark:text-[#1b1b1b] tracking-tight text-3xl md:text-5xl font-black leading-tight">
            Choose Your Plan
          </h2>
          <p className="text-slate-600 dark:text-[#1b1b1b] text-lg md:text-xl font-normal leading-relaxed">
            Flexible pricing designed to scale with your business. Start with a low-cost entry plan,
            upgrade when you're ready.
          </p>
        </motion.div>

        {/* Pricing sub-heading: icon on top, then 3 lines – all centered */}
        <div className="flex justify-center">
          <div className="flex flex-col items-center justify-center gap-1 text-center text-black font-extrabold tracking-wide text-3xl md:text-5xl">
            <span className="text-3xl md:text-5xl">🎁</span>
            <span>Get 30-Day Free Trial</span>
            <span>
              Everything in <span className="text-[#a855f7] text-4xl md:text-6xl">PRO</span>
            </span>
            <span>No credit card required</span>
          </div>
        </div>

        {/* CTA button (same as Hero) – hide when user is logged in */}
        {!user && (
          <div className="flex justify-center mt-6">
            <Link
              to="/login?mode=signup"
              className="inline-flex h-14 md:h-16 min-w-[200px] md:min-w-[240px] items-center justify-center rounded-xl bg-[#a855f7] hover:bg-[#9333ea] px-10 md:px-12 text-white text-base md:text-lg font-bold tracking-wide transition-all"
            >
              Start your 30-day free trial
            </Link>
          </div>
        )}

        {/* Pricing Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 xl:gap-10 items-stretch"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={itemVariants}
              className={`group relative flex flex-col h-full transition-all duration-300 ${
                plan.highlighted
                  ? 'bg-[#c7edb8] p-8 lg:p-10 xl:p-12 rounded-[2.5rem] shadow-[0_32px_64px_rgba(74,61,196,0.12)] scale-100 xl:scale-105 z-10 border-4 border-white hover:border-[#a855f7]'
                  : 'bg-[#f3f3f4] p-8 lg:p-10 rounded-[2rem] border border-[#c8c4d6]/20 hover:border-[#a855f7]'
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 bg-[#a855f7] text-white text-xs font-black rounded-full uppercase tracking-widest shadow-lg">
                  Most Popular
                </span>
              )}

              <div className="flex flex-col h-full">
                <div className="mb-8">
                  <h3
                    className={`mb-2 ${
                      plan.highlighted
                        ? 'text-3xl font-black text-[#032102]'
                        : 'text-2xl font-bold text-slate-900'
                    }`}
                  >
                    {plan.highlighted ? 'ADVANCED' : plan.name}
                  </h3>
                  <p
                    className={`text-sm ${
                      plan.highlighted ? 'text-[#2f4e27] font-medium' : 'text-slate-600'
                    }`}
                  >
                    {plan.description}
                  </p>
                </div>

                <div className="mb-10 flex items-baseline gap-1">
                  <span
                    className={`tracking-tighter ${
                      plan.highlighted
                        ? 'text-7xl font-extrabold text-[#032102]'
                        : 'text-5xl font-extrabold text-slate-900'
                    }`}
                  >
                    ${plan.price}
                  </span>
                  <span
                    className={`font-medium ${
                      plan.highlighted ? 'text-[#2f4e27] font-bold' : 'text-slate-500'
                    }`}
                  >
                    /mo
                  </span>
                </div>

                <button
                  type="button"
                  disabled={plan.name !== 'PRO' || !!user}
                  onClick={(e) => {
                    e.preventDefault();
                    if (plan.name !== 'PRO' || user) return;
                    navigate('/login?mode=signup');
                  }}
                  className={`mb-10 w-full text-center inline-block active:scale-95 transition-all ${
                    plan.highlighted
                      ? plan.name === 'PRO' && !user
                        ? 'py-5 rounded-full bg-[#a855f7] text-white font-black text-lg shadow-xl shadow-[#a855f7]/30 hover:bg-[#9333ea] cursor-pointer transition-colors'
                        : 'py-5 rounded-full bg-slate-300 text-slate-500 font-black text-lg cursor-not-allowed'
                      : plan.name === 'PRO' && !user
                        ? 'py-4 rounded-full border border-[#787585] text-[#5549d0] font-bold hover:bg-[#eeeeee] cursor-pointer'
                        : 'py-4 rounded-full border border-[#787585] text-[#5549d0] font-bold cursor-not-allowed'
                  }`}
                >
                  {plan.name === 'PRO' ? '30-Day Free Trial' : plan.buttonText}
                </button>

                <ul className="space-y-6 mb-2 flex-grow">
                  {plan.features.map((feature, featureIndex) => {
                    const purpleFeatures = ['10 Custom Domains', 'Workspaces, Campaigns and Groups', 'Bot Protection', 'UTM Presets', 'Advanced Analytics', 'Unlimited Custom Domains', 'Geo Redirect', 'Conversion API & S2S tracking', 'Pro Analytics', 'Expedited Support'];
                    const proBlackFeatures = ['Workspaces, Campaigns and Groups', 'Bot Protection', 'UTM Presets'];
                    const isBlack = plan.name === 'PRO' && proBlackFeatures.includes(feature);
                    const isPurple = !isBlack && purpleFeatures.includes(feature);
                    return (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <Check
                          aria-hidden="true"
                          className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                            plan.highlighted ? 'text-[#032102]' : 'text-[#46673d]'
                          }`}
                        />
                        <span
                          className={`text-sm md:text-base font-semibold leading-relaxed ${
                            isBlack
                              ? 'text-black'
                              : isPurple
                                ? 'text-[#7c3aed]'
                                : plan.highlighted
                                  ? 'text-[#032102]'
                                  : 'text-slate-700'
                          }`}
                        >
                          {feature}
                        </span>
                      </li>
                    );
                  })}
                </ul>

              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;

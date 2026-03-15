import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
        '10 Custom Domains',
        'Unlimited QR Codes',
        'Unlimited Clicks',
        'Workspaces, Campaigns and Groups',
        'Bot Protection',
        'UTM Presets',
        'Advanced Analytics',
        'Email Support',
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
        'Unlimited Custom Domains',
        'Unlimited QR Codes',
        'Unlimited Clicks',
        'Workspaces, Campaigns and Groups',
        'Bot Protection',
        'Conversion API & S2S tracking',
        'UTM Presets',
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
      className="scroll-mt-20 py-20 px-6 md:px-20 bg-white"
    >
      <div className="mx-auto max-w-[1200px] flex flex-col gap-16">
        {/* Headline */}
        <motion.div
          id="pricing-heading"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center gap-4 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center rounded-full bg-[#c0ffa5]/30 px-3 py-1 text-sm font-medium text-[#0b996f] border border-[#c0ffa5]/50">
            Pricing
          </div>
          <h2 className="text-slate-900 dark:text-[#1b1b1b] tracking-tight text-3xl md:text-5xl font-black leading-tight">
            Choose Your Plan
          </h2>
          <p className="text-slate-600 dark:text-[#1b1b1b] text-lg md:text-xl font-normal leading-relaxed">
            Flexible pricing designed to scale with your business. Start with a low-cost entry plan,
            upgrade when you're ready.
          </p>
        </motion.div>

        {/* Pricing sub-heading: 30-day trial message – 3 lines, sentence case, PRO larger */}
        <div className="flex justify-center">
          <div className="inline-flex flex-col items-center gap-0 text-center text-[#6358de] font-extrabold tracking-wide text-3xl md:text-5xl">
            <span className="flex items-center gap-2">
              <span>🎁</span>
              <span>Get 30-Day Free Trial</span>
            </span>
            <span>
              Everything in <span className="text-4xl md:text-6xl">PRO</span>
            </span>
            <span>No credit card required</span>
          </div>
        </div>

        {/* Pricing Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={itemVariants}
              className={`relative flex flex-col rounded-xl border-2 transition-all duration-300 w-full md:max-w-md md:mx-auto lg:max-w-none lg:mx-0 ${
                plan.highlighted
                  ? 'border-[#c0ffa5] bg-[#c0ffa5]/10 shadow-2xl scale-105 lg:scale-110'
                  : 'border-slate-200 dark:border-slate-200 bg-white dark:bg-white hover:border-[#c0ffa5]/50 hover:shadow-xl'
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#c0ffa5] text-[#1b1b1b] text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider z-10">
                  Most Popular
                </span>
              )}

              <div className="p-8 flex flex-col gap-6">
                {/* Top highlight area: header + price + CTA */}
                <div
                  className={`-mx-8 -mt-8 px-8 pt-8 pb-6 ${
                    plan.highlighted ? 'bg-[#0b996f]/15' : 'bg-[#0b996f]/15'
                  }`}
                >
                  {/* Plan Header */}
                  <div className="flex flex-col gap-2">
                    <h3 className="text-slate-900 dark:text-[#1b1b1b] text-2xl font-black">
                      {plan.name}
                    </h3>
                    <p className="text-slate-500 dark:text-[#1b1b1b] text-sm">
                      {plan.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-2 flex-wrap mt-4">
                    {plan.originalPrice && (
                      <span className="hidden text-slate-500 dark:text-slate-400 text-5xl font-black line-through">
                        ${plan.originalPrice}
                      </span>
                    )}
                    <span className="text-slate-900 dark:text-[#1b1b1b] text-5xl font-black">
                      ${plan.price}
                    </span>
                    <span className="text-slate-500 dark:text-[#1b1b1b] text-lg font-medium">
                      /month
                    </span>
                  </div>

                  {/* CTA Button (directly under price) */}
                  <button
                    type="button"
                    disabled={plan.name !== 'PRO' || !!user}
                    onClick={(e) => {
                      e.preventDefault();
                      // Only allow click on PRO when user is not logged in
                      if (plan.name !== 'PRO' || user) return;

                      // For 30-day free trial we send users to signup
                      navigate('/login?mode=signup');

                      // 🔒 Future: when 30-day free trial is removed,
                      // uncomment this block to send logged-in users directly to Lemon Squeezy:
                      /*
                      if (!user) {
                        navigate(`/login?plan=${plan.name.toLowerCase()}`);
                        return;
                      }

                      let targetUrl;
                      if (
                        userProfile?.plan_type !== 'free' &&
                        userProfile?.lemon_squeezy_customer_portal_url
                      ) {
                        targetUrl = userProfile.lemon_squeezy_customer_portal_url;
                      } else {
                        const baseUrl = plan.checkoutUrl.split('?')[0];
                        const q = [];
                        const emailToUse = (userProfile?.email || user.email || '').trim();
                        console.log(
                          '[LS Checkout][CTA] emailToUse=',
                          emailToUse,
                          'user.email=',
                          user?.email,
                          'profile.email=',
                          userProfile?.email
                        );
                        if (emailToUse) {
                          q.push(`checkout[email]=${encodeURIComponent(emailToUse)}`);
                        }
                        q.push(`checkout[custom][user_id]=${encodeURIComponent(user.id)}`);
                        q.push('embed=1');
                        targetUrl = `${baseUrl}?${q.join('&')}`;
                        console.log('[LS Checkout][CTA] targetUrl=', targetUrl);
                      }

                      window.open(targetUrl, '_blank', 'noopener,noreferrer');
                      */
                    }}
                    className={`mt-6 w-full py-4 px-6 rounded-lg font-bold text-base transition-all text-center inline-block active:scale-95 ${
                      plan.name === 'PRO' && !user
                        ? 'bg-[#6358de] hover:bg-[#5348c7] text-white shadow-lg shadow-[#6358de]/30'
                        : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {plan.name === 'PRO' ? '30-Day Free Trial' : plan.buttonText}
                  </button>
                </div>

                {/* Features List */}
                <ul className="flex flex-col gap-4 mt-4">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check
                        className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#6358de] font-bold stroke-[2.5]"
                      />
                      <span className="text-slate-700 dark:text-slate-300 text-base md:text-lg font-bold leading-relaxed">
                        {feature}
                      </span>
                    </li>
                  ))}
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

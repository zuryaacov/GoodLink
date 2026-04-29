import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const CTASection = () => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!supabase) return;

    const fetchUserAndProfile = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);

      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select(
            'plan_type, subscription_status, lemon_squeezy_customer_portal_url, lemon_squeezy_subscription_data, email'
          )
          .eq('user_id', currentUser.id)
          .single();
        setUserProfile(profile || null);
      } else {
        setUserProfile(null);
      }
    };

    fetchUserAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchUserAndProfile();
    });

    return () => authListener?.subscription?.unsubscribe();
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
        'https://goodlink.lemonsqueezy.com/checkout/buy/1014444?embed=1',
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
        'SuperLinks Included',
        'Password-Protected Access',
        'Custom Usage & Click Limits',
        'Time-Expiring Links',
      ],
      highlighted: false,
      checkoutUrl:
        'https://goodlink.lemonsqueezy.com/checkout/buy/1591830?embed=1',
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
        'SuperLinks Included',
        'Password-Protected Access',
        'Custom Usage & Click Limits',
        'Time-Expiring Links',
      ],
      highlighted: true,
      checkoutUrl:
        'https://goodlink.lemonsqueezy.com/checkout/buy/1014504?embed=1',
      buttonText: 'Go Pro',
    },
  ];

  const planKeyFromName = (name) =>
    name === 'STARTER' ? 'starter' : name === 'ADVANCED' ? 'advanced' : 'pro';

  const currentPlan = userProfile?.plan_type || 'free';
  const isFreeTrial =
    userProfile?.subscription_status === 'free_trial' ||
    userProfile?.subscription_status === 'free_plan';
  const isCancelled = userProfile?.subscription_status === 'cancelled';
  const currentPlanKey =
    isCancelled || isFreeTrial
      ? null
      : currentPlan === 'start' || currentPlan === 'starter'
        ? 'starter'
        : currentPlan === 'advanced'
          ? 'advanced'
          : currentPlan === 'pro'
            ? 'pro'
            : null;
  const currentPlanPrice =
    currentPlanKey === 'starter'
      ? 5
      : currentPlanKey === 'advanced'
        ? 10
        : currentPlanKey === 'pro'
          ? 20
          : 0;
  const subscriptionData = userProfile?.lemon_squeezy_subscription_data;
  const parsedSubscriptionData =
    typeof subscriptionData === 'string'
      ? (() => {
          try {
            return JSON.parse(subscriptionData);
          } catch {
            return null;
          }
        })()
      : subscriptionData;
  const hasSubscriptionData = parsedSubscriptionData != null;
  const updateSubscriptionUrl =
    parsedSubscriptionData?.data?.attributes?.urls?.customer_portal_update_subscription;
  const hasActivePaidSubscription = !!user && !isCancelled && !isFreeTrial && currentPlanKey != null;

  const openCheckout = (plan) => {
    if (!user) {
      navigate('/login?mode=signup');
      return;
    }

    if (hasActivePaidSubscription && hasSubscriptionData && updateSubscriptionUrl) {
      window.open(updateSubscriptionUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const baseUrl = plan.checkoutUrl.split('?')[0];
    const q = [];
    const emailToUse = (userProfile?.email || user.email || '').trim();
    if (emailToUse) q.push(`checkout[email]=${encodeURIComponent(emailToUse)}`);
    q.push(`checkout[custom][user_id]=${encodeURIComponent(user.id)}`);
    q.push('embed=1');
    const targetUrl = `${baseUrl}?${q.join('&')}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

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
        </motion.div>

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

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 xl:grid-cols-3 gap-8 xl:gap-10 items-stretch"
        >
          {plans.map((plan) => {
            const planKey = planKeyFromName(plan.name);
            const isCurrentPlan = currentPlanKey != null && planKey === currentPlanKey;
            const isRecommendedForTrial = !!user && isFreeTrial && planKey === 'pro';
            const planPriceNum = Number(plan.price) || 0;
            const isDowngrade = currentPlanKey && planPriceNum < currentPlanPrice;
            const isFeaturedCard = user ? isCurrentPlan || isRecommendedForTrial : plan.highlighted;
            let buttonLabel = plan.buttonText;

            if (user) {
              if (isCurrentPlan) buttonLabel = 'Your current plan';
              else if (isDowngrade) buttonLabel = 'Switch to this plan';
            } else {
              buttonLabel = plan.name === 'PRO' ? 'Free 30-day Trial' : 'Start with Pro Trial';
            }

            return (
              <motion.div
                key={plan.name}
                variants={itemVariants}
                className={`group relative flex flex-col h-full transition-all duration-300 ${
                  isFeaturedCard
                    ? 'bg-[#c7edb8] p-8 lg:p-10 xl:p-12 rounded-[2.5rem] shadow-[0_32px_64px_rgba(74,61,196,0.12)] scale-100 xl:scale-105 z-10 border-4 border-white hover:border-[#a855f7]'
                    : 'bg-[#f3f3f4] p-8 lg:p-10 rounded-[2rem] border border-[#c8c4d6]/20 hover:border-[#a855f7]'
                } ${
                  plan.name === 'PRO'
                    ? 'order-1 xl:order-3'
                    : plan.name === 'ADVANCED'
                      ? 'order-2 xl:order-2'
                      : 'order-3 xl:order-1'
                }`}
              >
                {!user && plan.highlighted && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 bg-[#a855f7] text-white text-xs font-black rounded-full uppercase tracking-widest shadow-lg">
                    30-Day Free Trial
                  </span>
                )}
                {user && (isCurrentPlan || isRecommendedForTrial) && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 bg-[#0b996f] text-white text-xs font-black rounded-full uppercase tracking-widest shadow-lg">
                    {isCurrentPlan ? 'Current Plan' : 'Recommended'}
                  </span>
                )}

                <div className="flex flex-col h-full">
                  <div className="mb-8">
                    <h3
                      className={`mb-2 ${
                        isFeaturedCard
                          ? 'text-3xl font-black text-[#032102]'
                          : 'text-2xl font-bold text-slate-900'
                      }`}
                    >
                      {plan.name}
                    </h3>
                    <p
                      className={`text-sm ${
                        isFeaturedCard ? 'text-[#2f4e27] font-medium' : 'text-slate-600'
                      }`}
                    >
                      {plan.description}
                    </p>
                  </div>

                  <div className="mb-10 flex items-baseline gap-1">
                    <span
                      className={`tracking-tighter ${
                        isFeaturedCard
                          ? 'text-7xl font-extrabold text-[#032102]'
                          : 'text-5xl font-extrabold text-slate-900'
                      }`}
                    >
                      ${plan.price}
                    </span>
                    <span
                      className={`font-medium ${
                        isFeaturedCard ? 'text-[#2f4e27] font-bold' : 'text-slate-500'
                      }`}
                    >
                      /mo
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={!!user && isCurrentPlan}
                    onClick={(e) => {
                      e.preventDefault();
                      if (user && isCurrentPlan) return;
                      openCheckout(plan);
                    }}
                    className={`mb-10 w-full text-center inline-block active:scale-95 transition-all ${
                      isFeaturedCard
                        ? !user || !isCurrentPlan
                          ? 'py-5 rounded-full bg-[#a855f7] text-white font-black text-lg shadow-xl shadow-[#a855f7]/30 hover:bg-[#9333ea] cursor-pointer transition-colors'
                          : 'py-5 rounded-full bg-slate-300 text-slate-500 font-black text-lg cursor-not-allowed'
                        : !user || !isCurrentPlan
                          ? 'py-4 rounded-full border border-[#787585] text-[#5549d0] font-bold hover:bg-[#d7fec8] cursor-pointer'
                          : 'py-4 rounded-full border border-[#787585] text-[#5549d0] font-bold cursor-not-allowed'
                    }`}
                  >
                    {buttonLabel}
                  </button>

                  <ul className="space-y-6 mb-2 flex-grow">
                    {plan.features.map((feature, featureIndex) => {
                      const isSuperLinksIncluded = feature === 'SuperLinks Included';
                      const isSuperLinksSubFeature = [
                        'Password-Protected Access',
                        'Custom Usage & Click Limits',
                        'Time-Expiring Links',
                      ].includes(feature);
                      const purpleFeatures = [
                        '10 Custom Domains',
                        'Workspaces, Campaigns and Groups',
                        'Bot Protection',
                        'UTM Presets',
                        'Advanced Analytics',
                        'Unlimited Custom Domains',
                        'Geo Redirect',
                        'Conversion API & S2S tracking',
                        'Pro Analytics',
                        'Expedited Support',
                      ];
                      const proBlackFeatures = [
                        'Workspaces, Campaigns and Groups',
                        'Bot Protection',
                        'UTM Presets',
                      ];
                      const isBlack = plan.name === 'PRO' && proBlackFeatures.includes(feature);
                      const isPurple = !isBlack && purpleFeatures.includes(feature);
                      return (
                        <li key={featureIndex} className="flex items-start gap-3">
                          {isSuperLinksSubFeature ? (
                            <span className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
                          ) : (
                            <Check
                              aria-hidden="true"
                              className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                                isSuperLinksIncluded
                                  ? 'text-emerald-600'
                                  : isFeaturedCard
                                    ? 'text-[#032102]'
                                    : 'text-[#46673d]'
                              }`}
                            />
                          )}
                          <span
                            className={`text-sm md:text-base font-semibold leading-relaxed ${
                              isSuperLinksIncluded
                                ? 'text-[#7c3aed]'
                                : isBlack
                                ? 'text-black'
                                : isPurple
                                  ? 'text-[#7c3aed]'
                                  : isFeaturedCard
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
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;

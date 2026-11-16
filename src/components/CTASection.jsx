import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../i18n/LanguageContext';

const PRO_FEATURE_KEYS = [
  'featureUnlimitedLinks',
  'featureUnlimitedQr',
  'featureUnlimitedClicks',
  'featureWorkspaces',
  'featureBotProtection',
  'featureUtmPresets',
  'featureUnlimitedDomains',
  'featureGeoRedirect',
  'featureCapi',
  'featureProAnalytics',
  'featureExpeditedSupport',
  'featureSuperLinks',
  'featurePasswordAccess',
  'featureClickLimits',
  'featureTimeExpiring',
];

const CTASection = () => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const navigate = useNavigate();
  const { t } = useLanguage();

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

  // Homepage shows PRO only. Starter/Advanced kept commented for future re-enable.
  const plans = [
    // {
    //   name: 'STARTER',
    //   price: '5',
    //   originalPrice: '10',
    //   description: 'Perfect for getting started',
    //   features: [
    //     'Unlimited Links',
    //     'Unlimited QR Codes',
    //     'Unlimited Clicks',
    //     'Standard Analytics',
    //     'Email Support',
    //   ],
    //   highlighted: false,
    //   checkoutUrl:
    //     'https://goodlink.lemonsqueezy.com/checkout/buy/315d0e60-5a87-44f0-90c7-7f7789aa85a0?embed=1',
    //   buttonText: 'Get Started',
    // },
    // {
    //   name: 'ADVANCED',
    //   price: '10',
    //   originalPrice: '26',
    //   description: 'For growing businesses',
    //   features: [
    //     'Unlimited Links',
    //     'Unlimited QR Codes',
    //     'Unlimited Clicks',
    //     'Email Support',
    //     '10 Custom Domains',
    //     'Workspaces, Campaigns and Groups',
    //     'Bot Protection',
    //     'UTM Presets',
    //     'Advanced Analytics',
    //     'SuperLinks',
    //     'Password-Protected Access',
    //     'Custom Usage & Click Limits',
    //     'Time-Expiring Links',
    //   ],
    //   highlighted: false,
    //   checkoutUrl:
    //     'https://goodlink.lemonsqueezy.com/checkout/buy/f544686f-e91d-425b-a930-22d293fcd74e?embed=1',
    //   buttonText: 'Go Advanced',
    // },
    {
      name: 'PRO',
      price: '20',
      originalPrice: '62',
      description: 'For power users',
      featureKeys: PRO_FEATURE_KEYS,
      highlighted: true,
      checkoutUrl:
        'https://goodlink.lemonsqueezy.com/checkout/buy/a3649238-094e-4217-af3c-3b1f996f3c80?embed=1',
      buttonTextKey: 'goPro',
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
            {t('whatsIncludedBadge')}
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex justify-center w-full"
        >
          {plans.map((plan) => {
            const planKey = planKeyFromName(plan.name);
            const isCurrentPlan = currentPlanKey != null && planKey === currentPlanKey;
            const isRecommendedForTrial = !!user && isFreeTrial && planKey === 'pro';
            const planPriceNum = Number(plan.price) || 0;
            const isDowngrade = currentPlanKey && planPriceNum < currentPlanPrice;
            const isFeaturedCard = user ? isCurrentPlan || isRecommendedForTrial : plan.highlighted;
            let buttonLabel = t(plan.buttonTextKey || 'goPro');

            if (user) {
              if (isCurrentPlan) buttonLabel = t('yourCurrentPlan');
              else if (isDowngrade) buttonLabel = t('switchToThisPlan');
            } else {
              buttonLabel = t('signUp');
            }

            return (
              <motion.div
                key={plan.name}
                variants={itemVariants}
                className={`group relative flex flex-col w-[92%] md:w-[50%] xl:w-[30%] transition-all duration-300 ${
                  isFeaturedCard
                    ? 'bg-[#c7edb8] p-8 lg:p-10 xl:p-12 rounded-[2.5rem] shadow-[0_32px_64px_rgba(74,61,196,0.12)] z-10 border-4 border-white hover:border-[#a855f7]'
                    : 'bg-[#f3f3f4] p-8 lg:p-10 rounded-[2rem] border border-[#c8c4d6]/20 hover:border-[#a855f7]'
                }`}
              >
                {!user && plan.highlighted && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 bg-[#a855f7] text-white text-sm font-black rounded-full uppercase tracking-widest shadow-lg">
                    {t('freeForever')}
                  </span>
                )}
                {/* Logged-in: hide "Current Plan" green bubble; keep "Recommended" for free-trial only */}
                {user && !isCurrentPlan && isRecommendedForTrial && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 bg-[#0b996f] text-white text-sm font-black rounded-full uppercase tracking-widest shadow-lg">
                    {t('recommended')}
                  </span>
                )}

                <div className="flex flex-col h-full">
                  <div className="mb-8 text-center">
                    <h3
                      className={`mb-2 ${
                        isFeaturedCard
                          ? 'text-4xl md:text-5xl font-black text-[#032102]'
                          : 'text-3xl md:text-4xl font-bold text-slate-900'
                      }`}
                    >
                      {t('whatYouGet')}
                    </h3>
                  </div>

                  {!(user && isCurrentPlan) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        openCheckout(plan);
                      }}
                      className={`mb-10 w-full text-center inline-block active:scale-95 transition-all ${
                        isFeaturedCard
                          ? 'py-5 rounded-full bg-[#a855f7] text-white font-black text-xl shadow-xl shadow-[#a855f7]/30 hover:bg-[#9333ea] cursor-pointer transition-colors'
                          : 'py-4 rounded-full border border-[#787585] text-[#5549d0] font-bold text-lg hover:bg-[#d7fec8] cursor-pointer'
                      }`}
                    >
                      {buttonLabel}
                    </button>
                  )}

                  <ul className="space-y-6 mb-2 flex-grow">
                    {(plan.featureKeys || []).map((featureKey) => {
                      const isSuperLinksIncluded = featureKey === 'featureSuperLinks';
                      const isSuperLinksSubFeature = [
                        'featurePasswordAccess',
                        'featureClickLimits',
                        'featureTimeExpiring',
                      ].includes(featureKey);
                      const purpleFeatureKeys = [
                        'featureUnlimitedDomains',
                        'featureGeoRedirect',
                        'featureCapi',
                        'featureProAnalytics',
                        'featureExpeditedSupport',
                      ];
                      const proBlackFeatureKeys = [
                        'featureWorkspaces',
                        'featureBotProtection',
                        'featureUtmPresets',
                      ];
                      const isBlack = plan.name === 'PRO' && proBlackFeatureKeys.includes(featureKey);
                      const isPurple = !isBlack && purpleFeatureKeys.includes(featureKey);
                      return (
                        <li key={featureKey} className="flex items-start gap-3">
                          {isSuperLinksSubFeature ? (
                            <span className="w-6 h-6 mt-0.5 flex-shrink-0" aria-hidden="true" />
                          ) : (
                            <Check
                              aria-hidden="true"
                              className={`w-6 h-6 mt-0.5 flex-shrink-0 ${
                                isSuperLinksIncluded
                                  ? 'text-emerald-600'
                                  : isFeaturedCard
                                    ? 'text-[#032102]'
                                    : 'text-[#46673d]'
                              }`}
                            />
                          )}
                          <span
                            className={`text-base md:text-lg font-semibold leading-relaxed ${
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
                            {t(featureKey)}
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




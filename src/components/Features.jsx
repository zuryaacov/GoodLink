import React from 'react';
import { motion } from 'framer-motion';

const Features = () => {
  const features = [
    {
      icon: 'dns',
      title: 'GoodSync',
      description:
        'Stop losing conversions to ad-blockers and privacy updates. GoodSync establishes a rock-solid, server-to-server Conversion API (CAPI) between your links and major ad platforms like Facebook, Instagram, Google, TikTok, and Snapchat. It bypasses browser limitations (iOS 14+) to ensure 100% tracking accuracy and smarter AI optimization for your pixel.',
      highlight: 'server-to-server Conversion API (CAPI)',
    },
    {
      icon: 'shield',
      title: 'GoodShield',
      description:
        "Your Budget's Best Friend. Stop paying for fake traffic. GoodShield uses real-time edge intelligence to identify and neutralize bots, crawlers, and suspicious activity. Whether you want to block, redirect, or cloak your destination URL, GoodShield ensures that only genuine human visitors reach your offers, keeping your conversion rates high and your accounts safe.",
      highlight: 'real-time edge intelligence to identify and neutralize bots',
    },
    {
      icon: 'public',
      title: 'GoodLink',
      description:
        'Take full ownership of your online presence with professional Custom Domains. Stop sending your traffic through generic, untrusted links that hurt your reputation. Our platform allows you to seamlessly map your own branded URLs, ensuring that every click reinforces your authority and builds instant trust with your audience.',
      highlight: 'professional Custom Domains',
    },
    {
      icon: 'insights',
      title: 'GoodSight',
      description:
        'Get a clear view of your audience. Track every click, geographic origin, and device type in real-time. GoodSight provides the essential data you need to monitor your link performance and verify your traffic quality at a glance.',
      highlight: 'Track every click',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section
      id="features"
      className="scroll-mt-20 py-20 px-6 md:px-20 bg-background-light dark:bg-background-dark relative"
    >
      <div className="mx-auto max-w-[1200px] flex flex-col gap-16">
        {/* Headline for Features */}
        <motion.div
          id="features-heading"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center gap-4 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center rounded-full bg-[#6358de]/10 px-3 py-1 text-sm font-medium text-[#6358de] border border-[#6358de]/20">
            Features
          </div>
          <h2 className="text-slate-900 dark:text-[#1b1b1b] tracking-tight text-3xl md:text-5xl font-black leading-tight">
            Engineered for Performance
          </h2>
          <p className="text-slate-600 dark:text-[#1b1b1b] text-lg md:text-xl font-normal leading-relaxed">
            Tools designed to give you the competitive edge in media buying. Stop losing data and
            start scaling your campaigns.
          </p>
        </motion.div>
        {/* Feature Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group flex flex-col gap-5 rounded-2xl border border-white/10 dark:border-[#324467] bg-white/5 dark:bg-[#192233]/50 backdrop-blur-md p-8 md:p-10 shadow-sm hover:shadow-xl hover:border-[#6358de]/50 transition-all duration-300"
            >
              <div className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-xl bg-[#6358de]/10 text-[#6358de] group-hover:bg-[#6358de] group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-4xl md:text-5xl">{feature.icon}</span>
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-slate-900 dark:text-[#1b1b1b] text-xl md:text-2xl font-bold leading-tight">
                  {feature.title}
                </h3>
                <p className="text-slate-600 dark:text-[#1b1b1b] text-base md:text-lg font-semibold leading-relaxed">
                  {feature.highlight
                    ? (() => {
                        const [before, ...rest] = feature.description.split(feature.highlight);
                        const after = rest.join(feature.highlight);
                        return (
                          <>
                            {before}
                            <span className="text-[#6358de] font-bold text-lg md:text-xl">
                              {feature.highlight}
                            </span>
                            {after}
                          </>
                        );
                      })()
                    : feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;

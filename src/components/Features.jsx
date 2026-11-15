import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';

const Features = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: 'dns',
      titleKey: 'goodSyncTitle',
      beforeKey: 'goodSyncBefore',
      highlightKey: 'goodSyncHighlight',
      afterKey: 'goodSyncAfter',
    },
    {
      icon: 'shield',
      titleKey: 'goodShieldTitle',
      beforeKey: 'goodShieldBefore',
      highlightKey: 'goodShieldHighlight',
      afterKey: 'goodShieldAfter',
    },
    {
      icon: 'public',
      titleKey: 'goodLinkTitle',
      beforeKey: 'goodLinkBefore',
      highlightKey: 'goodLinkHighlight',
      afterKey: 'goodLinkAfter',
    },
    {
      icon: 'insights',
      titleKey: 'goodSightTitle',
      beforeKey: 'goodSightBefore',
      highlightKey: 'goodSightHighlight',
      afterKey: 'goodSightAfter',
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
      aria-labelledby="features-heading"
      className="scroll-mt-20 py-20 px-6 md:px-20 bg-white relative"
    >
      <div className="mx-auto max-w-[1200px] flex flex-col gap-16">
        {/* Headline for Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center gap-4 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center rounded-full bg-[#a855f7]/10 px-3 py-1 text-sm font-medium text-[#7c3aed] border border-[#a855f7]/20">
            {t('featuresBadge')}
          </div>
          <h2 id="features-heading" className="text-slate-900 dark:text-[#1b1b1b] tracking-tight text-3xl md:text-5xl font-black leading-tight">
            {t('featuresHeading')}
          </h2>
          <p className="text-slate-600 dark:text-[#1b1b1b] text-lg md:text-xl font-normal leading-relaxed">
            {t('featuresSubheading')}
          </p>
        </motion.div>
        {/* Feature Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 gap-8"
        >
          <motion.div
            variants={itemVariants}
            className="group flex flex-col gap-5 rounded-2xl border border-white/10 dark:border-[#324467] bg-white/5 dark:bg-[#192233]/50 backdrop-blur-md p-8 md:p-10 shadow-sm hover:shadow-xl hover:border-[#a855f7]/50 transition-all duration-300 max-w-4xl mx-auto w-full text-center"
          >
            <div
              className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-xl bg-[#a855f7]/10 text-[#a855f7] group-hover:bg-[#a855f7] group-hover:text-white transition-colors mx-auto"
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-4xl md:text-5xl">bolt</span>
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="text-slate-900 dark:text-[#1b1b1b] text-xl md:text-2xl font-bold leading-tight">
                {t('superLinksTitle')}
              </h3>
              <p className="text-slate-600 dark:text-[#1b1b1b] text-base md:text-lg font-semibold leading-relaxed">
                {t('superLinksBefore')}
                <span className="text-[#7c3aed] font-bold text-lg md:text-xl">
                  {t('superLinksHighlight')}
                </span>
                {t('superLinksAfter')}
              </p>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.titleKey}
              variants={itemVariants}
              className="group flex flex-col gap-5 rounded-2xl border border-white/10 dark:border-[#324467] bg-white/5 dark:bg-[#192233]/50 backdrop-blur-md p-8 md:p-10 shadow-sm hover:shadow-xl hover:border-[#a855f7]/50 transition-all duration-300"
            >
              <div className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-xl bg-[#a855f7]/10 text-[#a855f7] group-hover:bg-[#a855f7] group-hover:text-white transition-colors" aria-hidden="true">
                <span className="material-symbols-outlined text-4xl md:text-5xl">{feature.icon}</span>
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-slate-900 dark:text-[#1b1b1b] text-xl md:text-2xl font-bold leading-tight">
                  {t(feature.titleKey)}
                </h3>
                <p className="text-slate-600 dark:text-[#1b1b1b] text-base md:text-lg font-semibold leading-relaxed">
                  {t(feature.beforeKey)}
                  <span className="text-[#7c3aed] font-bold text-lg md:text-xl">
                    {t(feature.highlightKey)}
                  </span>
                  {t(feature.afterKey)}
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

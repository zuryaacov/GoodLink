import React from 'react';
import { motion } from 'framer-motion';

const Features = () => {
  const features = [
    {
      icon: 'dns',
      title: 'Pixel Vault',
      description:
        'Store and fire pixels server-side. Bypass browser restrictions and never lose tracking data again.',
    },
    {
      icon: 'add_link',
      title: 'Smart Links',
      description:
        'Generate deep links with dynamic parameters in seconds. Automatic device & OS routing.',
    },
    {
      icon: 'public',
      title: 'Custom Domains',
      description:
        'Build brand trust with fully branded short links. Connect unlimited domains effortlessly.',
    },
    {
      icon: 'insights',
      title: 'Real-Time Analytics',
      description:
        'Monitor your traffic with live dashboards. Granular reporting on clicks, geos, and devices.',
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
      className="py-20 px-6 md:px-20 bg-background-light dark:bg-background-dark relative"
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
          <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary border border-primary/20">
            Features
          </div>
          <h2 className="text-slate-900 dark:text-white tracking-tight text-3xl md:text-5xl font-black leading-tight">
            Engineered for Performance
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg md:text-xl font-normal leading-relaxed">
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
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group flex flex-col gap-4 rounded-xl border border-white/10 dark:border-[#324467] bg-white/5 dark:bg-[#192233]/50 backdrop-blur-md p-6 shadow-sm hover:shadow-xl hover:border-primary/50 transition-all duration-300"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-3xl">{feature.icon}</span>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-slate-900 dark:text-white text-lg font-bold leading-tight">
                  {feature.title}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-normal">
                  {feature.description}
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

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Hero = ({ user }) => {
  return (
    <section className="relative px-6 py-12 md:px-20 lg:py-24 overflow-hidden bg-[#d7fec8]">
      <div className="layout-content-container mx-auto max-w-[1200px] flex flex-col">
        <div className="flex flex-col gap-10 lg:flex-row items-center">
          {/* Hero Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col gap-8 flex-1 text-center lg:text-left"
          >
            <div className="flex flex-col gap-4">
              <h1 className="text-slate-900 dark:text-[#1b1b1b] text-4xl font-black leading-tight tracking-tight md:text-5xl lg:text-6xl">
                Own Your Data. <br />
                <span className="text-[#6358de]">Secure Your Links.</span> <br />
                Maximize Profits.
              </h1>
              <h2 className="text-slate-600 dark:text-[#1b1b1b] text-lg font-normal leading-relaxed md:text-xl max-w-2xl mx-auto lg:mx-0">
                The ultimate link management ecosystem for elite affiliate marketers and media
                buyers. Track every click, pixel, and conversion with precision.
              </h2>
            </div>
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              {!user && (
                <Link
                  to="/login"
                  className="flex h-12 min-w-[140px] cursor-pointer items-center justify-center rounded-lg bg-[#6358de] hover:bg-[#5348c7] px-6 text-white text-base font-bold transition-all"
                >
                  Get started
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2 justify-center lg:justify-start text-sm text-slate-500 dark:text-[#1b1b1b]">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              <span>No credit card required</span>
              <span className="mx-2">•</span>
              <span className="material-symbols-outlined text-lg">bolt</span>
              <span>Setup in 2 minutes</span>
            </div>
          </motion.div>
          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full flex-1 max-w-[600px] lg:max-w-none"
          >
            <div
              className="w-full aspect-video bg-center bg-no-repeat bg-cover rounded-xl shadow-2xl shadow-primary/20 border border-slate-200 dark:border-slate-200 overflow-hidden relative group"
              style={{
                backgroundImage: 'url("/hero-dashboard.png")',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#d7fec8]/30 to-transparent pointer-events-none"></div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

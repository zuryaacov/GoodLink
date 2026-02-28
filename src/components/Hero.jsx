import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

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
          {/* Hero Card: Technical Blueprint */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full flex-1 max-w-[500px] mx-auto lg:max-w-none flex justify-center"
          >
            <div className="relative w-full aspect-square max-w-[500px] border border-slate-300/50 rounded-full p-8 sm:p-12 flex items-center justify-center">
              {/* Rotating Rings */}
              <div className="absolute inset-0 border border-slate-300/40 rounded-full hero-ring-slow" />
              <div className="absolute inset-8 border border-slate-400/30 rounded-full hero-ring-slow-reverse" />

              {/* Central Data Node */}
              <div className="relative z-20 w-56 sm:w-64 h-72 sm:h-80 bg-[#121826] border border-slate-500/30 rounded-2xl p-5 sm:p-6 shadow-xl shadow-slate-900/20">
                <div className="flex justify-between items-start mb-8">
                  <ShieldCheck className="text-emerald-500 w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                  <div className="text-right">
                    <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Node Status</p>
                    <p className="text-[10px] text-emerald-400 font-mono">ENCRYPTED</p>
                  </div>
                </div>

                {/* Minimalist Chart */}
                <div className="h-20 sm:h-24 w-full mb-5 sm:mb-6">
                  <svg viewBox="0 0 200 100" className="w-full h-full">
                    <defs>
                      <linearGradient id="hero-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,80 Q40,75 70,40 T140,20 T200,10" fill="none" stroke="#10b981" strokeWidth="2" className="hero-data-line" />
                    <path d="M0,80 Q40,75 70,40 T140,20 T200,10 L200,100 L0,100 Z" fill="url(#hero-grad)" opacity="0.1" />
                  </svg>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-tighter">Attribution Accuracy</span>
                    <span className="text-xs font-mono text-white">99.8%</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-tighter">Signal Strength</span>
                    <span className="text-xs font-mono text-white">Optimal</span>
                  </div>
                </div>
              </div>

              {/* Orbiting Feature Tags */}
              <div className="absolute -top-2 right-4 sm:right-10 bg-white/95 backdrop-blur border border-slate-200 px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 sm:gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[9px] font-bold tracking-widest uppercase text-slate-700">Server-Side API</span>
              </div>
              <div className="absolute bottom-16 -left-4 sm:bottom-20 sm:-left-10 bg-white/95 backdrop-blur border border-slate-200 px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 sm:gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#6358de] shrink-0" />
                <span className="text-[9px] font-bold tracking-widest uppercase text-slate-700">Global Proxying</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

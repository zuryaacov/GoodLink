import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const Hero = ({ user }) => {
  return (
    <section aria-labelledby="hero-heading" className="relative px-6 py-16 md:py-24 bg-[#d7fec8]">
      <div className="mx-auto max-w-7xl flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col items-center w-full max-w-xl sm:max-w-2xl lg:max-w-5xl space-y-8 md:space-y-12"
        >
          {/* Trial badge */}
          <motion.div
            className="inline-flex items-center rounded-full bg-gradient-to-r from-[#a855f7] to-[#7c6ee8] px-4 py-2 text-sm md:text-base font-semibold text-white shadow-lg shadow-[#a855f7]/40"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="mr-2 text-lg">🎁</span>
            <span>30-Day Free Trial · No credit card required</span>
          </motion.div>

          {/* Main line */}
          <h1
            id="hero-heading"
            className="text-slate-900 text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black leading-loose md:leading-[1.75] lg:leading-[2] xl:leading-[1.75] tracking-tight"
          >
            Short Links, Bot Protection1,
            <br className="hidden sm:block" />
            <span>
              <span className="text-[#a855f7]">S2S Tracking</span> &amp; Great Analytics
            </span>
          </h1>

          {/* Secondary line */}
          <p className="text-[#0b996f] text-xl sm:text-2xl md:text-3xl lg:text-[2.25rem] xl:text-[2.07rem] font-bold leading-snug xl:whitespace-nowrap">
            Speed-of-Light Redirection, Server-Side Power &amp; Clean Traffic
          </p>

          {/* CTA */}
          {!user && (
            <div className="flex flex-col items-center">
              <Link
                to="/login?mode=signup"
                className="inline-flex h-14 md:h-16 min-w-[200px] md:min-w-[240px] items-center justify-center rounded-xl bg-[#a855f7] hover:bg-[#9333ea] px-10 md:px-12 text-white text-base md:text-lg font-bold tracking-wide transition-all"
              >
                Start your 30-day free trial
              </Link>
              <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 mt-6">
                <div className="flex items-center gap-2 text-base font-bold text-black">
                  <CheckCircle2
                    size={20}
                    className="text-[#a855f7] flex-shrink-0"
                    aria-hidden="true"
                  />
                  No credit card required
                </div>
                <div className="flex items-center gap-2 text-base font-bold text-black">
                  <CheckCircle2
                    size={20}
                    className="text-[#a855f7] flex-shrink-0"
                    aria-hidden="true"
                  />
                  Full access included
                </div>
                <div className="flex items-center gap-2 text-base font-bold text-black">
                  <CheckCircle2
                    size={20}
                    className="text-[#a855f7] flex-shrink-0"
                    aria-hidden="true"
                  />
                  Cancel anytime
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;

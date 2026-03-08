import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const Hero = ({ user }) => {
  return (
    <section className="relative px-6 py-16 md:py-24 bg-[#d7fec8]">
      <div className="mx-auto max-w-7xl flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col items-center w-full max-w-xl sm:max-w-2xl lg:max-w-5xl space-y-8 md:space-y-12"
        >
          {/* Main line */}
          <h1 className="text-slate-900 text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black leading-loose md:leading-[1.75] lg:leading-[2] xl:leading-[1.75] tracking-tight">
            Short Links, Bot Protection,
            <br className="hidden sm:block" />
            <span>
              <span className="text-[#6358de]">S2S Tracking</span> &amp; Great Analytics
            </span>
          </h1>

          {/* Secondary line */}
          <p className="text-[#0b996f] text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-snug">
            Zero Latency, Server-Side Power &amp; Clean Traffic
          </p>

          {/* CTA */}
          {!user && (
            <div className="flex flex-col items-center">
              <Link
                to="/login"
                className="inline-flex h-14 md:h-16 min-w-[200px] md:min-w-[240px] items-center justify-center rounded-xl bg-[#6358de] hover:bg-[#5348c7] px-10 md:px-12 text-white text-base md:text-lg font-bold tracking-wide transition-all"
              >
                Start your 30-day free trial
              </Link>
              <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 mt-6">
                <div className="flex items-center gap-2 text-base font-bold text-black">
                  <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
                  No credit card required
                </div>
                <div className="flex items-center gap-2 text-base font-bold text-black">
                  <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
                  Full access included
                </div>
                <div className="flex items-center gap-2 text-base font-bold text-black">
                  <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
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

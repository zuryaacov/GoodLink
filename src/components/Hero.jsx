import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Hero = ({ user }) => {
  return (
    <section className="relative px-6 py-16 md:py-24 bg-[#d7fec8]">
      <div className="layout-content-container mx-auto max-w-5xl flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col items-center w-full lg:w-3/4 space-y-8 md:space-y-12"
        >
          {/* Main line */}
          <h1 className="text-slate-900 text-6xl md:text-7xl lg:text-8xl font-black leading-snug md:leading-tight tracking-tight">
            Short Links, Bot Protection,
            <br className="hidden sm:block" />
            <span>
              <span className="text-[#6358de]">S2S Tracking</span> &amp; Great Analytics
            </span>
          </h1>

          {/* Secondary line */}
          <p className="text-slate-600 text-5xl md:text-6xl font-semibold leading-snug">
            Smart Links Built For You
          </p>

          {/* CTA */}
          {!user && (
            <Link
              to="/login"
              className="inline-flex h-12 min-w-[160px] items-center justify-center rounded-lg bg-[#6358de] hover:bg-[#5348c7] px-8 text-white text-sm md:text-base font-bold tracking-wide uppercase transition-all"
            >
              Get Started
            </Link>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;

import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Footer = () => {
  const location = useLocation();

  return (
    <footer className="border-t border-slate-200 dark:border-slate-200 bg-white dark:bg-[#111722] py-12 px-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-4">
          <div className="col-span-2 lg:col-span-2 flex flex-col gap-4">
            <Link
              to="/"
              onClick={(e) => {
                if (location.pathname === '/') {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="flex items-center gap-3 text-[#1b1b1b] transition-opacity hover:opacity-80 cursor-pointer"
            >
              <div className="size-5 sm:size-8 text-primary flex-shrink-0">
                <svg fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                    stroke="#6358de"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                  ></path>
                  <path
                    d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                    stroke="#6358de"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                  ></path>
                </svg>
              </div>
              <h2 className="text-3xl font-black leading-tight tracking-tight text-[#6358de]">
                GoodLink
              </h2>
            </Link>
            <p className="text-sm text-slate-500 dark:text-[#1b1b1b] max-w-xs">
              The advanced link management platform for high-performance marketers. Track, optimize,
              and scale.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <h4 className="font-bold text-slate-900 dark:text-[#1b1b1b]">Product</h4>
            <a
              className="text-sm text-slate-500 dark:text-[#1b1b1b] hover:text-primary transition-colors"
              href="#"
            >
              Features
            </a>
            <a
              className="text-sm text-slate-500 dark:text-[#1b1b1b] hover:text-primary transition-colors"
              href="#"
            >
              Resources
            </a>
            <a
              className="text-sm text-slate-500 dark:text-[#1b1b1b] hover:text-primary transition-colors"
              href="#"
            >
              Pricing
            </a>
          </div>
          <div className="flex flex-col gap-4">
            <h4 className="font-bold text-slate-900 dark:text-[#1b1b1b]">Company</h4>
            <Link
              to="/abuse"
              className="text-sm text-slate-500 dark:text-[#1b1b1b] hover:text-primary transition-colors"
            >
              Abuse / DMCA
            </Link>
            <Link
              to="/terms"
              className="text-sm text-slate-500 dark:text-[#1b1b1b] hover:text-primary transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              to="/privacy"
              className="text-sm text-slate-500 dark:text-[#1b1b1b] hover:text-primary transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/subprocessors"
              className="text-sm text-slate-500 dark:text-[#1b1b1b] hover:text-primary transition-colors"
            >
              Subprocessors
            </Link>
            <Link
              to="/dpa"
              className="text-sm text-slate-500 dark:text-[#1b1b1b] hover:text-primary transition-colors"
            >
              DPA
            </Link>
            <Link
              to="/contact"
              className="text-sm text-slate-500 dark:text-[#1b1b1b] hover:text-primary transition-colors"
            >
              Contact
            </Link>
            <Link
              to="/docs"
              className="text-sm text-slate-500 dark:text-[#1b1b1b] hover:text-primary transition-colors"
            >
              Docs
            </Link>
          </div>
        </div>
        <div className="mt-12 border-t border-slate-200 dark:border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500 dark:text-[#1b1b1b]">
            © 2025 GoodLink.ai. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link to="/contact" className="text-[#1b1b1b] hover:text-primary transition-colors">
              <span className="material-symbols-outlined">mail</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

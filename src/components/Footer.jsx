import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import AccessibilityFooterRestore from './accessibility/AccessibilityFooterRestore';

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
              className="flex items-center gap-3 text-[#1b1b1b] transition-colors hover:text-[#0b996f] cursor-pointer"
            >
              {/* Link-shape icon hidden by request (kept in code, do not delete)
              <div className="size-5 sm:size-8 text-primary flex-shrink-0" aria-hidden="true">
                <svg fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                    stroke="#a855f7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                  ></path>
                  <path
                    d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                    stroke="#a855f7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                  ></path>
                </svg>
              </div>
              */}
              <span className="text-3xl font-black leading-tight tracking-tight text-inherit">
                GoodLink
              </span>
            </Link>
            <p className="text-sm text-slate-500 dark:text-[#1b1b1b] max-w-xs">
              The advanced link management platform for high-performance marketers. Track, optimize,
              and scale.
            </p>
          </div>
          <nav aria-label="Product links" className="flex flex-col gap-4">
            <h3 className="font-bold text-slate-900 dark:text-[#1b1b1b]">Product</h3>
            <Link
              to="/#features"
              className="text-sm text-slate-500 dark:text-[#1b1b1b] hover:text-primary transition-colors"
            >
              Features
            </Link>
            <Link
              to="/#insights"
              className="text-sm text-slate-500 dark:text-[#1b1b1b] hover:text-primary transition-colors"
            >
              Insights
            </Link>
            <Link
              to="/#pricing"
              className="text-sm text-slate-500 dark:text-[#1b1b1b] hover:text-primary transition-colors"
            >
              Pricing
            </Link>
          </nav>
          <nav aria-label="Company links" className="flex flex-col gap-4">
            <h3 className="font-bold text-slate-900 dark:text-[#1b1b1b]">Company</h3>
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
              to="/accessibility"
              className="text-sm text-slate-500 dark:text-[#1b1b1b] hover:text-primary transition-colors"
            >
              Accessibility
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
              Contact Us
            </Link>
            <Link
              to="/docs"
              className="text-sm text-slate-500 dark:text-[#1b1b1b] hover:text-primary transition-colors"
            >
              Docs
            </Link>
          </nav>
        </div>
        <div className="mt-12 border-t border-slate-200 dark:border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500 dark:text-[#1b1b1b]">
            © 2025 GoodLink.ai. All rights reserved.
          </p>
          <nav aria-label="Footer utilities" className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
            <AccessibilityFooterRestore className="dark:text-slate-400" />
            <div className="flex gap-4">
              <Link to="/contact" aria-label="Contact us via email" className="text-[#1b1b1b] hover:text-primary transition-colors">
                <span className="material-symbols-outlined" aria-hidden="true">mail</span>
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

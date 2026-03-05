import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsOpen(false);
    // Refresh the page after logout
    window.location.reload();
  };

  const navLinks = [
    { name: 'Features', href: '#features', id: 'features' },
    { name: 'Resources', href: '#resources', id: 'resources' },
    { name: 'Pricing', href: '#pricing', id: 'pricing' },
  ];

  const handleSectionClick = (e, sectionId) => {
    if (isOpen) setIsOpen(false);
    const isHome = location.pathname === '/';
    if (!isHome) {
      navigate(`/#${sectionId}`);
      return;
    }
    e.preventDefault();
    const el = document.getElementById(sectionId);
    if (el) {
      window.history.replaceState(null, '', `#${sectionId}`);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }
  };

  return (
    <header className="sticky top-0 z-50 flex flex-col border-b border-solid border-[#0b996f]/20 bg-[#d7fec8] backdrop-blur-md">
      <div className="flex items-center justify-between px-6 py-4 lg:px-20">
        <Link
          to="/"
          className="flex items-center gap-3 text-[#1b1b1b] transition-opacity hover:opacity-80"
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

        {/* Desktop Navigation */}
        <div className="hidden md:flex flex-1 justify-center">
          <div className="flex items-center gap-9">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleSectionClick(e, link.id);
                }}
                className="text-[#1b1b1b] hover:text-primary transition-colors text-base font-bold leading-normal cursor-pointer"
              >
                {link.name}
              </a>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Action Buttons - Hidden on mobile, shown in menu */}
          <div className="hidden sm:flex items-center gap-2">
            {user ? (
              <>
                <Link
                  to="/dashboard/links"
                  className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#6358de] hover:bg-[#5348c7] text-white text-sm font-bold leading-normal tracking-[0.015em] transition-colors"
                >
                  <span className="truncate">Dashboard</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#c0ffa5] hover:bg-[#b0ef95] text-[#1b1b1b] text-sm font-bold leading-normal tracking-[0.015em] transition-colors"
                >
                  <span className="truncate">Logout</span>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#6358de] hover:bg-[#5348c7] text-white text-sm font-bold leading-normal tracking-[0.015em] transition-colors"
              >
                <span className="truncate">Login</span>
              </Link>
            )}
          </div>

          {/* Hamburger Menu Token */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex md:hidden items-center justify-center size-10 rounded-lg text-[#1b1b1b] hover:bg-black/5 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">{isOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay with Smooth Animations */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="md:hidden flex flex-col border-t border-primary/20 bg-white overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="p-6 flex flex-col gap-6"
            >
              <div className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSectionClick(e, link.id);
                    }}
                    className="text-[#1b1b1b] hover:text-primary transition-colors text-xl font-bold cursor-pointer"
                  >
                    {link.name}
                  </a>
                ))}
                {/* Mobile Dashboard Link when logged in */}
                {user && (
                  <Link
                    to="/dashboard/links"
                    onClick={() => setIsOpen(false)}
                    className="text-[#1b1b1b] hover:text-primary transition-colors text-lg font-bold"
                  >
                    Dashboard
                  </Link>
                )}
              </div>
              <div className="flex flex-col gap-3 pt-6 border-t border-primary/20">
                {user ? (
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                    className="flex w-full cursor-pointer items-center justify-center rounded-lg h-12 bg-[#c0ffa5] hover:bg-[#b0ef95] text-[#1b1b1b] font-bold transition-colors"
                  >
                    Logout
                  </button>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="flex w-full cursor-pointer items-center justify-center rounded-lg h-12 bg-[#6358de] hover:bg-[#5348c7] text-white font-bold transition-colors"
                  >
                    Login
                  </Link>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;

import React, { useState, useEffect } from 'react';
import { UserProfile, CompanySetting } from '../types';
import { usePWAInstall } from '../utils/usePWAInstall';
import { Language, translations } from '../utils/i18n';
import { LogOut, Moon, Sun, Download, Smartphone, Globe } from 'lucide-react';

interface HeaderProps {
  user: UserProfile;
  company: CompanySetting;
  onSignOut: () => void;
  lang: Language;
  onToggleLang: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, company, onSignOut, lang, onToggleLang }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  useEffect(() => {
    // Check initial theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.add('light');
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.remove('light');
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  return (
    <header className="no-print sticky top-0 z-40 bg-[var(--bg-surface)] border-b border-[var(--border-color)] px-4 py-2.5 shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Logo & Company Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-950 p-1 border-2 border-[var(--amber)] shadow-lg shrink-0 overflow-hidden flex items-center justify-center">
            <img
              src={company.logoUrl || '/logo.svg'}
              alt="Green Power Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.svg';
              }}
            />
          </div>

          <div>
            <h1 className="text-sm md:text-base font-extrabold tracking-tight text-white uppercase font-sans leading-snug">
              {company.name || 'Green Power and Construction'}
            </h1>
            <p className="text-[11px] font-bold text-[var(--amber)] font-['Hind_Siliguri'] leading-none">
              {company.nameBn || 'গ্রীন পাওয়ার এন্ড কনস্ট্রাকশন'}
            </p>
          </div>
        </div>

        {/* Right Action Controls & Profile Avatar */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Firebase Live Cloud Sync Indicator */}
          <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded-full text-[11px] font-bold text-emerald-300 shadow-sm" title="Firebase Cloud Database Live Synced">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="hidden sm:inline">☁️ ক্লাউড সিঙ্ক চালু</span>
          </div>

          {/* Owner/Foreman Profile Badge with Contractor Photo */}
          <div className="flex items-center gap-2 bg-[var(--bg-primary)] px-2.5 py-1 rounded-full border border-[var(--border-color)]">
            <div className="w-6 h-6 rounded-full overflow-hidden border border-[var(--amber)] shrink-0 bg-zinc-900">
              <img
                src={company.ownerPhotoUrl || user.photoUrl || '/contractor.svg'}
                alt={user.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/contractor.svg';
                }}
              />
            </div>
            <span className="text-xs font-bold text-zinc-200 hidden sm:inline">
              {user.name || company.ownerName || 'মালিক'}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                user.role === 'owner'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {user.role === 'owner' ? '👑 মালিক' : '🛠 ফরম্যান'}
            </span>
          </div>

          {/* PWA Install Prompt */}
          {!isInstalled && isInstallable && (
            <button
              onClick={install}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--copper)] text-white text-xs font-medium hover:bg-[var(--copper-hover)] transition shadow-sm cursor-pointer"
              title="অ্যাপ ইনস্টল করুন"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ইনস্টল</span>
            </button>
          )}

          {!isInstalled && isIOS && (
            <button
              onClick={() => setShowIOSGuide(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-700/60 text-zinc-200 text-xs font-medium hover:bg-zinc-700 transition cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">iOS</span>
            </button>
          )}

          {/* Language Switcher Button (বাংলা / English) */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-bold text-[var(--amber)] hover:bg-zinc-800 transition cursor-pointer"
            title={lang === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন'}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>{lang === 'bn' ? 'English' : 'বাংলা'}</span>
          </button>

          {/* Light/Dark Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] hover:bg-zinc-700/40 transition cursor-pointer"
            title={translations[lang].themeToggle}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
          </button>

          {/* Logout Button */}
          <button
            onClick={onSignOut}
            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition flex items-center gap-1 text-xs font-medium cursor-pointer"
            title="লগআউট"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">লগআউট</span>
          </button>
        </div>
      </div>

      {/* iOS Install Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-surface)] p-6 shadow-2xl border border-[var(--border-color)] text-[var(--text-main)]">
            <h3 className="text-lg font-bold text-[var(--amber)]">আইফোনে (iOS) ইনস্টল করার নিয়ম</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
              ১. Safari ব্রাউজারের নিচে <strong>শেয়ার (Share)</strong> বাটনে ট্যাপ করুন।<br />
              ২. একটু নিচে নেমে <strong>'Add to Home Screen'</strong> সিলেক্ট করুন।
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-[var(--copper)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--copper-hover)] transition cursor-pointer"
            >
              বুঝেছি
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

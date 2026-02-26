'use client';

import Link from 'next/link';
import { LayoutGrid, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getSiteSettings, SiteSettings } from '@/lib/db';
import { getGithubConfig } from '@/lib/github';

export default function Navbar() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }

    const loadSettings = async () => {
      try {
        const data = await getSiteSettings();
        setSettings(data);
        const config = getGithubConfig();
        if (data?.siteLogoPath && config) {
          setLogoUrl(`https://raw.githubusercontent.com/${config.username}/${config.repo}/main/${data.siteLogoPath}`);
        }
      } catch (error) {
        console.error('Failed to load site settings:', error);
      }
    };
    loadSettings();
  }, []);

  const toggleDark = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDark(true);
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded-lg" />
              ) : (
                <LayoutGrid className="w-6 h-6" />
              )}
              {settings?.siteName !== '' && (
                <span>{settings?.siteName || 'تطبيقات للشاشات'}</span>
              )}
            </Link>
          </div>
          <div className="flex items-center">
            {mounted && (
              <button
                onClick={toggleDark}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="تبديل الوضع الليلي"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { getApps, AppItem, getSiteSettings, SiteSettings } from '@/lib/db';
import Navbar from '@/components/Navbar';
import AppCard from '@/components/AppCard';
import { Download, Loader2, Search } from 'lucide-react';

export default function Home() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [appsData, settingsData] = await Promise.all([
        getApps(),
        getSiteSettings()
      ]);
      
      setApps(appsData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredApps = apps.filter(app => 
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (app.description && app.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <div className="relative max-w-xl mx-auto group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
            <input
              type="text"
              placeholder="ابحث عن تطبيق أو لعبة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="relative w-full px-6 py-4 pr-14 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-gray-900 dark:text-white outline-none transition-all text-lg"
            />
            <Search className="w-6 h-6 text-gray-400 absolute right-5 top-4 transition-colors group-focus-within:text-indigo-500" />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-3xl p-4 gap-4 animate-pulse border border-gray-100/50 dark:border-gray-800/50 flex flex-row items-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gray-200 dark:bg-gray-800 flex-shrink-0"></div>
                <div className="flex-grow flex flex-col gap-2 py-0.5">
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                  <div className="h-2.5 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
                  <div className="h-2.5 bg-gray-200 dark:bg-gray-800 rounded w-5/6"></div>
                </div>
              </div>
            ))}
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-24 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-3xl border border-gray-100/50 dark:border-gray-800/50">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Download className="w-10 h-10 text-indigo-400 dark:text-indigo-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">لا توجد تطبيقات بعد</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">سيتم عرض التطبيقات هنا فور إضافتها من خلال لوحة التحكم الخاصة بالموقع.</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="text-center py-24 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-3xl border border-gray-100/50 dark:border-gray-800/50">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">لا توجد نتائج مطابقة</h3>
            <p className="text-gray-500 dark:text-gray-400">لم نتمكن من العثور على أي تطبيق يطابق كلمة البحث &quot;{searchQuery}&quot;</p>
          </div>
        ) : (
          <div className={`grid gap-6 sm:gap-8 ${filteredApps.length === 1 ? 'grid-cols-1 max-w-3xl mx-auto' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
            {filteredApps.map((app) => (
              <AppCard key={app.id} app={app} isSingleApp={filteredApps.length === 1} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

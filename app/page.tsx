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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-10 text-center">
          {settings?.siteName && (
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 whitespace-nowrap">{settings.siteName}</h1>
          )}
          
          <div className="max-w-md mx-auto relative">
            <input
              type="text"
              placeholder="ابحث عن تطبيق..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pr-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-white outline-none transition-all"
            />
            <Search className="w-5 h-5 text-gray-400 absolute right-4 top-3.5" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Download className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">لا توجد تطبيقات</h3>
            <p className="text-gray-500 dark:text-gray-400">لم يتم إضافة تطبيقات بعد</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">لا توجد نتائج</h3>
            <p className="text-gray-500 dark:text-gray-400">لم يتم العثور على تطبيقات تطابق بحثك</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredApps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

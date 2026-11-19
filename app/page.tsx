'use client';

import { useCallback, useEffect, useState } from 'react';
import { getApps, type AppItem } from '@/lib/db';
import Navbar from '@/components/Navbar';
import AppCard from '@/components/AppCard';
import { Download, Loader2, Search } from 'lucide-react';

export default function Home() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setApps(await getApps());
    } catch (error) {
      console.error('Failed to load apps:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredApps = apps.filter((app) =>
    app.name.toLocaleLowerCase().includes(normalizedQuery) ||
    (app.description && app.description.toLocaleLowerCase().includes(normalizedQuery)),
  );

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-10 text-center">
          <div className="max-w-md mx-auto relative">
            <input
              type="search"
              aria-label="ابحث عن تطبيق"
              placeholder="ابحث عن تطبيق..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full px-4 py-3 pr-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-white outline-none transition-all"
            />
            <Search className="w-5 h-5 text-gray-400 absolute right-4 top-3.5" aria-hidden="true" />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" role="status" aria-label="جارٍ تحميل التطبيقات">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-row items-center p-2.5 sm:p-3 gap-3 animate-pulse">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gray-200 dark:bg-gray-800 flex-shrink-0" />
                <div className="flex-grow flex flex-col gap-2 py-0.5">
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                  <div className="h-2.5 bg-gray-200 dark:bg-gray-800 rounded w-full" />
                  <div className="h-2.5 bg-gray-200 dark:bg-gray-800 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">تعذر تحميل التطبيقات</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-5">تحقق من الاتصال ثم حاول مرة أخرى.</p>
            <button
              type="button"
              onClick={() => void loadData()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <Loader2 className="w-4 h-4" aria-hidden="true" />
              إعادة المحاولة
            </button>
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Download className="w-8 h-8 text-gray-400" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-1">لا توجد تطبيقات</h2>
            <p className="text-gray-500 dark:text-gray-400">لم يتم إضافة تطبيقات بعد</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-1">لا توجد نتائج</h2>
            <p className="text-gray-500 dark:text-gray-400">لم يتم العثور على تطبيقات تطابق بحثك</p>
          </div>
        ) : (
          <div className={`grid gap-4 sm:gap-6 ${filteredApps.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {filteredApps.map((app) => <AppCard key={app.id} app={app} />)}
          </div>
        )}
      </main>
    </>
  );
}

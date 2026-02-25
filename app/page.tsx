'use client';

import { useEffect, useState } from 'react';
import { getApps, AppItem } from '@/lib/db';
import Navbar from '@/components/Navbar';
import AppCard from '@/components/AppCard';
import { Download, Loader2 } from 'lucide-react';

export default function Home() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    try {
      const data = await getApps();
      setApps(data);
    } catch (error) {
      console.error('Failed to load apps:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">تطبيقات للشاشات</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            مجموعة من أفضل التطبيقات المختارة بعناية. اضغط على صورة التطبيق للتحميل المباشر.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Download className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">لا توجد تطبيقات</h3>
            <p className="text-gray-500">قم بإضافة تطبيقات من لوحة التحكم</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {apps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

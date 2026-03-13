'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getApps, AppItem, getRawGithubUrl } from '@/lib/db';
import Navbar from '@/components/Navbar';
import { Download, Loader2, ArrowRight, File as FileIcon } from 'lucide-react';
import Link from 'next/link';

function AppDetailsContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [app, setApp] = useState<AppItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    getApps().then(apps => {
      const found = apps.find(a => a.id === id);
      setApp(found || null);
      setLoading(false);
    });
  }, [id]);

  const handleDownload = async (path: string, name: string) => {
    let url = path;
    if (!path.startsWith('http')) {
      url = getRawGithubUrl(path, 'main');
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (!res.ok && res.status === 404) {
          url = getRawGithubUrl(path, 'master');
        }
      } catch (e) {
        console.warn('Failed to verify main branch URL:', e);
      }
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">التطبيق غير موجود</h1>
        <Link href="/" className="text-indigo-600 dark:text-indigo-400 hover:underline">العودة للرئيسية</Link>
      </div>
    );
  }

  const imageUrl = getRawGithubUrl(app.imagePath);
  const files = app.files || (app.filePath && app.fileName ? [{ path: app.filePath, name: app.fileName }] : []);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-8 transition-colors">
        <ArrowRight className="w-5 h-5" />
        العودة للرئيسية
      </Link>

      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/3 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={app.name}
              className="w-full h-full object-cover aspect-square md:aspect-auto"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src.includes('/main/')) {
                  target.src = target.src.replace('/main/', '/master/');
                } else {
                  target.src = 'https://picsum.photos/400';
                }
              }}
            />
          </div>
          <div className="p-6 sm:p-8 md:w-2/3 flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{app.name}</h1>
            </div>
            {app.description && (
              <p className="text-gray-600 dark:text-gray-300 mb-8 whitespace-pre-wrap leading-relaxed">
                {app.description}
              </p>
            )}
            
            <div className="mt-auto">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">ملفات التحميل</h3>
              <div className="space-y-3">
                {files.map((file, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleDownload(file.path, file.name)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileIcon className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-200 font-medium truncate" dir="ltr">{file.name}</span>
                    </div>
                    <Download className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex-shrink-0" />
                  </button>
                ))}
                {files.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">لا توجد ملفات متاحة للتحميل</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AppDetails() {
  return (
    <>
      <Navbar />
      <Suspense fallback={
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>
      }>
        <AppDetailsContent />
      </Suspense>
    </>
  );
}

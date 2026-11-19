'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getApps, type AppItem, getRawGithubUrl } from '@/lib/db';
import { getAppFiles } from '@/lib/appFiles';
import { downloadAppFile } from '@/lib/download';
import { formatFileSize } from '@/lib/uploadUtils';
import Navbar from '@/components/Navbar';
import { Download, Loader2, ArrowRight, File as FileIcon } from 'lucide-react';
import Link from 'next/link';

function AppDetailsContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [result, setResult] = useState<{
    id: string | null;
    app: AppItem | null;
    loading: boolean;
    error: boolean;
  }>({ id: null, app: null, loading: true, error: false });

  useEffect(() => {
    let isCurrentRequest = true;

    if (!id) {
      return () => {
        isCurrentRequest = false;
      };
    }

    getApps()
      .then((apps) => {
        if (isCurrentRequest) {
          setResult({
            id,
            app: apps.find((item) => item.id === id) || null,
            loading: false,
            error: false,
          });
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load app details:', error);
        if (isCurrentRequest) setResult({ id, app: null, loading: false, error: true });
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [id]);

  const loading = id !== null && (result.id !== id || result.loading);
  const app = result.id === id ? result.app : null;
  const loadError = id !== null && result.id === id && result.error;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64" role="status" aria-label="جارٍ تحميل التطبيق">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">تعذر تحميل بيانات التطبيق</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-5">تحقق من اتصال الإنترنت ثم أعد المحاولة.</p>
        <Link href="/" className="text-indigo-600 dark:text-indigo-400 hover:underline">العودة للرئيسية</Link>
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

  const imageUrl = app.imagePath ? getRawGithubUrl(app.imagePath) : '';
  const files = getAppFiles(app);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-8 transition-colors">
        <ArrowRight className="w-5 h-5" />
        العودة للرئيسية
      </Link>

      <article className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/3 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={app.name}
                className="w-full aspect-square md:aspect-auto md:min-h-72 object-cover"
                onError={(event) => {
                  const target = event.target as HTMLImageElement;
                  if (target.src.includes('/main/')) {
                    target.src = target.src.replace('/main/', '/master/');
                  } else {
                    target.src = 'https://picsum.photos/400';
                  }
                }}
              />
            ) : (
              <div className="w-full aspect-square flex items-center justify-center text-gray-400">
                <FileIcon className="w-12 h-12" aria-hidden="true" />
              </div>
            )}
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

            <section className="mt-auto" aria-labelledby="download-files-heading">
              <h2 id="download-files-heading" className="text-lg font-semibold text-gray-900 dark:text-white mb-4">ملفات التحميل</h2>
              <div className="space-y-3">
                {files.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => void downloadAppFile(file.path, file.name)}
                    className="w-full flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group text-right"
                    aria-label={`تحميل ${file.name}${file.size === undefined ? '' : `، ${formatFileSize(file.size)}`}`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      <FileIcon className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="block text-gray-700 dark:text-gray-200 font-medium truncate" dir="ltr">{file.name}</span>
                        {file.size !== undefined && (
                          <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatFileSize(file.size)}</span>
                        )}
                      </div>
                    </div>
                    <Download className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex-shrink-0" aria-hidden="true" />
                  </button>
                ))}
                {files.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">لا توجد ملفات متاحة للتحميل</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </article>
    </main>
  );
}

export default function AppDetails() {
  return (
    <>
      <Navbar />
      <Suspense fallback={
        <div className="flex justify-center items-center h-64" role="status" aria-label="جارٍ تحميل التطبيق">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>
      }>
        <AppDetailsContent />
      </Suspense>
    </>
  );
}

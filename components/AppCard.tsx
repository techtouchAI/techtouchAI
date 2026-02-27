'use client';

import { AppItem, getRawGithubUrl } from '@/lib/db';
import { Download, Eye } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getViews } from '@/lib/counter';

interface AppCardProps {
  app: AppItem;
  isSingleApp?: boolean;
}

export default function AppCard({ app, isSingleApp }: AppCardProps) {
  const imageUrl = getRawGithubUrl(app.imagePath);
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    getViews(app.id).then(count => {
      if (count !== null) setViews(count);
    });
  }, [app.id]);

  const files = app.files || (app.filePath && app.fileName ? [{ path: app.filePath, name: app.fileName }] : []);
  const firstFile = files[0];

  const handleDownload = async (e: React.MouseEvent, path: string, name: string) => {
    e.preventDefault();
    let url = getRawGithubUrl(path, 'main');
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (!res.ok && res.status === 404) {
        url = getRawGithubUrl(path, 'master');
      }
    } catch (err) {}
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Link href={`/app?id=${app.id}`} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow group flex flex-row items-center p-3 sm:p-4 gap-4">
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 flex-shrink-0">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={app.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src.includes('/main/')) {
                target.src = target.src.replace('/main/', '/master/');
              } else {
                target.src = 'https://picsum.photos/200';
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      <div className="flex-grow flex flex-col justify-center min-w-0 py-1">
        <h3 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg line-clamp-1 mb-1">
          {app.name}
        </h3>
        {app.description && (
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
            {app.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-auto">
          <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
            <Eye className="w-3.5 h-3.5" />
            <span>{views !== null ? views : '...'} مشاهدة</span>
          </div>
          {isSingleApp && firstFile && (
            <button 
              onClick={(e) => handleDownload(e, firstFile.path, firstFile.name)}
              className="mr-auto flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              تحميل
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

'use client';

import { AppItem, getRawGithubUrl } from '@/lib/db';
import { Download } from 'lucide-react';
import Link from 'next/link';

interface AppCardProps {
  app: AppItem;
  isSingleApp?: boolean;
}

export default function AppCard({ app, isSingleApp }: AppCardProps) {
  const imageUrl = getRawGithubUrl(app.imagePath);

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
    <Link href={`/app?id=${app.id}`} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow group flex flex-row items-center p-2.5 sm:p-3 gap-3">
      <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 flex-shrink-0">
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
            <div className="w-5 h-5 border-2 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      <div className="flex-grow flex flex-col justify-center min-w-0 py-0.5">
        <h3 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg line-clamp-1 mb-0.5">
          {app.name}
        </h3>
        {app.description && (
          <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mb-1.5 leading-relaxed">
            {app.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-auto">
          {isSingleApp && firstFile && (
            <button 
              onClick={(e) => handleDownload(e, firstFile.path, firstFile.name)}
              className="mr-auto flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-md text-[10px] font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              <Download className="w-3 h-3" />
              تحميل
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

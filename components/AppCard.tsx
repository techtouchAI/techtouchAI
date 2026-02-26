'use client';

import { AppItem, getRawGithubUrl } from '@/lib/db';
import { Download } from 'lucide-react';

interface AppCardProps {
  app: AppItem;
}

export default function AppCard({ app }: AppCardProps) {
  const handleDownload = async () => {
    let url = getRawGithubUrl(app.filePath, 'main');
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (!res.ok && res.status === 404) {
        url = getRawGithubUrl(app.filePath, 'master');
      }
    } catch (e) {
      // Ignore fetch error and just try main
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = app.fileName;
    a.target = '_blank'; // Open in new tab as fallback
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const imageUrl = getRawGithubUrl(app.imagePath);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
      <div
        className="relative aspect-square cursor-pointer overflow-hidden bg-gray-50 dark:bg-gray-800 flex-shrink-0"
        onClick={handleDownload}
      >
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
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-3 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
            <Download className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </div>
      <div className="p-3 sm:p-4 flex-grow flex flex-col justify-center">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base line-clamp-1 mb-1 text-center">
          {app.name}
        </h3>
        {app.description && (
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-2 text-center">
            {app.description}
          </p>
        )}
      </div>
    </div>
  );
}

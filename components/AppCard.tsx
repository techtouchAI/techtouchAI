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
        <div className="flex items-center gap-1.5 mt-auto overflow-x-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {files.map((file, idx) => (
            <button 
              key={idx}
              onClick={(e) => handleDownload(e, file.path, file.name)}
              className="flex-shrink-0 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-md text-[9px] sm:text-[10px] font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
              title={file.name}
            >
              <Download className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="max-w-[50px] sm:max-w-[70px] truncate" dir="ltr">{file.name}</span>
            </button>
          ))}
        </div>
      </div>
    </Link>
  );
}

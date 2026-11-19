'use client';

import { AppItem, getRawGithubUrl } from '@/lib/db';
import { getAppFiles } from '@/lib/appFiles';
import { downloadAppFile } from '@/lib/download';
import { Download } from 'lucide-react';
import Link from 'next/link';

interface AppCardProps {
  app: AppItem;
}

export default function AppCard({ app }: AppCardProps) {
  const imageUrl = getRawGithubUrl(app.imagePath);
  const files = getAppFiles(app);

  return (
    <article className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow flex flex-row items-center p-2.5 sm:p-3 gap-3">
      <Link
        href={`/app?id=${encodeURIComponent(app.id)}`}
        aria-label={`عرض تفاصيل ${app.name}`}
        className="group flex flex-1 min-w-0 items-center gap-3"
      >
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 flex-shrink-0">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={app.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(event) => {
                const target = event.target as HTMLImageElement;
                if (target.src.includes('/main/')) {
                  target.src = target.src.replace('/main/', '/master/');
                } else {
                  target.src = 'https://picsum.photos/200';
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
            </div>
          )}
        </div>
        <div className="flex-grow flex flex-col justify-center min-w-0 py-0.5">
          <h3 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg line-clamp-1 mb-0.5">
            {app.name}
          </h3>
          {app.description && (
            <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
              {app.description}
            </p>
          )}
        </div>
      </Link>

      {files.length > 0 && (
        <div
          aria-label="روابط التحميل السريع"
          className="flex items-center gap-1.5 flex-shrink-0 max-w-[38%] overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {files.map((file) => (
            <button
              key={file.path}
              type="button"
              onClick={() => void downloadAppFile(file.path, file.name)}
              className="flex-shrink-0 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-md text-[9px] sm:text-[10px] font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
              title={file.name}
              aria-label={`تحميل ${file.name}`}
            >
              <Download className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="max-w-[50px] sm:max-w-[70px] truncate" dir="ltr">{file.name}</span>
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

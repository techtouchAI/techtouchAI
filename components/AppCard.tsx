'use client';

import { AppItem, getRawGithubUrl } from '@/lib/db';
import { Download } from 'lucide-react';
import Link from 'next/link';

interface AppCardProps {
  app: AppItem;
}

export default function AppCard({ app }: AppCardProps) {
  const imageUrl = getRawGithubUrl(app.imagePath);

  return (
    <Link href={`/app/${app.id}`} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
      <div className="relative aspect-square overflow-hidden bg-gray-50 dark:bg-gray-800 flex-shrink-0">
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
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 font-medium text-sm text-indigo-600 dark:text-indigo-400">
            عرض التفاصيل
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
    </Link>
  );
}

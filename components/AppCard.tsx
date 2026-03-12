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
    let url = path;
    if (!path.startsWith('http')) {
      url = getRawGithubUrl(path, 'main');
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (!res.ok && res.status === 404) {
          url = getRawGithubUrl(path, 'master');
        }
      } catch (err) {}
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Link href={`/app?id=${app.id}`} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-3xl shadow-sm hover:shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden transition-all duration-300 group flex flex-row items-center p-4 sm:p-5 gap-4 sm:gap-5 hover:-translate-y-1">
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-800 flex-shrink-0 shadow-inner group-hover:shadow-lg transition-shadow duration-300">
        <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent dark:from-white/5 z-10 pointer-events-none"></div>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={app.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
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
      <div className="flex-grow flex flex-col justify-center min-w-0 py-1">
        <h3 className="font-bold text-gray-900 dark:text-white text-lg sm:text-xl line-clamp-1 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {app.name}
        </h3>
        {app.description && (
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed">
            {app.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-auto overflow-x-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-1">
          {files.map((file, idx) => (
            <button 
              key={idx}
              onClick={(e) => handleDownload(e, file.path, file.name)}
              className="flex-shrink-0 flex items-center gap-1.5 bg-indigo-50/80 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 hover:scale-105 active:scale-95 transition-all"
              title={file.name}
            >
              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="max-w-[60px] sm:max-w-[80px] truncate" dir="ltr">{file.name}</span>
            </button>
          ))}
        </div>
      </div>
    </Link>
  );
}

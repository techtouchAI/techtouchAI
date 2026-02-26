'use client';

import { AppItem } from '@/lib/db';
import { getGithubConfig } from '@/lib/github';

export function CMSAppImage({ app }: { app: AppItem }) {
  const config = getGithubConfig();
  
  if (!config) {
    return <div className="w-full h-full bg-gray-100 dark:bg-gray-800 animate-pulse" />;
  }

  // Add timestamp to bypass browser cache
  const timestamp = new Date().getTime();
  const imageUrl = `https://raw.githubusercontent.com/${config.username}/${config.repo}/main/${app.imagePath}?t=${timestamp}`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={app.name}
      className="w-full h-full object-cover"
      onError={(e) => {
        (e.target as HTMLImageElement).src = 'https://picsum.photos/200'; // Fallback
      }}
    />
  );
}

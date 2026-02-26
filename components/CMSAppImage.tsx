'use client';

import { AppItem, getRawGithubUrl } from '@/lib/db';

export function CMSAppImage({ app }: { app: AppItem }) {
  const imageUrl = getRawGithubUrl(app.imagePath);

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

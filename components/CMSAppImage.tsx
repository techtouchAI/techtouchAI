'use client';

import { AppItem, getPublicUrl } from '@/lib/db';

export function CMSAppImage({ app }: { app: AppItem }) {
  // Add timestamp to bypass browser cache
  const timestamp = new Date().getTime();
  const imageUrl = `${getPublicUrl(app.imagePath)}?t=${timestamp}`;

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

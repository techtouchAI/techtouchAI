'use client';

import { useEffect, useState } from 'react';
import { AppItem } from '@/lib/db';

export function CMSAppImage({ app }: { app: AppItem }) {
  const [imageUrl, setImageUrl] = useState<string>('');

  useEffect(() => {
    const url = URL.createObjectURL(app.image);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [app.image]);

  if (!imageUrl) {
    return <div className="w-full h-full bg-gray-100 animate-pulse" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={app.name}
      className="w-full h-full object-cover"
    />
  );
}

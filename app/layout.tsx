import type {Metadata} from 'next';
import { Cairo } from 'next/font/google';
import './globals.css'; // Global styles

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
});

export const metadata: Metadata = {
  title: 'تطبيقات للشاشات',
  description: 'موقع لعرض وتحميل التطبيقات',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body suppressHydrationWarning className="font-cairo bg-gray-50 text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}

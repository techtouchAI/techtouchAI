import type {Metadata} from 'next';
import { Cairo } from 'next/font/google';
import Script from 'next/script';
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
      <head>
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-TR55PX6G95" strategy="afterInteractive" />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-TR55PX6G95');
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="font-cairo bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}

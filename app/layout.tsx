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
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-M30SE8J69J"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-M30SE8J69J');
          `}
        </Script>
      </head>
      <body suppressHydrationWarning className="font-cairo bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}

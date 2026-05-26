import type {NextConfig} from 'next';

// للتحقق مما إذا كان البناء يتم لصالح GitHub Pages
const isGithubPages = process.env.GITHUB_ACTIONS === 'true' || process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image placeholder.
  images: {
    unoptimized: true, // مطلوب لـ GitHub Pages
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
    ],
  },
  // استخدام 'export' لـ GitHub Pages و 'standalone' لبيئة التطوير الحالية
  output: isGithubPages ? 'export' : 'standalone',
  // تعيين المسار الأساسي ليتوافق مع اسم المستودع على GitHub
  ...(isGithubPages ? { basePath: '/techtouchAI' } : {}),
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;

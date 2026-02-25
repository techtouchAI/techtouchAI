import Link from 'next/link';
import { LayoutGrid, Settings } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-indigo-600">
              <LayoutGrid className="w-6 h-6" />
              تطبيقات للشاشات
            </Link>
          </div>
          <div className="flex items-center">
            <Link
              href="/cms"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              لوحة التحكم
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

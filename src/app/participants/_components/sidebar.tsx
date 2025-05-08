"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/language-context';

interface UserInfo {
  name?: string | null;
  username?: string | null;
  email?: string | null;
  id?: number;
  isParticipant?: boolean;
  role?: string;
}

export default function ParticipantSidebar({ user }: { user: UserInfo | null }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  
  // Function to determine if a link is active
  const isActive = (path: string) => {
    if (path === '/participants/dashboard') {
      return pathname === '/participants' || pathname === '/participants/dashboard';
    }
    return pathname.startsWith(path);
  };

  return (
    <aside className="hidden lg:block w-64 border-r bg-gray-50 dark:bg-gray-900 overflow-y-auto min-h-full">
      <div className="p-4 font-medium text-sm uppercase text-gray-500 dark:text-gray-400">{t('sidebar.explorer')}</div>
      <div className="w-64 p-4 border-t">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
            {user?.name?.charAt(0) || user?.username?.charAt(0) || 'G'}
          </div>
          <div className="text-sm">
            <p className="font-medium">{user?.name || user?.username || 'Guest'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
          </div>
        </div>
      </div>
      <nav className="space-y-1 px-2">
        <Link
          href="/participants/dashboard"
          className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-md group ${
            isActive('/participants/dashboard')
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-800'
          }`}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-5 w-5 mr-3 ${
              isActive('/participants/dashboard') 
                ? 'text-blue-600' 
                : 'text-gray-500 group-hover:text-blue-600'
            }`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          {t('sidebar.dashboard')}
        </Link>
        
        <Link
          href="/participants/profile"
          className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-md group ${
            isActive('/participants/profile')
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-800'
          }`}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-5 w-5 mr-3 ${
              isActive('/participants/profile') 
                ? 'text-blue-600' 
                : 'text-gray-500 group-hover:text-blue-600'
            }`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {t('sidebar.profile')}
        </Link>
        
        <Link
          href="/participants/contingents"
          className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-md group ${
            isActive('/participants/contingents')
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-800'
          }`}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-5 w-5 mr-3 ${
              isActive('/participants/contingents') 
                ? 'text-blue-600' 
                : 'text-gray-500 group-hover:text-blue-600'
            }`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          {t('sidebar.contingent')}
        </Link>
        
        <Link
          href="/participants/contestants"
          className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-md group ${
            isActive('/participants/contestants')
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-800'
          }`}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-5 w-5 mr-3 ${
              isActive('/participants/contestants') 
                ? 'text-blue-600' 
                : 'text-gray-500 group-hover:text-blue-600'
            }`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          {t('sidebar.contestants')}
        </Link>
        
        <Link
          href="/participants/managers"
          className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-md group ${
            isActive('/participants/managers')
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-800'
          }`}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-5 w-5 mr-3 ${
              isActive('/participants/managers') 
                ? 'text-blue-600' 
                : 'text-gray-500 group-hover:text-blue-600'
            }`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {t('sidebar.managers')}
        </Link>
        
        <Link
          href="/participants/teams"
          className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-md group ${
            isActive('/participants/teams')
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-800'
          }`}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-5 w-5 mr-3 ${
              isActive('/participants/teams') 
                ? 'text-blue-600' 
                : 'text-gray-500 group-hover:text-blue-600'
            }`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {t('sidebar.teams')}
        </Link>
      </nav>
      
      
    </aside>
  );
}

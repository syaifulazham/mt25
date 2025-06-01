import React, { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { default as dynamicImport } from 'next/dynamic';
import Image from 'next/image';

// Mark this layout as dynamic since it uses session which uses headers()
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Import the client component dynamically with no SSR
const ParticipantSidebar = dynamicImport(
  () => import('./_components/sidebar'),
  { ssr: false }
);

// Import the language selector component dynamically
const LanguageSelector = dynamicImport(
  () => import('@/components/language-selector').then(mod => ({ default: mod.LanguageSelector })),
  { ssr: false }
);

interface ParticipantLayoutProps {
  children: ReactNode;
}

export default async function ParticipantLayout({ children }: ParticipantLayoutProps) {
  // Get current user without redirecting (middleware handles redirects for unauthenticated users)
  const user = await getSessionUser({ redirectToLogin: false });
  
  // If user is authenticated but not a participant, redirect to appropriate area
  if (user) {
    const isParticipant = (user as any).role === 'PARTICIPANTS_MANAGER' || (user as any).isParticipant === true;
    
    if (!isParticipant) {
      // Redirect non-participants to appropriate area
      if ((user as any).role === 'ADMIN' || (user as any).role === 'OPERATOR' || (user as any).role === 'VIEWER') {
        redirect('/organizer');
      } else if ((user as any).role === 'JUDGE') {
        redirect('/judge');
      } else {
        redirect('/');
      }
    }
  }
  // Don't redirect here - let middleware handle unauthenticated users

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 text-white">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <a href="/participants" className="flex items-center gap-3">
              <Image 
                src="/images/mt-logo-white.png" 
                alt="Techlympics 2025 Logo" 
                width={180} 
                height={40} 
                className="h-10 w-auto" 
                priority 
              />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-white leading-none">MALAYSIA</span>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-red-500 to-blue-500">TECHLYMPICS 2025</span>
              </div>
              <span className="rounded-md bg-gradient-to-r from-blue-500 to-indigo-600 px-2 py-1 text-xs text-white hidden sm:inline-block">
                Participant
              </span>
            </a>
          </div>
          
          {/* Mobile menu */}
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 p-0">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[80vw] sm:w-[350px] bg-gradient-to-b from-blue-900 via-indigo-900 to-purple-900 text-white border-l-0">
                <nav className="flex flex-col gap-4 pt-4">
                  <a href="/participants/dashboard" className="text-lg font-medium px-4 py-2 hover:bg-blue-800/50 rounded-md hover:text-yellow-400 transition-colors">
                    Dashboard
                  </a>
                  <a href="/participants/profile" className="text-lg font-medium px-4 py-2 hover:bg-blue-800/50 rounded-md hover:text-yellow-400 transition-colors">
                    Profile
                  </a>
                  <a href="/participants/contingents" className="text-lg font-medium px-4 py-2 hover:bg-blue-800/50 rounded-md hover:text-yellow-400 transition-colors">
                    Contingent
                  </a>
                  <a href="/participants/contestants" className="text-lg font-medium px-4 py-2 hover:bg-blue-800/50 rounded-md hover:text-yellow-400 transition-colors">
                    Contestants
                  </a>
                  <a href="/participants/managers" className="text-lg font-medium px-4 py-2 hover:bg-blue-800/50 rounded-md hover:text-yellow-400 transition-colors">
                    Managers
                  </a>
                  <a href="/participants/teams" className="text-lg font-medium px-4 py-2 hover:bg-blue-800/50 rounded-md hover:text-yellow-400 transition-colors">
                    Teams
                  </a>
                  <a href="/participants/lms" className="text-lg font-medium px-4 py-2 hover:bg-blue-800/50 rounded-md hover:text-yellow-400 transition-colors">
                    LMS
                  </a>
                  <div className="border-t border-blue-700 my-4"></div>
                  {user ? (
                    <>
                      <div className="flex items-center justify-center mx-4 my-2">
                        <LanguageSelector variant="full" className="w-full justify-center" />
                      </div>
                      <a href="/api/auth/signout" className="text-lg font-medium mx-4 px-4 py-2 rounded-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 transition-all text-center">
                        Sign Out
                      </a>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center mx-4 my-2">
                        <LanguageSelector variant="full" className="w-full justify-center" />
                      </div>
                      <a href="/participants/auth/login" className="text-lg font-medium mx-4 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all text-center">
                        Sign In
                      </a>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
          
          {/* Desktop user menu */}
          <div className="hidden lg:flex items-center space-x-4">
            <LanguageSelector variant="full" className="text-white" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-white">
                {user?.name || user?.username || 'Guest'}
              </span>
              {user ? (
                <a href="/api/auth/signout" className="px-4 py-2 rounded-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 transition-all text-white text-sm">
                  Sign Out
                </a>
              ) : (
                <a href="/participants/auth/login" className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all text-white text-sm">
                  Sign In
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* VS Code-style Sidebar using client component */}
        <ParticipantSidebar user={user} />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-white dark:bg-gray-950 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

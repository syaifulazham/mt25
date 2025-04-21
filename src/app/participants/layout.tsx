import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

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
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <a href="/participants" className="flex items-center space-x-2">
              <span className="font-bold">Techlympics</span>
              <span className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground hidden sm:inline-block">
                Participant
              </span>
            </a>
          </div>
          
          {/* Mobile menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 p-0">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[80vw] sm:w-[350px]">
                <nav className="flex flex-col gap-4">
                  <a href="/participants/profile" className="text-lg font-medium px-2 py-1 hover:bg-accent rounded-md">
                    Profile
                  </a>
                  <a href="/participants/contingents" className="text-lg font-medium px-2 py-1 hover:bg-accent rounded-md">
                    My Teams
                  </a>
                  <a href="/participants/contests" className="text-lg font-medium px-2 py-1 hover:bg-accent rounded-md">
                    Contests
                  </a>
                  <div className="border-t my-4"></div>
                  {user ? (
                    <a href="/api/auth/signout" className="text-lg font-medium px-2 py-1 hover:bg-accent rounded-md text-destructive">
                      Sign Out
                    </a>
                  ) : (
                    <a href="/participants/auth/login" className="text-lg font-medium px-2 py-1 hover:bg-accent rounded-md text-primary">
                      Sign In
                    </a>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
          
          {/* Desktop navigation */}
          <nav className="hidden md:flex flex-1 items-center justify-between space-x-2">
            <div className="flex items-center gap-4 ml-6">
              <a href="/participants/profile" className="text-sm font-medium hover:text-primary">
                Profile
              </a>
              <a href="/participants/contingents" className="text-sm font-medium hover:text-primary">
                My Teams
              </a>
              <a href="/participants/contests" className="text-sm font-medium hover:text-primary">
                Contests
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {user?.name || user?.username || 'Guest'}
              </span>
              {user ? (
                <a href="/api/auth/signout" className="text-sm font-medium hover:text-destructive">
                  Sign Out
                </a>
              ) : (
                <a href="/participants/auth/login" className="text-sm font-medium hover:text-primary">
                  Sign In
                </a>
              )}
            </div>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <div className="container py-4 px-4 md:py-6 md:px-6">{children}</div>
      </main>
      <footer className="border-t py-4">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row px-4">
          <p className="text-center text-sm text-muted-foreground md:text-left">
            &copy; {new Date().getFullYear()} Techlympics 2025. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

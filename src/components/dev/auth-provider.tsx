'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { hasMockAuthCookie, setMockAuthCookie, clearMockAuthCookie } from '@/lib/mock-auth';

// This component is only for development purposes
export default function DevAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Check if we have an auth cookie on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if we already have a cookie
        const hasAuth = hasMockAuthCookie();
        setIsAuthenticated(hasAuth);
        
        // If not authenticated, set a mock auth cookie automatically
        if (!hasAuth) {
          await handleAuthenticate();
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      }
    };

    // Only run in development
    if (process.env.NODE_ENV === 'development') {
      checkAuth();
    }
  }, []);

  // Handle manual authentication
  const handleAuthenticate = async () => {
    if (isAuthenticating) return;
    
    setIsAuthenticating(true);
    try {
      await setMockAuthCookie();
      setIsAuthenticated(true);
      toast.success('Development authentication enabled');
      
      // Add auth header to all fetch requests
      const originalFetch = window.fetch;
      window.fetch = async (input, init = {}) => {
        const newInit: RequestInit = {
          ...init,
          credentials: 'include' as RequestCredentials,
        };
        return originalFetch(input, newInit);
      };
      
      // Force reload to apply the auth cookie
      window.location.reload();
    } catch (error) {
      console.error('Authentication error:', error);
      toast.error('Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      clearMockAuthCookie();
      setIsAuthenticated(false);
      toast.success('Logged out');
      // Reload the page to apply the change
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  // If we're still checking auth status, show nothing
  if (isAuthenticated === null) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Development auth controls - only shown in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-slate-800 text-white p-2 rounded-lg shadow-lg text-xs">
            <div className="flex items-center mb-1">
              <span className="mr-2">Dev Auth:</span>
              {isAuthenticated ? (
                <span className="text-green-400 flex items-center">
                  <span className="h-2 w-2 bg-green-400 rounded-full mr-1"></span>
                  Active
                </span>
              ) : (
                <span className="text-red-400 flex items-center">
                  <span className="h-2 w-2 bg-red-400 rounded-full mr-1"></span>
                  Inactive
                </span>
              )}
            </div>
            <div className="flex space-x-2">
              {isAuthenticated ? (
                <Button size="sm" variant="destructive" onClick={handleLogout} className="text-xs h-7 px-2">
                  Logout
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  variant="default" 
                  onClick={handleAuthenticate} 
                  className="text-xs h-7 px-2"
                  disabled={isAuthenticating}
                >
                  {isAuthenticating ? 'Logging in...' : 'Login'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}

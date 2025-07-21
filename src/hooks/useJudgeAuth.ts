import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface JudgeEndpoint {
  id: number;
  eventId: number;
  contestId: number;
  judge_name: string;
  judge_passcode: string;
  hashcode: string;
  event: {
    id: number;
    name: string;
  };
  contest: {
    id: number;
    name: string;
  };
}

export function useJudgeAuth(hashcode: string) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [judgeEndpoint, setJudgeEndpoint] = useState<JudgeEndpoint | null>(null);

  // Cookie management functions
  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  };

  const setCookie = (name: string, value: string, days: number = 1) => {
    if (typeof document === 'undefined') return;
    
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
  };

  const deleteCookie = (name: string) => {
    if (typeof document === 'undefined') return;
    
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Strict`;
  };

  // Check if already authenticated via cookie
  const checkCookieAuth = async () => {
    const cookiePasscode = getCookie(`judge_passcode_${hashcode}`);
    if (cookiePasscode) {
      try {
        const res = await fetch(`/api/judge/auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            hashcode,
            passcode: cookiePasscode,
          }),
        });
        
        if (res.ok) {
          const data = await res.json();
          setJudgeEndpoint(data.judgeEndpoint);
          setAuthenticated(true);
          setLoading(false);
          return true;
        } else {
          // Invalid cookie, remove it
          deleteCookie(`judge_passcode_${hashcode}`);
        }
      } catch (error) {
        console.error('Cookie auth check failed:', error);
        deleteCookie(`judge_passcode_${hashcode}`);
      }
    }
    setLoading(false);
    return false;
  };

  // Authenticate with passcode
  const authenticate = async (passcode: string) => {
    try {
      const res = await fetch(`/api/judge/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hashcode,
          passcode,
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Authentication failed');
      }
      
      const data = await res.json();
      setJudgeEndpoint(data.judgeEndpoint);
      setAuthenticated(true);
      
      // Store passcode in cookie
      setCookie(`judge_passcode_${hashcode}`, passcode, 1); // 1 day expiry
      
      toast.success('Authentication successful');
      return true;
      
    } catch (error) {
      console.error('Authentication error:', error);
      toast.error(error instanceof Error ? error.message : 'Authentication failed');
      return false;
    }
  };

  // Logout function
  const logout = () => {
    deleteCookie(`judge_passcode_${hashcode}`);
    setAuthenticated(false);
    setJudgeEndpoint(null);
    toast.success('Logged out successfully');
  };

  // Check cookie auth on mount
  useEffect(() => {
    checkCookieAuth();
  }, [hashcode]);

  return {
    loading,
    authenticated,
    judgeEndpoint,
    authenticate,
    logout
  };
}

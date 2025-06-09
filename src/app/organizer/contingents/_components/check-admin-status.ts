"use client";

// Simple utility to check if the current user has admin status
// This can be used in client components where session data is needed

export async function checkAdminStatus(): Promise<boolean> {
  try {
    const response = await fetch('/api/users/me', {
      method: 'GET',
      credentials: 'include',
    });
    
    if (!response.ok) {
      return false;
    }
    
    const userData = await response.json();
    return userData?.user?.role === 'ADMIN';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

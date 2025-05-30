'use client';

import { SessionProvider } from 'next-auth/react';

// Mark this layout as dynamic to ensure fresh auth state
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Wrap children in SessionProvider to enable client-side auth
  return (
    <SessionProvider>
      <div className="min-h-screen">
        {children}
      </div>
    </SessionProvider>
  );
}

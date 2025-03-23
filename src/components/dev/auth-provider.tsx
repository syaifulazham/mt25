'use client';

import React from 'react';

// This component is only for development purposes
export default function DevAuthProvider({ children }: { children: React.ReactNode }) {
  // Simply return children without any auth logic to prevent infinite loops
  // This is a temporary fix until we can properly debug the auth provider
  return <>{children}</>;
}

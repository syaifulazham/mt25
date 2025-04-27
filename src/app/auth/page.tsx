// Main entry point for authentication - redirects to appropriate section
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

// Mark as dynamic to avoid caching
export const dynamic = 'force-dynamic';

export default function AuthPage() {
  // Check referer header to determine which section to redirect to
  const headersList = headers();
  const referer = headersList.get('referer') || '';
  
  // Determine which section to redirect to based on referer
  if (referer.includes('/organizer')) {
    redirect('/auth/organizer/login');
  } else {
    // Default to participants
    redirect('/auth/participants/login');
  }
}

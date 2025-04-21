import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Participant Portal | Techlympics 2025',
  description: 'Participant portal for Techlympics 2025',
};

export default async function ParticipantPage() {
  // Check if user is authenticated
  const user = await getSessionUser();
  
  if (user) {
    // If authenticated, redirect to dashboard
    redirect('/participants/dashboard');
  } else {
    // If not authenticated, redirect to login
    redirect('/participants/auth/login');
  }
}

"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileEditForm } from '../_components/profile-edit-form';
import { useLanguage } from '@/lib/i18n/language-context';

// Define a combined user type to handle participant user details
type ParticipantUser = {
  id: number;
  name: string | null;
  email: string;
  username: string;
  isActive: boolean;
  // Participant-specific fields
  ic?: string | null;
  phoneNumber?: string | null;
  gender?: string | null;
};

export default function EditProfilePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState<ParticipantUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const response = await fetch('/api/participants/profile');
        if (!response.ok) {
          // If not authenticated, redirect to login
          router.push('/participants/auth/login');
          return;
        }
        const userData = await response.json();
        setUser(userData);
      } catch (error) {
        console.error('Error fetching user data:', error);
        router.push('/participants/auth/login');
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserData();
  }, [router]);

  // Display loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user data is loaded but somehow null/undefined
  if (!user) {
    return null; // Will be redirected by the useEffect
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('profile.edit.title')}</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {t('profile.edit.description')}
        </p>
      </div>

      <ProfileEditForm user={user} />
    </div>
  );
}

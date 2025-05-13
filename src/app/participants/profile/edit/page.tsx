import { Metadata } from 'next';
import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { ProfileEditForm } from '../_components/profile-edit-form';

export const metadata: Metadata = {
  title: 'Edit Profile | Techlympics 2025',
  description: 'Update your personal information',
};

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

export default async function EditProfilePage() {
  // Get the current user
  const user = await getCurrentUser() as unknown as ParticipantUser;
  
  if (!user) {
    // If no user, redirect to login
    redirect('/participants/auth/login');
  }
  
  // Since this page is inside /participants/ route, only participants should access it
  // Additional checking will be done in the API endpoint

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Edit Profile</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Update your personal information
        </p>
      </div>

      <ProfileEditForm user={user} />
    </div>
  );
}

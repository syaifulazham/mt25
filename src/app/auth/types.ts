/**
 * Shared authentication types for both organizer and participant interfaces
 */
import { user_role } from "@prisma/client";

export interface AuthProps {
  callbackUrl?: string;
  error?: string;
  message?: string;
}

export interface LoginFormProps {
  onSubmit: (values: LoginFormValues) => Promise<void>;
  isLoading: boolean;
  error?: string;
  csrfToken?: string;
  callbackUrl?: string;
  userType: 'organizer' | 'participant';
}

export interface LoginFormValues {
  username: string;
  password: string;
  csrfToken?: string;
  callbackUrl?: string;
}

export interface AuthResult {
  success: boolean;
  message: string;
  redirect?: string;
}

export interface AuthUserBase {
  id: number;
  name: string;
  email: string;
  role?: user_role | string;
  isParticipant?: boolean;
}

export interface OrganizerUser extends AuthUserBase {
  username: string | null;
  role: user_role;
  isParticipant?: false;
}

export interface ParticipantUser extends AuthUserBase {
  participantId?: number;
  isParticipant: true;
  role: 'PARTICIPANTS_MANAGER'; // Special role for participants
}

export type AuthUser = OrganizerUser | ParticipantUser;

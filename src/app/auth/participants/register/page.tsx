// Server component for participant registration
import ParticipantRegisterClient from './client';

// Define metadata for SEO
export const metadata = {
  title: "Techlympics 2025 | Register",
  description: "Extraordinary, Global, Inclusive - Register for the Techlympics 2025 Platform",
};

// Mark this page as dynamic to ensure fresh authentication state
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function ParticipantRegisterPage() {
  return <ParticipantRegisterClient />;
}

// Server component for participant login
import ParticipantLoginClient from './client';

// Define metadata for SEO
export const metadata = {
  title: "Login | Participant Portal",
  description: "Login to the Techlympics 2025 Participant Portal",
};

// Mark this page as dynamic to ensure fresh authentication state
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function ParticipantLoginPage() {
  return <ParticipantLoginClient />;
}

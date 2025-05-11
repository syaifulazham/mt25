// Server component for participant login
import ParticipantLoginClient from './client';

// Define metadata for SEO
export const metadata = {
  title: "Techlympics 2025 | Login",
  description: "Extraordinary, Global, Inclusive - Login to the Techlympics 2025 Platform",
};

// Mark this page as dynamic to ensure fresh authentication state
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function ParticipantLoginPage() {
  return <ParticipantLoginClient />;
}

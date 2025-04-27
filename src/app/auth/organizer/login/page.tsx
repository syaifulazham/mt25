// Server component for organizer login
import OrganizerLoginClient from './client';

// Define metadata for SEO
export const metadata = {
  title: "Login | Organizer Portal",
  description: "Login to the Techlympics 2025 Organizer Portal",
};

// Mark this page as dynamic to ensure fresh authentication state
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function OrganizerLoginPage() {
  return <OrganizerLoginClient />;
}

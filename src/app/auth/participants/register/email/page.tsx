// Server component for email registration
import EmailRegisterClient from './client';

// Define metadata for SEO
export const metadata = {
  title: "Techlympics 2025 | Register with Email",
  description: "Register with email for the Techlympics 2025 Platform",
};

// Mark this page as dynamic to ensure fresh authentication state
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function EmailRegisterPage() {
  return <EmailRegisterClient />;
}

// Server component for email verification
import VerifyEmailClient from './client';

// Define metadata for SEO
export const metadata = {
  title: "Techlympics 2025 | Verify Email",
  description: "Verify your email for the Techlympics 2025 Platform",
};

// Mark this page as dynamic to ensure fresh authentication state
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function VerifyEmailPage() {
  return <VerifyEmailClient />;
}

// Simple login page wrapper that uses a client component for the actual login functionality
import LoginClient from './client';

export const metadata = {
  title: "Login | Organizer Portal",
  description: "Login to the Techlympics 2025 Organizer Portal",
};

// Mark this page as dynamic to ensure it's always fresh
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function LoginPage() {
  // Just render the client component
  return <LoginClient />;
}

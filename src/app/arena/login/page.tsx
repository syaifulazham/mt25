// Arena login page for contestant microsite
import ArenaLoginClient from '@/app/arena/login/client';

// Define metadata for SEO
export const metadata = {
  title: "Malaysia Techlympics 2025 | Arena Login",
  description: "Enter the gaming arena - Login to your contestant microsite",
};

// Mark this page as dynamic to ensure fresh authentication state
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function ArenaLoginPage() {
  return <ArenaLoginClient />;
}

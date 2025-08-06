// Microsites management page for participants
import MicrositesClient from './client';

// Define metadata for SEO
export const metadata = {
  title: "Microsites Management | Techlympics 2025 Participant Portal",
  description: "Manage contestant microsites and arena access",
};

// Mark this page as dynamic to ensure fresh data
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function MicrositesPage() {
  return <MicrositesClient />;
}

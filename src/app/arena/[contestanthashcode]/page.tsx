// Contestant microsite page
import ContestantArenaClient from './client';

// Define metadata for SEO
export const metadata = {
  title: "Malaysia Techlympics 2025 | Contestant Arena",
  description: "Your personal gaming arena - Access quizzes and track your progress",
};

// Mark this page as dynamic to ensure fresh data
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

interface ArenaPageProps {
  params: {
    contestanthashcode: string;
  };
}

export default function ContestantArenaPage({ params }: ArenaPageProps) {
  return <ContestantArenaClient contestantHashcode={params.contestanthashcode} />;
}

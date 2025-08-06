// Quiz start page - displays instructions before starting the quiz
import QuizStartClient from './client';

// Define metadata for SEO
export const metadata = {
  title: "Malaysia Techlympics 2025 | Quiz Instructions",
  description: "Quiz instructions and preparation - Get ready to start your quiz",
};

// Mark this page as dynamic to ensure fresh data
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

interface QuizStartPageProps {
  params: {
    contestanthashcode: string;
    quizId: string;
  };
}

export default function QuizStartPage({ params }: QuizStartPageProps) {
  return (
    <QuizStartClient 
      contestantHashcode={params.contestanthashcode} 
      quizId={parseInt(params.quizId)}
    />
  );
}

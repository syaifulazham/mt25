// Quiz taking page - actual quiz with timer and questions
import QuizTakingClient from './client';

// Define metadata for SEO
export const metadata = {
  title: "Malaysia Techlympics 2025 | Taking Quiz",
  description: "Quiz in progress - Answer questions within the time limit",
};

// Mark this page as dynamic to ensure fresh data
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

interface QuizTakingPageProps {
  params: {
    contestanthashcode: string;
    quizId: string;
  };
}

export default function QuizTakingPage({ params }: QuizTakingPageProps) {
  return (
    <QuizTakingClient 
      contestantHashcode={params.contestanthashcode} 
      quizId={parseInt(params.quizId)}
    />
  );
}

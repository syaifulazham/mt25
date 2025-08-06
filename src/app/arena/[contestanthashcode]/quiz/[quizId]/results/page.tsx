import { Suspense } from 'react';
import QuizResultsClient from './client';

interface QuizResultsPageProps {
  params: {
    contestanthashcode: string;
    quizId: string;
  };
}

export default function QuizResultsPage({ params }: QuizResultsPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading quiz results...</p>
          </div>
        </div>
      }>
        <QuizResultsClient 
          contestantHashcode={params.contestanthashcode}
          quizId={params.quizId}
        />
      </Suspense>
    </div>
  );
}

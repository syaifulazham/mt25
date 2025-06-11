"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { QuestionEditForm } from "./_components/question-edit-form";

interface Question {
  id: number;
  target_group: string;
  knowledge_field: string;
  question: string;
  question_image?: string;
  answer_type: string;
  answer_options: Array<{ option: string; answer: string }>;
  answer_correct: string;
}

export default function EditQuestionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        setLoading(true);
        console.log('Fetching question with ID:', params.id);
        const res = await fetch(`/api/organizer/questions/${params.id}`);
        
        if (!res.ok) {
          console.error('API error status:', res.status);
          const errorData = await res.json().catch(() => ({}));
          console.error('Error response data:', errorData);
          
          if (res.status === 404) {
            throw new Error("Question not found");
          } else {
            throw new Error(errorData.error || "Failed to fetch question");
          }
        }
        
        const data = await res.json();
        setQuestion(data);
      } catch (err: any) {
        setError(err.message || "An error occurred");
        toast.error(err.message || "Failed to load question details");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestion();
  }, [params.id]);

  if (loading) {
    return (
      <div className="container py-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading question...</p>
        </div>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="container py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/organizer/quizzes/questions">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Questions
            </Link>
          </Button>
        </div>
        
        <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-md">
          <h1 className="text-xl font-semibold text-destructive mb-2">Error</h1>
          <p>{error || "Question not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/organizer/quizzes/questions/${params.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Question
          </Link>
        </Button>
      </div>
      
      <PageHeader 
        title="Edit Question" 
        description={`Editing question #${question.id}`} 
      />

      <div className="mt-6">
        <QuestionEditForm question={question} />
      </div>
    </div>
  );
}

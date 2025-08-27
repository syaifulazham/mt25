import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Eye, Pencil } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface QuestionDetailModalProps {
  question: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuestionDetailModal({
  question,
  open,
  onOpenChange,
}: QuestionDetailModalProps) {
  if (!question) return null;

  // Format answer type for display
  const getAnswerTypeDisplay = (type: string) => {
    const types: Record<string, string> = {
      'single_selection': 'Single Choice',
      'multiple_selection': 'Multiple Choice',
      'binary': 'Binary (Yes/No)'
    };
    return types[type] || type;
  };

  // Get badge color based on answer type
  const getAnswerTypeBadgeVariant = (answerType: string): "default" | "outline" | "secondary" | "destructive" => {
    switch (answerType) {
      case "single_selection":
        return "default";
      case "multiple_selection":
        return "secondary";
      case "binary":
        return "outline";
      default:
        return "outline";
    }
  };

  // Format the correct answer(s)
  const formatCorrectAnswer = (correct: string | string[]): string => {
    if (Array.isArray(correct)) {
      return correct.join(", ");
    }
    return correct;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex gap-2 mb-2">
            <Badge>{question.target_group}</Badge>
            <Badge variant={getAnswerTypeBadgeVariant(question.answer_type)}>
              {getAnswerTypeDisplay(question.answer_type)}
            </Badge>
            <Badge variant="outline">{question.knowledge_field}</Badge>
          </div>
          <DialogTitle className="text-xl">{question.question}</DialogTitle>
          <DialogDescription>
            {question.createdAt && typeof question.createdAt === 'string' && question.createdAt.trim() !== '' 
              ? `Created on ${format(new Date(question.createdAt), "MMMM dd, yyyy")}` 
              : 'Creation date not available'}
            {question.creatorName && ` by ${question.creatorName}`}
          </DialogDescription>
        </DialogHeader>

        {question.question_image && (
          <div className="my-4">
            <h4 className="font-medium mb-2">Question Image:</h4>
            <div className="relative h-48 w-full rounded overflow-hidden border">
              <Image 
                src={question.question_image} 
                alt="Question illustration" 
                fill 
                className="object-contain"
                unoptimized // For development purposes
                onError={(e: any) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden absolute inset-0 items-center justify-center bg-muted/20">
                <p className="text-sm text-muted-foreground">Image not available</p>
              </div>
            </div>
          </div>
        )}

        <div className="my-4">
          <h4 className="font-medium mb-2">Answer Options:</h4>
          <div className="space-y-2">
            {question.answer_options.map((option: any, index: number) => {
              // Match the approach used in the question detail page
              const isCorrect = (() => {
                // For binary questions
                if (question.answer_type === "binary") {
                  return option.answer === question.answer_correct;
                }
                
                // For single selection
                if (question.answer_type === "single_selection") {
                  return option.option === question.answer_correct;
                }
                
                // For multiple selection
                if (question.answer_type === "multiple_selection") {
                  // Handle both string and array formats
                  if (typeof question.answer_correct === 'string') {
                    return question.answer_correct.includes(option.option);
                  } else if (Array.isArray(question.answer_correct)) {
                    return question.answer_correct.includes(option.option);
                  }
                }
                
                return false;
              })();
                  
              return (
                <div 
                  key={index}
                  className={`p-3 rounded-md border ${isCorrect 
                    ? "bg-green-100 border-green-300 shadow-sm" 
                    : "bg-gray-50"}`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{option.option}</span>
                    {isCorrect && (
                      <Badge className="bg-green-600 hover:bg-green-600 text-white border-none font-medium">
                        ✓ Correct Answer
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm mt-1">{option.answer}</p>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <div className="flex gap-2 w-full justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button asChild variant="outline">
              <Link href={`/organizer/quizzes/questions/${question.questionId || question.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View Full Details
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/organizer/quizzes/questions/${question.questionId || question.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

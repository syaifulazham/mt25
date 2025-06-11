"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MathRenderer } from "@/components/math/math-renderer";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Calendar, 
  School, 
  Tag, 
  BookOpen,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Image,
  AlertTriangle,
  ClipboardList
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Answer {
  option: string;
  answer: string;
}

interface Question {
  id: number;
  target_group: string;
  knowledge_field: string;
  question: string;
  question_image?: string;
  answer_type: "single_selection" | "multiple_selection" | "binary";
  answer_options: Answer[];
  answer_correct: string;
  creatorName: string;
  createdAt: string;
  updatedAt: string;
  usedInQuizzes: Array<{
    quizId: number;
    quizName: string;
    quizStatus: string;
    points: number;
    order: number;
  }>;
}

export default function QuestionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [targetGroups, setTargetGroups] = useState<Array<{value: string, label: string}>>([]);

  useEffect(() => {
    // Fetch target groups
    const fetchTargetGroups = async () => {
      try {
        const res = await fetch('/api/organizer/targetgroups', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store'
        });
        
        if (!res.ok) {
          console.error('Failed to fetch target groups:', res.status);
          return;
        }
        
        const data = await res.json();
        setTargetGroups(data);
      } catch (error) {
        console.error('Error fetching target groups:', error);
      }
    };
    
    fetchTargetGroups();
  }, []);
  
  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        setLoading(true);
        console.log('Fetching question with ID:', params.id);
        
        // Debug information for paths
        console.log('API path being used:', `/api/organizer/questions/${params.id}`);
        
        const res = await fetch(`/api/organizer/questions/${params.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store'
        });
        
        if (!res.ok) {
          console.error('API error status:', res.status);
          let errorMessage = 'Failed to fetch question';
          
          try {
            const errorData = await res.json();
            console.error('Error response data:', errorData);
            errorMessage = errorData.error || errorMessage;
          } catch (jsonError) {
            console.error('Could not parse error response as JSON:', jsonError);
          }
          
          if (res.status === 404) {
            throw new Error("Question not found");
          } else {
            throw new Error(errorMessage);
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

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/organizer/questions/${params.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete question");
      }

      toast.success("Question deleted successfully");
      router.push('/organizer/quizzes/questions');
    } catch (err: any) {
      toast.error(err.message || "Failed to delete question");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Function to get answer type display text
  const getAnswerTypeDisplay = (type: string) => {
    const types: Record<string, string> = {
      'single_selection': 'Single Choice',
      'multiple_selection': 'Multiple Choice', 
      'binary': 'Binary (Yes/No)'
    };
    return types[type] || type;
  };

  // Knowledge field options (same as in new question page)
  const knowledgeFields = [
    { value: "general_science", label: "General Science" },
    { value: "robotics", label: "Robotics" },
    { value: "artificial_intelligence", label: "Artificial Intelligence" },
    { value: "physics", label: "Physics" },
    { value: "math", label: "Mathematics" },
    { value: "chemistry", label: "Chemistry" },
    { value: "biology", label: "Biology" },
    { value: "computer_science", label: "Computer Science" },
    { value: "engineering", label: "Engineering" },
  ];

  // Function to get target group display
  const getTargetGroupDisplay = (group: string) => {
    // Find matching target group from fetched data
    const targetGroup = targetGroups.find(tg => tg.value === group);
    return targetGroup ? targetGroup.label : group;
  };
  
  // Function to get knowledge field display
  const getKnowledgeFieldDisplay = (field: string) => {
    // Find matching knowledge field
    const knowledgeField = knowledgeFields.find(kf => kf.value === field);
    return knowledgeField ? knowledgeField.label : field;
  };

  // Function to render answers based on type
  const renderAnswers = (question: Question) => {
    if (question.answer_type === "binary") {
      return (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className={`p-3 border rounded-md ${question.answer_correct === "Yes" ? "border-green-500 bg-green-50" : "border-gray-200"}`}>
            <div className="flex items-center">
              {question.answer_correct === "Yes" && <CheckCircle className="h-5 w-5 text-green-500 mr-2" />}
              <span>Yes</span>
            </div>
          </div>
          <div className={`p-3 border rounded-md ${question.answer_correct === "No" ? "border-green-500 bg-green-50" : "border-gray-200"}`}>
            <div className="flex items-center">
              {question.answer_correct === "No" && <CheckCircle className="h-5 w-5 text-green-500 mr-2" />}
              <span>No</span>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-3 mt-4">
          {question.answer_options.map((opt, idx) => (
            <div 
              key={idx} 
              className={`p-3 border rounded-md 
                ${
                  question.answer_type === "single_selection" 
                    ? opt.option === question.answer_correct ? "border-green-500 bg-green-50" : "border-gray-200"
                    : question.answer_correct.includes(opt.option) ? "border-green-500 bg-green-50" : "border-gray-200"
                }
              `}
            >
              <div className="flex items-center">
                {question.answer_type === "single_selection" 
                  ? (opt.option === question.answer_correct && <CheckCircle className="h-5 w-5 text-green-500 mr-2" />)
                  : (question.answer_correct.includes(opt.option) && <CheckCircle className="h-5 w-5 text-green-500 mr-2" />)
                }
                <MathRenderer content={opt.answer} />
              </div>
            </div>
          ))}
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="container py-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin">
            <svg className="h-8 w-8 text-primary opacity-75" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">Loading question details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <h2 className="text-xl font-semibold">Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button asChild className="mt-4">
            <Link href="/organizer/quizzes/questions">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Questions
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="container py-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <h2 className="text-xl font-semibold">Question Not Found</h2>
          <p className="text-muted-foreground">The question you are looking for does not exist or has been deleted.</p>
          <Button asChild className="mt-4">
            <Link href="/organizer/quizzes/questions">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Questions
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/organizer/quizzes/questions">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Questions
            </Link>
          </Button>
        </div>
        
        <div className="flex justify-between items-start gap-4 flex-wrap md:flex-nowrap mb-6">
          <div>
            <PageHeader
              title="Question Details"
              description={`Viewing question #${question.id}`}
            />
          </div>
          
          <div className="flex gap-2 self-start">
            <Button variant="outline" asChild>
              <Link href={`/organizer/quizzes/questions/${params.id}/edit`}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Question
              </Link>
            </Button>
            
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to delete this question?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This question will be permanently deleted and removed from any quizzes it's used in.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete();
                    }}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? "Deleting..." : "Delete Question"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Question</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-medium">
                      <MathRenderer content={question.question} />
                    </h3>
                    {question.question_image && (
                      <div className="mt-4 p-4 border rounded flex items-center">
                        <Image className="h-5 w-5 mr-2 text-blue-500" />
                        <span className="text-sm text-muted-foreground">
                          Image attached: {question.question_image}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Answer Options</h4>
                    {renderAnswers(question)}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ClipboardList className="mr-2 h-5 w-5" />
                  Used In Quizzes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {question.usedInQuizzes && question.usedInQuizzes.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quiz Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {question.usedInQuizzes.map((quiz) => (
                        <TableRow key={quiz.quizId}>
                          <TableCell className="font-medium">
                            {quiz.quizName}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={quiz.quizStatus === "ACTIVE" ? "default" : 
                                     quiz.quizStatus === "DRAFT" ? "secondary" : "outline"}>
                              {quiz.quizStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>{quiz.points}</TableCell>
                          <TableCell>{quiz.order}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" asChild>
                              <Link href={`/organizer/quizzes/${quiz.quizId}`}>
                                View Quiz
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-6 text-center text-muted-foreground">
                    <p>This question is not used in any quizzes yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Question Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Knowledge Field</p>
                      <p className="font-medium">{getKnowledgeFieldDisplay(question.knowledge_field)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <School className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Target Group</p>
                      <p className="font-medium">{getTargetGroupDisplay(question.target_group)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Answer Type</p>
                      <p className="font-medium">{getAnswerTypeDisplay(question.answer_type)}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-medium">{format(new Date(question.createdAt), 'PP')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Last Updated</p>
                      <p className="font-medium">{format(new Date(question.updatedAt), 'PP')}</p>
                    </div>
                  </div>
                  
                  {question.creatorName && (
                    <div className="flex items-start gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        {question.creatorName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Created By</p>
                        <p className="font-medium">{question.creatorName}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

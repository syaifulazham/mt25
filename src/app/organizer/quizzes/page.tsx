"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  PlusCircle, 
  Search, 
  Loader2, 
  BrainCircuit, 
  BookOpen, 
  Sparkles, 
  Plus,
  MoreHorizontal, 
  Eye, 
  Copy, 
  Pencil, 
  Trash, 
  ImageIcon,
  Clock,
  Calendar,
  User
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

interface Quiz {
  id: number;
  quiz_name: string;
  description: string | null;
  target_group: string;
  time_limit: number | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  createdBy: number;
  creatorName: string;
  totalQuestions: number;
  totalPoints: number;
}

interface Question {
  id: number;
  question: string;
  question_image: string | null;
  target_group: string;
  knowledge_field: string;
  answer_type: string;
  createdAt: string;
  createdBy: number;
  creatorName: string;
}

export default function QuizzesPage() {
  // Main tabs state - Quizzes or Questions
  const [mainView, setMainView] = useState("quizzes");
  
  // Quiz management state
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
  const [quizTab, setQuizTab] = useState("all");
  
  // Question bank state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [questionTab, setQuestionTab] = useState("all");
  
  // Shared state
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/organizer/quizzes");
        
        if (!response.ok) {
          throw new Error(`Error fetching quizzes: ${response.status}`);
        }
        
        const data = await response.json();
        setQuizzes(data);
        setFilteredQuizzes(data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch quizzes:", err);
        setError("Failed to load quizzes. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizzes();
  }, []);
  
  // Fetch questions for Question Bank
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setQuestionsLoading(true);
        const response = await fetch("/api/organizer/questions");
        
        if (!response.ok) {
          throw new Error(`Error fetching questions: ${response.status}`);
        }
        
        const data = await response.json();
        setQuestions(data);
        setFilteredQuestions(data);
        setQuestionsError(null);
      } catch (err) {
        console.error("Failed to fetch questions:", err);
        setQuestionsError("Failed to load questions. Please try again later.");
      } finally {
        setQuestionsLoading(false);
      }
    };

    // Only fetch questions when the Question Bank tab is active
    if (mainView === "questions") {
      fetchQuestions();
    }
  }, [mainView]);

  useEffect(() => {
    // Apply filtering based on active tab and search query for quizzes
    let filtered = [...quizzes];
    
    // Filter by status if not "all" tab
    if (quizTab !== "all") {
      const statusMap: Record<string, string> = {
        "draft": "created",
        "published": "published",
        "ended": "ended"
      };
      
      filtered = filtered.filter(quiz => quiz.status === statusMap[quizTab]);
    }
    
    // Apply search query filter if present
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(quiz => 
        quiz.quiz_name.toLowerCase().includes(query) || 
        (quiz.description && quiz.description.toLowerCase().includes(query))
      );
    }
    
    setFilteredQuizzes(filtered);
  }, [quizTab, searchQuery, quizzes]);
  
  // Filter questions based on tab and search query
  useEffect(() => {
    if (mainView !== "questions") return;
    
    let filtered = [...questions];
    
    // Filter by target group if not "all" tab
    if (questionTab !== "all") {
      filtered = filtered.filter(question => question.target_group === questionTab);
    }
    
    // Apply search query filter if present
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(question => 
        question.question.toLowerCase().includes(query) || 
        question.knowledge_field.toLowerCase().includes(query)
      );
    }
    
    setFilteredQuestions(filtered);
  }, [questionTab, searchQuery, questions, mainView]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleQuizTabChange = (value: string) => {
    setQuizTab(value);
  };
  
  const handleQuestionTabChange = (value: string) => {
    setQuestionTab(value);
  };
  
  const handleMainViewChange = (value: string) => {
    setMainView(value);
    setSearchQuery(""); // Reset search when switching views
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader 
        title="Quiz & Question Management" 
        description="Create and manage quizzes and questions for participants"
      >
        {mainView === "quizzes" ? (
          <Button asChild>
            <Link href="/organizer/quizzes/new">
              <Plus className="mr-2 h-4 w-4" /> New Quiz
            </Link>
          </Button>
        ) : (
          <div className="flex space-x-2">
            <Button asChild variant="outline">
              <Link href="/organizer/quizzes/questions/new">
                <Plus className="mr-2 h-4 w-4" /> New Question
              </Link>
            </Button>
            <Button asChild>
              <Link href="/organizer/quizzes/questions/generate">
                <Sparkles className="mr-2 h-4 w-4" /> Generate with AI
              </Link>
            </Button>
          </div>
        )}
      </PageHeader>
      
      {/* Main Navigation Tabs */}
      <Tabs defaultValue="quizzes" value={mainView} onValueChange={handleMainViewChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="quizzes" className="flex items-center">
            <BookOpen className="mr-2 h-4 w-4" /> Quizzes
          </TabsTrigger>
          <TabsTrigger value="questions" className="flex items-center">
            <BrainCircuit className="mr-2 h-4 w-4" /> Question Bank
          </TabsTrigger>
        </TabsList>
      
        {/* Quizzes Tab Content */}
        <TabsContent value="quizzes" className="space-y-6">
          <div className="flex mb-6">
            <Input 
              className="max-w-sm" 
              placeholder="Search quizzes..." 
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>

          <Tabs defaultValue="all" value={quizTab} onValueChange={handleQuizTabChange}>
            <TabsList>
              <TabsTrigger value="all">All Quizzes</TabsTrigger>
              <TabsTrigger value="draft">Drafts</TabsTrigger>
              <TabsTrigger value="published">Published</TabsTrigger>
              <TabsTrigger value="ended">Ended</TabsTrigger>
            </TabsList>

            {isLoading ? (
              <div className="flex justify-center items-center h-60">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading quizzes...</span>
              </div>
            ) : error ? (
              <div className="mt-6 p-4 bg-red-50 text-red-800 rounded-md">
                <p>{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            ) : (
              <TabsContent value={quizTab} className="mt-6">
                {filteredQuizzes.length === 0 ? (
                  <div className="text-center py-12 border rounded-md bg-gray-50">
                    <h3 className="text-lg font-medium mb-2">No quizzes found</h3>
                    <p className="text-gray-500 mb-4">
                      {searchQuery 
                        ? "No quizzes match your search query. Try a different search term."
                        : quizTab !== "all" 
                          ? `You don't have any ${quizTab} quizzes yet.` 
                          : "You haven't created any quizzes yet."}
                    </p>
                    <Button asChild>
                      <Link href="/organizer/quizzes/new">
                        <Plus className="mr-2 h-4 w-4" /> Create Your First Quiz
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredQuizzes.map(quiz => (
                      <QuizCard 
                        key={quiz.id}
                        id={quiz.id}
                        title={quiz.quiz_name}
                        description={quiz.description || undefined}
                        status={quiz.status}
                        targetGroup={quiz.target_group}
                        totalQuestions={quiz.totalQuestions}
                        timeLimit={quiz.time_limit || undefined}
                        createdAt={new Date(quiz.createdAt)}
                        createdBy={quiz.creatorName}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </TabsContent>
        
        {/* Question Bank Tab Content */}
        <TabsContent value="questions" className="space-y-6">
          <div className="flex mb-6">
            <Input 
              className="max-w-sm" 
              placeholder="Search questions..." 
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>

          <Tabs defaultValue="all" value={questionTab} onValueChange={handleQuestionTabChange}>
            <TabsList>
              <TabsTrigger value="all">All Questions</TabsTrigger>
              <TabsTrigger value="PRIMARY">Primary</TabsTrigger>
              <TabsTrigger value="SECONDARY">Secondary</TabsTrigger>
              <TabsTrigger value="HIGHER">Higher Education</TabsTrigger>
            </TabsList>

            {questionsLoading ? (
              <div className="flex justify-center items-center h-60">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading questions...</span>
              </div>
            ) : questionsError ? (
              <div className="mt-6 p-4 bg-red-50 text-red-800 rounded-md">
                <p>{questionsError}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            ) : (
              <TabsContent value={questionTab} className="mt-6">
                {filteredQuestions.length === 0 ? (
                  <div className="text-center py-12 border rounded-md bg-gray-50">
                    <h3 className="text-lg font-medium mb-2">No questions found</h3>
                    <p className="text-gray-500 mb-4">
                      {searchQuery 
                        ? "No questions match your search query. Try a different search term."
                        : questionTab !== "all" 
                          ? `You don't have any ${questionTab} level questions yet.` 
                          : "You haven't created any questions yet."}
                    </p>
                    <div className="flex justify-center space-x-4">
                      <Button asChild variant="outline">
                        <Link href="/organizer/quizzes/questions/new">
                          <Plus className="mr-2 h-4 w-4" /> Create Question Manually
                        </Link>
                      </Button>
                      <Button asChild>
                        <Link href="/organizer/quizzes/questions/generate">
                          <Sparkles className="mr-2 h-4 w-4" /> Generate with AI
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[300px]">Question</TableHead>
                          <TableHead>Target Group</TableHead>
                          <TableHead>Knowledge Field</TableHead>
                          <TableHead>Answer Type</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredQuestions.map(question => (
                          <TableRow key={question.id}>
                            <TableCell className="font-medium truncate max-w-[300px]">
                              {question.question}
                              {question.question_image && (
                                <Badge variant="outline" className="ml-2">
                                  <ImageIcon className="h-3 w-3 mr-1" /> Has Image
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={question.target_group === 'PRIMARY' ? 'default' : 
                                          question.target_group === 'SECONDARY' ? 'secondary' : 'outline'}>
                                {question.target_group === 'PRIMARY' ? 'Primary' : 
                                question.target_group === 'SECONDARY' ? 'Secondary' : 'Higher Education'}
                              </Badge>
                            </TableCell>
                            <TableCell>{question.knowledge_field}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {question.answer_type === 'single_selection' ? 'Single Choice' :
                                 question.answer_type === 'multiple_selection' ? 'Multiple Choice' :
                                 question.answer_type === 'binary' ? 'Yes/No' : question.answer_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(question.createdAt), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" asChild>
                                  <Link href={`/organizer/quizzes/questions/${question.id}`}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                                <Button size="sm" variant="ghost" asChild>
                                  <Link href={`/organizer/quizzes/questions/${question.id}/edit`}>
                                    <Pencil className="h-4 w-4" />
                                  </Link>
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem asChild>
                                      <Link href={`/organizer/quizzes/questions/${question.id}`}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        View
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                      <Link href={`/organizer/quizzes/questions/${question.id}/edit`}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Edit
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>
                                      <Copy className="mr-2 h-4 w-4" />
                                      Duplicate
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600">
                                      <Trash className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface QuestionCardProps {
  question: Question;
}

function QuestionCard({ question }: QuestionCardProps) {
  // Function to get answer type display text
  const getAnswerTypeDisplay = (type: string) => {
    const types: Record<string, string> = {
      'single_selection': 'Single Choice',
      'multiple_selection': 'Multiple Choice',
      'binary': 'Binary (Yes/No)'
    };
    return types[type] || type;
  };

  return (
    <Card className="overflow-hidden transition-all hover:border-primary/50">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <div>
            <Badge variant={question.target_group === 'PRIMARY' ? 'default' : 
                          question.target_group === 'SECONDARY' ? 'secondary' : 'outline'}
                  className="mb-2">
              {question.target_group === 'PRIMARY' ? 'Primary' : 
               question.target_group === 'SECONDARY' ? 'Secondary' : 'Higher Education'}
            </Badge>
            <Badge variant="outline" className="ml-2">
              {getAnswerTypeDisplay(question.answer_type)}
            </Badge>
          </div>
          <Badge variant="outline">{question.knowledge_field}</Badge>
        </div>
        <CardTitle className="text-lg line-clamp-2">
          {question.question}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        {question.question_image && (
          <div className="text-xs text-muted-foreground mb-2">
            <span className="font-medium">Has image:</span> {question.question_image.substring(0, 30)}...
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2 flex justify-between text-sm text-muted-foreground">
        <div className="flex items-center">
          <Calendar className="h-3 w-3 mr-1" />
          {format(new Date(question.createdAt), 'MMM d, yyyy')}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/organizer/quizzes/questions/${question.id}`}>
              View
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/organizer/quizzes/questions/${question.id}/edit`}>
              Edit
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

interface QuizCardProps {
  id: number;
  title: string;
  description?: string;
  status: string;
  targetGroup: string;
  totalQuestions: number;
  timeLimit?: number;
  createdAt: Date;
  createdBy: string;
}

function QuizCard({ id, title, description, status, targetGroup, totalQuestions, timeLimit, createdAt, createdBy }: QuizCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'created':
        return <Badge className="bg-yellow-100 text-yellow-800">Draft</Badge>;
      case 'published':
        return <Badge className="bg-green-100 text-green-800">Published</Badge>;
      case 'retracted':
        return <Badge className="bg-gray-100 text-gray-800">Retracted</Badge>;
      case 'ended':
        return <Badge className="bg-red-100 text-red-800">Ended</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTargetGroupLabel = (targetGroup: string) => {
    switch (targetGroup) {
      case 'PRIMARY':
        return 'Primary School';
      case 'SECONDARY':
        return 'Secondary School';
      case 'UNIVERSITY':
        return 'University';
      case 'PROFESSIONAL':
        return 'Professional';
      case 'ALL':
        return 'All Groups';
      default:
        return targetGroup;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <CardTitle className="line-clamp-1">{title}</CardTitle>
          {getStatusBadge(status)}
        </div>
        <CardDescription className="line-clamp-2">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Questions:</span>
            <span className="font-medium">{totalQuestions}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Target Group:</span>
            <span className="font-medium">{getTargetGroupLabel(targetGroup)}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span>{timeLimit ? `${timeLimit} minutes` : "No time limit"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span>Created {format(createdAt, "MMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <span>{createdBy}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-6">
        <Button variant="outline" className="w-full" asChild>
          <Link href={`/organizer/quizzes/${id}`}>View Quiz</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

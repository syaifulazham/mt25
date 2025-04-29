"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Download, Upload, Filter, FileText, BookOpen, Sparkles, Loader2, Calendar, ArrowLeft, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Copy, Pencil, Trash } from "lucide-react";

interface Question {
  id: number;
  target_group: string;
  knowledge_field: string;
  question: string;
  question_image?: string;
  answer_type: "single_selection" | "multiple_selection" | "binary";
  answer_options: Array<{
    option: string;
    answer: string;
  }>;
  answer_correct: string;
  createdBy: number;
  creatorName: string;
  createdAt: string;
  updatedAt: string;
}

// Knowledge field options
const knowledgeFields = [
  "general science",
  "robotics",
  "artificial intelligence",
  "physics",
  "math",
  "chemistry",
  "biology",
  "computer science",
  "engineering"
];

// Target group options
const targetGroups = [
  "PRIMARY",
  "SECONDARY",
  "HIGHER"
];

export default function QuestionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  
  // State for questions data from API
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Handle filter selection
  const handleFieldFilter = (field: string | null) => {
    setSelectedField(field);
  };

  const handleGroupFilter = (group: string | null) => {
    setSelectedGroup(group);
  };

  // Fetch questions from API
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/organizer/questions');
        
        if (!response.ok) {
          throw new Error(`Error fetching questions: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Fetched questions:', data);
        setQuestions(data);
      } catch (err) {
        console.error('Failed to fetch questions:', err);
        setError('Failed to load questions. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  // Filter questions based on search term, active tab, and filters
  const filteredQuestions = questions.filter((question) => {
    const matchesSearch = 
      question.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.knowledge_field.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesField = selectedField === null || 
      question.knowledge_field.toLowerCase() === selectedField.toLowerCase();
    
    const matchesGroup = selectedGroup === null || 
      question.target_group === selectedGroup;
    
    if (activeTab === "all") return matchesSearch && matchesField && matchesGroup;
    if (activeTab === "single") return matchesSearch && matchesField && matchesGroup && question.answer_type === "single_selection";
    if (activeTab === "multiple") return matchesSearch && matchesField && matchesGroup && question.answer_type === "multiple_selection";
    if (activeTab === "binary") return matchesSearch && matchesField && matchesGroup && question.answer_type === "binary";
    
    return matchesSearch && matchesField && matchesGroup;
  });

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col space-y-4">
        <Link 
          href="/organizer/quizzes" 
          className="flex items-center text-muted-foreground hover:text-primary transition-colors w-fit"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Quizzes
        </Link>
        
        <PageHeader 
          title="Question Bank" 
          description="Manage questions for quizzes and assessments"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 w-full max-w-sm">
          <Search className="w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search questions..."
            value={searchTerm}
            onChange={handleSearch}
            className="h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1">
                <Filter className="w-4 h-4" />
                <span>Filter</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Knowledge Field</DropdownMenuLabel>
              <DropdownMenuItem 
                onClick={() => handleFieldFilter(null)}
                className={selectedField === null ? "bg-blue-50 text-blue-600 font-medium" : ""}
              >
                All Fields
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {knowledgeFields.map((field) => (
                <DropdownMenuItem 
                  key={field}
                  onClick={() => handleFieldFilter(field)}
                  className={selectedField === field ? "bg-blue-50 text-blue-600 font-medium" : ""}
                >
                  {field}
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Target Group</DropdownMenuLabel>
              <DropdownMenuItem 
                onClick={() => handleGroupFilter(null)}
                className={selectedGroup === null ? "bg-blue-50 text-blue-600 font-medium" : ""}
              >
                All Groups
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {targetGroups.map((group) => (
                <DropdownMenuItem 
                  key={group}
                  onClick={() => handleGroupFilter(group)}
                  className={selectedGroup === group ? "bg-blue-50 text-blue-600 font-medium" : ""}
                >
                  {group}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="outline" size="sm" className="h-9 gap-1">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1">
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1">
            <Link href="/organizer/quizzes/questions/generate" className="flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              <span>AI Generate</span>
            </Link>
          </Button>
          <Button asChild className="h-9 gap-1">
            <Link href="/organizer/quizzes/questions/new">
              <PlusCircle className="w-4 h-4" />
              <span>Create Question</span>
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="all">All Questions</TabsTrigger>
          <TabsTrigger value="single">Single Selection</TabsTrigger>
          <TabsTrigger value="multiple">Multiple Selection</TabsTrigger>
          <TabsTrigger value="binary">Binary</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-4">
          <QuestionsTable questions={filteredQuestions} />
        </TabsContent>

        <TabsContent value="single" className="space-y-4 mt-4">
          <QuestionsTable questions={filteredQuestions} />
        </TabsContent>

        <TabsContent value="multiple" className="space-y-4 mt-4">
          <QuestionsTable questions={filteredQuestions} />
        </TabsContent>
        
        <TabsContent value="binary" className="space-y-4 mt-4">
          <QuestionsTable questions={filteredQuestions} />
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

function QuestionsTable({ questions }: { questions: Question[] }) {
  if (questions.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium mb-2">No questions found</h3>
        <p className="text-gray-500 mb-4">
          Try adjusting your filters or create new questions
        </p>
        <div className="flex justify-center space-x-4">
          <Button asChild variant="outline">
            <Link href="/organizer/quizzes/questions/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Question
            </Link>
          </Button>
          <Button asChild>
            <Link href="/organizer/quizzes/questions/generate">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate with AI
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'single_selection':
        return 'Single Selection';
      case 'multiple_selection':
        return 'Multiple Selection';
      case 'binary':
        return 'Binary (Yes/No)';
      default:
        return type;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'single_selection':
        return 'bg-blue-100 text-blue-800';
      case 'multiple_selection':
        return 'bg-purple-100 text-purple-800';
      case 'binary':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTargetGroupBadgeColor = (group: string) => {
    switch (group) {
      case 'PRIMARY':
        return 'bg-yellow-100 text-yellow-800';
      case 'SECONDARY':
        return 'bg-blue-100 text-blue-800';
      case 'HIGHER':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Question</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Target Group</TableHead>
            <TableHead>Knowledge Field</TableHead>
            <TableHead>Created Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {questions.map((question) => (
            <TableRow key={question.id}>
              <TableCell className="font-medium max-w-md">
                <div className="line-clamp-2">{question.question}</div>
                {question.question_image && (
                  <div className="text-xs text-blue-600 mt-1">Has image attachment</div>
                )}
              </TableCell>
              <TableCell>
                <Badge className={getTypeBadgeColor(question.answer_type)}>
                  {getTypeLabel(question.answer_type)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={getTargetGroupBadgeColor(question.target_group)}>
                  {question.target_group}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="capitalize">{question.knowledge_field}</div>
              </TableCell>
              <TableCell>{format(question.createdAt, "MMM d, yyyy")}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem>
                      <Link href={`/organizer/quizzes/questions/${question.id}`} className="flex items-center w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href={`/organizer/quizzes/questions/${question.id}/edit`} className="flex items-center w-full">
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit Question
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <div className="flex items-center w-full">
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">
                      <div className="flex items-center w-full">
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

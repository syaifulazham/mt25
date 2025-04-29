"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Clock, Search, BookOpen, Award, UserCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface Quiz {
  id: number;
  quiz_name: string;
  description: string | null;
  target_group: string;
  time_limit: number | null;
  status: string;
  totalQuestions: number;
  totalPoints: number;
  creatorName: string;
}

export default function ParticipantQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setIsLoading(true);
        // In a real implementation, this would fetch from a participant-specific endpoint
        // that only returns published quizzes available to this participant
        const response = await fetch("/api/participant/quizzes");
        
        if (!response.ok) {
          // For now, use mock data if the API isn't implemented yet
          const mockData: Quiz[] = [
            {
              id: 1,
              quiz_name: "Science Knowledge Quiz",
              description: "Test your understanding of basic scientific concepts",
              target_group: "SECONDARY",
              time_limit: 30,
              status: "published",
              totalQuestions: 12,
              totalPoints: 20,
              creatorName: "Admin User"
            },
            {
              id: 2,
              quiz_name: "Mathematics Challenge",
              description: "Challenge your math skills with these problems",
              target_group: "SECONDARY",
              time_limit: 45,
              status: "published",
              totalQuestions: 15,
              totalPoints: 30,
              creatorName: "Admin User"
            },
            {
              id: 3,
              quiz_name: "General Knowledge",
              description: "Test your general knowledge across various subjects",
              target_group: "ALL",
              time_limit: 60,
              status: "published",
              totalQuestions: 20,
              totalPoints: 40,
              creatorName: "Admin User"
            }
          ];
          
          setQuizzes(mockData);
          setFilteredQuizzes(mockData);
          return;
        }
        
        const data = await response.json();
        setQuizzes(data);
        setFilteredQuizzes(data);
      } catch (err) {
        console.error("Failed to fetch quizzes:", err);
        setError("Failed to load quizzes. Please try again later.");
        
        // Use mock data for demonstration in case of error
        const mockData: Quiz[] = [
          {
            id: 1,
            quiz_name: "Science Knowledge Quiz",
            description: "Test your understanding of basic scientific concepts",
            target_group: "SECONDARY",
            time_limit: 30,
            status: "published",
            totalQuestions: 12,
            totalPoints: 20,
            creatorName: "Admin User"
          },
          {
            id: 2,
            quiz_name: "Mathematics Challenge",
            description: "Challenge your math skills with these problems",
            target_group: "SECONDARY",
            time_limit: 45,
            status: "published",
            totalQuestions: 15,
            totalPoints: 30,
            creatorName: "Admin User"
          },
          {
            id: 3,
            quiz_name: "General Knowledge",
            description: "Test your general knowledge across various subjects",
            target_group: "ALL",
            time_limit: 60,
            status: "published",
            totalQuestions: 20,
            totalPoints: 40,
            creatorName: "Admin User"
          }
        ];
        
        setQuizzes(mockData);
        setFilteredQuizzes(mockData);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  useEffect(() => {
    // Filter quizzes based on search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = quizzes.filter(quiz => 
        quiz.quiz_name.toLowerCase().includes(query) || 
        (quiz.description && quiz.description.toLowerCase().includes(query))
      );
      setFilteredQuizzes(filtered);
    } else {
      setFilteredQuizzes(quizzes);
    }
  }, [searchQuery, quizzes]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Available Quizzes</h1>
          <p className="text-muted-foreground mt-1">
            Explore and complete quizzes to earn points and badges
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 max-w-md">
        <Search className="w-4 h-4 text-gray-500" />
        <Input 
          placeholder="Search quizzes..." 
          value={searchQuery}
          onChange={handleSearchChange}
          className="h-9"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-60">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading quizzes...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-800 rounded-md">
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
      ) : filteredQuizzes.length === 0 ? (
        <div className="text-center py-12 border rounded-md bg-gray-50">
          <div className="rounded-full bg-gray-100 p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">No quizzes found</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-4">
            {searchQuery 
              ? "No quizzes match your search criteria. Try a different search term."
              : "There are no quizzes available for you at the moment. Check back later!"}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredQuizzes.map(quiz => (
            <QuizCard 
              key={quiz.id}
              id={quiz.id}
              title={quiz.quiz_name}
              description={quiz.description || undefined}
              targetGroup={quiz.target_group}
              timeLimit={quiz.time_limit || undefined}
              totalQuestions={quiz.totalQuestions}
              totalPoints={quiz.totalPoints}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface QuizCardProps {
  id: number;
  title: string;
  description?: string;
  targetGroup: string;
  timeLimit?: number;
  totalQuestions: number;
  totalPoints: number;
}

function QuizCard({ id, title, description, targetGroup, timeLimit, totalQuestions, totalPoints }: QuizCardProps) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge className="bg-green-100 text-green-800">Available</Badge>
        </div>
        <CardDescription className="line-clamp-2">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <div>
            <p className="text-gray-500">Questions</p>
            <p className="font-medium">{totalQuestions}</p>
          </div>
          <div>
            <p className="text-gray-500">Points</p>
            <p className="font-medium">{totalPoints}</p>
          </div>
          <div>
            <p className="text-gray-500">Time</p>
            <p className="font-medium">{timeLimit ? `${timeLimit} min` : "No limit"}</p>
          </div>
          <div>
            <p className="text-gray-500">Level</p>
            <p className="font-medium">{getTargetGroupLabel(targetGroup)}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 pb-4">
        <Button className="w-full" asChild>
          <Link href={`/participant/quizzes/${id}`}>
            Take Quiz
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function getTargetGroupLabel(targetGroup: string) {
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
}

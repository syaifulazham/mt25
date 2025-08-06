"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Save } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type Quiz = {
  id: number;
  quiz_name: string;
  description: string | null;
  target_group: string;
  time_limit: number | null;
  status: string;
  publishedAt: Date | null;
};

export default function EditQuizPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const quizId = parseInt(params.id);
  
  const [quiz, setQuiz] = useState<Quiz>({
    id: 0,
    quiz_name: "",
    description: "",
    target_group: "",
    time_limit: null,
    status: "",
    publishedAt: null
  });
  
  const [loading, setLoading] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetGroups, setTargetGroups] = useState<Array<{value: string, label: string}>>([]);

  // Fetch quiz data from API
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoadingQuiz(true);
        setError(null);
        
        // Fetch quiz data and target groups in parallel
        const [quizResponse, targetGroupsResponse] = await Promise.all([
          fetch(`/api/organizer/quizzes/${quizId}`),
          fetch('/api/organizer/targetgroups')
        ]);
        
        if (!quizResponse.ok) {
          if (quizResponse.status === 404) {
            throw new Error('Quiz not found');
          } else if (quizResponse.status === 401) {
            throw new Error('Unauthorized - Please log in');
          } else if (quizResponse.status === 403) {
            throw new Error('Unauthorized - Only organizers can access this page');
          } else {
            throw new Error(`Failed to fetch quiz: ${quizResponse.status}`);
          }
        }
        
        if (!targetGroupsResponse.ok) {
          console.warn('Failed to fetch target groups, using fallback options');
        }
        
        const quizData = await quizResponse.json();
        setQuiz({
          id: quizData.id,
          quiz_name: quizData.quiz_name,
          description: quizData.description,
          target_group: quizData.target_group,
          time_limit: quizData.time_limit,
          status: quizData.status,
          publishedAt: quizData.publishedAt
        });
        
        // Set target groups if successfully fetched
        if (targetGroupsResponse.ok) {
          const targetGroupsData = await targetGroupsResponse.json();
          setTargetGroups(targetGroupsData);
        } else {
          // Fallback to hardcoded options if API fails
          setTargetGroups([
            { value: "PRIMARY", label: "Primary School" },
            { value: "SECONDARY", label: "Secondary School" },
            { value: "UNIVERSITY", label: "University" },
            { value: "PROFESSIONAL", label: "Professional" },
            { value: "ALL", label: "All Groups" }
          ]);
        }
      } catch (err) {
        console.error('Failed to fetch quiz:', err);
        setError(err instanceof Error ? err.message : 'Failed to load quiz');
      } finally {
        setLoadingQuiz(false);
      }
    };

    if (quizId && !isNaN(quizId)) {
      fetchQuiz();
    } else {
      setError('Invalid quiz ID');
      setLoadingQuiz(false);
    }
  }, [quizId]);

  const handleChange = (field: keyof Quiz, value: string | number | null) => {
    setQuiz((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`/api/organizer/quizzes/${quizId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quiz_name: quiz.quiz_name,
          description: quiz.description,
          target_group: quiz.target_group,
          time_limit: quiz.time_limit,
          status: quiz.status
        }),
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Quiz not found');
        } else if (response.status === 401) {
          throw new Error('Unauthorized - Please log in');
        } else if (response.status === 403) {
          throw new Error('Unauthorized - Only organizers can update quizzes');
        } else if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Invalid quiz data');
        } else {
          throw new Error(`Failed to update quiz: ${response.status}`);
        }
      }
      
      const updatedQuiz = await response.json();
      
      toast.success("Quiz updated successfully");
      router.push(`/organizer/quizzes/${quizId}`);
    } catch (error) {
      console.error("Error updating quiz:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update quiz. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Form validation
  const isValid = 
    quiz.quiz_name.trim().length > 0 && 
    quiz.target_group.trim().length > 0;
  
  const canEdit = quiz.status === 'created';

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Edit Quiz" 
          description={`Update details for "${quiz.quiz_name}"`}
        />
        <Button variant="outline" size="sm" asChild>
          <Link href={`/organizer/quizzes/${quizId}`}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Quiz
          </Link>
        </Button>
      </div>

      {loadingQuiz ? (
        <div className="flex justify-center py-12">
          <div className="animate-pulse space-y-8 w-full max-w-2xl">
            <div className="h-12 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-3">
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      ) : error ? (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="text-red-600 text-lg font-medium mb-2">Error Loading Quiz</div>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Quiz Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!canEdit && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-md mb-4">
                  <p className="font-medium">This quiz cannot be edited</p>
                  <p className="text-sm">
                    Published or completed quizzes cannot be edited. You can view the details, but no changes can be saved.
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="quiz_name">Quiz Name</Label>
                <Input
                  id="quiz_name"
                  value={quiz.quiz_name}
                  onChange={(e) => handleChange("quiz_name", e.target.value)}
                  placeholder="Enter quiz name"
                  disabled={!canEdit}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={quiz.description || ""}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Enter quiz description (optional)"
                  disabled={!canEdit}
                  rows={4}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="target_group">Target Group</Label>
                <Select 
                  value={quiz.target_group} 
                  onValueChange={(value) => handleChange("target_group", value)}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target group" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetGroups.map((group) => (
                      <SelectItem key={group.value} value={group.value}>
                        {group.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="time_limit">Time Limit (minutes)</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="time_limit"
                    type="number"
                    min="0"
                    value={quiz.time_limit || ""}
                    onChange={(e) => handleChange("time_limit", e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Time limit in minutes"
                    disabled={!canEdit}
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap">minutes (0 = no limit)</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6 flex justify-between">
              <Button variant="outline" type="button" asChild>
                <Link href={`/organizer/quizzes/${quizId}`}>Cancel</Link>
              </Button>
              {canEdit && (
                <Button 
                  type="submit" 
                  disabled={!isValid || loading}
                >
                  {loading ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </form>
      )}
    </div>
  );
}

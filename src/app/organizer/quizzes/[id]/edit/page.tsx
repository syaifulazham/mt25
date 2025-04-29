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

// Mock quiz data
const mockQuiz = {
  id: 1,
  quiz_name: "Science Knowledge Quiz",
  description: "Test your understanding of basic scientific concepts",
  target_group: "SECONDARY",
  time_limit: 30,
  status: "created",
  publishedAt: null
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

  // Simulate fetching quiz data
  useEffect(() => {
    setLoadingQuiz(true);
    
    // In a real implementation, this would be a fetch call to your API
    setTimeout(() => {
      setQuiz(mockQuiz);
      setLoadingQuiz(false);
    }, 500);
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
      // In a real implementation, this would be a fetch call to your API
      // const response = await fetch(`/api/organizer/quizzes/${quizId}`, {
      //   method: "PUT",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify(quiz),
      // });
      
      // Simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Quiz updated successfully");
      router.push(`/organizer/quizzes/${quizId}`);
    } catch (error) {
      console.error("Error updating quiz:", error);
      toast.error("Failed to update quiz. Please try again.");
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
                    <SelectItem value="PRIMARY">Primary School</SelectItem>
                    <SelectItem value="SECONDARY">Secondary School</SelectItem>
                    <SelectItem value="UNIVERSITY">University</SelectItem>
                    <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                    <SelectItem value="ALL">All Groups</SelectItem>
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

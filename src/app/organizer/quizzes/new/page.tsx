"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { ChevronLeft, Clock, Save } from "lucide-react";
import { toast } from "sonner";

// Target group options
const targetGroups = [
  { value: "PRIMARY", label: "Primary School" },
  { value: "SECONDARY", label: "Secondary School" },
  { value: "HIGHER", label: "Higher Education" },
];

export default function CreateQuizPage() {
  const [formState, setFormState] = useState({
    quiz_name: "",
    description: "",
    target_group: "",
    time_limit: 30,
    enable_time_limit: true,
    status: "created",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Validation
    if (!formState.quiz_name.trim()) {
      toast.error("Quiz name is required");
      setIsSubmitting(false);
      return;
    }
    
    if (!formState.target_group) {
      toast.error("Please select a target group");
      setIsSubmitting(false);
      return;
    }

    // Prepare data for submission
    const quizData = {
      ...formState,
      time_limit: formState.enable_time_limit ? formState.time_limit : null,
    };
    
    try {
      // Here we would send the data to the server
      // const response = await fetch('/api/organizer/quizzes', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(quizData),
      // });
      
      // if (!response.ok) {
      //   throw new Error('Failed to create quiz');
      // }
      
      // Mock successful submission
      setTimeout(() => {
        toast.success("Quiz created successfully!");
        setIsSubmitting(false);
        // Redirect to assign questions page after successful creation
        window.location.href = "/organizer/quizzes/1/questions"; // In a real app, this would use the new quiz ID
      }, 1000);
      
    } catch (error) {
      console.error("Error creating quiz:", error);
      toast.error("Failed to create quiz. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Create New Quiz" 
          description="Create a quiz and assign questions"
        />
        <Button variant="outline" size="sm" asChild>
          <Link href="/organizer/quizzes">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Quizzes
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="quiz_name">Quiz Name</Label>
                <Input
                  id="quiz_name"
                  placeholder="Enter quiz name"
                  value={formState.quiz_name}
                  onChange={(e) => handleInputChange("quiz_name", e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Enter quiz description"
                  value={formState.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="min-h-[100px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_group">Target Group</Label>
                <Select
                  value={formState.target_group}
                  onValueChange={(value) => handleInputChange("target_group", value)}
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

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="time_limit" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Time Limit
                  </Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formState.enable_time_limit}
                      onCheckedChange={(checked) => handleInputChange("enable_time_limit", checked)}
                    />
                    <Label htmlFor="enable_time_limit" className="text-sm cursor-pointer">
                      {formState.enable_time_limit ? "Enabled" : "No time limit"}
                    </Label>
                  </div>
                </div>
                
                {formState.enable_time_limit && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Duration (minutes)</span>
                      <span className="text-sm font-medium">{formState.time_limit} min</span>
                    </div>
                    <Slider
                      defaultValue={[30]}
                      min={5}
                      max={180}
                      step={5}
                      value={[formState.time_limit]}
                      onValueChange={(values) => handleInputChange("time_limit", values[0])}
                      disabled={!formState.enable_time_limit}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>5 min</span>
                      <span>60 min</span>
                      <span>180 min</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.href = "/organizer/quizzes"}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Creating..." : "Create Quiz"}
          </Button>
        </div>
      </form>
    </div>
  );
}

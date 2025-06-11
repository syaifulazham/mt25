"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { MathRenderer } from "@/components/math/math-renderer";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { ChevronLeft, Sparkles, Save, RefreshCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Knowledge field options
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

// Default target group options (used as fallback if API fails)
const defaultTargetGroups = [
  { value: "PRIMARY", label: "Primary School" },
  { value: "SECONDARY", label: "Secondary School" },
  { value: "HIGHER", label: "Higher Education" },
];

// Answer type options
const answerTypes = [
  { value: "single_selection", label: "Single Selection" },
  { value: "multiple_selection", label: "Multiple Selection" },
  { value: "binary", label: "Binary (Yes/No)" },
];

// Level of difficulty options
const difficultyLevels = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

// Language options
const languageOptions = [
  { value: "english", label: "English" },
  { value: "malay", label: "Bahasa Melayu" },
];

// Mock generated questions for demo
const mockGeneratedQuestions = [
  {
    id: 1,
    target_group: "PRIMARY",
    knowledge_field: "general_science",
    question: "Which of the following is NOT a primary color of light?",
    question_image: "",
    answer_type: "single_selection",
    answer_options: [
      { option: "A", answer: "Red" },
      { option: "B", answer: "Green" },
      { option: "C", answer: "Blue" },
      { option: "D", answer: "Yellow" },
    ],
    answer_correct: "D",
  },
  {
    id: 2,
    target_group: "PRIMARY",
    knowledge_field: "general_science",
    question: "What is the process called when a plant makes its own food using sunlight?",
    question_image: "",
    answer_type: "single_selection",
    answer_options: [
      { option: "A", answer: "Photosynthesis" },
      { option: "B", answer: "Respiration" },
      { option: "C", answer: "Digestion" },
      { option: "D", answer: "Absorption" },
    ],
    answer_correct: "A",
  },
  {
    id: 3,
    target_group: "PRIMARY",
    knowledge_field: "general_science",
    question: "Which of these is a renewable source of energy?",
    question_image: "",
    answer_type: "single_selection",
    answer_options: [
      { option: "A", answer: "Coal" },
      { option: "B", answer: "Natural gas" },
      { option: "C", answer: "Solar power" },
      { option: "D", answer: "Petroleum" },
    ],
    answer_correct: "C",
  },
];

export default function GenerateQuestionsPage() {
  const [targetGroups, setTargetGroups] = useState(defaultTargetGroups);
  const [loading, setLoading] = useState(true);
  
  // Fetch target groups from API
  useEffect(() => {
    const fetchTargetGroups = async () => {
      try {
        const response = await fetch('/api/organizer/targetgroups');
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setTargetGroups(data);
          }
        }
      } catch (error) {
        console.error('Error fetching target groups:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTargetGroups();
  }, []);
  
  const [formState, setFormState] = useState({
    target_group: "PRIMARY",
    knowledge_field: "general_science",
    answer_type: "single_selection",
    number_of_questions: 3,
    difficulty: "medium",
    language: "english", // Default to English
    with_images: false,
    with_math_equations: false,
    specific_topics: "",
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);

  const handleInputChange = (field: string, value: any) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const generateQuestions = async () => {
    setIsGenerating(true);
    
    try {
      // Call the actual API endpoint that interfaces with OpenAI
      const response = await fetch('/api/organizer/questions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_group: formState.target_group,
          knowledge_field: formState.knowledge_field,
          answer_type: formState.answer_type,
          count: formState.number_of_questions,
          difficulty: formState.difficulty,
          language: formState.language,
          with_images: formState.with_images,
          with_math_equations: formState.with_math_equations,
          specific_topics: formState.specific_topics,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate questions');
      }
      
      const data = await response.json();
      console.log('Questions generated successfully:', data);
      
      if (data.questions && data.questions.length > 0) {
        // Transform the API response to match the expected format for the UI
        const formattedQuestions = data.questions.map((q: any) => ({
          id: q.id,
          target_group: q.target_group,
          knowledge_field: q.knowledge_field,
          question: q.question,
          question_image: q.question_image,
          answer_type: q.answer_type,
          answer_options: q.answer_options,
          answer_correct: q.answer_correct
        }));
        
        setGeneratedQuestions(formattedQuestions);
        setSelectedQuestions(formattedQuestions.map((q: any) => q.id));
        toast.success(`Generated ${formattedQuestions.length} questions successfully!`);
      } else {
        toast.warning('No questions were generated. Try adjusting your parameters.');
      }
    } catch (error) {
      console.error("Error generating questions:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate questions. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveSelectedQuestions = async () => {
    if (selectedQuestions.length === 0) {
      toast.error("Please select at least one question to save");
      return;
    }
    
    setIsSaving(true);
    
    try {
      // The questions are already saved in the database during generation
      // We could implement a batch API for updating or deleting questions if needed
      // For now, we'll just navigate back to the question bank
      
      toast.success(`Added ${selectedQuestions.length} questions to the question bank!`);
      // Redirect to question bank after saving
      window.location.href = "/organizer/quizzes/questions";
    } catch (error) {
      console.error("Error saving questions:", error);
      toast.error("Failed to save questions. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleQuestionSelection = (id: number) => {
    setSelectedQuestions(prev => 
      prev.includes(id) 
        ? prev.filter(qId => qId !== id) 
        : [...prev, id]
    );
  };

  const selectAllQuestions = () => {
    setSelectedQuestions(generatedQuestions.map(q => q.id));
  };

  const deselectAllQuestions = () => {
    setSelectedQuestions([]);
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/organizer/quizzes">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Quizzes
            </Link>
          </Button>
          <span className="text-muted-foreground">|</span>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/organizer/quizzes/questions">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Questions
            </Link>
          </Button>
        </div>
        
        <PageHeader 
          title="Generate Questions with AI" 
          description="Use AI to generate quiz questions automatically"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardContent className="pt-6 space-y-6">
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

            <div className="space-y-2">
              <Label htmlFor="knowledge_field">Knowledge Field</Label>
              <Select
                value={formState.knowledge_field}
                onValueChange={(value) => handleInputChange("knowledge_field", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select knowledge field" />
                </SelectTrigger>
                <SelectContent>
                  {knowledgeFields.map((field) => (
                    <SelectItem key={field.value} value={field.value}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="answer_type">Answer Type</Label>
              <Select
                value={formState.answer_type}
                onValueChange={(value) => handleInputChange("answer_type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select answer type" />
                </SelectTrigger>
                <SelectContent>
                  {answerTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={formState.language}
                onValueChange={(value) => handleInputChange("language", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select
                value={formState.difficulty}
                onValueChange={(value) => handleInputChange("difficulty", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  {difficultyLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="number_of_questions">Number of Questions</Label>
                <Badge variant="outline">{formState.number_of_questions}</Badge>
              </div>
              <Slider
                defaultValue={[3]}
                min={1}
                max={10}
                step={1}
                value={[formState.number_of_questions]}
                onValueChange={(values) => handleInputChange("number_of_questions", values[0])}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>1</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>

            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="with_images"
                checked={formState.with_images}
                onCheckedChange={(checked) => handleInputChange("with_images", checked)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="with_images"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Generate image descriptions
                </Label>
                <p className="text-sm text-muted-foreground">
                  AI will suggest relevant images for questions
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="with_math_equations"
                checked={formState.with_math_equations}
                onCheckedChange={(checked) => handleInputChange("with_math_equations", checked)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="with_math_equations"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Include mathematical equations
                </Label>
                <p className="text-sm text-muted-foreground">
                  AI will use LaTeX notation for mathematical content when appropriate
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specific_topics">Specific Topics (Optional)</Label>
              <Textarea
                id="specific_topics"
                placeholder="Enter specific topics to focus on"
                value={formState.specific_topics}
                onChange={(e) => handleInputChange("specific_topics", e.target.value)}
                className="resize-none h-20"
              />
              <p className="text-xs text-gray-500">
                Separate multiple topics with commas. Check "Include mathematical equations" option above for STEM topics requiring math formulas.
              </p>
            </div>

            <Button 
              onClick={generateQuestions} 
              className="w-full"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Questions
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          {generatedQuestions.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">Generated Questions</h2>
                  <Badge>{generatedQuestions.length}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllQuestions}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAllQuestions}>
                    Deselect All
                  </Button>
                  <Button variant="outline" size="sm" onClick={generateQuestions} disabled={isGenerating}>
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Regenerate
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {generatedQuestions.map((question) => (
                  <Card 
                    key={question.id} 
                    className={`border ${
                      selectedQuestions.includes(question.id) 
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200"
                    }`}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedQuestions.includes(question.id)}
                          onCheckedChange={() => toggleQuestionSelection(question.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge>{question.knowledge_field.replace('_', ' ')}</Badge>
                              <Badge variant="outline">{question.target_group}</Badge>
                              <Badge variant="outline">{question.answer_type.replace('_', ' ')}</Badge>
                            </div>
                            <p className="font-medium">
                              <MathRenderer content={question.question} />
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {question.answer_options.map((option: { option: string, answer: string }, index: number) => (
                              <div 
                                key={index} 
                                className={`flex items-center gap-2 p-2 rounded-md ${
                                  question.answer_correct.includes(option.option)
                                    ? "bg-green-100 border-green-200 border"
                                    : "bg-gray-50"
                                }`}
                              >
                                <div className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full flex-shrink-0">
                                  {option.option}
                                </div>
                                <div className="flex-1 line-clamp-1">
                                  <MathRenderer content={option.answer} />
                                </div>
                                {question.answer_correct.includes(option.option) && (
                                  <Badge className="bg-green-100 text-green-800 flex-shrink-0">Correct</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.location.href = "/organizer/quizzes/questions"}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={saveSelectedQuestions} 
                  disabled={selectedQuestions.length === 0 || isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save {selectedQuestions.length} Question{selectedQuestions.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center bg-gray-50 rounded-lg p-12 h-full">
              <div className="rounded-full bg-blue-100 p-4 mb-4">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-medium mb-2">Ready to Generate Questions</h3>
              <p className="text-gray-500 max-w-md mb-6">
                Configure your generation settings and click the Generate button to create AI-powered quiz questions
              </p>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex flex-col items-center p-3 bg-white rounded-md border">
                    <span className="font-medium">Step 1</span>
                    <span className="text-gray-500">Configure settings</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-white rounded-md border">
                    <span className="font-medium">Step 2</span>
                    <span className="text-gray-500">Generate questions</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-white rounded-md border">
                    <span className="font-medium">Step 3</span>
                    <span className="text-gray-500">Save to question bank</span>
                  </div>
                </div>
                <Button
                  onClick={generateQuestions}
                  className="mt-2"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Questions Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

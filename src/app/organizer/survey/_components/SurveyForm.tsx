"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Survey } from "../survey-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, PlusCircle, ArrowUp, ArrowDown, Trash2, Settings, ArrowLeft } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter
} from "@/components/ui/card";

interface SurveyFormProps {
  survey?: Survey;
  onCancel: () => void;
  onSuccess: () => void;
}

export function SurveyForm({ survey, onCancel, onSuccess }: SurveyFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(survey?.name || "");
  const [description, setDescription] = useState(survey?.description || "");
  interface QuestionOption {
    id?: number;
    value: string;
  }

  interface SurveyQuestion {
    id?: number;
    question: string;
    questionType: 'text' | 'single_choice' | 'multiple_choice';
    options: QuestionOption[];
    displayOrder: number;
    isRequired?: boolean;
  }

  const [questions, setQuestions] = useState<SurveyQuestion[]>(
    survey?.questions.map((q, index) => ({
      id: q.id,
      question: q.question,
      questionType: (q.questionType as 'text' | 'single_choice' | 'multiple_choice') || 'text',
      options: Array.isArray(q.options) ? q.options.map((opt: any) => (
        typeof opt === 'string' ? { value: opt } : opt
      )) : [],
      displayOrder: q.displayOrder !== undefined ? q.displayOrder : index,
      isRequired: q.isRequired !== undefined ? q.isRequired : true
    })) || 
    [{ question: "", questionType: "text", options: [], displayOrder: 0, isRequired: true }]
  );

  const handleAddQuestion = () => {
    setQuestions([
      ...questions, 
      { 
        question: "", 
        questionType: "text", 
        options: [], 
        displayOrder: questions.length, 
        isRequired: true 
      }
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions.splice(index, 1);
    
    // Update displayOrder for remaining questions
    updatedQuestions.forEach((q, i) => {
      q.displayOrder = i;
    });
    
    setQuestions(updatedQuestions);
  };

  const handleQuestionChange = (index: number, field: keyof SurveyQuestion, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value
    };
    
    // If changing question type, reset options for non-choice types
    if (field === 'questionType' && value === 'text') {
      updatedQuestions[index].options = [];
    }
    
    // If changing to a choice type and no options exist, add empty options
    if (field === 'questionType' && (value === 'single_choice' || value === 'multiple_choice') && updatedQuestions[index].options.length === 0) {
      updatedQuestions[index].options = [{ value: '' }, { value: '' }];
    }
    
    setQuestions(updatedQuestions);
  };
  
  const handleAddOption = (questionIndex: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options = [
      ...updatedQuestions[questionIndex].options,
      { value: '' }
    ];
    setQuestions(updatedQuestions);
  };
  
  const handleRemoveOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options.splice(optionIndex, 1);
    setQuestions(updatedQuestions);
  };
  
  const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options[optionIndex].value = value;
    setQuestions(updatedQuestions);
  };
  
  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === questions.length - 1)
    ) {
      return; // Cannot move beyond bounds
    }
    
    const updatedQuestions = [...questions];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap questions
    [updatedQuestions[index], updatedQuestions[newIndex]] = 
      [updatedQuestions[newIndex], updatedQuestions[index]];
    
    // Update display order
    updatedQuestions.forEach((q, i) => {
      q.displayOrder = i;
    });
    
    setQuestions(updatedQuestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!name.trim()) {
      setError("Survey name is required");
      return;
    }
    
    // Filter out empty questions
    const validQuestions = questions.filter(q => q.question.trim() !== "");
    
    // Validate that choice-based questions have at least 2 options
    const invalidChoiceQuestion = validQuestions.find(
      q => (q.questionType === 'single_choice' || q.questionType === 'multiple_choice') && 
           q.options.filter(o => o.value.trim() !== '').length < 2
    );
    
    if (invalidChoiceQuestion) {
      setError(`Question "${invalidChoiceQuestion.question}" needs at least 2 options`);
      return;
    }
    if (validQuestions.length === 0) {
      setError("At least one question is required");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const url = survey 
        ? `/api/survey/${survey.id}` 
        : '/api/survey';
      
      const method = survey ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description: description || null,
          questions: validQuestions.map(q => ({
            id: q.id,
            question: q.question,
            questionType: q.questionType,
            options: q.options.map(o => o.value),
            displayOrder: q.displayOrder,
            isRequired: q.isRequired
          })),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save survey');
      }
      
      router.refresh();
      onSuccess();
    } catch (err) {
      console.error('Error saving survey:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex flex-row items-center gap-2">
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            onClick={onCancel} 
            className="mr-2"
            title="Back to surveys"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle>{survey ? 'Edit Survey' : 'Create New Survey'}</CardTitle>
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="name">Survey Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter survey name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description || ""}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this survey"
              rows={3}
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Questions</Label>
              <Button 
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddQuestion}
                className="flex items-center gap-1"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Add Question</span>
              </Button>
            </div>
            
            {questions.map((q, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center gap-2">
                  <div className="font-medium">Question {index + 1}</div>
                  <div className="flex items-center gap-1">
                    <Button 
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveQuestion(index, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveQuestion(index, 'down')}
                      disabled={index === questions.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveQuestion(index)}
                      disabled={questions.length === 1}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`question-${index}`}>Question</Label>
                    <Input
                      id={`question-${index}`}
                      value={q.question}
                      onChange={(e) => handleQuestionChange(index, 'question', e.target.value)}
                      placeholder="Enter your question"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`type-${index}`}>Question Type</Label>
                      <Select 
                        value={q.questionType} 
                        onValueChange={(value) => handleQuestionChange(
                          index, 
                          'questionType', 
                          value as 'text' | 'single_choice' | 'multiple_choice'
                        )}
                      >
                        <SelectTrigger id={`type-${index}`}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text Response</SelectItem>
                          <SelectItem value="single_choice">Single Choice</SelectItem>
                          <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2 pt-8">
                      <Switch
                        id={`required-${index}`}
                        checked={q.isRequired}
                        onCheckedChange={(checked) => handleQuestionChange(index, 'isRequired', checked)}
                      />
                      <Label htmlFor={`required-${index}`} className="font-normal">Required question</Label>
                    </div>
                  </div>

                  {(q.questionType === 'single_choice' || q.questionType === 'multiple_choice') && (
                    <div className="mt-2">
                      <Accordion type="single" collapsible defaultValue="options">
                        <AccordionItem value="options">
                          <AccordionTrigger className="py-2">
                            <div className="flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              <span>Options</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3 pt-2">
                              {q.questionType === 'single_choice' ? (
                                <RadioGroup value="preview-option">
                                  {q.options.map((option, optionIndex) => (
                                    <div key={optionIndex} className="flex items-center gap-2 mb-3">
                                      <div className="flex items-center">
                                        <RadioGroupItem value={`preview-${optionIndex}`} disabled id={`preview-radio-${index}-${optionIndex}`} />
                                      </div>
                                      <Input
                                        value={option.value}
                                        onChange={(e) => handleOptionChange(index, optionIndex, e.target.value)}
                                        placeholder={`Option ${optionIndex + 1}`}
                                        className="flex-grow"
                                      />
                                      <Button 
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveOption(index, optionIndex)}
                                        disabled={q.options.length <= 2}
                                        className="text-red-500 hover:text-red-700"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </RadioGroup>
                              ) : (
                                // For multiple choice or text questions
                                q.options.map((option, optionIndex) => (
                                  <div key={optionIndex} className="flex items-center gap-2 mb-3">
                                    {q.questionType === 'multiple_choice' && (
                                      <Checkbox disabled id={`preview-checkbox-${index}-${optionIndex}`} />
                                    )}
                                    <Input
                                      value={option.value}
                                      onChange={(e) => handleOptionChange(index, optionIndex, e.target.value)}
                                      placeholder={`Option ${optionIndex + 1}`}
                                      className="flex-grow"
                                    />
                                    <Button 
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoveOption(index, optionIndex)}
                                      disabled={q.options.length <= 2}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => handleAddOption(index)}
                              >
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Add Option
                              </Button>
                              
                              <div className="text-xs text-muted-foreground mt-2">
                                {q.questionType === 'single_choice' 
                                  ? 'Respondents can select exactly one option.'
                                  : 'Respondents can select multiple options.'}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && 
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
            }
            {survey ? 'Save Changes' : 'Create Survey'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

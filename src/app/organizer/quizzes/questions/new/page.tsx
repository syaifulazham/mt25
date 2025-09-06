"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ChevronLeft, Plus, Minus, Save, X, Upload, Image, Trash2 } from "lucide-react";
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

// Default target group options
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

// Language options
const languageOptions = [
  { value: "none", label: "None" },
  { value: "en", label: "English" },
  { value: "my", label: "Malay" },
  { value: "zh", label: "Chinese" },
  { value: "ta", label: "Tamil" },
];

export default function CreateQuestionPage() {
  // State for target groups (fetched from API)
  const [targetGroups, setTargetGroups] = useState(defaultTargetGroups);
  
  // Fetch target groups on component mount
  useEffect(() => {
    const fetchTargetGroups = async () => {
      try {
        const response = await fetch('/api/organizer/targetgroups');
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data)) {
            setTargetGroups(data);
          }
        }
      } catch (error) {
        console.error('Error fetching target groups:', error);
        // Keep using the default values if fetch fails
      }
    };

    fetchTargetGroups();
  }, []);

  const [formState, setFormState] = useState({
    target_group: "",
    knowledge_field: "",
    question: "",
    question_image: "",
    main_lang: "en", // Default to English
    alt_lang: "", // Optional alternate language
    alt_question: "", // Question in alternate language
    answer_type: "single_selection",
    answer_options: [
      { option: "A", answer: "", alt_answer: "" },
      { option: "B", answer: "", alt_answer: "" },
      { option: "C", answer: "", alt_answer: "" },
      { option: "D", answer: "", alt_answer: "" },
    ],
    answer_correct: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslatingOptions, setIsTranslatingOptions] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAnswerTypeChange = (value: string) => {
    let defaultOptions = [];
    
    if (value === "binary") {
      defaultOptions = [
        { option: "A", answer: "Yes", alt_answer: "" },
        { option: "B", answer: "No", alt_answer: "" },
      ];
    } else {
      defaultOptions = [
        { option: "A", answer: "", alt_answer: "" },
        { option: "B", answer: "", alt_answer: "" },
        { option: "C", answer: "", alt_answer: "" },
        { option: "D", answer: "", alt_answer: "" },
      ];
    }
    
    setFormState((prev) => ({
      ...prev,
      answer_type: value,
      answer_options: defaultOptions,
      answer_correct: "",
    }));
  };

  const handleOptionChange = (index: number, value: string, field: 'answer' | 'alt_answer' = 'answer') => {
    const newOptions = [...formState.answer_options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    
    setFormState((prev) => ({
      ...prev,
      answer_options: newOptions,
    }));
  };

  const handleCorrectAnswerChange = (option: string) => {
    if (formState.answer_type === "multiple_selection") {
      // For multiple selection, toggle the option
      const current = formState.answer_correct.split(",").filter(o => o);
      
      if (current.includes(option)) {
        // Remove the option
        const newCorrect = current.filter(o => o !== option).join(",");
        setFormState(prev => ({ ...prev, answer_correct: newCorrect }));
      } else {
        // Add the option
        const newCorrect = [...current, option].sort().join(",");
        setFormState(prev => ({ ...prev, answer_correct: newCorrect }));
      }
    } else {
      // For single selection or binary, just set the option
      setFormState(prev => ({ ...prev, answer_correct: option }));
    }
  };

  const addOption = () => {
    if (formState.answer_options.length < 8) {
      const nextOptionLetter = String.fromCharCode(65 + formState.answer_options.length);
      setFormState(prev => ({
        ...prev,
        answer_options: [
          ...prev.answer_options,
          { option: nextOptionLetter, answer: "", alt_answer: "" }
        ]
      }));
    }
  };

  const removeOption = (index: number) => {
    if (formState.answer_options.length > 2) {
      const newOptions = formState.answer_options.filter((_, i) => i !== index);
      
      // Remap option letters after removal
      const remappedOptions = newOptions.map((option, i) => ({
        option: String.fromCharCode(65 + i),
        answer: option.answer,
        alt_answer: option.alt_answer || ""
      }));

      // Update correct answers if they reference removed options
      let newCorrect = formState.answer_correct;
      const removedOption = formState.answer_options[index].option;
      if (formState.answer_type === "multiple_selection") {
        const correctOptions = formState.answer_correct.split(",").filter(o => o && o !== removedOption);
        newCorrect = correctOptions.join(",");
      } else if (formState.answer_correct === removedOption) {
        newCorrect = "";
      }
      
      setFormState(prev => ({
        ...prev,
        answer_options: remappedOptions,
        answer_correct: newCorrect
      }));
    }
  };

  // Dropzone setup
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Only accept the first file if multiple are dropped
    const file = acceptedFiles[0];
    
    if (!file) return;
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }
    
    // Store the file
    setImageFile(file);
    
    // Create a preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    
    // Encode as base64 for the API
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setFormState(prev => ({ ...prev, question_image: base64String }));
    };
    reader.readAsDataURL(file);
  }, []);
  
  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
    },
    maxFiles: 1
  });
  
  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the dropzone click
    setImageFile(null);
    setImagePreview(null);
    setFormState(prev => ({ ...prev, question_image: "" }));
  };
  
  // Translation functions using OpenAI API
  const translateText = async (text: string, targetLang: string) => {
    if (!text.trim() || !targetLang) return "";
    
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          targetLang,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Translation failed');
      }
      
      const data = await response.json();
      return data.translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Failed to translate text');
      return "";
    }
  };
  
  const handleTranslateQuestion = async () => {
    if (!formState.question.trim() || !formState.alt_lang || formState.alt_lang === "none") {
      toast.error('Please enter a question and select an alternate language');
      return;
    }
    
    setIsTranslating(true);
    try {
      const translatedText = await translateText(formState.question, formState.alt_lang);
      if (translatedText) {
        setFormState(prev => ({
          ...prev,
          alt_question: translatedText
        }));
        toast.success('Question translated successfully');
      }
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  };
  
  const handleTranslateOptions = async () => {
    if (!formState.alt_lang || formState.alt_lang === "none") {
      toast.error('Please select an alternate language');
      return;
    }
    
    // Check if there are options to translate
    const hasEmptyAnswers = formState.answer_options.some(opt => !opt.answer.trim());
    if (hasEmptyAnswers) {
      toast.error('Please fill in all answer options before translating');
      return;
    }
    
    setIsTranslatingOptions(true);
    try {
      // Translate each option
      const newOptions = [...formState.answer_options];
      for (let i = 0; i < newOptions.length; i++) {
        const translatedAnswer = await translateText(newOptions[i].answer, formState.alt_lang);
        newOptions[i] = { ...newOptions[i], alt_answer: translatedAnswer };
      }
      
      setFormState(prev => ({
        ...prev,
        answer_options: newOptions
      }));
      
      toast.success('Answer options translated successfully');
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslatingOptions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Validation
    if (!formState.target_group) {
      toast.error("Please select a target group");
      setIsSubmitting(false);
      return;
    }
    
    if (!formState.knowledge_field) {
      toast.error("Please select a knowledge field");
      setIsSubmitting(false);
      return;
    }
    
    if (!formState.question.trim()) {
      toast.error("Question is required");
      setIsSubmitting(false);
      return;
    }
    
    if (!formState.answer_correct) {
      toast.error("Please select the correct answer(s)");
      setIsSubmitting(false);
      return;
    }
    
    // Check if alternate language is selected but no alternate question is provided
    if (formState.alt_lang && formState.alt_lang !== "none" && !formState.alt_question.trim()) {
      toast.error(`Please provide the question in ${languageOptions.find(l => l.value === formState.alt_lang)?.label || formState.alt_lang}`);
      setIsSubmitting(false);
      return;
    }
    
    // Check if all options have content
    const emptyOption = formState.answer_options.find(option => !option.answer.trim());
    if (emptyOption) {
      toast.error(`Option ${emptyOption.option} is empty`);
      setIsSubmitting(false);
      return;
    }

    try {
      // We need to properly handle the image upload
      // Check if we're using the FormData API (for files) or JSON
      let response;
      
      if (imageFile) {
        // Use FormData for file uploads
        const formData = new FormData();
        
        // Process language fields before adding to formData
        const mainLang = formState.main_lang === 'none' ? 'en' : formState.main_lang;
        const altLang = formState.alt_lang === 'none' ? '' : formState.alt_lang;
        const altQuestion = formState.alt_lang === 'none' ? '' : formState.alt_question;
        
        // Append all text fields
        Object.entries(formState).forEach(([key, value]) => {
          if (key === 'answer_options') {
            formData.append(key, JSON.stringify(value));
          } else if (key === 'question_image') {
            // Skip the base64 version since we'll upload the file directly
          } else if (key === 'main_lang') {
            formData.append(key, mainLang);
          } else if (key === 'alt_lang') {
            formData.append(key, altLang);
          } else if (key === 'alt_question') {
            formData.append(key, altQuestion);
          } else {
            formData.append(key, String(value));
          }
        });
        
        // Append the image file
        formData.append('image_file', imageFile);
        
        // Send the FormData
        response = await fetch('/api/organizer/questions', {
          method: 'POST',
          body: formData
        });
      } else {
        // Regular JSON submission without files
        // Clean up language fields for submission
        const dataToSubmit = {
          ...formState,
          // Handle language fields - ensure proper values are sent
          main_lang: formState.main_lang === 'none' ? 'en' : formState.main_lang,
          alt_lang: formState.alt_lang === 'none' ? null : formState.alt_lang,
          alt_question: formState.alt_lang === 'none' ? null : formState.alt_question
        };
        
        console.log('Submitting question data:', dataToSubmit);
        
        response = await fetch('/api/organizer/questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataToSubmit)
        });
      }
      
      // Process response (common for both paths)
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create question');
      }
      
      toast.success("Question created successfully!");
      setIsSubmitting(false);
      // Redirect to questions list after successful creation
      window.location.href = "/organizer/quizzes/questions";
      
    } catch (error) {
      console.error("Error creating question:", error);
      toast.error("Failed to create question. Please try again.");
      setIsSubmitting(false);
    }
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
          title="Create New Question" 
          description="Add a question to the question bank"
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                <div className="space-y-2">
                  <Label htmlFor="main_lang">Main Language</Label>
                  <Select
                    value={formState.main_lang}
                    onValueChange={(value) => handleInputChange("main_lang", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languageOptions.filter(lang => lang.value).map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="alt_lang">Alternate Language</Label>
                  <Select
                    value={formState.alt_lang}
                    onValueChange={(value) => handleInputChange("alt_lang", value)}
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
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="question">Question</Label>
                <div className="flex flex-col space-y-2">
                  <Textarea
                    id="question"
                    placeholder="Enter your question here"
                    value={formState.question}
                    onChange={(e) => handleInputChange("question", e.target.value)}
                    className="min-h-[100px]"
                  />
                  {formState.alt_lang && formState.alt_lang !== "none" && (
                    <div className="flex justify-end">
                      <Button 
                        type="button" 
                        variant="secondary" 
                        size="sm"
                        onClick={handleTranslateQuestion}
                        disabled={isTranslating || !formState.question.trim()}
                        className="mt-2"
                      >
                        {isTranslating ? (
                          <>
                            <Spinner size="sm" className="mr-2" />
                            Translating...
                          </>
                        ) : (
                          <>Translate to {languageOptions.find(l => l.value === formState.alt_lang)?.label || formState.alt_lang}</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              {formState.alt_lang && formState.alt_lang !== "none" && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="alt_question">Question in {languageOptions.find(l => l.value === formState.alt_lang)?.label}</Label>
                  <Textarea
                    id="alt_question"
                    placeholder={`Enter the question in ${languageOptions.find(l => l.value === formState.alt_lang)?.label || formState.alt_lang}`}
                    value={formState.alt_question}
                    onChange={(e) => handleInputChange("alt_question", e.target.value)}
                    className="min-h-[100px] bg-yellow-50"
                  />
                </div>
              )}
              
              <div className="space-y-2 md:col-span-2">
                <Label>Question Image (Optional)</Label>
                <div 
                  {...getRootProps()} 
                  className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'}`}
                >
                  <input {...getInputProps()} />
                  {imagePreview ? (
                    <div className="flex flex-col items-center">
                      <div className="relative w-full max-w-md">
                        <img 
                          src={imagePreview} 
                          alt="Question image preview" 
                          className="max-h-48 max-w-full rounded-md mx-auto object-contain"
                        />
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="icon" 
                          className="absolute top-0 right-0 rounded-full -mt-2 -mr-2" 
                          onClick={handleRemoveImage}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="mt-2 text-sm text-gray-500 truncate max-w-xs">{imageFile?.name}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Image className="h-10 w-10 text-gray-300 mb-2" />
                      <p className="text-gray-500">Drag & drop an image here, or click to select</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG or GIF up to 5MB</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="answer_type">Answer Type</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {answerTypes.map((type) => (
                    <div
                      key={type.value}
                      className={`cursor-pointer p-4 rounded-lg border ${
                        formState.answer_type === type.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => handleAnswerTypeChange(type.value)}
                    >
                      <div className="font-medium">{type.label}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {type.value === "single_selection" && "Select one correct answer"}
                        {type.value === "multiple_selection" && "Select one or more correct answers"}
                        {type.value === "binary" && "Yes/No or True/False answers"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Answer Options</h3>
                <div className="flex gap-2">
                  {formState.alt_lang && formState.alt_lang !== "none" && (
                    <Button 
                      type="button" 
                      variant="secondary" 
                      size="sm" 
                      onClick={handleTranslateOptions}
                      disabled={isTranslatingOptions || formState.answer_options.some(opt => !opt.answer.trim())}
                    >
                      {isTranslatingOptions ? (
                        <>
                          <Spinner size="sm" className="mr-2" />
                          Translating...
                        </>
                      ) : (
                        <>Translate Options</>
                      )}
                    </Button>
                  )}
                  {formState.answer_type !== "binary" && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={addOption}
                      disabled={formState.answer_options.length >= 8}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Option
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                {formState.answer_options.map((option, index) => (
                  <div key={index} className="flex gap-4 items-start">
                    <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-md text-gray-600 font-medium">
                      {option.option}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={option.answer}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Option ${option.option}`}
                        disabled={formState.answer_type === "binary"}
                      />
                      {formState.alt_lang && formState.alt_lang !== "none" && (
                        <Input
                          value={option.alt_answer}
                          onChange={(e) => handleOptionChange(index, e.target.value, 'alt_answer')}
                          placeholder={`Option ${option.option} in ${languageOptions.find(l => l.value === formState.alt_lang)?.label || formState.alt_lang}`}
                          disabled={formState.answer_type === "binary"}
                          className="bg-yellow-50"
                        />
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {formState.answer_type === "multiple_selection" ? (
                        <div 
                          className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer border ${
                            formState.answer_correct.includes(option.option)
                              ? "bg-green-100 border-green-500 text-green-600"
                              : "bg-gray-100 border-gray-200 hover:bg-gray-200"
                          }`}
                          onClick={() => handleCorrectAnswerChange(option.option)}
                        >
                          {formState.answer_correct.includes(option.option) && "✓"}
                        </div>
                      ) : (
                        <div 
                          className={`w-8 h-8 flex items-center justify-center rounded-full cursor-pointer border ${
                            formState.answer_correct === option.option
                              ? "bg-green-100 border-green-500 text-green-600"
                              : "bg-gray-100 border-gray-200 hover:bg-gray-200"
                          }`}
                          onClick={() => handleCorrectAnswerChange(option.option)}
                        >
                          {formState.answer_correct === option.option && "✓"}
                        </div>
                      )}
                    </div>
                    {formState.answer_type !== "binary" && formState.answer_options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(index)}
                      >
                        <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="text-sm flex items-start gap-2 bg-blue-50 p-3 rounded-md text-blue-700">
                <div className="flex-shrink-0 mt-1">ℹ️</div>
                <div>
                  {formState.answer_type === "single_selection" && 
                    "Click the circle next to an option to mark it as the correct answer."}
                  {formState.answer_type === "multiple_selection" && 
                    "Click the boxes next to options to mark them as correct answers. You can select multiple options."}
                  {formState.answer_type === "binary" && 
                    "Select Yes or No as the correct answer for this binary question."}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.href = "/organizer/quizzes/questions"}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Saving..." : "Save Question"}
          </Button>
        </div>
      </form>
    </div>
  );
}

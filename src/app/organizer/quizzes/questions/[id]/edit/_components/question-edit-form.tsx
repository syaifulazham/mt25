"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Loader2, Plus, Trash, Upload, X, Calculator, Languages } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Target groups will be fetched from API

// Language options
const LANGUAGE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "en", label: "English" },
  { value: "my", label: "Malay" },
  { value: "zh", label: "Chinese" },
  { value: "ta", label: "Tamil" },
];

// Match knowledge fields with those in the new question page
const KNOWLEDGE_FIELDS = [
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

interface QuestionEditFormProps {
  question: {
    id: number;
    target_group: string;
    knowledge_field: string;
    question: string;
    question_image?: string;
    main_lang?: string;
    alt_lang?: string;
    alt_question?: string;
    answer_type: string;
    answer_options: Array<{ option: string; answer: string; alt_answer?: string }>;
    answer_correct: string;
  };
}

const formSchema = z.object({
  question: z.string().min(3, "Question must be at least 3 characters"),
  question_image: z.string().optional(),
  main_lang: z.string().default("en"),
  alt_lang: z.string().optional(),
  alt_question: z.string().optional(),
  target_group: z.string().min(1, "Must select a target group"),
  knowledge_field: z.string().min(1, "Must select a knowledge field"),
  answer_type: z.string().min(1, "Must select an answer type"),
  answer_options: z.array(
    z.object({
      option: z.string(),
      answer: z.string().min(1, "Answer text is required"),
      alt_answer: z.string().optional()
    })
  ).min(1, "At least one answer option is required"),
  answer_correct: z.string().min(1, "Must select a correct answer")
});

export function QuestionEditForm({ question }: QuestionEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetGroups, setTargetGroups] = useState<Array<{value: string, label: string}>>([]);
  const [loadingTargetGroups, setLoadingTargetGroups] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslatingOptions, setIsTranslatingOptions] = useState(false);
  
  // Image handling state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(question.question_image || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch target groups from API
  useEffect(() => {
    const fetchTargetGroups = async () => {
      try {
        setLoadingTargetGroups(true);
        const response = await fetch('/api/organizer/targetgroups');
        
        if (!response.ok) {
          throw new Error('Failed to fetch target groups');
        }
        
        const data = await response.json();
        setTargetGroups(data);
      } catch (error) {
        console.error('Error fetching target groups:', error);
        toast.error('Failed to load target groups');
      } finally {
        setLoadingTargetGroups(false);
      }
    };
    
    fetchTargetGroups();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      question: question.question,
      question_image: question.question_image || "",
      main_lang: question.main_lang || "en",
      alt_lang: question.alt_lang || "none",
      alt_question: question.alt_question || "",
      target_group: question.target_group,
      knowledge_field: question.knowledge_field,
      answer_type: question.answer_type,
      answer_options: question.answer_options.map(option => ({
        ...option,
        alt_answer: option.alt_answer || ""
      })),
      answer_correct: question.answer_correct
    },
  });

  // When answer type changes, reset options and correct answers appropriately
  useEffect(() => {
    const answerType = form.watch("answer_type");
    const currentOptions = form.watch("answer_options");
    
    if (answerType === "binary") {
      // For binary questions, set fixed Yes/No options
      form.setValue("answer_options", [
        { option: "Yes", answer: "Yes" },
        { option: "No", answer: "No" }
      ]);
      
      // Default to "Yes" if neither yes nor no was selected
      if (form.watch("answer_correct") !== "Yes" && form.watch("answer_correct") !== "No") {
        form.setValue("answer_correct", "Yes");
      }
    } else if (answerType === "single_selection" || answerType === "multiple_selection") {
      // For selection questions, if coming from binary, reset to empty or keep current
      if (currentOptions.length === 2 && 
          currentOptions[0].option === "Yes" && 
          currentOptions[1].option === "No") {
        form.setValue("answer_options", [
          { option: "A", answer: "" },
          { option: "B", answer: "" },
          { option: "C", answer: "" },
          { option: "D", answer: "" }
        ]);
        form.setValue("answer_correct", "A");
      }
      
      // When switching from multiple to single, take first answer if multiple are selected
      if (answerType === "single_selection" && form.watch("answer_correct").includes(",")) {
        form.setValue("answer_correct", form.watch("answer_correct").split(",")[0]);
      }
    }
  }, [form.watch("answer_type")]);

  const handleAddOption = () => {
    const currentOptions = form.getValues("answer_options");
    const lastOption = currentOptions[currentOptions.length - 1]?.option || "";
    
    // Generate next option key (A, B, C, etc.)
    let nextOption = "A";
    if (lastOption) {
      const lastCharCode = lastOption.charCodeAt(0);
      nextOption = String.fromCharCode(lastCharCode + 1);
    }
    
    form.setValue("answer_options", [
      ...currentOptions, 
      { option: nextOption, answer: "" }
    ]);
  };
  
  const handleRemoveOption = (index: number) => {
    const currentOptions = form.getValues("answer_options");
    
    // Don't allow removing if only one option left
    if (currentOptions.length <= 1) {
      return;
    }
    
    const removedOption = currentOptions[index].option;
    const newOptions = currentOptions.filter((_, i) => i !== index);
    form.setValue("answer_options", newOptions);
    
    // If removed option was in correct answers, update correct answers
    const correctAnswers = form.getValues("answer_correct").split(",");
    if (correctAnswers.includes(removedOption)) {
      const newCorrectAnswers = correctAnswers
        .filter(answer => answer !== removedOption)
        .join(",");
      
      // If removing last correct answer, default to first option
      if (newCorrectAnswers === "") {
        form.setValue("answer_correct", newOptions[0]?.option || "");
      } else {
        form.setValue("answer_correct", newCorrectAnswers);
      }
    }
  };
  
  // Translation functions using OpenAI API
  const translateText = async (text: string, targetLang: string) => {
    if (!text.trim() || !targetLang || targetLang === "none") return "";
    
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
    const questionText = form.getValues("question");
    const altLang = form.getValues("alt_lang") || "none";
    
    if (!questionText.trim() || !altLang || altLang === "none") {
      toast.error('Please enter a question and select an alternate language');
      return;
    }
    
    setIsTranslating(true);
    try {
      const translatedText = await translateText(questionText, altLang);
      if (translatedText) {
        form.setValue("alt_question", translatedText);
        toast.success('Question translated successfully');
      }
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  };
  
  const handleTranslateOptions = async () => {
    const altLang = form.getValues("alt_lang") || "none";
    
    if (!altLang || altLang === "none") {
      toast.error('Please select an alternate language');
      return;
    }
    
    // Check if there are options to translate
    const hasEmptyAnswers = form.getValues("answer_options").some(opt => !opt.answer.trim());
    if (hasEmptyAnswers) {
      toast.error('Please fill in all answer options before translating');
      return;
    }
    
    setIsTranslatingOptions(true);
    try {
      // Translate each option
      const currentOptions = form.getValues("answer_options");
      const newOptions = [...currentOptions];
      
      for (let i = 0; i < newOptions.length; i++) {
        const translatedAnswer = await translateText(newOptions[i].answer, altLang);
        newOptions[i] = { ...newOptions[i], alt_answer: translatedAnswer };
      }
      
      form.setValue("answer_options", newOptions);
      toast.success('Answer options translated successfully');
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslatingOptions(false);
    }
  };
  
  // Handle correct answer selection for multiple choice
  const handleMultipleCorrect = (option: string, checked: boolean) => {
    const currentCorrect = form.getValues("answer_correct").split(",").filter(Boolean);
    
    if (checked) {
      if (!currentCorrect.includes(option)) {
        currentCorrect.push(option);
      }
    } else {
      const index = currentCorrect.indexOf(option);
      if (index > -1) {
        currentCorrect.splice(index, 1);
      }
    }
    
    form.setValue("answer_correct", currentCorrect.join(","));
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);
      
      // Validate that correct answers exist in options
      const optionKeys = values.answer_options.map(o => o.option);
      
      if (values.answer_type === "multiple_selection") {
        const correctAnswers = values.answer_correct.split(',');
        const allValid = correctAnswers.every(answer => optionKeys.includes(answer));
        
        if (!allValid) {
          toast.error("All correct answers must exist in the options");
          return;
        }
      } else {
        if (!optionKeys.includes(values.answer_correct)) {
          toast.error("The correct answer must exist in the options");
          return;
        }
      }
      
      let response;
      // Process language fields before submitting
      const mainLang = values.main_lang || 'en';
      const altLang = values.alt_lang === 'none' ? null : values.alt_lang;
      const altQuestion = (!altLang || values.alt_lang === 'none') ? null : values.alt_question;
      
      // Process answer options to ensure alt_answer is properly handled
      const processedAnswerOptions = values.answer_options.map(option => ({
        ...option,
        alt_answer: (!altLang || values.alt_lang === 'none') ? undefined : (option.alt_answer || '')
      }));
      
      // Use FormData if we have a new image file
      if (imageFile) {
        const formData = new FormData();
        
        // Append all form fields
        Object.entries(values).forEach(([key, value]) => {
          if (key === 'answer_options') {
            formData.append(key, JSON.stringify(processedAnswerOptions));
          } else if (key === 'question_image' && imageFile) {
            // Skip since we'll append the file directly
          } else if (key === 'main_lang') {
            formData.append(key, mainLang);
          } else if (key === 'alt_lang') {
            formData.append(key, altLang || '');
          } else if (key === 'alt_question') {
            formData.append(key, altQuestion || '');
          } else {
            formData.append(key, String(value));
          }
        });
        
        // Append the image file
        formData.append('image_file', imageFile);
        
        // Send the FormData
        response = await fetch(`/api/organizer/questions/${question.id}`, {
          method: "PUT",
          body: formData,
        });
      } else {
        // Regular JSON request if no new image
        const dataToSubmit = {
          ...values,
          main_lang: mainLang,
          alt_lang: altLang,
          alt_question: altQuestion,
          answer_options: processedAnswerOptions
        };
        
        console.log('Submitting question data:', dataToSubmit);
        
        response = await fetch(`/api/organizer/questions/${question.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataToSubmit),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update question");
      }

      toast.success("Question updated successfully");
      router.push(`/organizer/quizzes/questions/${question.id}`);
    } catch (error: any) {
      toast.error(error.message || "An error occurred while updating the question");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Language Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="main_lang"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  <Languages className="h-4 w-4" />
                  Main Language
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.filter(lang => lang.value !== "none").map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Primary language of the question
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="alt_lang"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alternate Language</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Optional secondary language for translation
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Question Text */}
        <FormField
          control={form.control}
          name="question"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Question Text</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <Textarea
                    placeholder="Enter the question text"
                    className="min-h-[120px]"
                    {...field}
                  />
                  
                  {form.watch("alt_lang") && form.watch("alt_lang") !== "none" && (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleTranslateQuestion}
                        disabled={isTranslating || !form.watch("question").trim()}
                      >
                        {isTranslating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Translating...
                          </>
                        ) : (
                          <>
                            <Languages className="mr-2 h-4 w-4" />
                            Translate to {LANGUAGE_OPTIONS.find(l => l.value === form.watch("alt_lang"))?.label}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription className="flex items-center gap-1 mt-1">
                <Calculator className="h-4 w-4" />
                <span>For mathematical equations, use LaTeX syntax: inline with single dollar signs (e.g. $E=mc^2$) or block with double dollar signs (e.g. {`$$\frac{x}{y}$$`})</span>
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Alternate Language Question */}
        {form.watch("alt_lang") && form.watch("alt_lang") !== "none" && (
          <FormField
            control={form.control}
            name="alt_question"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Question in {LANGUAGE_OPTIONS.find(l => l.value === form.watch("alt_lang"))?.label}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={`Enter the question in ${LANGUAGE_OPTIONS.find(l => l.value === form.watch("alt_lang"))?.label}`}
                    className="min-h-[120px] bg-yellow-50"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Question Image */}
        <FormField
          control={form.control}
          name="question_image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Question Image</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  {/* Image preview */}
                  {imagePreview && (
                    <div className="border rounded-md p-2 max-w-md">
                      <div className="relative aspect-video w-full overflow-hidden rounded-md">
                        <Image 
                          src={imagePreview} 
                          alt="Question image preview" 
                          className="object-contain"
                          fill
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-2"
                        onClick={() => {
                          setImagePreview(null);
                          setImageFile(null);
                          form.setValue("question_image", "");
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                      >
                        <Trash className="h-4 w-4 mr-2" /> Remove Image
                      </Button>
                    </div>
                  )}

                  {/* Upload controls - only show if no image */}
                  {!imagePreview && (
                    <div className="flex flex-col gap-4">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setImageFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const result = reader.result as string;
                              setImagePreview(result);
                              // Keep the base64 string for preview but not in form state
                              // We'll handle the upload separately
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 w-fit"
                      >
                        <Upload className="h-4 w-4" />
                        Upload Image
                      </Button>

                      {/* Hide the URL input as we now handle via file upload */}
                      <Input
                        type="hidden"
                        {...field}
                        value={field.value || ""}
                      />
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Upload an image to include with this question (optional)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Target Group */}
          <FormField
            control={form.control}
            name="target_group"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Group</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target group" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {loadingTargetGroups ? (
                      <div className="flex items-center justify-center py-2 px-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-sm">Loading...</span>
                      </div>
                    ) : targetGroups.length > 0 ? (
                      targetGroups.map((group) => (
                        <SelectItem key={group.value} value={group.value}>
                          {group.label}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="py-2 px-2 text-sm text-muted-foreground">
                        No target groups found
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Knowledge Field */}
          <FormField
            control={form.control}
            name="knowledge_field"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Knowledge Field</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select knowledge field" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {KNOWLEDGE_FIELDS.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Answer Type */}
        <FormField
          control={form.control}
          name="answer_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Answer Type</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select answer type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="single_selection">Single Choice</SelectItem>
                  <SelectItem value="multiple_selection">Multiple Choice</SelectItem>
                  <SelectItem value="binary">Binary (Yes/No)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Answer Options */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Answer Options</h3>
            
            <div className="flex gap-2">
              {form.watch("alt_lang") && form.watch("alt_lang") !== "none" && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleTranslateOptions}
                  disabled={isTranslatingOptions || form.watch("answer_options").some(opt => !opt.answer.trim())}
                >
                  {isTranslatingOptions ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Translating...
                    </>
                  ) : (
                    <>
                      <Languages className="h-4 w-4 mr-2" />
                      Translate Options
                    </>
                  )}
                </Button>
              )}
              
              {form.watch("answer_type") !== "binary" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddOption}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Option
                </Button>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            {form.watch("answer_options").map((option, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-[calc(100%-40px)]">
                  <div className="space-y-2 w-full">
                    <FormField
                      control={form.control}
                      name={`answer_options.${index}.answer`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                {String.fromCharCode(65 + index)}
                              </div>
                              <Input
                                placeholder={`Answer option ${String.fromCharCode(65 + index)}`}
                                {...field}
                                disabled={form.watch("answer_type") === "binary"}
                              />
                            </div>
                          </FormControl>
                          <FormDescription className="ml-10 text-xs mt-1">
                            You can use LaTeX for math formulas: e.g. $x^2$ or {`$$\sum_{n=1}^{10} n$$`}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {form.watch("alt_lang") && form.watch("alt_lang") !== "none" && (
                      <FormField
                        control={form.control}
                        name={`answer_options.${index}.alt_answer`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="flex items-center gap-2 ml-10">
                                <Input
                                  placeholder={`${String.fromCharCode(65 + index)} in ${LANGUAGE_OPTIONS.find(l => l.value === form.watch("alt_lang"))?.label}`}
                                  {...field}
                                  className="bg-yellow-50"
                                  disabled={form.watch("answer_type") === "binary"}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
                
                {form.watch("answer_type") !== "binary" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 mt-1"
                    onClick={() => handleRemoveOption(index)}
                    disabled={form.watch("answer_options").length <= 1}
                  >
                    <Trash className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Correct Answer */}
        <div>
          <h3 className="text-lg font-medium mb-2">Correct Answer</h3>
          {form.watch("answer_type") === "single_selection" && (
            <FormField
              control={form.control}
              name="answer_correct"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="space-y-3"
                    >
                      {form.watch("answer_options").map((option, index) => (
                        <FormItem key={index} className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value={option.option} />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {option.option}: {option.answer}
                          </FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {form.watch("answer_type") === "multiple_selection" && (
            <div className="space-y-3">
              {form.watch("answer_options").map((option, index) => {
                const isChecked = form.watch("answer_correct").split(',').includes(option.option);
                
                return (
                  <div key={index} className="flex items-center space-x-2">
                    <Checkbox
                      id={`option-${option.option}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => 
                        handleMultipleCorrect(option.option, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={`option-${option.option}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {option.option}: {option.answer}
                    </label>
                  </div>
                );
              })}
              
              {/* Error message if no option is selected */}
              {form.formState.errors.answer_correct && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.answer_correct.message}
                </p>
              )}
            </div>
          )}
          
          {form.watch("answer_type") === "binary" && (
            <FormField
              control={form.control}
              name="answer_correct"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="Yes" />
                        </FormControl>
                        <FormLabel className="font-normal">Yes</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="No" />
                        </FormControl>
                        <FormLabel className="font-normal">No</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="px-8"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Question
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/organizer/quizzes/questions/${question.id}`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

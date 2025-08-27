"use client";

import React, { useState, useEffect, useRef } from "react";
import { QuestionDetailModal } from "./question-detail-modal";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, Search, FileText, BookOpen, Loader2, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, 
  ArrowUpDown, ChevronUp, ChevronDown,
  MoreHorizontal, Eye, Copy, Pencil, Trash, Calendar, Sparkles,
  X, FilterX
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format, formatDistance, formatRelative } from "date-fns";
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
// Creating a simple debounce hook inline since we're having module resolution issues
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Effect to reset pagination when search term changes
function useResetPaginationOnSearch(debouncedSearchTerm: string, setPagination: React.Dispatch<React.SetStateAction<PaginationData>>) {
  const prevSearchRef = useRef<string>("");
  
  useEffect(() => {
    // Only reset if the search term has actually changed and is not the initial render
    if (prevSearchRef.current !== debouncedSearchTerm && prevSearchRef.current !== "") {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
    prevSearchRef.current = debouncedSearchTerm;
  }, [debouncedSearchTerm, setPagination]);
}

// Using Tailwind's built-in animation classes

// Cookie helpers for filter persistence
const COOKIE_PREFIX = "quiz_questions_";

const getCookieValue = (name: string): string | null => {
  if (typeof document === 'undefined') return null; // Server-side check
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${COOKIE_PREFIX}${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

const setCookieValue = (name: string, value: string): void => {
  if (typeof document === 'undefined') return; // Server-side check
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + 1); // Cookies expire in 1 month
  document.cookie = `${COOKIE_PREFIX}${name}=${value}; expires=${expiryDate.toUTCString()}; path=/`;
};

// Helper functions for consistent data handling
const formatDateRelative = (date: string | Date): string => {
  const now = new Date();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const diffTime = Math.abs(now.getTime() - dateObj.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return format(dateObj, 'MMM d, yyyy');
  }
};

const getAnswerTypeLabel = (type: string): string => {
  switch (type) {
    case "single_selection":
      return "Single Selection";
    case "multiple_selection":
      return "Multiple Selection";
    case "binary":
      return "Binary";
    default:
      return type;
  }
};

const truncateText = (text: string, maxLength: number = 100): string => {
  if (!text) return '';
  return text.length <= maxLength ? text : `${text.substring(0, maxLength)}...`;
};

// Define interfaces
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
  answer_correct: string | string[];
  createdAt: string;
  createdBy: string;
  creatorName: string;
  updatedAt?: string;
}

interface PaginationData {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Helper functions
const formatDate = (dateString: string): string => {
  try {
    return format(new Date(dateString), "MMM dd, yyyy");
  } catch (error) {
    return "Invalid date";
  }
};

const getAnswerTypeLabelJSX = (answerType: string): JSX.Element => {
  switch (answerType) {
    case "single_selection":
      return <Badge variant="outline" className="bg-blue-100 text-blue-800">Single Choice</Badge>;
    case "multiple_selection":
      return <Badge variant="outline" className="bg-purple-100 text-purple-800">Multiple Choice</Badge>;
    case "binary":
      return <Badge variant="outline" className="bg-green-100 text-green-800">Binary</Badge>;
    default:
      return <Badge variant="outline" className="bg-gray-100 text-gray-800">{answerType}</Badge>;
  }
};

// Pagination controls component
const PaginationControls = ({
  pagination,
  onPageChange
}: {
  pagination: PaginationData,
  onPageChange: (page: number) => void
}) => {
  return (
    <div className="flex items-center justify-between px-2 mt-4">
      <div className="text-sm text-muted-foreground">
        Showing <span className="font-medium">{((pagination.page - 1) * pagination.pageSize) + 1}</span> to{' '}
        <span className="font-medium">
          {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)}
        </span> of{' '}
        <span className="font-medium">{pagination.totalCount}</span> questions
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={pagination.page === 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={!pagination.hasPrevPage}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm">
          Page <span className="font-medium">{pagination.page}</span> of{' '}
          <span className="font-medium">{pagination.totalPages}</span>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={!pagination.hasNextPage}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(pagination.totalPages)}
          disabled={pagination.page === pagination.totalPages || pagination.totalPages === 0}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Questions table component with sortable headers
function QuestionsTable({ 
  questions, 
  onSort, 
  sortField,
  sortOrder,
  onQuestionClick
}: { 
  questions: Question[],
  onSort: (field: string) => void,
  sortField: string,
  sortOrder: "asc" | "desc",
  onQuestionClick: (question: Question) => void
}) {
  // Helper to render sort indicator
  const renderSortIndicator = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-4 w-4 inline" />
    return sortOrder === 'asc' ? 
      <ChevronUp className="ml-1 h-4 w-4 inline" /> : 
      <ChevronDown className="ml-1 h-4 w-4 inline" />
  }
  
  // Sortable column header
  const SortableHeader = ({ field, children }: { field: string, children: React.ReactNode }) => (
    <TableHead 
      onClick={() => onSort(field)}
      className="cursor-pointer hover:bg-muted/50"
    >
      <div className="flex items-center">
        {children}
        {renderSortIndicator(field)}
      </div>
    </TableHead>
  )

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

  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader field="question">Question</SortableHeader>
            <SortableHeader field="answer_type">Type</SortableHeader>
            <SortableHeader field="target_group">Target Group</SortableHeader>
            <SortableHeader field="knowledge_field">Knowledge Field</SortableHeader>
            <SortableHeader field="createdAt">Created Date</SortableHeader>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {questions.map((question) => (
            <TableRow key={question.id}>
              <TableCell className="w-[300px] truncate">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span 
                      className="font-medium cursor-pointer hover:text-primary hover:underline" 
                      onClick={() => onQuestionClick(question)}
                    >
                      {truncateText(question.question, 30)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-wrap">{question.question}</p>
                  </TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell>
                {getAnswerTypeLabelJSX(question.answer_type)}
              </TableCell>
              <TableCell>
                {question.target_group}
              </TableCell>
              <TableCell>
                {question.knowledge_field}
              </TableCell>
              <TableCell>
                {formatDate(question.createdAt)}
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Link href={`/organizer/quizzes/questions/${question.id}`}>
                    <Button size="icon" variant="ghost">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href={`/organizer/quizzes/questions/${question.id}/edit`}>
                    <Button size="icon" variant="ghost">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <Trash className="h-4 w-4 mr-2" />
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
  );
}

// Question Card Component
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

// Main questions page component
export default function QuestionsPage() {
  // State for pagination, sorting, and filtering
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    pageSize: 50, // Increased page size for better UX
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  
  // Ref for infinite scroll
  const observerTarget = React.useRef<HTMLDivElement>(null);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  
  // Sorting state
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Available filter options
  const [knowledgeFields, setKnowledgeFields] = useState<string[]>([]);
  const [targetGroups, setTargetGroups] = useState<string[]>([]);

  // Save filter state to cookies
  const saveFilterStateToCookies = () => {
    setCookieValue('searchTerm', searchTerm);
    setCookieValue('selectedField', selectedField || '');
    setCookieValue('selectedGroup', selectedGroup || '');
    setCookieValue('activeTab', activeTab);
    setCookieValue('sortField', sortField);
    setCookieValue('sortOrder', sortOrder);
  };

  // Load filter state from cookies
  const loadFilterStateFromCookies = () => {
    if (typeof window === 'undefined') return; // Server-side check
    
    const savedSearchTerm = getCookieValue('searchTerm');
    const savedField = getCookieValue('selectedField');
    const savedGroup = getCookieValue('selectedGroup');
    const savedTab = getCookieValue('activeTab');
    const savedSortField = getCookieValue('sortField');
    const savedSortOrder = getCookieValue('sortOrder');
    
    if (savedSearchTerm) setSearchTerm(savedSearchTerm);
    if (savedField && savedField !== '') setSelectedField(savedField);
    if (savedGroup && savedGroup !== '') setSelectedGroup(savedGroup);
    if (savedTab) setActiveTab(savedTab);
    if (savedSortField) setSortField(savedSortField);
    if (savedSortOrder && (savedSortOrder === 'asc' || savedSortOrder === 'desc')) {
      setSortOrder(savedSortOrder as "asc" | "desc");
    }
  };

  // Fetch questions with current filters, sorting and pagination
  const fetchQuestions = async (isLoadMore: boolean = false) => {
    try {
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      
      // Reset questions if not loading more
      if (!isLoadMore) {
        setQuestions([]);
      }
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('pageSize', pagination.pageSize.toString());
      
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (selectedField) params.append('knowledgeField', selectedField);
      if (selectedGroup) params.append('targetGroup', selectedGroup);
      
      if (activeTab && activeTab !== "all") {
        let answerType = "";
        if (activeTab === "single") answerType = "single_selection";
        if (activeTab === "multiple") answerType = "multiple_selection";
        if (activeTab === "binary") answerType = "binary";
        params.append('answerType', answerType);
      }
      
      console.log('Filter params:', {
        search: debouncedSearchTerm || 'none',
        knowledgeField: selectedField || 'none',
        targetGroup: selectedGroup || 'none',
        answerType: activeTab !== "all" ? activeTab : 'all',
        sortField,
        sortOrder,
        page: pagination.page
      });
      
      params.append('sortField', sortField);
      params.append('sortOrder', sortOrder);
      
      // Make API request
      const response = await fetch(`/api/organizer/questions?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API response:', {
        questionCount: data.questions.length,
        pagination: data.pagination,
        filters: {
          search: debouncedSearchTerm || 'none',
          knowledgeField: selectedField || 'none',
          targetGroup: selectedGroup || 'none',
          answerType: activeTab !== "all" ? activeTab : 'all'
        }
      });
      
      // Update state with response data
      if (isLoadMore) {
        setQuestions(prev => [...prev, ...data.questions]);
      } else {
        // Reset questions when not loading more
        setQuestions(data.questions);
      }
      
      setPagination({
        page: data.pagination.page,
        pageSize: data.pagination.pageSize,
        totalCount: data.pagination.totalCount,
        totalPages: data.pagination.totalPages,
        hasNextPage: data.pagination.hasNextPage,
        hasPrevPage: data.pagination.hasPrevPage,
      });
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      
      // Save current filter state to cookies after data is loaded
      saveFilterStateToCookies();
    }
  };
  
  // Handle sort column changes
  const handleSortChange = (field: string) => {
    if (field === sortField) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending
      setSortField(field);
      setSortOrder('desc');
    }
    // Reset to first page when sorting changes
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle page changes
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };
  
  // Load more questions
  const loadMoreQuestions = () => {
    if (!isLoadingMore && !isLoading && pagination.hasNextPage) {
      // Just increment the page - the useEffect will handle the fetch
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };
  
  // Setup intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && pagination.hasNextPage && !isLoading && !isLoadingMore) {
          loadMoreQuestions();
        }
      },
      { threshold: 0.5 }
    );
    
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    
    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [pagination.hasNextPage, isLoading, isLoadingMore]);

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedField(null);
    setSelectedGroup(null);
    setActiveTab("all");
    setSortField("createdAt");
    setSortOrder("desc");
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Fetch available filter options from API
  const fetchFilterOptions = async () => {
    try {
      // Fetch knowledge fields
      const knowledgeFieldsResponse = await fetch('/api/organizer/questions/knowledge-fields');
      if (knowledgeFieldsResponse.ok) {
        const fields = await knowledgeFieldsResponse.json();
        if (Array.isArray(fields)) {
          setKnowledgeFields(fields);
          console.log('Loaded knowledge fields:', fields.length);
        }
      } else {
        console.error('Failed to fetch knowledge fields:', knowledgeFieldsResponse.status);
      }

      // Fetch target groups
      const targetGroupsResponse = await fetch('/api/organizer/questions/target-groups');
      if (targetGroupsResponse.ok) {
        const groups = await targetGroupsResponse.json();
        if (Array.isArray(groups)) {
          setTargetGroups(groups);
          console.log('Loaded target groups:', groups.length);
        }
      } else {
        console.error('Failed to fetch target groups:', targetGroupsResponse.status);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  // Track initialization state
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Question detail modal state
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);

  // Load filter state from cookies and fetch filter options on component mount
  useEffect(() => {
    const initializeComponent = async () => {
      // First load cookie values to restore user's preferences
      loadFilterStateFromCookies();
      
      // Then fetch filter options
      await fetchFilterOptions();
      
      // Mark initialization as complete - this will trigger data fetch in the next effect
      setIsInitializing(false);
      console.log('Initialization complete, loading data with saved filters');
    };
    
    initializeComponent();
  }, []);

  // Reset pagination when search term changes
  useResetPaginationOnSearch(debouncedSearchTerm, setPagination);

  // Fetch data when filters, sorting or pagination change
  useEffect(() => {
    // Skip initial fetch until component is fully initialized with cookie values
    if (isInitializing) {
      return;
    }
    
    console.log('Fetching questions with settings:', {
      searchTerm: debouncedSearchTerm || '(empty)',
      field: selectedField || '(none)',
      group: selectedGroup || '(none)',
      tab: activeTab,
      sortField,
      sortOrder,
      page: pagination.page
    });
    
    const isLoadMore = pagination.page > 1;
    fetchQuestions(isLoadMore);
  }, [
    isInitializing, // Dependency on initialization state ensures data loads after cookie values are applied
    debouncedSearchTerm, 
    selectedField, 
    selectedGroup, 
    activeTab, 
    sortField, 
    sortOrder, 
    pagination.page,
    pagination.pageSize
  ]);

  return (
    <div className="container py-10 mx-auto">
      <PageHeader title="Questions">
        <div className="flex items-center justify-between">
          <Link href="/organizer/quizzes/questions/create">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </Link>
        </div>
      </PageHeader>

      <div className="my-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Questions</CardTitle>
            <CardDescription>
              Browse, search, and manage your quiz questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 md:items-center mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search questions..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    // Don't reset pagination here since we're using debounced search term
                    // which will trigger useEffect when the debounced value changes
                  }}
                />
              </div>
              
              <div className="flex gap-2 items-center">
                <div className="flex gap-2">
                  {/* Knowledge Field Filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-9">
                        <FileText className="mr-2 h-4 w-4" />
                        {selectedField || "Knowledge Field"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Knowledge Fields</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {knowledgeFields.map((field) => (
                        <DropdownMenuItem
                          key={field}
                          onClick={() => {
                            setSelectedField(field);
                            setPagination(prev => ({ ...prev, page: 1 }));
                          }}
                          className={selectedField === field ? "bg-secondary" : ""}
                        >
                          {field}
                        </DropdownMenuItem>
                      ))}
                      {knowledgeFields.length === 0 && (
                        <DropdownMenuItem disabled>No fields available</DropdownMenuItem>
                      )}
                      {selectedField && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setSelectedField(null)}>
                            Clear selection
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* Target Group Filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-9">
                        <BookOpen className="mr-2 h-4 w-4" />
                        {selectedGroup || "Target Group"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Target Groups</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {targetGroups.map((group) => (
                        <DropdownMenuItem
                          key={group}
                          onClick={() => {
                            setSelectedGroup(group);
                            setPagination(prev => ({ ...prev, page: 1 }));
                          }}
                          className={selectedGroup === group ? "bg-secondary" : ""}
                        >
                          {group}
                        </DropdownMenuItem>
                      ))}
                      {targetGroups.length === 0 && (
                        <DropdownMenuItem disabled>No groups available</DropdownMenuItem>
                      )}
                      {selectedGroup && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setSelectedGroup(null)}>
                            Clear selection
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {/* Clear filters button */}
                {(searchTerm || selectedField || selectedGroup || activeTab !== "all" || 
                  sortField !== "createdAt" || sortOrder !== "desc") && (
                  <Button 
                    variant="ghost" 
                    onClick={handleClearFilters} 
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-100/50"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center">
                          <FilterX className="h-4 w-4 mr-1" />
                          <span>Clear</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Reset all filters and sorting</p>
                      </TooltipContent>
                    </Tooltip>
                  </Button>
                )}
              </div>
            </div>
            
            {/* Tabs for answer types */}
            <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => {
              setActiveTab(value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Types</TabsTrigger>
                <TabsTrigger value="single">Single Selection</TabsTrigger>
                <TabsTrigger value="multiple">Multiple Selection</TabsTrigger>
                <TabsTrigger value="binary">Binary</TabsTrigger>
              </TabsList>
              
              {/* Show loading state with progress indicators */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Loader2 className="h-10 w-10 animate-spin mb-4" />
                  <p className="text-lg font-medium mb-2">Loading questions...</p>
                  
                  {/* Progress bar - simulates progress since we don't have actual progress data */}
                  <div className="w-full max-w-md bg-secondary rounded-full h-2.5 mb-1 overflow-hidden">
                    <div className="bg-primary h-2.5 rounded-full animate-pulse" 
                         style={{ width: '70%' }}></div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    This may take a moment for large datasets
                  </p>
                </div>
              ) : (
                <>
                  <TabsContent value="all" className="p-0">
                    <QuestionsTable 
                      questions={questions} 
                      onSort={handleSortChange} 
                      sortField={sortField} 
                      sortOrder={sortOrder} 
                      onQuestionClick={(question) => {
                        setSelectedQuestion(question);
                        setShowQuestionModal(true);
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="single" className="p-0">
                    <QuestionsTable 
                      questions={questions} 
                      onSort={handleSortChange} 
                      sortField={sortField} 
                      sortOrder={sortOrder} 
                      onQuestionClick={(question) => {
                        setSelectedQuestion(question);
                        setShowQuestionModal(true);
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="multiple" className="p-0">
                    <QuestionsTable 
                      questions={questions} 
                      onSort={handleSortChange} 
                      sortField={sortField} 
                      sortOrder={sortOrder} 
                      onQuestionClick={(question) => {
                        setSelectedQuestion(question);
                        setShowQuestionModal(true);
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="binary" className="p-0">
                    <QuestionsTable 
                      questions={questions} 
                      onSort={handleSortChange} 
                      sortField={sortField} 
                      sortOrder={sortOrder} 
                      onQuestionClick={(question) => {
                        setSelectedQuestion(question);
                        setShowQuestionModal(true);
                      }}
                    />
                  </TabsContent>
                  
                  {/* Load more indicator */}
                  {questions.length > 0 && (
                    <div className="mt-6">
                      {pagination.hasNextPage && (
                        <div className="flex flex-col items-center">
                          <div ref={observerTarget} className="h-10 w-full" />
                          {isLoadingMore ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-6 w-6 animate-spin mr-2" />
                              <span>Loading more questions...</span>
                            </div>
                          ) : (
                            <Button 
                              variant="outline" 
                              onClick={loadMoreQuestions} 
                              disabled={!pagination.hasNextPage || isLoadingMore}
                              className="mx-auto"
                            >
                              Load More
                            </Button>
                          )}
                        </div>
                      )}
                      
                      <div className="text-sm text-center text-muted-foreground mt-4">
                        Showing {questions.length} of {pagination.totalCount} questions
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {!isLoading && questions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-8 w-8 mb-2" />
                  <h3 className="font-medium">No questions found</h3>
                  <p>Try adjusting your filters or create a new question.</p>
                </div>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Question Detail Modal */}
      <QuestionDetailModal 
        question={selectedQuestion}
        open={showQuestionModal}
        onOpenChange={setShowQuestionModal}
      />
    </div>
  );
}

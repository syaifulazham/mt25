'use client';

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { downloadContestantsAsDocx } from "@/lib/docx-export";
import { Contestant } from "@/types/contestant";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Search, 
  Plus, 
  Users, 
  UserPlus, 
  School, 
  GraduationCap, 
  User, 
  Filter, 
  Download, 
  Upload, 
  Trash2,
  Pencil,
  FileText,
  FileDown,
  AlertTriangle,
  X,
  LayoutGrid
} from "lucide-react";
import Link from "next/link";
import EditContestantModal from "./_components/edit-contestant-modal";
import ContestantsFilters from "./_components/contestants-filters";
import Pagination from "./_components/pagination";
import BulkAssignContests from "./_components/bulk-assign-contests";
import AssignContestsModal from "./_components/assign-contests-modal";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Using the shared Contestant interface from @/types/contestant

export default function ContestantsPage() {
  const { data: session, status } = useSession();
  const { t } = useLanguage();
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [eduLevelFilter, setEduLevelFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContestants, setTotalContestants] = useState(0);
  const [limit] = useState(20); // 20 records per page
  
  // Stats state
  const [stats, setStats] = useState({
    total: 0,
    byEduLevel: {
      "sekolah rendah": 0,
      "sekolah menengah": 0,
      "belia": 0
    }
  });
  
  // Filter state
  const [classGradeFilter, setClassGradeFilter] = useState("");
  const [classNameFilter, setClassNameFilter] = useState("");
  const [ageFilter, setAgeFilter] = useState("");
  
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contestantToDelete, setContestantToDelete] = useState<{id: number, name: string} | null>(null);
  
  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/participants/auth/login");
    }
  }, [status]);
  
  // State to track if user has any contingents
  const [hasContingents, setHasContingents] = useState<boolean | null>(null);

  // Check if the user has any contingents
  const checkContingents = async () => {
    if (!session?.user?.email) return;
    
    try {
      setIsLoading(true);
      
      const contingentsResponse = await fetch('/api/participants/contingents/managed');
      
      if (!contingentsResponse.ok) {
        throw new Error('Failed to check contingents');
      }
      
      const contingentsData = await contingentsResponse.json();
      const hasAnyContingents = contingentsData && contingentsData.length > 0;
      
      setHasContingents(hasAnyContingents);
      
      // Only proceed to fetch contestants if the user has contingents
      if (hasAnyContingents) {
        fetchContestants(1);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error checking contingents:", error);
      setHasContingents(false);
      setIsLoading(false);
    }
  };
  
  // Fetch contestants with filters and pagination
  const fetchContestants = async (page = currentPage) => {
    if (!session?.user?.email) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      // Add search query if present
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      // Add education level filter if not "all"
      if (eduLevelFilter && eduLevelFilter !== 'all') {
        params.append('edu_level', eduLevelFilter);
      }
      
      if (classGradeFilter && classGradeFilter !== 'all') {
        params.append('class_grade', classGradeFilter);
      }
      
      if (classNameFilter) {
        params.append('class_name', classNameFilter);
      }
      
      if (ageFilter) {
        params.append('age', ageFilter);
      }
      
      // Fetch contestants with filters and pagination
      const contestantsResponse = await fetch(`/api/participants/contestants?${params.toString()}`);
      
      if (!contestantsResponse.ok) {
        const errorData = await contestantsResponse.json();
        throw new Error(errorData.error || t('contestant.error_fetch'));
      }
      
      const result = await contestantsResponse.json();
      setContestants(result.data);
      setTotalContestants(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
      setCurrentPage(result.pagination.page);
      
      // If no contestants are found but the API call was successful
      if (result.data.length === 0 && result.pagination.total === 0) {
        console.log("No contestants found for managed contingents");
      }
      
      // Fetch stats after contestants to get accurate tab counts
      fetchStats();
    } catch (error) {
      console.error("Error fetching contestants:", error);
      setError(t('contestant.error_load'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch contestant stats
  const fetchStats = async () => {
    if (!session?.user?.email) return;
    
    try {
      // Build query parameters for stats (apply same filters as contestants)
      const params = new URLSearchParams();
      
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      if (classGradeFilter && classGradeFilter !== 'all') {
        params.append('class_grade', classGradeFilter);
      }
      
      if (classNameFilter) {
        params.append('class_name', classNameFilter);
      }
      
      if (ageFilter) {
        params.append('age', ageFilter);
      }
      
      const statsResponse = await fetch(`/api/participants/contestants/stats?${params.toString()}`);
      
      if (!statsResponse.ok) {
        console.error("Failed to fetch contestant stats");
        return;
      }
      
      const statsData = await statsResponse.json();
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching contestant stats:", error);
    }
  };

  // Initial check for contingents before fetching contestants
  useEffect(() => {
    if (session?.user?.email) {
      checkContingents();
    }
  }, [session]);
  
  // Handle filter apply
  const handleFilterApply = () => {
    fetchContestants(1); // Reset to first page when applying filters
  };
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Set education level filter based on active tab
    let newEduLevelFilter = "all";
    if (value === "primary") {
      newEduLevelFilter = "sekolah rendah";
    } else if (value === "secondary") {
      newEduLevelFilter = "sekolah menengah";
    } else if (value === "youth") {
      newEduLevelFilter = "belia";
    }
    
    // Only update if the filter actually changed
    if (eduLevelFilter !== newEduLevelFilter) {
      setEduLevelFilter(newEduLevelFilter);
      // Reset to page 1 when changing tabs/filters
      setCurrentPage(1);
      setTimeout(() => {
        fetchContestants(1);
      }, 0);
    }
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle search form submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to page 1 when searching
    fetchContestants(1);
  };
  
  // Handle filter reset
  const handleFilterReset = () => {
    setClassGradeFilter("");
    setClassNameFilter("");
    setAgeFilter("");
    setEduLevelFilter("all");
    setSearchQuery("");
    setActiveTab("all"); // Reset active tab to "all"
    // Fetch with reset filters
    setTimeout(() => {
      fetchContestants(1);
    }, 0);
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    fetchContestants(page);
  };
  
  // Group contestants by education level
  const contestantsByEduLevel = {
    "sekolah rendah": contestants.filter(c => c.edu_level === "sekolah rendah"),
    "sekolah menengah": contestants.filter(c => c.edu_level === "sekolah menengah"),
    "belia": contestants.filter(c => c.edu_level === "belia")
  };
  
  // Handle opening delete confirmation dialog
  const openDeleteDialog = (id: number, name: string) => {
    setContestantToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  // Handle contestant deletion
  const handleDeleteContestant = async () => {
    if (!contestantToDelete) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/participants/contestants/${contestantToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        let errorMessage = t('contestant.delete.error');
        
        // Check if there's content to parse
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            if (errorData && errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (parseError) {
            console.error('Error parsing error response:', parseError);
          }
        }
        
        throw new Error(errorMessage);
      }
      
      // Update the local state
      setContestants(contestants.filter(c => c.id !== contestantToDelete.id));
      toast.success(t('contestant.delete.success'));
    } catch (error: any) {
      console.error("Error deleting contestant:", error);
      toast.error(error.message || t('contestant.delete.error'));
    } finally {
      setIsLoading(false);
      // Reset the contestant to delete
      setContestantToDelete(null);
      setDeleteDialogOpen(false);
    }
  };
  
  // Education level badge component
  const EduLevelBadge = ({ eduLevel }: { eduLevel: string }) => {
    switch (eduLevel) {
      case "sekolah rendah":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600">{t('contestant.primary_school')}</Badge>;
      case "sekolah menengah":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600">{t('contestant.secondary_school')}</Badge>;
      case "belia":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600">{t('contestant.youth')}</Badge>;
      default:
        return <Badge variant="outline">{eduLevel}</Badge>;
    }
  };
  
  // Function to render the contestants table
  const renderContestantsTable = (contestantsToRender: Contestant[]) => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="p-8 text-center">
          <p className="text-red-500">{error}</p>
        </div>
      );
    }
    
    if (contestantsToRender.length === 0) {
      return (
        <div className="p-8 text-center">
          <p className="text-muted-foreground">{t('contestant.no_contestants_found')}</p>
          <div className="flex justify-center mt-4">
            <Button asChild>
              <Link href="/participants/contestants/new">
                <UserPlus className="mr-2 h-4 w-4" /> {t('contestant.add_contestant')}
              </Link>
            </Button>
          </div>
        </div>
      );
    }
    
    // Show pagination only when we have multiple pages
    const shouldShowPagination = totalPages > 1;
    
    return (
      <div className="space-y-4">
        <Table>
          <TableCaption>
            {shouldShowPagination 
              ? `${t('contestant.showing')} ${contestants.length} ${t('contestant.of')} ${totalContestants} ${t('contestant.contestants')} (${t('contestant.page')} ${currentPage} ${t('contestant.of')} ${totalPages})`
              : `${t('contestant.total')}: ${contestantsToRender.length} ${t('contestant.contestants')}`
            }
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>{t('contestant.name')}</TableHead>
              <TableHead>{t('contestant.class')}</TableHead>
              <TableHead className="text-right">{t('contestant.actions')}</TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
          {contestantsToRender.map((contestant) => (
            <TableRow key={contestant.id}>
              <TableCell>
                <div className="font-medium">{contestant.name}</div>
                <div className="flex items-center text-xs mt-1 text-muted-foreground">
                  <div className="mr-3">
                    {contestant.gender === 'MALE' ? (
                      <Badge variant="outline" className="px-2 min-w-[70px] justify-center bg-blue-50 text-blue-700 border-blue-200 flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{t('contestant.male')}</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="px-2 min-w-[70px] justify-center bg-pink-50 text-pink-700 border-pink-200 flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{t('contestant.female')}</span>
                      </Badge>
                    )}
                  </div>
                  <div className="mr-3">{contestant.age} {t('contestant.years')}</div>
                  <div className="flex items-center">
                    <span className="font-mono mr-2">{contestant.ic}</span>
                    {contestant.is_ppki && (
                      <Badge variant="outline" className="px-2 bg-amber-50 text-amber-700 border-amber-200 flex items-center space-x-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{t('contestant.is_ppki')}</span>
                      </Badge>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {contestant.class_grade && contestant.class_name 
                  ? `${contestant.class_grade} - ${contestant.class_name}` 
                  : contestant.class_name || contestant.class_grade || '-'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end items-center space-x-1">
                  <AssignContestsModal
                    contestantId={contestant.id}
                    contestantName={contestant.name}
                    onSuccess={() => fetchContestants(currentPage)}
                  />
                  <EditContestantModal 
                    contestant={contestant} 
                    onUpdate={(updatedContestant) => {
                      // Update the contestant in the local state
                      setContestants(prev => 
                        prev.map(c => c.id === updatedContestant.id ? updatedContestant : c)
                      );
                    }} 
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => openDeleteDialog(contestant.id, contestant.name)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="12" cy="5" r="1" />
                          <circle cx="12" cy="19" r="1" />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{t('contestant.actions')}</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => {}}>
                      <Link href={`/participants/contingents/${contestant.contingentId}`} className="flex items-center w-full">
                        <Pencil className="h-4 w-4 mr-2" /> {t('contestant.view')} Contingent
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <EditContestantModal 
                        contestant={contestant} 
                        onUpdate={(updatedContestant) => {
                          // Update the contestant in the local state
                          setContestants(prev => 
                            prev.map(c => c.id === updatedContestant.id ? updatedContestant : c)
                          );
                        }} 
                      />
                      <span className="ml-2">{t('contestant.edit_contestant')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <AssignContestsModal
                        contestantId={contestant.id}
                        contestantName={contestant.name}
                        onSuccess={() => fetchContestants(currentPage)}
                      />
                      <span className="ml-2">{t('contestant.contests.assign_button')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => openDeleteDialog(contestant.id, contestant.name)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> {t('contestant.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
        
        {/* Pagination */}
        {totalPages > 1 && searchQuery === "" && eduLevelFilter === "all" && (
          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={handlePageChange} 
          />
        )}
      </div>
    );
  };
  
  if (status === "loading") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }
  
  // If user has no contingents, display message to create one first
  if (hasContingents === false) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{t('contestant.title')}</h1>
        </div>
        
        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="pt-6 text-center py-12">
            <School className="mx-auto h-12 w-12 text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('contestant.no_contingent_title') || "No Contingent Found"}</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {t('contestant.no_contingent_message') || "You need to create or join a contingent before you can add contestants. Please create a contingent first."}
            </p>
            <Link href="/participants/contingents">
              <Button size="lg">
                <Users className="mr-2 h-5 w-5" />
                {t('contestant.create_contingent') || "Go to Contingents"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Normal page rendering when user has contingents
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('contestant.title')}</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            {t('contestant.description')}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button asChild>
            <Link href="/participants/contestants/new">
              <UserPlus className="mr-2 h-4 w-4" /> {t('contestant.add')}
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/participants/contestants/bulk">
              <Upload className="mr-2 h-4 w-4" /> {t('contestant.bulk_upload')}
            </Link>
          </Button>
          <Button variant="outline" className="gap-2" asChild>
            <Link href="/templates/contestants-template.csv" download>
              <Download className="h-4 w-4" />
              {t('contestant.template')}
            </Link>
          </Button>
          <BulkAssignContests />
        </div>
      </div>
      
      {/* Search and filter row - placed above tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2 justify-between bg-card rounded-md p-3 shadow-sm border">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center flex-1">
          <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('contestant.search_placeholder') || "Search by name or IC..."}
            className="pl-8 w-full"
            value={searchQuery}
            onChange={handleSearchChange}
          />
          <Button type="submit" variant="secondary" className="ml-2">
            {t('common.search')}
          </Button>
        </form>
        
        <div className="flex items-center space-x-2 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                {t('contestant.filters')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[320px]">
              <DropdownMenuLabel>{t('contestant.filters')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-4 grid gap-4">
                {/* Class Grade Filter */}
                <div className="space-y-2">
                  <Label htmlFor="dropdown_class_grade" className="text-xs font-medium">
                    {t('contestant.filter.grade')}
                  </Label>
                  <Select
                    value={classGradeFilter}
                    onValueChange={setClassGradeFilter}
                  >
                    <SelectTrigger id="dropdown_class_grade" className="h-8">
                      <SelectValue placeholder={t('contestant.filter.all_grades')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('contestant.filter.all_grades')}</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="PPKI">PPKI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Class Name Filter */}
                <div className="space-y-2">
                  <Label htmlFor="dropdown_class_name" className="text-xs font-medium">
                    {t('contestant.filter.class_name')}
                  </Label>
                  <Input
                    id="dropdown_class_name"
                    placeholder={t('contestant.filter.enter_class_name')}
                    value={classNameFilter}
                    onChange={(e) => setClassNameFilter(e.target.value)}
                    className="h-8"
                  />
                </div>
                
                {/* Age Filter */}
                <div className="space-y-2">
                  <Label htmlFor="dropdown_age" className="text-xs font-medium">
                    {t('contestant.filter.age')}
                  </Label>
                  <Input
                    id="dropdown_age"
                    type="number"
                    placeholder={t('contestant.filter.enter_age')}
                    value={ageFilter}
                    onChange={(e) => setAgeFilter(e.target.value)}
                    min={5}
                    max={25}
                    className="h-8"
                  />
                </div>
                
                {/* Action Buttons */}
                <div className="flex justify-between pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleFilterReset}
                  >
                    <X className="mr-2 h-3 w-3" />
                    {t('common.reset')}
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleFilterApply}
                  >
                    <Search className="mr-2 h-3 w-3" />
                    {t('common.apply')}
                  </Button>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Tabs section */}
      <Tabs 
        defaultValue="all" 
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <div className="flex items-center justify-between mb-4">
          <TabsList className="grid grid-cols-4 w-auto">
            <TabsTrigger value="all" className="relative">
              <LayoutGrid className="h-4 w-4 md:hidden" />
              <span className="hidden md:inline">{t('contestant.all') || "All"}</span>
              <Badge variant="secondary" className="ml-2">
                {stats.total}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="primary" className="relative">
              <School className="h-4 w-4 md:hidden" />
              <span className="hidden md:inline">{t('contestant.primary_school') || "Primary"}</span>
              <Badge variant="secondary" className="ml-2 bg-blue-500/10">
                {stats.byEduLevel["sekolah rendah"]}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="secondary" className="relative">
              <GraduationCap className="h-4 w-4 md:hidden" />
              <span className="hidden md:inline">{t('contestant.secondary_school') || "Secondary"}</span>
              <Badge variant="secondary" className="ml-2 bg-purple-500/10">
                {stats.byEduLevel["sekolah menengah"]}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="youth" className="relative">
              <Users className="h-4 w-4 md:hidden" />
              <span className="hidden md:inline">{t('contestant.youth') || "Youth"}</span>
              <Badge variant="secondary" className="ml-2 bg-amber-500/10">
                {stats.byEduLevel["belia"]}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="all" className="mt-4">
          {renderContestantsTable(contestants)}
        </TabsContent>
        
        <TabsContent value="primary" className="mt-4">
          {renderContestantsTable(contestants)}
        </TabsContent>
        
        <TabsContent value="secondary" className="mt-4">
          {renderContestantsTable(contestants)}
        </TabsContent>
        
        <TabsContent value="youth" className="mt-4">
          {renderContestantsTable(contestants)}
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Showing {contestants.length} of {totalContestants} contestants
        </p>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => downloadContestantsAsDocx(contestants, `senarai_peserta_${new Date().toISOString().split('T')[0]}`)}
          >
            <FileDown className="mr-2 h-4 w-4" /> {t('contestant.export')}
          </Button>
        </div>
      </div>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('contestant.delete.confirmation_title')}
            </AlertDialogTitle>
            <AlertDialogDescription className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                <p>{t('contestant.delete.confirmation_message')}</p>
              </div>
              {contestantToDelete && (
                <p className="font-medium mt-2">
                  {contestantToDelete.name} ({t('contestant.id')}: {contestantToDelete.id})
                </p>
              )}
              <p className="mt-2">{t('contestant.delete.permanent')}</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteContestant}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t('contestant.delete.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

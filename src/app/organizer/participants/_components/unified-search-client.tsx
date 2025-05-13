"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Loader2, X, MapPin, Phone, Mail, Building } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";

type SearchResultType = 'contestant' | 'contingent' | 'team' | 'school' | 'participant';

interface SearchResult {
  id: number;
  type: SearchResultType;
  name: string;
  description: string; // Secondary info like IC, email, address, etc.
  logoUrl?: string;
  tags?: string[];
  url: string; // Link to detailed page
}

// Interface for detailed school information
interface SchoolDetails {
  id: number;
  name: string;
  address: string;
  city: string;
  postcode: string;
  state: string;
  phone: string;
  email: string;
  level: string;
  category: string;
  code: string;
  district: string;
  ppd: string;
}

// Helper functions for result display
function getAvatarClass(type: SearchResultType, logoUrl?: string): string {
  // Special case for contingents with logos
  if (type === 'contingent' && logoUrl) {
    return '';
  }
  
  switch(type) {
    case 'contestant':
      return 'bg-blue-100 text-blue-700';
    case 'contingent':
      return 'bg-green-100 text-green-700';
    case 'team':
      return 'bg-purple-100 text-purple-700';
    case 'school':
      return 'bg-amber-100 text-amber-700';
    case 'participant':
      return 'bg-indigo-100 text-indigo-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getAvatarLabel(type: SearchResultType): string {
  switch(type) {
    case 'contestant':
      return 'CO';
    case 'contingent':
      return 'CT';
    case 'team':
      return 'TM';
    case 'school':
      return 'SC';
    case 'participant':
      return 'PA';
    default:
      return 'UN';
  }
}

function getTypeLabel(type: SearchResultType): string {
  switch(type) {
    case 'contestant':
      return 'Contestant';
    case 'contingent':
      return 'Contingent';
    case 'team':
      return 'Team';
    case 'school':
      return 'School';
    case 'participant':
      return 'Participant';
    default:
      return 'Unknown';
  }
}

export default function UnifiedSearchClient() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<SearchResultType | 'all'>('all');
  const [selectedSchool, setSelectedSchool] = useState<SchoolDetails | null>(null);
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [isLoadingSchool, setIsLoadingSchool] = useState(false);
  
  // Handle search button click
  const handleSearchSubmit = () => {
    if (searchTerm.length >= 2) {
      performSearch();
    } else if (searchTerm.length === 0) {
      setSearchResults([]);
    }
  };
  
  // Handle Enter key press in search input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  // API-based search function
  const searchAPI = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/organizer/search?term=${encodeURIComponent(searchTerm)}&filter=${currentFilter}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      setSearchResults(data.results);
    } catch (error) {
      console.error('Error searching:', error);
      // In real app, add error handling UI
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Use the API search function directly
  const performSearch = () => {
    if (searchTerm.length >= 2) {
      // Call the real API to get search results
      searchAPI();
    }
  };

  // These functions have been moved outside the component to avoid scoping issues

  // Handler for school click
  const handleSchoolClick = async (schoolId: number) => {
    console.log(`School clicked, fetching details for ID: ${schoolId}`);
    setIsLoadingSchool(true);
    setIsSchoolModalOpen(true); // Open the modal immediately to show loading state
    
    try {
      // Fetch detailed school information from API
      const url = `/api/organizer/reference-data/schools/${schoolId}`;
      console.log(`Fetching from URL: ${url}`);
      
      const response = await fetch(url);
      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error: ${response.status}`, errorText);
        throw new Error(`Failed to fetch school details: ${response.status} ${errorText}`);
      }
      
      const schoolDetails = await response.json();
      console.log('School details received:', schoolDetails);
      setSelectedSchool(schoolDetails);
    } catch (error) {
      console.error('Error fetching school details:', error);
      // Keep the modal open but show error state
      setSelectedSchool(null);
      // Could add toast notification here for error handling
    } finally {
      setIsLoadingSchool(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 w-full">
          <div className="relative w-full flex">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contestants, contingents, schools or teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10 h-10 rounded-r-none"
            />
            <Button 
              onClick={handleSearchSubmit} 
              className="h-10 rounded-l-none"
            >
              Search
            </Button>
          </div>
          <Button variant="outline" size="sm" className="h-10">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {searchTerm.length > 0 && (
        <Tabs defaultValue="all" value={currentFilter} onValueChange={(value) => setCurrentFilter(value as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Results</TabsTrigger>
            <TabsTrigger value="contestant">Contestants</TabsTrigger>
            <TabsTrigger value="contingent">Contingents</TabsTrigger>
            <TabsTrigger value="team">Teams</TabsTrigger>
            <TabsTrigger value="participant">Participants</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            <SearchResultsList 
              results={searchResults} 
              isLoading={isLoading} 
              onSchoolClick={handleSchoolClick} 
            />
          </TabsContent>
          <TabsContent value="contestant" className="mt-0">
            <SearchResultsList 
              results={searchResults} 
              isLoading={isLoading} 
              onSchoolClick={handleSchoolClick} 
            />
          </TabsContent>
          <TabsContent value="contingent" className="mt-0">
            <SearchResultsList 
              results={searchResults} 
              isLoading={isLoading} 
              onSchoolClick={handleSchoolClick} 
            />
          </TabsContent>
          <TabsContent value="team" className="mt-0">
            <SearchResultsList 
              results={searchResults} 
              isLoading={isLoading} 
              onSchoolClick={handleSchoolClick} 
            />
          </TabsContent>
          <TabsContent value="participant" className="mt-0">
            <SearchResultsList 
              results={searchResults} 
              isLoading={isLoading} 
              onSchoolClick={handleSchoolClick} 
            />
          </TabsContent>
        </Tabs>
      )}

      {/* School Details Modal */}
      <Dialog open={isSchoolModalOpen} onOpenChange={setIsSchoolModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedSchool?.name || 'School Details'}</DialogTitle>
            <DialogDescription>
              Detailed information about this school
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingSchool ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedSchool ? (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-[20px_1fr] items-start gap-3">
                <Building className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">School Info</div>
                  <div className="text-sm text-muted-foreground">
                    Level: {selectedSchool.level || 'N/A'}<br />
                    Category: {selectedSchool.category || 'N/A'}<br />
                    School Code: {selectedSchool.code || 'N/A'}<br />
                    PPD: {selectedSchool.ppd || 'N/A'}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-[20px_1fr] items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Address</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedSchool.address || 'N/A'}<br />
                    {selectedSchool.city ? `${selectedSchool.city}` : ''} 
                    {selectedSchool.postcode ? `${selectedSchool.postcode}` : ''}<br />
                    {selectedSchool.state || 'N/A'}<br />
                    District: {selectedSchool.district || 'N/A'}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-[20px_1fr] items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Contact</div>
                  <div className="text-sm text-muted-foreground">
                    Phone: {selectedSchool.phone || 'N/A'}<br />
                    Email: {selectedSchool.email || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-muted-foreground">
              School information not available
            </div>
          )}
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface SearchResultsListProps {
  results: SearchResult[];
  isLoading: boolean;
  onSchoolClick: (schoolId: number) => void;
}

function SearchResultsList({ results, isLoading, onSchoolClick }: SearchResultsListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No results found. Try a different search term.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {results.map((result) => (
        <div key={`${result.type}-${result.id}`}>
          {result.type === 'school' ? (
            // Make school results clickable to show modal instead of navigating
            <div 
              className="hover:bg-accent/50 transition-colors py-4 px-6 cursor-pointer" 
              onClick={() => onSchoolClick(result.id)}
            >
              <div className="flex items-start gap-4">
                <Avatar className={`h-10 w-10 mt-1 ${getAvatarClass(result.type, result.logoUrl)}`}>
                  {result.logoUrl && result.type === 'contingent' ? (
                    <AvatarImage src={result.logoUrl} alt={result.name} />
                  ) : null}
                  <AvatarFallback className={getAvatarClass(result.type)}>
                    {getAvatarLabel(result.type)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-foreground">{result.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {getTypeLabel(result.type)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{result.description}</p>
                  {result.tags && result.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {result.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Other result types navigate to their URL
            <Link href={result.url}>
              <div className="hover:bg-accent/50 transition-colors py-4 px-6">
                <div className="flex items-start gap-4">
                <Avatar className={`h-10 w-10 mt-1 ${getAvatarClass(result.type, result.logoUrl)}`}>
                  {result.logoUrl && result.type === 'contingent' ? (
                    <AvatarImage src={result.logoUrl} alt={result.name} />
                  ) : null}
                  <AvatarFallback className={getAvatarClass(result.type)}>
                    {getAvatarLabel(result.type)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-foreground">{result.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {getTypeLabel(result.type)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{result.description}</p>
                  {result.tags && result.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {result.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              </div>
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}

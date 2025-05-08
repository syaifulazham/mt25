"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";

type SearchResultType = 'contestant' | 'contingent' | 'team' | 'school';

interface SearchResult {
  id: number;
  type: SearchResultType;
  name: string;
  description: string; // Secondary info like IC, email, address, etc.
  logoUrl?: string;
  tags?: string[];
  url: string; // Link to detailed page
}

export default function UnifiedSearchClient() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<SearchResultType | 'all'>('all');
  
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
      // Call the real API instead of using mock data
      searchAPI();
    }
  };
  
  // Uncomment this line to use the API-based search instead of mock data
  // const performSearch = searchAPI;

  // Function to determine avatar color based on result type
  const getAvatarClass = (type: SearchResultType) => {
    switch(type) {
      case 'contestant':
        return 'bg-blue-100 text-blue-700';
      case 'contingent':
        return 'bg-green-100 text-green-700';
      case 'team':
        return 'bg-purple-100 text-purple-700';
      case 'school':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Function to get avatar label based on result type
  const getAvatarLabel = (type: SearchResultType) => {
    switch(type) {
      case 'contestant':
        return 'CO';
      case 'contingent':
        return 'CT';
      case 'team':
        return 'TM';
      case 'school':
        return 'SC';
      default:
        return 'UN';
    }
  };

  // Function to get type label based on result type
  const getTypeLabel = (type: SearchResultType) => {
    switch(type) {
      case 'contestant':
        return 'Contestant';
      case 'contingent':
        return 'Contingent';
      case 'team':
        return 'Team';
      case 'school':
        return 'School';
      default:
        return 'Unknown';
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
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            <SearchResultsList results={searchResults} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="contestant" className="mt-0">
            <SearchResultsList results={searchResults} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="contingent" className="mt-0">
            <SearchResultsList results={searchResults} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="team" className="mt-0">
            <SearchResultsList results={searchResults} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

interface SearchResultsListProps {
  results: SearchResult[];
  isLoading: boolean;
}

function SearchResultsList({ results, isLoading }: SearchResultsListProps) {
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
        <Link href={result.url} key={`${result.type}-${result.id}`}>
          <div className="hover:bg-accent/50 transition-colors py-4 px-6">
              <div className="flex items-start gap-4">
                <Avatar className={`h-10 w-10 mt-1 ${result.type === 'contingent' && result.logoUrl ? '' : 
                    result.type === 'contestant' ? 'bg-blue-100 text-blue-700' :
                    result.type === 'contingent' ? 'bg-green-100 text-green-700' :
                    result.type === 'team' ? 'bg-purple-100 text-purple-700' :
                    result.type === 'school' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                  {result.logoUrl && result.type === 'contingent' ? (
                    <AvatarImage src={result.logoUrl} alt={result.name} />
                  ) : null}
                  <AvatarFallback className={
                    result.type === 'contestant' ? 'bg-blue-100 text-blue-700' :
                    result.type === 'contingent' ? 'bg-green-100 text-green-700' :
                    result.type === 'team' ? 'bg-purple-100 text-purple-700' :
                    result.type === 'school' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-700'
                  }>
                    {
                    result.type === 'contestant' ? 'CO' :
                    result.type === 'contingent' ? 'CT' :
                    result.type === 'team' ? 'TM' :
                    result.type === 'school' ? 'SC' : 'UN'
                  }
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-foreground">{result.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {
                    result.type === 'contestant' ? 'Contestant' :
                    result.type === 'contingent' ? 'Contingent' :
                    result.type === 'team' ? 'Team' :
                    result.type === 'school' ? 'School' : 'Unknown'
                  }
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
      ))}
    </div>
  );
}

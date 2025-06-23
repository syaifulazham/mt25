"use client";

import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { XIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
export const dynamic = 'force-dynamic';

// Theme type definition
type Theme = {
  id: string | number;
  name: string;
  description: string | null;
  iconUrl?: string;
  logoPath?: string | null;
  color?: string | null;
  isActive?: boolean;
};

type Contest = {
  id: string | number;
  name: string;
  code?: string;
  description: string;
  contestType: string;
  participation_mode: string;
  theme?: {
    id: string | number;
    name: string;
    color?: string | null;
    logoPath?: string | null;
  };
  targetgroups: {
    id: string | number;
    name: string;
    minAge?: number;
    maxAge?: number;
    schoolLevel: string;
    ageGroup?: string;
    code?: string;
  }[];
};

// Placeholder themes (will be replaced with real data fetched client-side)
const placeholderThemes: Theme[] = [
  {
    id: '1',
    name: 'Robotics',
    description: 'Build and program robots to solve real-world challenges',
    iconUrl: '/icons/robotics.png',
    isActive: true
  },
  {
    id: '2',
    name: 'Coding',
    description: 'Develop applications and solve complex programming problems',
    iconUrl: '/icons/coding.png',
    isActive: true
  },
  {
    id: '3',
    name: 'AI & Machine Learning',
    description: 'Create intelligent systems that learn and adapt',
    iconUrl: '/icons/ai.png',
    isActive: true
  }
];

async function getThemes() {
  try {
    // Use the public themes endpoint (no auth required)
    const response = await fetch('/api/public/themes');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching themes:", error);
    return [];
  }
}

async function getContestsByTheme(themeId: string | number) {
  try {
    // Public endpoint for contests by theme - no auth required
    const response = await fetch(`/api/public/contests?themeId=${themeId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const contests = await response.json();
    console.log('Raw contest data from API:', contests);
    
    // Make sure the API response is correctly structured
    return contests;
  } catch (error) {
    console.error("Error fetching contests:", error);
    return [];
  }
}

export default function ThemesSection() {
  const { t } = useLanguage();
  const [themes, setThemes] = useState<Theme[]>(placeholderThemes);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [themeContests, setThemeContests] = useState<Contest[]>([]);
  
  // Helper function to log data for debugging
  const logContestData = (data: Contest[]) => {
    console.log('Contest data loaded:', data);
    if (data.length > 0) {
      //console.log('First contest target group:', data[0].targetgroup);
    }
  };
  const [isLoadingContests, setIsLoadingContests] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string | number, boolean>>({});
  
  // Fetch themes on component mount
  useEffect(() => {
    async function fetchThemes() {
      try {
        const data = await getThemes();
        setThemes(data);
      } catch (error) {
        console.error('Error fetching themes:', error);
      }
    }
    
    fetchThemes();
  }, []);
  
  // Handle opening the modal with contests for a specific theme
  async function handleViewCompetitions(theme: Theme) {
    setSelectedTheme(theme);
    setIsModalOpen(true);
    setIsLoadingContests(true);
    
    try {
      const contestData = await getContestsByTheme(theme.id);
      logContestData(contestData); // Log data for debugging
      setThemeContests(contestData);
    } catch (error) {
      console.error("Error loading contests:", error);
      setThemeContests([]);
    } finally {
      setIsLoadingContests(false);
    }
  };
  
  // Close the modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTheme(null);
    setExpandedDescriptions({});
  };

  // Toggle description expansion
  const toggleDescription = (contestId: string | number) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [contestId]: !prev[contestId]
    }));
  };

  return (
    <section className="py-16 bg-black bg-opacity-20">
      <div className="container mx-auto px-6">
       
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-red-500 to-blue-500">
          {t('themes.title')}
          </span>
        </h2>
        <p className="text-center text-gray-300 mb-12 max-w-3xl mx-auto">
          {t('themes.description')}
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {themes.length > 0 ? (
            themes.map((theme: Theme) => (
              <div 
                key={theme.id} 
                className="bg-gradient-to-br from-gray-900 to-indigo-900 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 flex flex-col"
              >
                <div className="h-40 bg-gradient-to-r from-blue-600 to-indigo-800 relative flex items-center justify-center p-4">
                  {theme.logoPath ? (
                    <Image 
                      src={theme.logoPath} 
                      alt={theme.name} 
                      width={120} 
                      height={120} 
                      className="object-contain max-h-32"
                    />
                  ) : (
                    <div 
                      className="w-24 h-24 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-3xl font-bold"
                      style={{ backgroundColor: theme.color || '#4338ca' }}
                    >
                      {theme.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="p-6 flex-grow">
                  <h3 className="text-xl font-bold mb-2">{theme.name}</h3>
                  <p className="text-gray-300 text-sm">
                    {theme.description || `Competitions related to ${theme.name} technologies and innovations.`}
                  </p>
                </div>
                <div className="px-6 pb-4">
                  <button 
                    onClick={() => handleViewCompetitions(theme)}
                    className="w-full py-2 rounded-md bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all text-sm font-medium"
                  >
                    View Competitions
                  </button>
                </div>
              </div>
            ))
          ) : (
            // Placeholder cards when no themes are available
            Array.from({ length: 4 }).map((_, index) => (
              <div 
                key={index} 
                className="bg-gradient-to-br from-gray-900 to-indigo-900 rounded-xl overflow-hidden shadow-lg flex flex-col"
              >
                <div className="h-40 bg-gradient-to-r from-blue-600 to-indigo-800 relative flex items-center justify-center p-4">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-3xl font-bold">
                    T
                  </div>
                </div>
                <div className="p-6 flex-grow">
                  <h3 className="text-xl font-bold mb-2">Technology Theme</h3>
                  <p className="text-gray-300 text-sm">
                    Exciting competitions related to cutting-edge technologies and innovations.
                  </p>
                </div>
                <div className="px-6 pb-4">
                  <button 
                    className="w-full py-2 rounded-md bg-gradient-to-r from-blue-500 to-indigo-600 opacity-70 cursor-not-allowed text-sm font-medium"
                    disabled
                  >
                    View Competitions
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Competitions Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto bg-gradient-to-br from-gray-900 to-indigo-900 text-white border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center">
              {selectedTheme?.logoPath && (
                <div className="mr-3 w-6 h-6 relative">
                  <Image 
                    src={selectedTheme.logoPath} 
                    alt="" 
                    width={24} 
                    height={24} 
                    className="object-contain min-w-8 min-h-8 mr-6"
                  />
                </div>
              )}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-red-500 to-blue-500 pl-6">
                {selectedTheme?.name} Competitions
              </span>
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Browse all competitions related to {selectedTheme?.name} theme.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-2">
            {isLoadingContests ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : themeContests.length > 0 ? (
              <div className="space-y-4">
                {themeContests.map((contest) => {
                  // More detailed debug output for understanding the data structure
                  console.log(`Contest ${contest.id}:`, {
                    id: contest.id,
                    name: contest.name,
                    targetgroups: contest.targetgroups
                  });
                  
                  return (
                    <div 
                      key={contest.id} 
                      className="bg-black bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-lg">
                          {contest.code ? `${contest.code} - ${contest.name}` : contest.name}
                        </h3>
                      </div>
                      <div className="text-gray-300 text-sm mb-3">
                        <p className={expandedDescriptions[contest.id] ? '' : 'line-clamp-2'}>
                          {contest.description}
                        </p>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDescription(contest.id);
                          }}
                          className="text-blue-400 hover:text-blue-300 text-xs mt-1 font-medium focus:outline-none transition-colors"
                        >
                          {expandedDescriptions[contest.id] ? 'Read Less' : 'Read More'}
                        </button>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center">
                          <span className="text-xs text-gray-400">
                            {contest.participation_mode === "INDIVIDUAL" ? "Individual" : "Team"} participation
                          </span>
                        </div>
                        
                        {/* School Level Information */}
                        {contest.targetgroups && contest.targetgroups.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {/* School Level Badge */}
                            <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-900/50 text-indigo-300">
                              <span className="font-medium">Level:</span> {contest.targetgroups[0].schoolLevel}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
                    <XIcon className="h-8 w-8 text-gray-400" />
                  </div>
                </div>
                <h3 className="text-xl font-medium mb-2">No competitions found</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  There are currently no competitions available for the {selectedTheme?.name} theme. Please check back later.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              onClick={handleCloseModal} 
              variant="outline" 
              className="w-full bg-transparent border-gray-700 text-white hover:bg-gray-800"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { 
  ArrowLeft, Download, FileText, BarChart as BarChartIcon, 
  PieChart as PieChartIcon
} from 'lucide-react';

// Color palette for charts
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', 
  '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1',
  '#a4de6c', '#d0ed57', '#ff7c43', '#665191'
];

interface SurveyResultsViewProps {
  survey: any;
  onBack: () => void;
}

export function SurveyResultsView({ survey, onBack }: SurveyResultsViewProps) {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Define filter types
  type FilterTypes = 'gender' | 'age' | 'education' | 'state';
  
  // Define filter state structure including answer filters
  type FiltersState = {
    gender: string[];
    age: string[];
    education: string[];
    state: string[];
    answers: Record<string, string>; // For answer filters like {'q1': 'Yes'}
  };
  
  // Initialize filter state
  const [filters, setFilters] = useState<FiltersState>({
    gender: [],
    age: [],
    education: [],
    state: [],
    answers: {}
  });

  // Helper function to determine age group from age
  const getAgeGroupFromValue = (age: number): string => {
    if (age < 13) return 'Under 13';
    if (age < 18) return '13-17';
    if (age < 25) return '18-24';
    if (age < 35) return '25-34';
    if (age < 45) return '35-44';
    if (age < 55) return '45-54';
    if (age < 65) return '55-64';
    return '65+';
  };
  
  // Fetch survey results
  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/survey/${survey.id}/results`);
        if (!response.ok) {
          throw new Error(`Failed to fetch results: ${response.status}`);
        }
        
        const data = await response.json();
        setResults(data);
        console.log('Survey results:', data);
      } catch (err) {
        console.error('Error fetching survey results:', err);
        setError(`Failed to load survey results: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };
    
    if (survey?.id) {
      fetchResults();
    }
  }, [survey?.id]);
  
  // Handle CSV download
  const handleDownloadCSV = async () => {
    try {
      const response = await fetch(`/api/survey/${survey.id}/results?format=csv`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate CSV: ${response.status}`);
      }
      
      const csvContent = await response.text();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `survey_${survey.id}_results.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading CSV:', err);
      alert('Failed to download CSV. Please try again.');
    }
  };

  // Function to filter data based on all active filters
  const getFilteredData = () => {
    // If no filters are active, return all data
    if (!Object.values(filters).some((value) => 
      Array.isArray(value) ? value.length > 0 : Object.keys(value || {}).length > 0
    )) {
      return results?.rawData || [];
    }
    
    // Apply all active filters
    return (results?.rawData || []).filter((respondent: any) => {
      // Check demographic filters
      if (filters.gender.length > 0 && !filters.gender.includes(respondent.gender)) {
        return false;
      }
      
      // Age filtering - convert numeric age to age group
      if (filters.age.length > 0) {
        const ageGroup = getAgeGroupFromValue(Number(respondent.age));
        if (!filters.age.includes(ageGroup)) {
          return false;
        }
      }
      
      if (filters.education.length > 0 && !filters.education.includes(respondent.edu_level)) {
        return false;
      }
      
      if (filters.state.length > 0 && !filters.state.includes(respondent.state)) {
        return false;
      }
      
      // Check answer filters
      for (const [qKey, answerValue] of Object.entries(filters.answers)) {
        const respondentAnswer = respondent[qKey];
        
        // For multiple choice, check if the answer contains the filter value
        if (typeof respondentAnswer === 'string' && respondentAnswer.includes(',')) {
          if (!respondentAnswer.includes(answerValue)) {
            return false;
          }
        } 
        // For single choice, exact match
        else if (respondentAnswer !== answerValue) {
          return false;
        }
      }
      
      return true;
    });
  };
  // Process filtered data to get counts for demographic charts
  const getFilteredDemographics = () => {
    const filteredData = getFilteredData();
    const counts = {
      gender: {} as Record<string, number>,
      age: {} as Record<string, number>,
      education: {} as Record<string, number>,
      state: {} as Record<string, number>
    };
    
    filteredData.forEach((r: any) => {
      // Track gender
      const gender = r.gender || 'Unknown';
      counts.gender[gender] = (counts.gender[gender] || 0) + 1;
      
      // Track age groups
      const ageGroup = getAgeGroupFromValue(Number(r.age));
      counts.age[ageGroup] = (counts.age[ageGroup] || 0) + 1;
      
      // Track education
      const eduLevel = r.edu_level || 'Unknown';
      counts.education[eduLevel] = (counts.education[eduLevel] || 0) + 1;
      
      // Track state
      const state = r.state || 'Unknown';
      counts.state[state] = (counts.state[state] || 0) + 1;
    });
    
    return counts;
  };

  // Get filtered data and demographics
  const filteredResponses = getFilteredData();
  const filteredDemographics = getFilteredDemographics();
  const filteredRespondentCount = new Set(filteredResponses.map((r: any) => r.contestantId)).size;
  
  // Create chart data from filtered demographics
  const genderData = Object.entries(filteredDemographics.gender).map(([name, value], index) => ({
    name,
    value: value as number,
    fill: COLORS[index % COLORS.length]
  }));
  
  const ageData = Object.entries(filteredDemographics.age).map(([name, value], index) => ({
    name,
    value: value as number,
    fill: COLORS[index % COLORS.length]
  })).sort((a, b) => {
    // Sort age groups logically
    const ageOrder: Record<string, number> = {
      'Under 13': 0, '13-17': 1, '18-24': 2, '25-34': 3,
      '35-44': 4, '45-54': 5, '55-64': 6, '65+': 7
    };
    return (ageOrder[a.name] || 999) - (ageOrder[b.name] || 999);
  });
  
  const educationData = Object.entries(filteredDemographics.education).map(([name, value], index) => ({
    name,
    value: value as number,
    fill: COLORS[index % COLORS.length]
  }));
  
  const stateData = Object.entries(filteredDemographics.state).map(([name, value], index) => ({
    name,
    value: value as number,
    fill: COLORS[index % COLORS.length]
  }));
  
  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center">
          <Button variant="ghost" onClick={onBack} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h2 className="text-2xl font-bold">Survey Results</h2>
        </div>
        
        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" onClick={onBack} className="w-fit">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col gap-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="ml-1">Back</span>
          </Button>
          <h2 className="text-2xl font-bold">{survey.name} Results</h2>
        </div>
        
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={handleDownloadCSV}
        >
          <Download className="h-4 w-4" />
          <span>Download Raw Data (CSV)</span>
        </Button>
      </div>
      
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Respondents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{results?.totalRespondents || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{survey.questions.length}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main content */}
      <Tabs value="demographics" className="mt-6">
        <TabsList>
          <TabsTrigger value="demographics">Demographics & Survey Results</TabsTrigger>
        </TabsList>
        
        {/* Demographics tab */}
        <TabsContent value="demographics" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Total Respondents Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Total Respondents</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {Object.values(filters).some((value) => 
                  Array.isArray(value) ? value.length > 0 : Object.keys(value || {}).length > 0
                ) ? (
                  <>
                    <div className="flex items-end gap-2">
                      <div className="text-4xl font-bold">{filteredRespondentCount}</div>
                      <div className="text-muted-foreground mb-1">of {results?.totalRespondents || 0}</div>
                    </div>
                    <p className="text-muted-foreground text-sm mt-2">
                      Showing filtered data based on selected demographics.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-4xl font-bold">{results?.totalRespondents || 0}</div>
                    <p className="text-muted-foreground text-sm mt-2">
                      Showing data from all survey participants.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Active Filters Display */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Active Filters</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {/* Show demographic filters */}
                  {Object.entries(filters)
                    .filter(([type]) => type !== 'answers')
                    .flatMap(([type, values]) =>
                      Array.isArray(values) ? values.map((value, i) => (
                        <div key={`${type}-${i}`} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center">
                          {type}: {value}
                          <button 
                            onClick={() => {
                              setFilters(prev => {
                                const typedKey = type as FilterTypes;
                                return {
                                  ...prev,
                                  [typedKey]: prev[typedKey].filter((v: string) => v !== value)
                                };
                              });
                            }}
                            className="ml-1 hover:bg-blue-200 rounded-full w-4 h-4 inline-flex items-center justify-center"
                          >
                            ×
                          </button>
                        </div>
                      )) : []
                    )}

                  {/* Show answer filters */}
                  {Object.entries(filters.answers || {}).map(([qKey, value]) => {
                    // Find the question by ID to show a better label
                    const questionId = qKey.replace('q', '');
                    const question = results?.questions?.find((q: any) => q.questionId === Number(questionId));
                    return (
                      <div key={qKey} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs flex items-center">
                        Q{questionId}: {value}
                        <button 
                          onClick={() => {
                            setFilters(prev => {
                              const newAnswers = { ...prev.answers };
                              delete newAnswers[qKey];
                              return { ...prev, answers: newAnswers };
                            });
                          }}
                          className="ml-1 hover:bg-green-200 rounded-full w-4 h-4 inline-flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}

                  {/* Show message when no filters are active */}
                  {!Object.values(filters).some((arr: any) => 
                    Array.isArray(arr) ? arr.length > 0 : Object.keys(arr || {}).length > 0
                  ) && (
                    <p className="text-muted-foreground text-sm">No active filters. Click on chart elements or survey results to filter data.</p>
                  )}
                </div>
                
                {/* Show clear all filters button when any filters are active */}
                {Object.values(filters).some((arr: any) => 
                  Array.isArray(arr) ? arr.length > 0 : Object.keys(arr || {}).length > 0
                ) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setFilters({gender: [], age: [], education: [], state: [], answers: {}})} 
                    className="mt-2"
                  >
                    Clear All Filters
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Gender distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
                <CardDescription>Click on segments to filter data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        onClick={(data) => {
                          setFilters(prev => {
                            const newGenders = prev.gender.includes(data.name) 
                              ? prev.gender.filter(g => g !== data.name)
                              : [...prev.gender, data.name];
                            return { ...prev, gender: newGenders };
                          });
                        }}
                      >
                        {genderData.map((entry, index) => (
                          <Cell 
                            key={`gender-cell-${index}`} 
                            fill={entry.fill} 
                            opacity={filters.gender.length === 0 || filters.gender.includes(entry.name) ? 1 : 0.3}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => [`${value} respondents`, 'Count']} />
                      <Legend 
                        onClick={(data) => {
                          setFilters(prev => {
                            const newGenders = prev.gender.includes(data.value) 
                              ? prev.gender.filter(g => g !== data.value)
                              : [...prev.gender, data.value];
                            return { ...prev, gender: newGenders };
                          });
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Age distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Age Distribution</CardTitle>
                <CardDescription>Click on bars to filter data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={ageData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip formatter={(value) => [`${value} respondents`, 'Count']} />
                      <Legend />
                      <Bar 
                        dataKey="value" 
                        name="Count" 
                        onClick={(data) => {
                          setFilters(prev => {
                            const newAges = prev.age.includes(data.name) 
                              ? prev.age.filter(a => a !== data.name)
                              : [...prev.age, data.name];
                            return { ...prev, age: newAges };
                          });
                        }}
                      >
                        {ageData.map((entry, index) => (
                          <Cell 
                            key={`age-cell-${index}`} 
                            fill={entry.fill} 
                            opacity={filters.age.length === 0 || filters.age.includes(entry.name) ? 1 : 0.3}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* State distribution */}
            <Card>
              <CardHeader>
                <CardTitle>State Distribution</CardTitle>
                <CardDescription>Click on bars to filter data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stateData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={80} 
                        tick={{ fontSize: 12 }}
                      />
                      <RechartsTooltip formatter={(value) => [`${value} respondents`, 'Count']} />
                      <Legend />
                      <Bar 
                        dataKey="value" 
                        name="Respondents"
                        onClick={(data) => {
                          setFilters(prev => {
                            const newStates = prev.state.includes(data.name) 
                              ? prev.state.filter(s => s !== data.name)
                              : [...prev.state, data.name];
                            return { ...prev, state: newStates };
                          });
                        }}
                      >
                        {stateData.map((entry, index) => (
                          <Cell 
                            key={`state-cell-${index}`} 
                            fill={entry.fill}
                            opacity={filters.state.length === 0 || filters.state.includes(entry.name) ? 1 : 0.3}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Education level */}
            <Card>
              <CardHeader>
                <CardTitle>Education Level</CardTitle>
                <CardDescription>Click on segments to filter data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={educationData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => 
                          `${name.length > 15 ? name.substring(0, 15) + '...' : name}: ${(percent * 100).toFixed(0)}%`
                        }
                        onClick={(data) => {
                          setFilters(prev => {
                            const newEducation = prev.education.includes(data.name) 
                              ? prev.education.filter(e => e !== data.name)
                              : [...prev.education, data.name];
                            return { ...prev, education: newEducation };
                          });
                        }}
                      >
                        {educationData.map((entry, index) => (
                          <Cell 
                            key={`education-cell-${index}`} 
                            fill={entry.fill}
                            opacity={filters.education.length === 0 || filters.education.includes(entry.name) ? 1 : 0.3}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => [`${value} respondents`, 'Count']} />
                      <Legend 
                        onClick={(data) => {
                          setFilters(prev => {
                            const newEducation = prev.education.includes(data.value) 
                              ? prev.education.filter(e => e !== data.value)
                              : [...prev.education, data.value];
                            return { ...prev, education: newEducation };
                          });
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Question Results Section */}
            <div className="col-span-1 md:col-span-2 mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Survey Results</h3>
                <div className="text-sm text-muted-foreground">
                  {Object.values(filters).some((value) => 
                    Array.isArray(value) ? value.length > 0 : Object.keys(value || {}).length > 0
                  ) ? 
                    `Showing data for ${filteredRespondentCount} respondents based on active filters` : 
                    `Showing data for all ${results?.totalRespondents || 0} respondents`}
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                {results?.questions?.map((question: any) => {
                  // Get question key (q1, q2, q3, etc.)
                  const qKey = `q${question.questionId}`;
                  
                  // Extract answers for this question from filtered respondents
                  const answers = filteredResponses
                    .filter((r: any) => r[qKey] !== undefined)
                    .map((r: any) => r[qKey]);
                    
                  const answerDistribution: Record<string, number> = {};
                  
                  // Build distribution based on question type
                  if (question.type === 'multiple_choice') {
                    // Handle multiple choice answers (comma-separated)
                    answers.forEach((answer: string) => {
                      if (typeof answer === 'string') {
                        const choices = answer.split(',').map((c: string) => c.trim());
                        choices.forEach((choice: string) => {
                          answerDistribution[choice] = (answerDistribution[choice] || 0) + 1;
                        });
                      }
                    });
                  } else {
                    // Handle single choice or text answers
                    answers.forEach((answer: string) => {
                      const processedAnswer = String(answer);
                      answerDistribution[processedAnswer] = (answerDistribution[processedAnswer] || 0) + 1;
                    });
                  }
                  
                  // Format chart data
                  const chartData = Object.entries(answerDistribution)
                    .filter(([_, value]) => Number(value) > 0)
                    .map(([name, value], index) => ({
                      name: name.length > 40 ? `${name.substring(0, 40)}...` : name, // Truncate long names
                      value: Number(value),
                      fill: COLORS[index % COLORS.length]
                    }))
                    .sort((a, b) => b.value - a.value); // Sort by count descending
                    
                  return (
                    <Card key={question.questionId}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center">
                            {question.type === 'single_choice' ? (
                              <PieChartIcon className="h-4 w-4" />
                            ) : question.type === 'multiple_choice' ? (
                              <BarChartIcon className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-base">{question.question}</CardTitle>
                            <CardDescription>
                              {question.type === 'text' ? 'Text Responses' : 
                              question.type === 'single_choice' ? 'Single Choice' : 
                              'Multiple Choice'} • {answers.length} responses
                              {Object.values(filters).some((value) => 
                                Array.isArray(value) ? value.length > 0 : Object.keys(value || {}).length > 0
                              ) && 
                              ` of ${question.responseCount} total`}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          {question.type !== 'text' ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={chartData}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis 
                                  dataKey="name" 
                                  type="category" 
                                  width={120}
                                  tick={{ fontSize: 12 }}
                                />
                                <RechartsTooltip 
                                  formatter={(value) => [
                                    `${value} ${Number(value) === 1 ? 'response' : 'responses'}`,
                                    ''
                                  ]} 
                                />
                                <Bar 
                                  dataKey="value" 
                                  name="Responses"
                                  onClick={(data) => {
                                    // Update the filters state with answer filter
                                    setFilters(prevFilters => {
                                      // Create a copy of the current answer filters
                                      const currentAnswers = { ...prevFilters.answers };
                                      
                                      // Toggle the filter for this answer
                                      if (currentAnswers[qKey] === data.name) {
                                        // If already filtered by this answer, remove it
                                        delete currentAnswers[qKey];
                                      } else {
                                        // Otherwise add/update the filter
                                        currentAnswers[qKey] = data.name;
                                      }
                                      
                                      // Return updated filters
                                      return {
                                        ...prevFilters,
                                        answers: currentAnswers
                                      };
                                    });
                                  }}
                                >
                                  {chartData.map((entry, index) => {
                                    // Check if this bar should be highlighted based on active filters
                                    const isHighlighted = filters.answers[qKey] === entry.name;
                                    
                                    return (
                                      <Cell 
                                        key={`${question.questionId}-${index}`} 
                                        fill={entry.fill}
                                        opacity={filters.answers && Object.keys(filters.answers).length > 0 ? 
                                          (isHighlighted ? 1 : 0.3) : 1}
                                      />
                                    );
                                  })}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <p className="text-muted-foreground">
                                Text responses cannot be visualized. Download the CSV to view full text responses.
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

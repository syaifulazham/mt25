'use client';

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Mars, Venus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Chart colors for gender representation
const GENDER_COLORS = {
  MALE: 'bg-blue-500',   // Blue for male
  FEMALE: 'bg-pink-500', // Pink for female
  TOTAL: 'bg-gray-200'   // Background for total
};

// Function to abbreviate long state names for better display
const formatStateName = (stateName: string): string => {
  if (!stateName) return stateName;
  
  const upperStateName = stateName.toUpperCase();
  
  if (upperStateName.includes('NEGERI SEMBILAN')) return 'N9';
  if (upperStateName.includes('PULAU PINANG')) return 'P. PINANG';
  if (upperStateName.includes('WILAYAH PERSEKUTUAN KUALA LUMPUR')) return 'WP KL';
  if (upperStateName.includes('WILAYAH PERSEKUTUAN')) {
    return `WP ${upperStateName.replace('WILAYAH PERSEKUTUAN', '').trim()}`;
  }
  if (upperStateName.includes('KUALA LUMPUR')) return 'KL';
  
  return stateName;
};

// Custom label styling props for state names
const STATE_NAME_STYLE = {
  fontSize: 10, // Smaller font size for state names
  textAnchor: 'end' as const,
  fill: '#6b7280' // Using a slightly muted color for better readability
};

// Format numbers with commas
const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    useGrouping: true
  }).format(value);
};

type ParticipationStateData = {
  state: string;
  MALE: number;
  FEMALE: number;
  TOTAL?: number;
};

// Mode for percentage calculation
type PercentageMode = 'per-state' | 'overall';

export default function ParticipationStateChart({ data: rawData }: { data: ParticipationStateData[] }) {
  // State for toggle between percentage modes
  const [percentageMode, setPercentageMode] = useState<PercentageMode>('per-state');
  
  // State for bar length mode (100% vs total count)
  const [barLengthMode, setBarLengthMode] = useState<'percentage' | 'total'>('percentage');
  
  // Calculate totals for each state and add them to the data
  const data = rawData.map(item => ({
    ...item,
    TOTAL: item.MALE + item.FEMALE
  }));
  
  // Sort data by total count in descending order
  const sortedData = [...data].sort((a, b) => b.TOTAL - a.TOTAL);
  
  // Calculate grand total across all states
  const grandTotal = sortedData.reduce((sum, item) => sum + item.TOTAL, 0);
  
  // Find the maximum count to calculate percentages
  const maxCount = Math.max(...sortedData.map(item => item.TOTAL), 1); // Ensure at least 1
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contest Participations by State and Gender</CardTitle>
        <CardDescription>Distribution of contest participations by gender across states</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="per-state" className="mb-4" onValueChange={(value) => setPercentageMode(value as PercentageMode)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="per-state">Per State Distribution</TabsTrigger>
            <TabsTrigger value="overall">Overall Distribution</TabsTrigger>
          </TabsList>
          {percentageMode === 'per-state' && (
            <div className="flex items-center space-x-2 mt-4 mb-2">
              <Switch 
                id="bar-length-mode" 
                checked={barLengthMode === 'total'}
                onCheckedChange={(checked) => setBarLengthMode(checked ? 'total' : 'percentage')}
              />
              <Label htmlFor="bar-length-mode" className="text-xs">
                {barLengthMode === 'percentage' ? 'Show all bars at 100%' : 'Scale bars by state total'}
              </Label>
            </div>
          )}
        </Tabs>
        <div className="w-full">
          <div className="space-y-3">
            <div className="flex items-center mb-2 text-xs">
              <div className="w-1/2">State</div>
              <div className="w-1/2 flex">
                <div className="flex items-center mr-3">
                  <div className="w-3 h-3 mr-1 rounded-sm bg-blue-500"></div>
                  <span className="flex items-center"><Mars className="h-3 w-3 mr-1" /> Male</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-1 rounded-sm bg-pink-500"></div>
                  <span className="flex items-center"><Venus className="h-3 w-3 mr-1" /> Female</span>
                </div>
              </div>
            </div>
            
            {sortedData.map((item, index) => {
              // Calculate percentages based on selected mode
              const totalWidthPercentage = Math.round((item.TOTAL / maxCount) * 100);
              
              // Per-state percentages (male/female within each state)
              const malePerStatePercentage = Math.round((item.MALE / item.TOTAL) * 100);
              const femalePerStatePercentage = 100 - malePerStatePercentage;
              
              // Overall percentages (relative to grand total)
              const maleOverallPercentage = Math.round((item.MALE / grandTotal) * 100);
              const femaleOverallPercentage = Math.round((item.FEMALE / grandTotal) * 100);
              
              // Choose which percentages to display based on mode
              const malePercentage = percentageMode === 'per-state' ? malePerStatePercentage : maleOverallPercentage;
              const femalePercentage = percentageMode === 'per-state' ? femalePerStatePercentage : femaleOverallPercentage;
              
              // For stacked bar widths (visual representation)
              const maleWidthPercentage = percentageMode === 'per-state' 
                ? malePerStatePercentage 
                : Math.round((item.MALE / item.TOTAL) * 100);
                
              const femaleWidthPercentage = percentageMode === 'per-state'
                ? femalePerStatePercentage
                : Math.round((item.FEMALE / item.TOTAL) * 100);
              
              const shortState = formatStateName(item.state);
              
              return (
                <div key={index} className="relative">
                  <div className="flex items-center mb-1">
                    <div className="w-1/2 flex items-center">
                      <div className="mr-2 p-1 rounded-full bg-muted">
                        <MapPin className="h-3 w-3" />
                      </div>
                      <span className="text-xs font-medium truncate" title={item.state}>{shortState}</span>
                    </div>
                    <div className="w-1/2 flex justify-end items-center space-x-2">
                      <span className="text-xs text-muted-foreground">
                        {percentageMode === 'overall' ? 
                          `${malePercentage + femalePercentage}% of total` : 
                          `${formatNumber(item.TOTAL)} total`}
                      </span>
                    </div>
                  </div>
                  
                  {/* Total bar background */}
                  <TooltipProvider>
                    <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
                      {/* Stacked bar container with fixed width based on total percentage */}
                      <div 
                        className={`h-full flex ${GENDER_COLORS.TOTAL}`} 
                        style={{ 
                          width: percentageMode === 'overall' 
                            ? `${malePercentage + femalePercentage}%`
                            : (barLengthMode === 'percentage' || percentageMode !== 'per-state') 
                              ? '100%' 
                              : `${Math.max(Math.round((item.TOTAL / maxCount) * 100), 15)}%`
                        }}
                      >
                        {/* Male portion */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div 
                              className={`h-full ${GENDER_COLORS.MALE} flex items-center justify-center text-[10px] text-white overflow-hidden`}
                              style={{ width: `${maleWidthPercentage}%` }}
                            >
                              {malePercentage > 15 ? `${malePercentage}%` : ''}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>Male: {formatNumber(item.MALE)} ({malePercentage}%)</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        {/* Female portion */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div 
                              className={`h-full ${GENDER_COLORS.FEMALE} flex items-center justify-center text-[10px] text-white overflow-hidden`}
                              style={{ width: `${femaleWidthPercentage}%` }}
                            >
                              {femalePercentage > 15 ? `${femalePercentage}%` : ''}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>Female: {formatNumber(item.FEMALE)} ({femalePercentage}%)</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </TooltipProvider>
                  
                  {/* Show percentages outside bar if they couldn't fit inside */}
                  <div className="flex text-[9px] mt-0.5">
                    <div className="flex-1">
                      {malePercentage > 0 && malePercentage <= 15 ? 
                        <span className="text-blue-600 font-medium">{malePercentage}%</span> : null}
                    </div>
                    <div className="flex-1 text-right">
                      {femalePercentage > 0 && femalePercentage <= 15 ? 
                        <span className="text-pink-600 font-medium">{femalePercentage}%</span> : null}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {sortedData.length === 0 && (
              <div className="text-sm text-muted-foreground py-2 text-center">
                No data available
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

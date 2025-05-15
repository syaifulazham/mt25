'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Mars, Venus } from "lucide-react";

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

export default function ParticipationStateChart({ data: rawData }: { data: ParticipationStateData[] }) {
  // Calculate totals for each state and add them to the data
  const data = rawData.map(item => ({
    ...item,
    TOTAL: item.MALE + item.FEMALE
  }));
  
  // Sort data by total count in descending order
  const sortedData = [...data].sort((a, b) => b.TOTAL - a.TOTAL);
  
  // Find the maximum count to calculate percentages
  const maxCount = Math.max(...sortedData.map(item => item.TOTAL), 1); // Ensure at least 1
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contest Participations by State and Gender</CardTitle>
        <CardDescription>Distribution of contest participations by gender across states</CardDescription>
      </CardHeader>
      <CardContent>
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
              // Calculate percentage widths for the male and female bars
              const totalPercentage = Math.round((item.TOTAL / maxCount) * 100);
              const malePercentage = Math.round((item.MALE / item.TOTAL) * 100);
              const femalePercentage = 100 - malePercentage; // Ensure they add up to 100%
              
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
                    <div className="w-1/2 flex justify-end">
                      <span className="text-xs font-semibold">{formatNumber(item.TOTAL)}</span>
                    </div>
                  </div>
                  
                  {/* Total bar background */}
                  <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
                    {/* Stacked bar container with fixed width based on total percentage */}
                    <div className={`h-full flex ${GENDER_COLORS.TOTAL}`} style={{ width: `${totalPercentage}%` }}>
                      {/* Male portion */}
                      <div 
                        className={`h-full ${GENDER_COLORS.MALE} flex items-center justify-center text-[10px] text-white overflow-hidden`}
                        style={{ width: `${malePercentage}%` }}
                      >
                        {item.MALE > 0 && malePercentage > 15 ? formatNumber(item.MALE) : ''}
                      </div>
                      {/* Female portion */}
                      <div 
                        className={`h-full ${GENDER_COLORS.FEMALE} flex items-center justify-center text-[10px] text-white overflow-hidden`}
                        style={{ width: `${femalePercentage}%` }}
                      >
                        {item.FEMALE > 0 && femalePercentage > 15 ? formatNumber(item.FEMALE) : ''}
                      </div>
                    </div>
                  </div>
                  
                  {/* Show values outside bar if they couldn't fit inside */}
                  <div className="flex text-[9px] mt-0.5">
                    <div className="flex-1">
                      {item.MALE > 0 && malePercentage <= 15 ? 
                        <span className="text-blue-600 font-medium">{formatNumber(item.MALE)}</span> : null}
                    </div>
                    <div className="flex-1 text-right">
                      {item.FEMALE > 0 && femalePercentage <= 15 ? 
                        <span className="text-pink-600 font-medium">{formatNumber(item.FEMALE)}</span> : null}
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

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Building } from "lucide-react";

// Format numbers with commas
const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    useGrouping: true
  }).format(value);
};

// Bar color
const BAR_COLOR = 'bg-blue-500';

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

type ContingentStateData = {
  state: string;
  count: number;
}

export default function ContingentStateChart({ data: rawData }: { data: ContingentStateData[] }) {
  // Sort data by count in descending order
  const sortedData = [...rawData].sort((a, b) => b.count - a.count);
  
  // Find the maximum count to calculate percentages
  const maxCount = Math.max(...sortedData.map(item => item.count), 1); // Ensure at least 1
  
  return (
    <div className="w-full h-full">
      <div className="space-y-3">
        {sortedData.map((item, index) => {
          // Calculate percentage width for the bar (max 96% to leave room for the count)
          const percentage = Math.round((item.count / maxCount) * 96);
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
                  <span className="text-xs font-semibold">{formatNumber(item.count)}</span>
                </div>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full ${BAR_COLOR} rounded-full flex items-center justify-center`} 
                  style={{ width: `${percentage}%` }}
                ></div>
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
  );
}

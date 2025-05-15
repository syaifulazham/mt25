'use client';

import { useEffect, useRef } from 'react';
import { School, Building, Home } from 'lucide-react';

// Format numbers with commas
const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    useGrouping: true
  }).format(value);
};

// Type definition for school category data
type SchoolCategoryData = {
  category: string;
  count: number;
}

// Props type
interface SchoolCategoryChartProps {
  data: SchoolCategoryData[];
}

// Mapping for icons
const categoryIcons = {
  'SK': School,
  'SJKC': School,
  'SJKT': School,
  'SMK': Building, 
  'SMJK': Building,
  'SBP': Building,
  'KV': Building,
  'SABK': Building,
  'SMBP': Building,
  'DEFAULT': Home
} as const;

// Mapping for colors
const categoryColors = {
  'SK': 'bg-emerald-500',
  'SJKC': 'bg-blue-500',
  'SJKT': 'bg-indigo-500',
  'SMK': 'bg-amber-500', 
  'SMJK': 'bg-orange-500',
  'SBP': 'bg-pink-500',
  'KV': 'bg-violet-500',
  'SABK': 'bg-teal-500',
  'SMBP': 'bg-red-500',
  'DEFAULT': 'bg-gray-500'
} as const;

export default function SchoolCategoryChart({ data }: SchoolCategoryChartProps) {
  // Find the maximum count to calculate percentages
  const maxCount = Math.max(...data.map(item => item.count), 1); // Ensure at least 1 to avoid division by zero
  
  // Sort data by count in descending order
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  return (
    <div className="w-full">
      <div className="space-y-2">
        {sortedData.map((item, index) => {
          // Calculate percentage width for the bar (max 96% to leave room for the count)
          const percentage = Math.round((item.count / maxCount) * 96);
          
          // Determine the icon for this school category
          const IconComponent = categoryIcons[item.category as keyof typeof categoryIcons] || categoryIcons.DEFAULT;
          
          // Determine bar color based on school category
          const barColor = categoryColors[item.category as keyof typeof categoryColors] || categoryColors.DEFAULT;
          
          return (
            <div key={index} className="relative">
              <div className="flex items-center mb-1">
                <div className="mr-2 p-1 rounded-full bg-muted">
                  <IconComponent className="h-3 w-3" />
                </div>
                <span className="text-xs font-medium">{item.category}</span>
                <span className="ml-auto text-xs font-semibold">{formatNumber(item.count)}</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full ${barColor} rounded-full`} 
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
        
        {data.length === 0 && (
          <div className="text-sm text-muted-foreground py-2 text-center">
            No data available
          </div>
        )}
      </div>
    </div>
  );
}

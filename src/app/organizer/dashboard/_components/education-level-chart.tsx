'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { School, GraduationCap, User } from 'lucide-react';

// Format numbers with commas
const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    useGrouping: true
  }).format(value);
};

// Type definition for education level data
type EducationLevelData = {
  level: string;
  count: number;
}

// Props type
interface EducationLevelChartProps {
  data: EducationLevelData[];
}

// Mapping for icons
const levelIcons = {
  'Sekolah Rendah': School,
  'Sekolah Menengah': GraduationCap,
  'Belia': User,
} as const;

export default function EducationLevelChart({ data }: EducationLevelChartProps) {
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
          
          // Determine the icon for this education level
          const IconComponent = levelIcons[item.level as keyof typeof levelIcons] || School;
          
          // Determine bar color based on education level
          let barColor = "bg-blue-500";
          if (item.level === 'Sekolah Rendah') barColor = "bg-emerald-500";
          if (item.level === 'Sekolah Menengah') barColor = "bg-blue-500";
          if (item.level === 'Belia') barColor = "bg-amber-500";
          
          return (
            <div key={index} className="relative">
              <div className="flex items-center mb-1">
                <div className="mr-2 p-1 rounded-full bg-muted">
                  <IconComponent className="h-3 w-3" />
                </div>
                <span className="text-xs font-medium">{item.level}</span>
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

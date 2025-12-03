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

// Function to normalize school level to display categories
function normalizeToDisplayCategory(schoolLevel: string): string {
  const normalized = schoolLevel?.toLowerCase().trim() || '';
  
  // Primary school variations - Maps to "Kids"
  if (normalized.includes('primary') || 
      normalized.includes('sekolah rendah') ||
      normalized.includes('rendah') ||
      normalized.includes('kids')) {
    return 'Kids';
  }
  
  // Secondary school variations - Maps to "Teens"
  if (normalized.includes('secondary') || 
      normalized.includes('sekolah menengah') ||
      normalized.includes('menengah') ||
      normalized.includes('teens')) {
    return 'Teens';
  }
  
  // University/College/Youth variations - Maps to "Youth"
  if (normalized.includes('university') || 
      normalized.includes('universiti') ||
      normalized.includes('college') || 
      normalized.includes('kolej') ||
      normalized.includes('higher') || 
      normalized.includes('tinggi') ||
      normalized.includes('youth') ||
      normalized.includes('belia')) {
    return 'Youth';
  }
  
  // Default to Youth for unrecognized levels
  return 'Youth';
}

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
  'Kids': School,
  'Teens': GraduationCap,
  'Youth': User,
} as const;

export default function EducationLevelChart({ data }: EducationLevelChartProps) {
  // Aggregate data by normalized categories
  const aggregatedData: Record<string, number> = {};
  
  data.forEach(item => {
    const category = normalizeToDisplayCategory(item.level);
    aggregatedData[category] = (aggregatedData[category] || 0) + item.count;
  });
  
  // Convert to array and sort by count descending
  const sortedData = Object.entries(aggregatedData)
    .map(([level, count]) => ({ level, count }))
    .sort((a, b) => b.count - a.count);
  
  // Find the maximum count to calculate percentages
  const maxCount = Math.max(...sortedData.map(item => item.count), 1);

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
          if (item.level === 'Kids') barColor = "bg-emerald-500";
          if (item.level === 'Teens') barColor = "bg-blue-500";
          if (item.level === 'Youth') barColor = "bg-amber-500";
          
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
        
        {sortedData.length === 0 && (
          <div className="text-sm text-muted-foreground py-2 text-center">
            No data available
          </div>
        )}
      </div>
    </div>
  );
}

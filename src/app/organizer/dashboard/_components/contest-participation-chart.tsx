"use client";

import React from 'react';
import { BookOpen, Award } from "lucide-react";

// Define types for our data
type ContestParticipationChartProps = {
  data: any[];
  educationLevels: string[];
};

// Define custom colors for different school levels
const SCHOOL_LEVEL_COLORS: Record<string, string> = {
  'PRIMARY_SCHOOL': 'bg-blue-500',
  'SECONDARY_SCHOOL': 'bg-green-500', 
  'UNIVERSITY': 'bg-purple-500',
  'COLLEGE': 'bg-orange-500',
  'OTHER': 'bg-gray-500'
};

// Format numbers with commas
const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    useGrouping: true
  }).format(value);
};

// Function to get a user-friendly display name for school levels
function getSchoolLevelDisplayName(normalizedLevel: string): string {
  switch (normalizedLevel) {
    case 'PRIMARY_SCHOOL': return 'Kids';
    case 'SECONDARY_SCHOOL': return 'Teens';
    case 'UNIVERSITY': 
    case 'COLLEGE':
    case 'OTHER':
      return 'Youth';
    default: return 'Youth';
  }
}

// Function to abbreviate long contest names for better display
const formatContestName = (name: string): string => {
  if (!name) return name;
  
  // If contest name is over 25 characters, truncate it
  if (name.length > 25) {
    return name.substring(0, 22) + '...';
  }
  
  return name;
};

export default function ContestParticipationChart({ data, educationLevels }: ContestParticipationChartProps) {
  if (!data || data.length === 0 || !educationLevels || educationLevels.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <p className="text-muted-foreground">No chart data available</p>
      </div>
    );
  }
  
  // Find the maximum total count to calculate percentages
  const maxCount = Math.max(...data.map(item => item.total), 1); // Ensure at least 1
  
  // Get all school levels that have data
  const schoolLevels = Object.keys(data[0] || {}).filter(
    key => key !== 'contestKey' && key !== 'contestName' && key !== 'total'
  );

  return (
    <div className="w-full h-full overflow-auto pr-1 flex flex-wrap gap-4 justify-start">
      {schoolLevels.map((schoolLevel, eduIndex) => {
        // Filter contests with count > 0 for this school_level and sort by count descending
        const contestsWithLevel = data.filter(contest => (contest[schoolLevel] || 0) > 0).sort((a, b) => (b[schoolLevel] || 0) - (a[schoolLevel] || 0));
        if (contestsWithLevel.length === 0) return null;
        return (
          <div key={eduIndex} className="mb-6 p-4 border border-gray-300 rounded-lg shadow-sm bg-white">
            <div className="text-lg font-bold text-blue-600 mb-2">{getSchoolLevelDisplayName(schoolLevel)}</div>
            <div className="space-y-3">
              {contestsWithLevel.map((contest, contestIndex) => {
                const shortName = contest.contestKey.replace(/-/g, ' - '); // Contest code prefixed name
                const count = contest[schoolLevel] || 0;
                const percentage = Math.round((count / maxCount) * 96);
                return (
                  <div key={contestIndex} className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <div className="mr-2 p-1 rounded-full bg-muted">
                          <Award className="h-3 w-3" />
                        </div>
                        <span className="text-xs font-medium truncate" title={contest.contestName}>{shortName}</span>
                      </div>
                      <span className="text-xs font-semibold">{formatNumber(count)}</span>
                    </div>
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${SCHOOL_LEVEL_COLORS[schoolLevel] || 'bg-gray-400'}`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {data.every(contest => schoolLevels.every(level => (contest[level] || 0) === 0)) && (
        <div className="text-sm text-muted-foreground py-2 text-center">
          No data available
        </div>
      )}
      {/* Overall legend */}
      <div className="mt-6 pt-4 border-t border-muted">
        <div className="text-xs font-medium mb-2">Legend</div>
        <div className="flex flex-wrap gap-3">
          {schoolLevels.map((level, idx) => (
            <div key={idx} className="flex items-center">
              <div className={`w-3 h-3 mr-1 rounded-sm ${SCHOOL_LEVEL_COLORS[level] || 'bg-gray-400'}`}></div>
              <span className="text-xs">{getSchoolLevelDisplayName(level)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

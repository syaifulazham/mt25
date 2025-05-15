'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Chart colors for gender representation
const GENDER_COLORS = {
  MALE: '#0088FE',  // Blue for male
  FEMALE: '#FF6B93'  // Pink for female
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
  
  // Calculate grand total
  const grandTotal = {
    state: 'GRAND TOTAL',
    MALE: data.reduce((acc, curr) => acc + curr.MALE, 0),
    FEMALE: data.reduce((acc, curr) => acc + curr.FEMALE, 0),
    TOTAL: data.reduce((acc, curr) => acc + curr.MALE + curr.FEMALE, 0)
  };
  
  // Calculate grand total but don't display it in chart
  // We'll keep it accessible for external use if needed
  const completeData = [...data];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contest Participations by State and Gender</CardTitle>
        <CardDescription>Distribution of contest participations by gender across states</CardDescription>
      </CardHeader>
      <CardContent className="h-[400px]">
        {completeData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={completeData}
              margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
            >
              <XAxis type="number" axisLine={false} tickLine={false} hide />
              <YAxis 
                dataKey="state" 
                type="category" 
                width={80} 
                axisLine={false} 
                tickLine={false}
                tick={STATE_NAME_STYLE}
                tickFormatter={formatStateName}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (typeof value === 'number') {
                    return [`${formatNumber(value)} participations`, name];
                  }
                  return [value, name];
                }} 
                cursor={false} 
              />
              <Legend />
              <Bar dataKey="MALE" stackId="a" fill={GENDER_COLORS.MALE} name="Male">
                <LabelList 
                  dataKey="MALE" 
                  position="inside" 
                  fill="#FFFFFF" 
                  formatter={formatNumber}
                />
              </Bar>
              <Bar dataKey="FEMALE" stackId="a" fill={GENDER_COLORS.FEMALE} name="Female">
                <LabelList 
                  dataKey="FEMALE" 
                  position="inside" 
                  fill="#FFFFFF" 
                  formatter={formatNumber}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

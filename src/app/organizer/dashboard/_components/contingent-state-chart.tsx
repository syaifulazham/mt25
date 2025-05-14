'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, LabelList } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Single chart color
const BAR_COLOR = '#0088FE';

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

export default function ContingentStateChart({ data }: { data: ContingentStateData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contingents by State</CardTitle>
        <CardDescription>Distribution of contingents across Malaysian states</CardDescription>
      </CardHeader>
      <CardContent className="h-[400px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
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
              <Tooltip formatter={(value) => [`${value} contingents`, 'Count']} cursor={false} />
              <Bar dataKey="count" fill={BAR_COLOR}>
                <LabelList dataKey="count" position="right" fill="#000000" />
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

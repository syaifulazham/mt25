'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mars, Venus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Sector } from 'recharts';
import { useState } from "react";

// Gender colors matching the bar chart
const GENDER_COLORS = {
  MALE: '#3b82f6', // Blue for male (bg-blue-500)
  FEMALE: '#ec4899', // Pink for female (bg-pink-500)
};

// Format numbers with commas
const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    useGrouping: true
  }).format(value);
};

type GenderDistributionData = {
  MALE: number;
  FEMALE: number;
};

// Custom active shape for the pie chart
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <text x={cx} y={cy - 8} dy={8} textAnchor="middle" fill="#888" fontSize={12}>
        {payload.name}
      </text>
      <text x={cx} y={cy + 8} dy={8} textAnchor="middle" fill="#333" fontWeight="bold">
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    </g>
  );
};

// Convert raw data to chart format
const prepareChartData = (data: GenderDistributionData) => {
  return [
    { name: 'Male', value: data.MALE },
    { name: 'Female', value: data.FEMALE }
  ];
};

// Custom legend that shows both percentage and count
const renderLegend = (props: any, chartData: any[]) => {
  const { payload } = props;
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <div className="flex justify-center space-x-6 text-sm">
      {payload.map((entry: any, index: number) => {
        const percentage = ((chartData[index].value / total) * 100).toFixed(1);
        const count = formatNumber(chartData[index].value);
        
        return (
          <div key={`item-${index}`} className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }}></div>
            <div>
              <span className="flex items-center font-medium">
                {entry.value === 'Male' ? <Mars className="h-3 w-3 mr-1" /> : <Venus className="h-3 w-3 mr-1" />}
                {entry.value}
              </span>
              <span className="text-xs text-muted-foreground">{percentage}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function OverallGenderPieChart({ data }: { data: GenderDistributionData }) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const chartData = prepareChartData(data);
  
  // Calculate total for summary
  const total = data.MALE + data.FEMALE;
  
  // Handle pie hover
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };
  
  const onPieLeave = () => {
    setActiveIndex(undefined);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Overall Gender Distribution</CardTitle>
        <CardDescription>Distribution of contest participations by gender</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full" style={{ height: '200px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                fill="#8884d8"
                dataKey="value"
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={index === 0 ? GENDER_COLORS.MALE : GENDER_COLORS.FEMALE} 
                  />
                ))}
              </Pie>
              <Legend 
                content={(props) => renderLegend(props, chartData)}
                verticalAlign="bottom"
                height={24}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

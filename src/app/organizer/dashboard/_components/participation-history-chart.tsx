"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ParticipationByDayProps {
  data: {
    date: string; // ISO date string
    count: number; // Number of registrations on this date
  }[];
}

export default function ParticipationHistoryChart({ data }: ParticipationByDayProps) {
  // Define the chart data type including the average property
  interface ChartDataItem {
    date: string;
    count: number;
    fullDate: string;
    average?: number; // Make average optional since it's not available for first 6 days
  }
  
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  
  useEffect(() => {
    if (!data || data.length === 0) return;
    
    // Format data for the chart with better date display
    const formattedData: ChartDataItem[] = data.map(item => ({
      date: new Date(item.date).toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric' 
      }),
      count: item.count,
      // Store the original date for tooltips
      fullDate: new Date(item.date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      average: undefined // Initialize as undefined, will be set for relevant entries
    }));
    
    // Calculate 7-day moving average
    formattedData.forEach((item, index) => {
      if (index >= 6) {
        const last7Days = formattedData.slice(index - 6, index + 1);
        const sum = last7Days.reduce((acc, day) => acc + day.count, 0);
        item.average = Math.round((sum / 7) * 10) / 10; // Round to 1 decimal place
      }
    });
    
    setChartData(formattedData);
  }, [data]);
  
  // Calculate statistics
  const totalParticipations = data.reduce((sum, item) => sum + item.count, 0);
  const maxParticipations = Math.max(...data.map(item => item.count), 0);
  const avgParticipations = Math.round((totalParticipations / (data.length || 1)) * 10) / 10;
  
  // Calculate date range
  const firstDate = data.length > 0 ? new Date(data[0].date) : new Date();
  const lastDate = data.length > 0 ? new Date(data[data.length - 1].date) : new Date();
  const daysDiff = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Custom tooltip to show more readable date information
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded p-2 shadow-md">
          <p className="font-medium">{payload[0].payload.fullDate}</p>
          <p className="text-primary">Registrations: <span className="font-medium">{payload[0].value}</span></p>
          {payload[1] && payload[1].value && (
            <p className="text-secondary">7-day average: <span className="font-medium">{payload[1].value}</span></p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Contest Participation History</CardTitle>
        <CardDescription>
          Daily registration activity from first registration to date
          <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Total Registrations</p>
              <p className="text-2xl font-bold">{totalParticipations.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Most in One Day</p>
              <p className="text-2xl font-bold">{maxParticipations.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Daily Average</p>
              <p className="text-2xl font-bold">{avgParticipations}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Showing {data.length} days of participation data over a {daysDiff}-day period
          </p>
        </CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 60,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis 
              dataKey="date" 
              tickMargin={10}
              angle={-45}
              textAnchor="end"
              interval="preserveStartEnd"
              // Show more ticks on larger screens, fewer on mobile
              tick={{ fontSize: 12 }}
              // Show every nth tick depending on data length
              tickFormatter={(value, index) => {
                // Dynamically adjust tick display based on data length
                const interval = Math.max(1, Math.floor(chartData.length / 15));
                return index % interval === 0 ? value : '';
              }}
            />
            <YAxis 
              tickFormatter={(value) => value.toLocaleString()} 
              width={45}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" />
            <ReferenceLine y={avgParticipations} stroke="#8884d8" strokeDasharray="3 3" label={{ value: 'Avg', position: 'left' }} />
            <Bar dataKey="count" name="Daily Registrations" fill="#3b82f6" barSize={chartData.length > 60 ? 3 : 10} />
            <Line 
              dataKey="average" 
              name="7-day average" 
              stroke="#6366f1" 
              strokeWidth={2}
              strokeDasharray="5 5" 
              dot={{ r: 3, fill: "#6366f1" }}
              activeDot={{ r: 5, strokeWidth: 1 }}
              type="monotone"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

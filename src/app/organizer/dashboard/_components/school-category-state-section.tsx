'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils/format";

type SchoolCategoryData = {
  category: string;
  count: number;
};

const formatCategory = (category: string): string => {
  if (!category) return 'Unknown';
  
  // Replace underscores with spaces and title case
  return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function SchoolCategoryStateSection({ stateId }: { stateId: string }) {
  const [data, setData] = useState<SchoolCategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/dashboard/school-category?stateId=${stateId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch school category data: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching school category data:', err);
        setError('Failed to load school category data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [stateId]);

  // Sort the data by count (descending)
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  
  // Calculate total for percentages
  const totalCount = data.reduce((acc, item) => acc + item.count, 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>School Categories</CardTitle>
        <CardDescription>Distribution of school contingents by category</CardDescription>
      </CardHeader>
      <CardContent className="pt-2 pb-2">
        <Tabs defaultValue="chart" className="h-full">
          <TabsList className="mb-4">
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chart" className="h-[250px]">
            {loading ? (
              <div className="h-full flex flex-col justify-center">
                <Skeleton className="h-[200px] w-full" />
              </div>
            ) : error ? (
              <div className="h-full flex flex-col items-center justify-center text-destructive">
                <p>{error}</p>
              </div>
            ) : data.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <p>No school category data available</p>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-between">
                <div className="flex-1 space-y-2">
                  {sortedData.map((item, index) => {
                    const percentage = totalCount > 0 ? (item.count / totalCount * 100).toFixed(1) : '0';
                    const formattedCategory = formatCategory(item.category);
                    
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 truncate" title={formattedCategory}>
                            <span className="text-sm font-medium">{formattedCategory}</span>
                          </div>
                          <div className="text-sm text-muted-foreground w-24 text-right">
                            {formatNumber(item.count)} ({percentage}%)
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="table" className="h-[250px] overflow-auto">
            {loading ? (
              <div className="h-full flex flex-col justify-center space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : error ? (
              <div className="h-full flex flex-col items-center justify-center text-destructive">
                <p>{error}</p>
              </div>
            ) : data.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <p>No school category data available</p>
              </div>
            ) : (
              <div className="w-full">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">School Category</th>
                      <th className="text-right p-2">Count</th>
                      <th className="text-right p-2">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((item, index) => {
                      const percentage = totalCount > 0 ? (item.count / totalCount * 100).toFixed(1) : '0';
                      const formattedCategory = formatCategory(item.category);
                      
                      return (
                        <tr key={index} className="border-b">
                          <td className="p-2 text-sm" title={formattedCategory}>{formattedCategory}</td>
                          <td className="p-2 text-right text-sm">{formatNumber(item.count)}</td>
                          <td className="p-2 text-right text-sm">{percentage}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="font-medium">
                      <td className="p-2">Total</td>
                      <td className="p-2 text-right">{formatNumber(totalCount)}</td>
                      <td className="p-2 text-right">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

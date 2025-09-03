'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from 'react';
import { formatNumber } from "@/lib/utils/format";

type PpdCountData = {
  ppd: string;
  count: number;
};

export default function SchoolPpdDistributionSection({ stateId }: { stateId: string }) {
  const [data, setData] = useState<PpdCountData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/dashboard/school-ppd-distribution?stateId=${stateId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch PPD data: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching PPD distribution data:', err);
        setError('Failed to load PPD distribution data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [stateId]);

  // Sort the data by count (descending)
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  
  // Get total count for percentage calculation
  const totalCount = data.reduce((acc, item) => acc + item.count, 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>School Contingents by PPD</CardTitle>
        <CardDescription>Distribution of school contingents by PPD in this state</CardDescription>
      </CardHeader>
      <CardContent className="pt-2 pb-2">
        <Tabs defaultValue="chart" className="h-full">
          <TabsList className="mb-4">
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chart" className="h-[350px]">
            {loading ? (
              <div className="h-full flex flex-col justify-center">
                <Skeleton className="h-[300px] w-full" />
              </div>
            ) : error ? (
              <div className="h-full flex flex-col items-center justify-center text-destructive">
                <p>{error}</p>
              </div>
            ) : data.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <p>No PPD data available for this state</p>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-between">
                <div className="flex-1 space-y-2">
                  {sortedData.map((item, index) => {
                    const percentage = totalCount > 0 ? (item.count / totalCount * 100).toFixed(1) : '0';
                    
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 truncate" title={item.ppd}>
                            <span className="text-sm font-medium">{item.ppd || 'Unknown'}</span>
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
          
          <TabsContent value="table" className="h-[350px] overflow-auto">
            {loading ? (
              <div className="h-full flex flex-col justify-center space-y-2">
                <Skeleton className="h-8 w-full" />
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
                <p>No PPD data available for this state</p>
              </div>
            ) : (
              <div className="w-full">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">PPD</th>
                      <th className="text-right p-2">Count</th>
                      <th className="text-right p-2">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((item, index) => {
                      const percentage = totalCount > 0 ? (item.count / totalCount * 100).toFixed(1) : '0';
                      
                      return (
                        <tr key={index} className="border-b">
                          <td className="p-2 text-sm" title={item.ppd}>{item.ppd || 'Unknown'}</td>
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

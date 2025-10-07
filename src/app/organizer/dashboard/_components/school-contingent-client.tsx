'use client';

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowUpRight, GraduationCap, MapPin, PieChart } from "lucide-react";
import { formatNumber } from "@/lib/utils/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SchoolLocation = {
  location: string | null;
  count: number | bigint;
};

interface SchoolContingentClientProps {
  count: number;
  locations: SchoolLocation[];
}

// Function to get a color based on index
function getColorForIndex(index: number): string {
  // A set of visually distinct colors for the chart
  const colors = [
    '#2563eb', // blue
    '#16a34a', // green
    '#9333ea', // purple
    '#ea580c', // orange
    '#0891b2', // cyan
    '#be123c', // rose
    '#4f46e5', // indigo
    '#65a30d', // lime
    '#0284c7', // light-blue
    '#9f1239', // red
  ];
  
  // Return the color at the index, or cycle through if we have more items than colors
  return colors[index % colors.length];
}

export default function SchoolContingentClient({ count, locations }: SchoolContingentClientProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Process location data to handle nulls and convert bigints
  const processedLocations = locations.map(loc => ({
    location: loc.location || 'Unknown Location',
    count: Number(loc.count)
  }));
  
  // Get the total to calculate percentages
  const totalCount = count || processedLocations.reduce((sum, loc) => sum + loc.count, 0);
  
  // Sort locations by count (descending)
  const sortedLocations = [...processedLocations].sort((a, b) => b.count - a.count);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            School Contingents
          </CardTitle>
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(count)}</div>
        </CardContent>
        <CardFooter>
          <button
            onClick={() => setIsOpen(true)}
            className="text-xs text-muted-foreground hover:text-primary flex items-center"
          >
            Show Details <ArrowUpRight className="ml-1 h-3 w-3" />
          </button>
        </CardFooter>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>School Contingents Details</DialogTitle>
            <DialogDescription>
              Total School Contingents: {formatNumber(count)}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="table">Table View</TabsTrigger>
              <TabsTrigger value="chart">Chart View</TabsTrigger>
            </TabsList>
            
            <TabsContent value="table" className="py-4">
              <h3 className="font-medium mb-3 flex items-center">
                <MapPin className="h-4 w-4 mr-2" /> School Contingents by Location
              </h3>
              
              <div className="overflow-y-auto max-h-[400px] border rounded-md">
                <table className="w-full">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Location</th>
                      <th className="text-right p-2">Count</th>
                      <th className="text-right p-2">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLocations.map((loc, index) => (
                      <tr key={index} className="border-t hover:bg-muted/50">
                        <td className="p-2">{loc.location}</td>
                        <td className="text-right p-2">{formatNumber(loc.count)}</td>
                        <td className="text-right p-2">
                          {((loc.count / totalCount) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            
            <TabsContent value="chart" className="py-4">
              <h3 className="font-medium mb-3 flex items-center">
                <PieChart className="h-4 w-4 mr-2" /> Distribution by Location
              </h3>
              
              <div className="w-full h-[400px] p-4 border rounded-md flex flex-col items-center justify-center">
                {/* Visual representation of the data */}
                <div className="w-full flex">
                  {sortedLocations.slice(0, 10).map((loc, i) => {
                    const percentage = (loc.count / totalCount) * 100;
                    return (
                      <div 
                        key={i}
                        className="h-36 flex-1"
                        style={{
                          backgroundColor: getColorForIndex(i),
                          position: 'relative',
                        }}
                      >
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 text-center truncate">
                          {percentage > 5 ? loc.location : '...'}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-8 grid grid-cols-2 gap-4 w-full">
                  {sortedLocations.slice(0, 10).map((loc, i) => (
                    <div key={i} className="flex items-center">
                      <div 
                        className="w-3 h-3 mr-2 rounded-sm"
                        style={{ backgroundColor: getColorForIndex(i) }}
                      ></div>
                      <span className="text-sm truncate">
                        {loc.location} ({formatNumber(loc.count)} - {((loc.count / totalCount) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}

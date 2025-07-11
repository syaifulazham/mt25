'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Users, CalendarDays, Clock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Import recharts for data visualization
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

type AttendanceStats = {
  totalContingents: number;
  totalTeams: number;
  totalContestants: number;
  totalManagers: number;
  totalParticipants: number;
  presentContingents: number;
  presentTeams: number;
  presentContestants: number;
  presentManagers: number;
  presentParticipants: number;
  attendanceRate: number;
};

type DailyAttendance = {
  date: string;
  count: number;
};

type HourlyAttendance = {
  hour: string;
  count: number;
};

export default function AttendanceDashboardPage() {
  const { id: eventId } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [dailyAttendance, setDailyAttendance] = useState<DailyAttendance[]>([]);
  const [hourlyAttendance, setHourlyAttendance] = useState<HourlyAttendance[]>([]);
  const [chartView, setChartView] = useState<'daily' | 'hourly'>('daily');

  // Contest group filter states
  const [kidsFilter, setKidsFilter] = useState(false);
  const [teensFilter, setTeensFilter] = useState(false);
  const [youthFilter, setYouthFilter] = useState(false);

  // Colors for pie chart
  const COLORS = ['#0088FE', '#ECEFF1'];

  // Fetch attendance statistics
  useEffect(() => {
    const fetchAttendanceStats = async () => {
      try {
        setLoading(true);
        
        // Build URL with active filters
        let url = `/api/organizer/events/${eventId}/attendance/statistics`;
        const params = new URLSearchParams();
        
        // Add contest group filters if active
        if (kidsFilter) params.append('kids', 'true');
        if (teensFilter) params.append('teens', 'true');
        if (youthFilter) params.append('youth', 'true');
        
        // Append params to URL if any filters are active
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
        
        console.log('Fetching statistics with URL:', url);
        console.log('Active filters:', { kidsFilter, teensFilter, youthFilter });
        
        // Add cache busting to prevent stale data
        const cacheBuster = Date.now();
        url += (url.includes('?') ? '&' : '?') + `_=${cacheBuster}`;
        
        // Use no-cache to ensure fresh results
        const response = await fetch(url, {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch attendance statistics');
        }
        
        const data = await response.json();
        console.log('Received statistics data:', data);
        
        setStats(data.stats);
        setDailyAttendance(data.dailyAttendance);
        setHourlyAttendance(data.hourlyAttendance);
      } catch (error) {
        console.error('Error fetching attendance statistics:', error);
        toast({
          title: 'Error',
          description: 'Failed to load attendance statistics. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchAttendanceStats();
  }, [eventId, toast, kidsFilter, teensFilter, youthFilter]);

  // Format hourly data for display (e.g., "09:00" instead of just "9")
  const formattedHourlyData = hourlyAttendance.map(item => ({
    ...item,
    hour: `${String(item.hour).padStart(2, '0')}:00`
  }));

  // Prepare data for attendance rate pie chart
  const pieChartData = stats
    ? [
        { name: 'Present', value: stats.presentParticipants },
        { name: 'Absent', value: stats.totalParticipants - stats.presentParticipants }
      ]
    : [];

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center">
        <Link href={`/organizer/events/${eventId}/attendance`}>
          <Button variant="outline" size="sm" className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Attendance Dashboard</h1>
      </div>
      
      {/* Contest Group Filter Toggle Buttons */}
      <div className="flex items-center gap-3 mb-6">
        <span className="font-medium">Filter by:</span>
        <div className="flex items-center gap-2">
          <Button 
            variant={kidsFilter ? "default" : "outline"}
            size="sm"
            onClick={() => setKidsFilter(!kidsFilter)}
            className={`${kidsFilter ? "bg-blue-500 hover:bg-blue-600" : ""}`}
          >
            Kids {kidsFilter && "✓"}
          </Button>
          
          <Button 
            variant={teensFilter ? "default" : "outline"}
            size="sm"
            onClick={() => setTeensFilter(!teensFilter)}
            className={`${teensFilter ? "bg-green-500 hover:bg-green-600" : ""}`}
          >
            Teens {teensFilter && "✓"}
          </Button>
          
          <Button 
            variant={youthFilter ? "default" : "outline"}
            size="sm"
            onClick={() => setYouthFilter(!youthFilter)}
            className={`${youthFilter ? "bg-purple-500 hover:bg-purple-600" : ""}`}
          >
            Youth {youthFilter && "✓"}
          </Button>
        </div>
        
        {(kidsFilter || teensFilter || youthFilter) && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setKidsFilter(false);
              setTeensFilter(false);
              setYouthFilter(false);
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-2/3 mb-2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-12 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Contingent Attendance
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats?.presentContingents} / {stats?.totalContingents}
                </div>
                <p className="text-sm text-muted-foreground">
                  {stats && stats.totalContingents > 0 ? Math.round((stats.presentContingents / stats.totalContingents) * 100) : 0}% attendance rate
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Team Attendance
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats?.presentTeams} / {stats?.totalTeams}
                </div>
                <p className="text-sm text-muted-foreground">
                  {stats && stats.totalTeams > 0 ? Math.round((stats.presentTeams / stats.totalTeams) * 100) : 0}% attendance rate
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Contestant Attendance
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats?.presentContestants} / {stats?.totalContestants}
                </div>
                <p className="text-sm text-muted-foreground">
                  {stats && stats.totalContestants > 0 ? Math.round((stats.presentContestants / stats.totalContestants) * 100) : 0}% attendance rate
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Manager Attendance
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats?.presentManagers} / {stats?.totalManagers}
                </div>
                <p className="text-sm text-muted-foreground">
                  {stats && stats.totalManagers > 0 ? Math.round((stats.presentManagers / stats.totalManagers) * 100) : 0}% attendance rate
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-green-500 border-2">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-green-50">
                <CardTitle className="text-sm font-medium">
                  Total Participant Attendance
                </CardTitle>
                <Users className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats?.presentParticipants} / {stats?.totalParticipants}
                </div>
                <p className="text-sm text-muted-foreground">
                  {stats && stats.totalParticipants > 0 ? Math.round((stats.presentParticipants / stats.totalParticipants) * 100) : 0}% attendance rate
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Attendance Rate Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Overall Attendance Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {loading ? (
              <div className="h-full bg-gray-100 rounded-md animate-pulse flex items-center justify-center">
                <p className="text-gray-500">Loading chart data...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(value) => [`${value} contingents`, null]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Time-Based Attendance Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Attendance Over Time</CardTitle>
          <Select
            value={chartView}
            onValueChange={(value) => setChartView(value as 'daily' | 'hourly')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">
                <div className="flex items-center">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  <span>Daily</span>
                </div>
              </SelectItem>
              <SelectItem value="hourly">
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  <span>Hourly</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            {loading ? (
              <div className="h-full bg-gray-100 rounded-md animate-pulse flex items-center justify-center">
                <p className="text-gray-500">Loading chart data...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartView === 'daily' ? dailyAttendance : formattedHourlyData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 60,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey={chartView === 'daily' ? 'date' : 'hour'} 
                    angle={-45} 
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    name={chartView === 'daily' ? 'Daily Check-ins' : 'Hourly Check-ins'} 
                    dataKey="count" 
                    fill="#8884d8" 
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

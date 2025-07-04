"use client";

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2 } from 'lucide-react';

// Types for the team data
type TeamData = {
  eventId: number;
  eventName: string;
  zoneId: number;
  zoneName: string;
  stateId: number;
  stateName: string;
  contestId: number;
  contestName: string;
  contestCode: string;
  contingentId: number;
  contingentName: string;
  contingentType: string;
  teamId: number;
  teamName: string;
  numberOfMembers: number;
};

type Event = {
  id: number;
  name: string;
};

type Zone = {
  id: number;
  name: string;
};

type State = {
  id: number;
  name: string;
  zoneId: number;
};

type Contest = {
  id: number;
  name: string;
  code: string;
};

export function TeamDataTable() {
  // Filter states
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('all');
  const [selectedStateId, setSelectedStateId] = useState<string>('all');
  const [selectedContestId, setSelectedContestId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [includeEmptyTeams, setIncludeEmptyTeams] = useState<boolean>(false);

  // Filter options loaded from API
  const [events, setEvents] = useState<Event[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);

  // Stats for summary
  const [totalTeams, setTotalTeams] = useState<number>(0);
  const [totalContestants, setTotalContestants] = useState<number>(0);
  const [totalContingents, setTotalContingents] = useState<number>(0);

  // Load filter options on component mount
  useEffect(() => {
    // Load events
    fetch('/api/events').then(res => res.json())
      .then(data => setEvents(data))
      .catch(err => console.error('Error loading events:', err));

    // Load zones
    fetch('/api/zones').then(res => res.json())
      .then(data => setZones(data))
      .catch(err => console.error('Error loading zones:', err));

    // Load states
    fetch('/api/states').then(res => res.json())
      .then(data => setStates(data))
      .catch(err => console.error('Error loading states:', err));

    // Load contests
    fetch('/api/contests').then(res => res.json())
      .then(data => setContests(data))
      .catch(err => console.error('Error loading contests:', err));
  }, []);

  // Build query string based on filters
  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (selectedEventId && selectedEventId !== 'all') params.append('eventId', selectedEventId);
    if (selectedZoneId && selectedZoneId !== 'all') params.append('zoneId', selectedZoneId);
    if (selectedStateId && selectedStateId !== 'all') params.append('stateId', selectedStateId);
    if (selectedContestId && selectedContestId !== 'all') params.append('contestId', selectedContestId);
    params.append('includeEmptyTeams', includeEmptyTeams.toString());
    return params.toString();
  };

  // Fetch team data with React Query
  const { data: teamData, isLoading, error, refetch } = useQuery<TeamData[]>({
    queryKey: ['teamData', selectedEventId, selectedZoneId, selectedStateId, selectedContestId, includeEmptyTeams],
    queryFn: async () => {
      const response = await fetch(`/api/organizer/events/teams-raw-data?${buildQueryString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch team data');
      }
      return response.json();
    },
    enabled: true,
  });

  // Filter data based on search term
  const filteredData = teamData?.filter(team => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      team.teamName.toLowerCase().includes(term) ||
      team.contingentName.toLowerCase().includes(term) ||
      team.contestName.toLowerCase().includes(term) ||
      team.stateName.toLowerCase().includes(term) ||
      team.zoneName.toLowerCase().includes(term)
    );
  }) || [];

  // Calculate summary statistics
  useEffect(() => {
    if (filteredData.length > 0) {
      setTotalTeams(filteredData.length);
      
      // Sum up all contestants across teams
      const contestants = filteredData.reduce(
        (sum, team) => sum + team.numberOfMembers,
        0
      );
      setTotalContestants(contestants);

      // Count distinct contingents
      const uniqueContingentIds = new Set(filteredData.map(team => team.contingentId));
      setTotalContingents(uniqueContingentIds.size);
    } else {
      setTotalTeams(0);
      setTotalContestants(0);
      setTotalContingents(0);
    }
  }, [filteredData]);

  // Filter options should be filtered based on selection hierarchy
  const filteredStates = selectedZoneId
    ? states.filter(state => state.zoneId === parseInt(selectedZoneId))
    : states;

  // Export data to CSV
  const exportToCSV = () => {
    if (!filteredData || filteredData.length === 0) return;

    const headers = [
      'Event', 'Zone', 'State', 'Contest', 'Contingent', 
      'Team Name', 'Members', 'Contingent Type'
    ];

    const rows = filteredData.map(team => [
      team.eventName,
      team.zoneName,
      team.stateName,
      team.contestName,
      team.contingentName,
      team.teamName,
      team.numberOfMembers.toString(),
      team.contingentType,
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create download link
    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `teams-data-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contingents</CardTitle>
            <div className="h-4 w-4 rounded-full bg-accent"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContingents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <div className="h-4 w-4 rounded-full bg-primary"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTeams}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contestants</CardTitle>
            <div className="h-4 w-4 rounded-full bg-secondary"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContestants}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Teams</CardTitle>
          <CardDescription>Refine the list of teams by applying filters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="event">Event</Label>
              <Select
                value={selectedEventId}
                onValueChange={setSelectedEventId}
              >
                <SelectTrigger id="event">
                  <SelectValue placeholder="All Events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id.toString()}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone">Zone</Label>
              <Select
                value={selectedZoneId}
                onValueChange={(value) => {
                  setSelectedZoneId(value);
                  setSelectedStateId('all'); // Reset state when zone changes
                }}
              >
                <SelectTrigger id="zone">
                  <SelectValue placeholder="All Zones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id.toString()}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select
                value={selectedStateId}
                onValueChange={setSelectedStateId}
                disabled={filteredStates.length === 0}
              >
                <SelectTrigger id="state">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {filteredStates.map((state) => (
                    <SelectItem key={state.id} value={state.id.toString()}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contest">Contest</Label>
              <Select
                value={selectedContestId}
                onValueChange={setSelectedContestId}
              >
                <SelectTrigger id="contest">
                  <SelectValue placeholder="All Contests" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contests</SelectItem>
                  {contests.map((contest) => (
                    <SelectItem key={contest.id} value={contest.id.toString()}>
                      {contest.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2 flex items-end">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeEmpty"
                  checked={includeEmptyTeams}
                  onCheckedChange={(checked) => {
                    setIncludeEmptyTeams(checked as boolean);
                  }}
                />
                <Label htmlFor="includeEmpty">Include teams with no members</Label>
              </div>
            </div>
            <div className="space-y-2 flex items-end">
              <Button
                onClick={exportToCSV}
                disabled={!filteredData || filteredData.length === 0}
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" /> Export to CSV
              </Button>
            </div>
            <div className="space-y-2 flex items-end">
              <Button onClick={() => refetch()}>
                Refresh Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Data</CardTitle>
          <CardDescription>Displaying {filteredData?.length || 0} teams</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-md text-red-800">
              Error loading team data. Please try again.
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No teams found matching the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>Contingent</TableHead>
                    <TableHead>Contest</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Members</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((team) => (
                    <TableRow key={team.teamId}>
                      <TableCell className="font-medium">{team.teamName}</TableCell>
                      <TableCell>
                        {team.contingentName}
                        <Badge variant="outline" className="ml-2">
                          {team.contingentType}
                        </Badge>
                      </TableCell>
                      <TableCell>{team.contestName}</TableCell>
                      <TableCell>{team.stateName}</TableCell>
                      <TableCell>{team.zoneName}</TableCell>
                      <TableCell>
                        <Badge
                          className={team.numberOfMembers === 0 ? 'bg-red-100 text-red-800' : ''}
                        >
                          {team.numberOfMembers}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

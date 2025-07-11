'use client';

import { useState, useEffect, Fragment } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Search, Clock, Check, X, Loader2, MessageSquare, FilterIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

type AttendanceRecord = {
  category: 'Participant' | 'Manager';
  eventId: number;
  name: string;
  ic: string | null;
  hashcode: string;
  stateId: number | null;
  contingentId: number;
  teamId: number;
  state: string | null;
  contingentName: string;
  teamName: string;
  contingentType: string;
  attendanceStatus: 'Present' | 'Not Present';
  contestId: string | number;
  contestCode: string;
  contestName: string;
  attendanceNote: string | null;
  attendanceDate: string | null;
  recordId: number;
};

export default function ManualAttendancePage() {
  const { id: eventId } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState<number | null>(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null);
  const [noteText, setNoteText] = useState('');
  
  // Filter state
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedContestGroup, setSelectedContestGroup] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [states, setStates] = useState<{id: number, name: string}[]>([]);
  const [contestGroups, setContestGroups] = useState<{value: string}[]>([]);
  const [categories, setCategories] = useState<{value: string, label: string}[]>([]);

  // Load attendance data with filters
  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        setLoading(true);
        let url = `/api/organizer/events/${eventId}/attendance/log/bymanual`;
        
        // Add filters to URL if selected
        const params = new URLSearchParams();
        if (selectedState && selectedState !== 'all') params.append('stateId', selectedState);
        if (selectedContestGroup && selectedContestGroup !== 'all') params.append('contestGroup', selectedContestGroup);
        if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch attendance data');
        
        const data = await response.json();
        setAttendanceRecords(data.attendanceData);
        setFilteredRecords(data.attendanceData);
        
        // Get filter options from the API response
        if (data.filterOptions) {
          setStates(data.filterOptions.states || []);
          setContestGroups(data.filterOptions.contestGroups || []);
          setCategories(data.filterOptions.categories || []);
        }
      } catch (error) {
        console.error('Error fetching attendance data:', error);
        toast({
          title: "Error",
          description: "Failed to load attendance data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, [eventId, toast, selectedState, selectedContestGroup, selectedCategory]);

  // Handle search filtering
  useEffect(() => {
    if (searchTerm === '') {
      setFilteredRecords(attendanceRecords);
    } else {
      const filtered = attendanceRecords.filter(record =>
        record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.contingentName && record.contingentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (record.teamName && record.teamName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (record.contestCode && record.contestCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (record.category && record.category.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredRecords(filtered);
    }
  }, [searchTerm, attendanceRecords]);

  // Mark attendance as present/not present
  const updateAttendanceStatus = async (record: AttendanceRecord, status: 'Present' | 'Not Present') => {
    setProcessing(record.recordId);
    try {
      // Special behavior for managers - mark all records with same contingentId as Present
      const isGroupUpdate = record.category === 'Manager' && status === 'Present';
      
      const response = await fetch(`/api/organizer/events/${eventId}/attendance/log/bymanual`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          recordId: record.recordId,
          category: record.category,
          status,
          contingentId: isGroupUpdate ? record.contingentId : undefined
        })
      });

      if (!response.ok) throw new Error('Failed to update attendance status');
      
      // Update local state
      const updatedRecords = attendanceRecords.map(item => {
        // For managers marking present: update all records with same contingentId
        if (isGroupUpdate && item.contingentId === record.contingentId) {
          return {
            ...item,
            attendanceStatus: status,
            attendanceDate: new Date().toISOString()
          };
        }
        // For participants or reset action: only update the specific record
        else if (item.recordId === record.recordId && item.category === record.category) {
          return {
            ...item,
            attendanceStatus: status,
            attendanceDate: status === 'Present' ? new Date().toISOString() : null
          };
        }
        return item;
      });

      setAttendanceRecords(updatedRecords);
      
      // Update filtered records
      if (searchTerm) {
        const filtered = updatedRecords.filter(item =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.contingentName && item.contingentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.teamName && item.teamName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.contestCode && item.contestCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        setFilteredRecords(filtered);
      } else {
        setFilteredRecords(updatedRecords);
      }

      toast({
        title: "Success",
        description: `Attendance marked as ${status === 'Present' ? 'present' : 'not present'}.`,
      });

    } catch (error) {
      console.error('Error updating attendance:', error);
      toast({
        title: "Error",
        description: "Failed to update attendance status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };
  
  // Open notes dialog
  const openNotesDialog = (record: AttendanceRecord) => {
    setCurrentRecord(record);
    setNoteText(record.attendanceNote || '');
    setNotesDialogOpen(true);
  };
  
  // Save attendance note
  const saveAttendanceNote = async () => {
    if (!currentRecord) return;
    
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/attendance/log/bymanual`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          recordId: currentRecord.recordId,
          category: currentRecord.category,
          attendanceNote: noteText
        })
      });

      if (!response.ok) throw new Error('Failed to update attendance note');
      
      // Update local state
      const updatedRecords = attendanceRecords.map(item => {
        if (item.recordId === currentRecord.recordId && item.category === currentRecord.category) {
          return {
            ...item,
            attendanceNote: noteText
          };
        }
        return item;
      });

      setAttendanceRecords(updatedRecords);
      setFilteredRecords(updatedRecords.filter(r => 
        searchTerm === '' || 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.contingentName && r.contingentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.teamName && r.teamName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.contestCode && r.contestCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.category && r.category.toLowerCase().includes(searchTerm.toLowerCase()))
      ));

      toast({
        title: "Success",
        description: "Attendance note updated successfully."
      });
      
      setNotesDialogOpen(false);
    } catch (error) {
      console.error('Error updating note:', error);
      toast({
        title: "Error",
        description: "Failed to update attendance note. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Format time from ISO string
  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'HH:mm:ss');
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center space-x-2">
          <Link href={`/organizer/events/${eventId}/attendance`}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h2 className="text-2xl font-bold">Attendance Log</h2>
        </div>

        <div className="flex items-center space-x-4 flex-wrap gap-2">
          {/* State Filter */}
          <div className="flex items-center space-x-2">
            <Select
              value={selectedState}
              onValueChange={setSelectedState}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map((state) => (
                  <SelectItem key={state.id} value={state.id.toString()}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Contest Group Filter */}
          <div className="flex items-center space-x-2">
            <Select
              value={selectedContestGroup}
              onValueChange={setSelectedContestGroup}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by contest group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contest Groups</SelectItem>
                {contestGroups.map(group => {
                  const label = group.value.charAt(0) + group.value.slice(1).toLowerCase();
                  return (
                    <SelectItem key={group.value} value={group.value}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-2">
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Search Input */}
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search by name, contingent, team, or contest..."
              className="w-full pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Attendance Records</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{filteredRecords.length} Records</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <p className="text-center py-6 text-gray-500">
              No attendance records found. {searchTerm && "Try a different search term."}
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contingent</TableHead>
                    <TableHead>Team</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record, index) => (
                    <TableRow 
                      key={`${record.category}-${record.recordId}`}
                      className={record.category === 'Manager' ? 'bg-blue-50' : undefined}
                    >
                       <TableCell>
                        <div className="flex items-center">
                          <span className="mr-2">{index + 1}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => openNotesDialog(record)}
                            title="Edit Notes"
                          >
                            <MessageSquare 
                              className={`h-4 w-4 ${record.attendanceNote ? 'text-green-500' : ''}`} 
                            />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.attendanceStatus === 'Present' ? (
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center text-green-600">
                              <Clock className="h-4 w-4 mr-1" />
                              <span>{formatTime(record.attendanceDate)}</span>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => updateAttendanceStatus(record, 'Not Present')}
                              disabled={processing === record.recordId}
                              title="Reset to Not Present"
                            >
                              {processing === record.recordId ? 
                                <Loader2 className="h-4 w-4 animate-spin" /> : 
                                <X className="h-4 w-4" />}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => updateAttendanceStatus(record, 'Present')}
                            disabled={processing === record.recordId}
                            title="Mark Present"
                          >
                            {processing === record.recordId ? 
                              <Loader2 className="h-4 w-4 animate-spin" /> : 
                              <Check className="h-4 w-4" />}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{record.name}</div>
                        {record.ic && <div className="text-xs text-gray-500">{record.ic}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{record.contingentName || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{record.state || 'No state'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{record.teamName || 'N/A'}</div>
                        {record.contestCode ? (
                          <div className="text-xs text-gray-500">
                            <span className="font-medium">{record.contestCode}</span> - {record.contestName}
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Notes Edit Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Attendance Notes</DialogTitle>
            <DialogDescription>
              {currentRecord && (
                <div className="text-sm mt-2">
                  <p><strong>Name:</strong> {currentRecord.name}</p>
                  <p><strong>Category:</strong> {currentRecord.category}</p>
                  <p><strong>Contingent:</strong> {currentRecord.contingentName}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            placeholder="Enter attendance notes here..."
            className="min-h-[100px]"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveAttendanceNote}>Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

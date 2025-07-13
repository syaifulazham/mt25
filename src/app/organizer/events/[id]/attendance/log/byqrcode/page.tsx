'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Loader2, Plus, Trash2, Link as LinkIcon, Copy, Check } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';

// Type definitions for attendance endpoints
type AttendanceEndpoint = {
  id: number;
  eventId: number;
  endpointhash: string;
  passcode: string;
  createdAt: string;
  updatedAt: string;
};

// Type definitions for attendance agent endpoints
type AttendanceAgentEndpoint = {
  id: number;
  eventId: number;
  endpointhash: string;
  passcode: string;
  createdAt: string;
  updatedAt: string;
};

export default function QRCodeAttendancePage() {
  const { id: eventId } = useParams();
  const { toast } = useToast();
  const [endpoints, setEndpoints] = useState<AttendanceEndpoint[]>([]);
  const [endpointsLoading, setEndpointsLoading] = useState(true);
  const [creatingEndpoint, setCreatingEndpoint] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [deletingEndpointId, setDeletingEndpointId] = useState<number | null>(null);
  
  // State for agent endpoints
  const [agentEndpoints, setAgentEndpoints] = useState<AttendanceAgentEndpoint[]>([]);
  const [agentEndpointsLoading, setAgentEndpointsLoading] = useState(true);
  const [creatingAgentEndpoint, setCreatingAgentEndpoint] = useState(false);
  const [copiedAgentHash, setCopiedAgentHash] = useState<string | null>(null);
  const [deletingAgentEndpointId, setDeletingAgentEndpointId] = useState<number | null>(null);

  // Fetch attendance endpoints when component mounts
  useEffect(() => {
    fetchAttendanceEndpoints();
    fetchAttendanceAgentEndpoints();
  }, []);
  
  // Function to fetch attendance endpoints
  const fetchAttendanceEndpoints = async () => {
    setEndpointsLoading(true);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/attendance/endpoints`);
      if (response.ok) {
        const data = await response.json();
        setEndpoints(data.endpoints);
      } else {
        toast({
          title: "Failed to fetch endpoints",
          description: "Could not load attendance endpoints. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching attendance endpoints:", error);
      toast({
        title: "Error",
        description: "An error occurred while fetching attendance endpoints.",
        variant: "destructive",
      });
    } finally {
      setEndpointsLoading(false);
    }
  };
  
  // Function to create new attendance endpoint
  const createAttendanceEndpoint = async () => {
    setCreatingEndpoint(true);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/attendance/endpoints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Endpoint Created",
          description: "New attendance endpoint has been created successfully.",
        });
        fetchAttendanceEndpoints(); // Refresh the list
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to create endpoint",
          description: errorData.error || "Could not create attendance endpoint. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating attendance endpoint:", error);
      toast({
        title: "Error",
        description: "An error occurred while creating the attendance endpoint.",
        variant: "destructive",
      });
    } finally {
      setCreatingEndpoint(false);
    }
  };
  
  // Function to delete an attendance endpoint
  const deleteAttendanceEndpoint = async (id: number) => {
    setDeletingEndpointId(id);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/attendance/endpoints/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast({
          title: "Endpoint Deleted",
          description: "Attendance endpoint has been deleted successfully.",
        });
        fetchAttendanceEndpoints(); // Refresh the list
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to delete endpoint",
          description: errorData.error || "Could not delete attendance endpoint. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting attendance endpoint:", error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the attendance endpoint.",
        variant: "destructive",
      });
    } finally {
      setDeletingEndpointId(null);
    }
  };
  
  // Function to copy endpoint URL to clipboard
  const copyEndpointUrl = (endpointHash: string) => {
    const url = `${window.location.origin}/attendance/events/${eventId}/${endpointHash}`;
    navigator.clipboard.writeText(url);
    setCopiedHash(endpointHash);
    setTimeout(() => setCopiedHash(null), 2000);
  };
  
  // Function to fetch attendance agent endpoints
  const fetchAttendanceAgentEndpoints = async () => {
    setAgentEndpointsLoading(true);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/attendance/agentendpoints`);
      if (response.ok) {
        const data = await response.json();
        setAgentEndpoints(data.endpoints);
      } else {
        toast({
          title: "Failed to fetch agent endpoints",
          description: "Could not load attendance agent endpoints. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching attendance agent endpoints:", error);
      toast({
        title: "Error",
        description: "An error occurred while fetching attendance agent endpoints.",
        variant: "destructive",
      });
    } finally {
      setAgentEndpointsLoading(false);
    }
  };
  
  // Function to create new attendance agent endpoint
  const createAttendanceAgentEndpoint = async () => {
    setCreatingAgentEndpoint(true);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/attendance/agentendpoints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Agent Endpoint Created",
          description: "New attendance agent endpoint has been created successfully.",
        });
        fetchAttendanceAgentEndpoints(); // Refresh the list
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to create agent endpoint",
          description: errorData.error || "Could not create attendance agent endpoint. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating attendance agent endpoint:", error);
      toast({
        title: "Error",
        description: "An error occurred while creating the attendance agent endpoint.",
        variant: "destructive",
      });
    } finally {
      setCreatingAgentEndpoint(false);
    }
  };
  
  // Function to delete an attendance agent endpoint
  const deleteAttendanceAgentEndpoint = async (id: number) => {
    setDeletingAgentEndpointId(id);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/attendance/agentendpoints/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast({
          title: "Agent Endpoint Deleted",
          description: "Attendance agent endpoint has been deleted successfully.",
        });
        fetchAttendanceAgentEndpoints(); // Refresh the list
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to delete agent endpoint",
          description: errorData.error || "Could not delete attendance agent endpoint. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting attendance agent endpoint:", error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the attendance agent endpoint.",
        variant: "destructive",
      });
    } finally {
      setDeletingAgentEndpointId(null);
    }
  };
  
  // Function to copy agent endpoint URL to clipboard
  const copyAgentEndpointUrl = (endpointHash: string) => {
    const url = `${window.location.origin}/attendance/events/${eventId}/agent/${endpointHash}`;
    navigator.clipboard.writeText(url);
    setCopiedAgentHash(endpointHash);
    setTimeout(() => setCopiedAgentHash(null), 2000);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center">
        <Link href={`/organizer/events/${eventId}/attendance`}>
          <Button variant="outline" size="sm" className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Manage Endpoints</h1>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>QR Code Endpoints</CardTitle>
            <CardDescription>
              Create and manage QR code attendance endpoints. Each endpoint has a unique URL and requires a passcode to access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Attendance Endpoints</h3>
              <Button
                onClick={createAttendanceEndpoint}
                disabled={creatingEndpoint}
                className="flex items-center"
              >
                {creatingEndpoint ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                ) : (
                  <><Plus className="mr-2 h-4 w-4" /> Create Endpoint</>
                )}
              </Button>
            </div>
            
            {endpointsLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : endpoints.length === 0 ? (
              <div className="text-center py-8 border rounded-md bg-gray-50">
                <p className="text-gray-500">No endpoints created yet.</p>
                <p className="text-sm text-gray-400 mt-2">Create your first endpoint to start managing QR code attendance.</p>
              </div>
            ) : (
              <Table>
                <TableCaption>List of attendance endpoints for this event.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint Hash</TableHead>
                    <TableHead>Passcode</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endpoints.map((endpoint) => (
                    <TableRow key={endpoint.id}>
                      <TableCell className="font-mono text-sm">
                        {endpoint.endpointhash}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {endpoint.passcode}
                      </TableCell>
                      <TableCell>
                        {format(new Date(endpoint.createdAt), 'PPp')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyEndpointUrl(endpoint.endpointhash)}
                            className="flex items-center"
                          >
                            {copiedHash === endpoint.endpointhash ? (
                              <><Check className="h-3 w-3 mr-1" /> Copied</>
                            ) : (
                              <><Copy className="h-3 w-3 mr-1" /> Copy URL</>
                            )}
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <Link href={`/attendance/events/${eventId}/${endpoint.endpointhash}`} target="_blank">
                              <LinkIcon className="h-3 w-3 mr-1" />
                              Open
                            </Link>
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={deletingEndpointId === endpoint.id}
                              >
                                {deletingEndpointId === endpoint.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Endpoint</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this attendance endpoint? This action cannot be undone.
                                  The endpoint hash is: <code className="bg-gray-100 px-1 rounded">{endpoint.endpointhash}</code>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteAttendanceEndpoint(endpoint.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="font-medium mb-2">How to use QR code endpoints:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Create an endpoint using the "Create Endpoint" button above.</li>
                <li>Copy the endpoint URL or click "Open" to access the attendance page.</li>
                <li>Share the URL and passcode with event organizers or attendees.</li>
                <li>Attendees can scan QR codes or manually enter attendance data at that endpoint.</li>
                <li>All attendance records will be centrally tracked for this event.</li>
              </ol>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>QR Code Agent Endpoints</CardTitle>
            <CardDescription>
              Create and manage QR code attendance agent endpoints. Each endpoint has a unique URL and requires a passcode to access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Attendance Agent Endpoints</h3>
              <Button
                onClick={createAttendanceAgentEndpoint}
                disabled={creatingAgentEndpoint}
                className="flex items-center"
              >
                {creatingAgentEndpoint ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                ) : (
                  <><Plus className="mr-2 h-4 w-4" /> Create Agent Endpoint</>
                )}
              </Button>
            </div>
            
            {agentEndpointsLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : agentEndpoints.length === 0 ? (
              <div className="text-center py-8 border rounded-md bg-gray-50">
                <p className="text-gray-500">No agent endpoints created yet.</p>
                <p className="text-sm text-gray-400 mt-2">Create your first agent endpoint to start managing QR code attendance for agents.</p>
              </div>
            ) : (
              <Table>
                <TableCaption>List of attendance agent endpoints for this event.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint Hash</TableHead>
                    <TableHead>Passcode</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentEndpoints.map((endpoint) => (
                    <TableRow key={endpoint.id}>
                      <TableCell className="font-mono text-sm">
                        {endpoint.endpointhash}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {endpoint.passcode}
                      </TableCell>
                      <TableCell>
                        {format(new Date(endpoint.createdAt), 'PPp')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyAgentEndpointUrl(endpoint.endpointhash)}
                            className="flex items-center"
                          >
                            {copiedAgentHash === endpoint.endpointhash ? (
                              <><Check className="h-3 w-3 mr-1" /> Copied</>
                            ) : (
                              <><Copy className="h-3 w-3 mr-1" /> Copy URL</>
                            )}
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <Link href={`/attendance/events/${eventId}/agent/${endpoint.endpointhash}`} target="_blank">
                              <LinkIcon className="h-3 w-3 mr-1" />
                              Open
                            </Link>
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={deletingAgentEndpointId === endpoint.id}
                              >
                                {deletingAgentEndpointId === endpoint.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Agent Endpoint</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this attendance agent endpoint? This action cannot be undone.
                                  The endpoint hash is: <code className="bg-gray-100 px-1 rounded">{endpoint.endpointhash}</code>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteAttendanceAgentEndpoint(endpoint.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <h4 className="font-medium mb-2">How to use QR code agent endpoints:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-green-800">
                <li>Create an agent endpoint using the "Create Agent Endpoint" button above.</li>
                <li>Copy the endpoint URL or click "Open" to access the agent attendance page.</li>
                <li>Share the URL and passcode with authorized agents or staff members.</li>
                <li>Agents can scan QR codes or manually enter attendance data at that endpoint.</li>
                <li>All agent attendance records will be centrally tracked for this event.</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

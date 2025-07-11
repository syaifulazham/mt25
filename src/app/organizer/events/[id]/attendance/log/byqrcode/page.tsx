'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Loader2, Scan, Keyboard, Plus, Trash2, Link as LinkIcon, Copy, Check } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Html5Qrcode } from 'html5-qrcode';
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function QRCodeAttendancePage() {
  const { id: eventId } = useParams();
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [message, setMessage] = useState<{ title: string; description: string; type: 'success' | 'error' | 'info' } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = "qr-reader";
  const [manualHashcode, setManualHashcode] = useState('');
  const [activeMainTab, setActiveMainTab] = useState('qrscanner');
  const [activeScannerTab, setActiveScannerTab] = useState('camera');
  const [endpoints, setEndpoints] = useState<AttendanceEndpoint[]>([]);
  const [endpointsLoading, setEndpointsLoading] = useState(true);
  const [creatingEndpoint, setCreatingEndpoint] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [deletingEndpointId, setDeletingEndpointId] = useState<number | null>(null);

  useEffect(() => {
    // Cleanup function to stop scanner when component unmounts
    return () => {
      if (scannerRef.current && scanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [scanning]);
  
  // Fetch attendance endpoints when component mounts
  useEffect(() => {
    fetchAttendanceEndpoints();
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
        body: JSON.stringify({
          eventId: Number(eventId),
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Endpoint Created",
          description: "New QR code endpoint created successfully.",
        });
        fetchAttendanceEndpoints(); // Refresh the list
      } else {
        toast({
          title: "Failed to create endpoint",
          description: data.error || "Could not create QR code endpoint.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating attendance endpoint:", error);
      toast({
        title: "Error",
        description: "An error occurred while creating the endpoint.",
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
          description: "QR code endpoint deleted successfully.",
        });
        fetchAttendanceEndpoints(); // Refresh the list
      } else {
        const data = await response.json();
        toast({
          title: "Failed to delete endpoint",
          description: data.error || "Could not delete QR code endpoint.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting attendance endpoint:", error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the endpoint.",
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
    toast({
      title: "URL Copied",
      description: "Endpoint URL copied to clipboard.",
    });
  };

  const startScanner = () => {
    const html5QrCode = new Html5Qrcode(scannerDivId);
    scannerRef.current = html5QrCode;

    html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      onScanSuccess,
      onScanFailure
    ).then(() => {
      setScanning(true);
    }).catch((err) => {
      console.error("Error starting scanner:", err);
      toast({
        title: "Scanner Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
    });
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        setScanning(false);
      }).catch((err) => {
        console.error("Error stopping scanner:", err);
      });
    }
  };

  const processHashcode = async (hashcode: string) => {
    // Prevent duplicate scans
    if (loading || hashcode === lastScanned) return;
    
    setLoading(true);
    setLastScanned(hashcode);
    
    // Reset the last scanned code after 5 seconds to allow rescanning
    setTimeout(() => {
      setLastScanned(null);
    }, 5000);
    
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/attendance/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hashcode,
          method: 'qrcode',
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage({
          title: "Check-in Successful!",
          description: `${data.contingentName} has been marked as present.`,
          type: 'success'
        });
        
        // Auto-dismiss success message after 5 seconds
        setTimeout(() => {
          setMessage(null);
        }, 5000);
      } else {
        setMessage({
          title: "Check-in Failed",
          description: data.error || "QR code not recognized.",
          type: 'error'
        });
      }
    } catch (error) {
      console.error("Error processing QR code:", error);
      setMessage({
        title: "Error",
        description: "Failed to process QR code. Please try again.",
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const onScanSuccess = (hashcode: string) => {
    processHashcode(hashcode);
  };


  const onScanFailure = (error: string) => {
    // Don't show error for normal scan attempts
    if (error.includes("No QR code found")) return;
    console.error("QR Scan error:", error);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualHashcode.trim()) {
      processHashcode(manualHashcode.trim());
      setManualHashcode(''); // Clear input after submission
    }
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
        <h1 className="text-3xl font-bold">QR Code Attendance</h1>
      </div>
      
      <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="qrscanner">QR Code Scanner</TabsTrigger>
          <TabsTrigger value="endpoints">Manage Endpoints</TabsTrigger>
        </TabsList>
        
        <TabsContent value="qrscanner">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>QR Code Scanner</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeScannerTab} onValueChange={setActiveScannerTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="camera" className="flex items-center">
                      <Scan className="h-4 w-4 mr-2" />
                      Camera Scan
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="flex items-center">
                      <Keyboard className="h-4 w-4 mr-2" />
                      Manual Input
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="camera">
                    <div className="mb-4">
                      <p>Scan the QR code from a contingent's ID or profile to mark their attendance.</p>
                    </div>
                    
                    <div 
                      id={scannerDivId} 
                      className="w-full h-[300px] bg-gray-100 flex items-center justify-center mb-4"
                    >
                      {!scanning && (
                        <div className="text-center p-4">
                          <p className="mb-4">Camera feed will appear here.</p>
                          <Button onClick={startScanner}>
                            Start Scanner
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {scanning ? (
                      <Button 
                        onClick={stopScanner} 
                        variant="destructive" 
                        className="w-full"
                      >
                        Stop Scanner
                      </Button>
                    ) : (
                      <Button 
                        onClick={startScanner} 
                        className="w-full"
                      >
                        Start Scanner
                      </Button>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="manual">
                    <div className="mb-4">
                      <p>Enter the QR code using a keyboard wedge scanner or manually type/paste the code.</p>
                    </div>
                    
                    <form onSubmit={handleManualSubmit} className="space-y-4">
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Scan or enter QR code here"
                          value={manualHashcode}
                          onChange={(e) => setManualHashcode(e.target.value)}
                          className="flex-1"
                          autoFocus={activeScannerTab === 'manual'}
                        />
                        <Button type="submit" disabled={loading || !manualHashcode.trim()}>
                          Submit
                        </Button>
                      </div>
                      
                      <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800">
                        <h4 className="font-medium mb-2">Using a QR Scanner Device:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Click in the input field to focus it</li>
                          <li>Scan the QR code with your scanner device</li>
                          <li>The code will be automatically entered</li>
                          <li>The system will process the code immediately if configured for auto-enter</li>
                        </ul>
                      </div>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Check-in Status</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex flex-col items-center justify-center p-6">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p>Processing...</p>
                  </div>
                ) : message ? (
                  <div className={`p-4 rounded-md mb-4 ${
                    message.type === 'success' 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : message.type === 'error'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    <h3 className="font-bold mb-1">{message.title}</h3>
                    <p>{message.description}</p>
                  </div>
                ) : (
                  <div className="text-center p-6">
                    <p className="text-gray-500">Scan a QR code to see check-in results</p>
                  </div>
                )}
                
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Instructions:</h3>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Ensure good lighting for better scanning.</li>
                    <li>Hold the QR code steady in front of the camera.</li>
                    <li>The system will automatically register attendance upon successful scan.</li>
                    <li>Check the status message to confirm successful check-in.</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="endpoints">
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
                    <p className="text-gray-500 text-sm mt-2">Create an endpoint to generate a QR code attendance URL.</p>
                  </div>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Passcode</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {endpoints.map((endpoint) => (
                          <TableRow key={endpoint.id}>
                            <TableCell className="font-mono font-medium">{endpoint.passcode}</TableCell>
                            <TableCell>{format(new Date(endpoint.createdAt), 'MMM d, yyyy h:mm a')}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyEndpointUrl(endpoint.endpointhash)}
                                >
                                  {copiedHash === endpoint.endpointhash ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                                <Link 
                                  href={`/attendance/events/${eventId}/${endpoint.endpointhash}`} 
                                  target="_blank"
                                  className="inline-block"
                                >
                                  <Button variant="outline" size="sm">
                                    <LinkIcon className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Endpoint</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this attendance endpoint? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteAttendanceEndpoint(endpoint.id)}
                                        disabled={deletingEndpointId === endpoint.id}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        {deletingEndpointId === endpoint.id ? (
                                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
                                        ) : (
                                          "Delete"
                                        )}
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
                  </div>
                )}
                
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4 text-blue-800">
                  <h4 className="font-medium mb-2">How to use QR code endpoints:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Create a new endpoint using the button above</li>
                    <li>Copy the generated URL or click the link icon to open it</li>
                    <li>Share the URL with the attendance operator</li>
                    <li>They will need the 6-character passcode to access the QR scanner</li>
                    <li>The operator can then scan QR codes to mark attendance</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

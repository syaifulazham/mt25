'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Camera, Smartphone } from "lucide-react";
import { useParams } from "next/navigation";
import { Html5Qrcode } from 'html5-qrcode';
import { Input } from "@/components/ui/input";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type EndpointData = {
  eventId: number;
  endpointhash: string;
  exists: boolean;
};

export default function PublicQRCodeAttendancePage() {
  const { eventId, endpointhash } = useParams();
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [message, setMessage] = useState<{ 
    title: string; 
    description: string; 
    type: 'success' | 'error' | 'info' 
  } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = "qr-reader";
  const [manualHashcode, setManualHashcode] = useState('');
  const [activeTab, setActiveTab] = useState('camera');
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [passcodeDialogOpen, setPasscodeDialogOpen] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [endpointData, setEndpointData] = useState<EndpointData | null>(null);
  const [endpointLoading, setEndpointLoading] = useState(true);
  const [endpointError, setEndpointError] = useState('');

  // Validate the endpoint when component mounts
  useEffect(() => {
    validateEndpoint();
  }, []);

  // Clean up scanner when component unmounts
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(error => console.error("Failed to stop scanner:", error));
        scannerRef.current = null;
      }
    };
  }, []);

  // Validate the attendance endpoint
  const validateEndpoint = async () => {
    try {
      setEndpointLoading(true);
      const response = await fetch(`/api/attendance/validate-endpoint?eventId=${eventId}&endpointhash=${endpointhash}`);
      const data = await response.json();
      
      if (!data.exists) {
        setEndpointError('This attendance endpoint does not exist or has expired.');
        return;
      }
      
      setEndpointData(data);
    } catch (error) {
      console.error('Error validating endpoint:', error);
      setEndpointError('Failed to validate attendance endpoint. Please try again later.');
    } finally {
      setEndpointLoading(false);
    }
  };

  // Start the QR scanner
  const startScanner = () => {
    if (scannerRef.current) {
      setScanning(true);
      return;
    }

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    try {
      // Create a new scanner instance
      const scanner = new Html5Qrcode(scannerDivId);
      scannerRef.current = scanner;
      
      // Start the scanner with the camera
      scanner.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanFailure
      )
      .then(() => {
        setScanning(true);
      })
      .catch(err => {
        console.error("Failed to start scanner:", err);
        toast({
          title: "Camera Error",
          description: "Failed to access camera. Please ensure camera permissions are granted.",
          variant: "destructive"
        });
        setScanning(false);
      });
    } catch (error) {
      console.error("Scanner initialization error:", error);
      toast({
        title: "Scanner Error",
        description: "Failed to initialize QR scanner.",
        variant: "destructive"
      });
    }
  };

  // Stop the QR scanner
  const stopScanner = () => {
    if (scannerRef.current && scanning) {
      scannerRef.current
        .stop()
        .then(() => {
          setScanning(false);
        })
        .catch(err => {
          console.error("Failed to stop scanner:", err);
        });
    }
  };

  // Handle successful QR scan
  const onScanSuccess = (decodedText: string) => {
    if (lastScanned === decodedText) return; // Prevent duplicate scans
    
    setLastScanned(decodedText);
    processHashcode(decodedText);
    
    // Auto-stop after successful scan
    stopScanner();
  };

  // Handle QR scan failure
  const onScanFailure = (error: any) => {
    // Just log errors but don't show to user unless critical
    console.debug("QR scan error:", error);
  };

  // Process the scanned QR code
  const processHashcode = async (code: string) => {
    setLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hashcode: code,
          eventId: eventId,
          endpointhash: endpointhash,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage({
          title: "Success!",
          description: data.message || "Attendance registered successfully.",
          type: "success"
        });
      } else {
        setMessage({
          title: "Failed",
          description: data.error || "Failed to register attendance.",
          type: "error"
        });
      }
    } catch (error) {
      console.error('Error processing hashcode:', error);
      setMessage({
        title: "Error",
        description: "A network error occurred. Please try again.",
        type: "error"
      });
    } finally {
      setLoading(false);
      setLastScanned(null); // Reset to allow rescanning the same code
    }
  };

  // Handle manual QR code submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualHashcode.trim()) return;
    
    processHashcode(manualHashcode.trim());
    setManualHashcode('');
  };

  // Verify passcode
  const verifyPasscode = async () => {
    if (!passcode.trim()) {
      setPasscodeError('Please enter a passcode.');
      return;
    }
    
    setVerifying(true);
    setPasscodeError('');
    
    try {
      const response = await fetch('/api/attendance/verify-passcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          passcode: passcode.trim(),
          eventId: eventId,
          endpointhash: endpointhash,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.valid) {
        setAuthorized(true);
        setPasscodeDialogOpen(false);
      } else {
        setPasscodeError(data.error || 'Invalid passcode. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying passcode:', error);
      setPasscodeError('A network error occurred. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  // Handle passcode form submission
  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyPasscode();
  };

  // Loading state
  if (endpointLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p>Validating attendance endpoint...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (endpointError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Invalid Endpoint</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center">{endpointError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main component render
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-indigo-900 to-purple-900 text-white">
      {/* Passcode Dialog */}
      <Dialog open={passcodeDialogOpen} onOpenChange={setPasscodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Passcode</DialogTitle>
            <DialogDescription>
              Please enter the 6-character passcode to access the QR code attendance scanner.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasscodeSubmit}>
            <div className="grid gap-4 py-4">
              <Input
                placeholder="Enter 6-character passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="col-span-3"
                maxLength={6}
                autoFocus
              />
              {passcodeError && <p className="text-red-500 text-sm">{passcodeError}</p>}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={verifying}>
                {verifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">QR Code Attendance</h1>
          {authorized && (
            <Button
              variant="outline"
              onClick={() => {
                setAuthorized(false);
                setPasscodeDialogOpen(true);
              }}
              className="bg-red-900 hover:bg-red-800 text-white border-red-700"
            >
              Log Out
            </Button>
          )}
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-md ${
              message.type === "success"
                ? "bg-green-800/30 border border-green-600"
                : message.type === "error"
                ? "bg-red-800/30 border border-red-600"
                : "bg-blue-800/30 border border-blue-600"
            }`}
          >
            <h2 className="text-lg font-semibold mb-1">{message.title}</h2>
            <p>{message.description}</p>
          </div>
        )}

        {/* Content based on authorization state */}
        {authorized ? (
          <div className="space-y-6">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle>QR Code Scanner</CardTitle>
                <div className="flex space-x-2 mt-2">
                  <Button
                    onClick={() => setActiveTab('camera')}
                    variant={activeTab === 'camera' ? "default" : "outline"}
                    size="sm"
                    className={activeTab === 'camera' ? "bg-blue-600" : "bg-transparent"}
                  >
                    <Camera className="mr-2 h-4 w-4" /> Camera Scanner
                  </Button>
                  <Button
                    onClick={() => {
                      setActiveTab('manual');
                      if (scanning) {
                        stopScanner();
                      }
                    }}
                    variant={activeTab === 'manual' ? "default" : "outline"}
                    size="sm"
                    className={activeTab === 'manual' ? "bg-blue-600" : "bg-transparent"}
                  >
                    <Smartphone className="mr-2 h-4 w-4" /> Manual Input
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {activeTab === 'camera' && (
                  <>
                    <div className="mb-4">
                      <p>Use your device's camera to scan attendance QR codes.</p>
                    </div>
                    
                    <div 
                      id={scannerDivId} 
                      className={`aspect-square w-full max-w-md mx-auto border-4 border-dashed border-white/20 rounded-lg overflow-hidden relative ${scanning ? 'bg-black' : 'bg-white/10'}`}
                    >
                      {!scanning && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Camera className="w-16 h-16 text-white/30" />
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 flex justify-center">
                      {loading ? (
                        <Button disabled className="w-full">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </Button>
                      ) : scanning ? (
                        <Button 
                          onClick={stopScanner} 
                          className="w-full bg-red-700 hover:bg-red-800 border-none"
                        >
                          Stop Scanner
                        </Button>
                      ) : (
                        <Button 
                          onClick={startScanner} 
                          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 border-none"
                        >
                          Start Scanner
                        </Button>
                      )}
                    </div>
                  </>
                )}
                
                {activeTab === 'manual' && (
                  <>
                    <div className="mb-4">
                      <p>Enter the QR code using a keyboard wedge scanner or manually type/paste the code.</p>
                    </div>
                    
                    <form onSubmit={handleManualSubmit} className="space-y-4">
                      <div className="relative">
                        <Input
                          placeholder="Ready for QR code input"
                          value={manualHashcode}
                          onChange={(e) => {
                            setManualHashcode(e.target.value);
                            // Auto-submit when input is detected via a device
                            if (e.target.value.trim()) {
                              const timer = setTimeout(() => {
                                processHashcode(e.target.value.trim());
                                setManualHashcode('');
                              }, 300); // Small delay to ensure complete input
                              return () => clearTimeout(timer);
                            }
                          }}
                          className="opacity-0 absolute inset-0 h-full w-full cursor-default"
                          autoFocus={activeTab === 'manual'}
                        />
                        <div className="bg-white/10 border border-white/20 rounded-md p-4 text-center min-h-[50px] flex flex-col justify-center items-center">
                          <Smartphone className="h-8 w-8 mb-2 text-yellow-400" />
                          <p className="text-white/80 font-medium">Ready to accept QR code input</p>
                          <p className="text-white/60 text-xs mt-1">Point your device at the QR code</p>
                        </div>
                      </div>
                      
                      <div className="bg-white/10 border border-white/20 rounded-md p-4 text-white/80">
                        <h4 className="font-medium mb-2">Using a QR Scanner Device:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Click in the input field to focus it</li>
                          <li>Scan the QR code with your scanner device</li>
                          <li>The code will be automatically processed</li>
                          <li>No need to press submit - it works instantly!</li>
                        </ul>
                      </div>
                    </form>
                  </>
                )}
              </CardContent>
            </Card>
              
            <Card>
              <CardHeader>
                <CardTitle>Check-in Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-6">
                  <p className="text-gray-500">Scan a QR code to see check-in results</p>
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
        ) : (
          <div className="flex justify-center">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-center">Authentication Required</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center">
                  Please enter the passcode to access the QR code scanner.
                </p>
                <Button 
                  className="w-full mt-4"
                  onClick={() => setPasscodeDialogOpen(true)}
                >
                  Enter Passcode
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

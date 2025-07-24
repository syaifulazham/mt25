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
  const scannerContainerRef = useRef<HTMLDivElement | null>(null);
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
  
  // Welcome screen state
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeData, setWelcomeData] = useState<{
    name: string;
    logoUrl: string | null;
    contingentName: string;
    stateName?: string;
    institution?: string;
    managerCount?: number;
    contestantCount?: number;
  } | null>(null);
  
  // Input disable state (5 seconds after any read)
  const [inputDisabled, setInputDisabled] = useState(false);
  const [disableTimer, setDisableTimer] = useState<NodeJS.Timeout | null>(null);
  
  // API call guards to prevent multiple simultaneous calls
  const [isProcessing, setIsProcessing] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const lastProcessedHashcode = useRef<string>('');
  
  // Focus management for manual input
  const [windowFocused, setWindowFocused] = useState(true);
  const [inputFocused, setInputFocused] = useState(false);
  const manualInputRef = useRef<HTMLInputElement>(null);

  // Validate the endpoint when component mounts
  useEffect(() => {
    validateEndpoint();
  }, []);

  // Clean up scanner when component unmounts
  useEffect(() => {
    return () => {
      cleanupScanner();
    };
  }, []);
  
  // Focus management for manual input mode
  useEffect(() => {
    const handleWindowFocus = () => {
      setWindowFocused(true);
      // Auto-focus input if in manual mode
      if (activeTab === 'manual' && manualInputRef.current) {
        setTimeout(() => {
          manualInputRef.current?.focus();
        }, 100);
      }
    };
    
    const handleWindowBlur = () => {
      setWindowFocused(false);
    };
    
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [activeTab]);
  
  // Auto-focus input when switching to manual tab
  useEffect(() => {
    if (activeTab === 'manual' && manualInputRef.current) {
      setTimeout(() => {
        manualInputRef.current?.focus();
        setInputFocused(true);
      }, 100);
    }
  }, [activeTab]);

  // Create isolated scanner container outside React's DOM management
  const createScannerContainer = () => {
    // Remove any existing scanner container
    const existingContainer = document.getElementById(scannerDivId);
    if (existingContainer) {
      existingContainer.remove();
    }
    
    // Create new container
    const container = document.createElement('div');
    container.id = scannerDivId;
    container.style.width = '100%';
    container.style.height = '300px';
    
    // Append to the React-managed container
    if (scannerContainerRef.current) {
      scannerContainerRef.current.appendChild(container);
    }
    
    return container;
  };

  // Complete scanner cleanup with DOM isolation
  const cleanupScanner = async () => {
    if (scannerRef.current) {
      try {
        // Check if scanner is actually running before stopping
        const scannerState = scannerRef.current.getState();
        if (scannerState === 2) { // Scanner is running (Html5QrcodeScannerState.SCANNING = 2)
          // Stop the scanner first (this should stop the video stream)
          await scannerRef.current.stop();
          
          // Additional cleanup: Stop any remaining video streams
          const scannerElement = document.getElementById(scannerDivId);
          if (scannerElement) {
            const videoElements = scannerElement.querySelectorAll('video');
            videoElements.forEach((video: HTMLVideoElement) => {
              try {
                if (video.srcObject) {
                  const stream = video.srcObject as MediaStream;
                  stream.getTracks().forEach(track => {
                    track.stop();
                  });
                  video.srcObject = null;
                }
                video.pause();
                video.load(); // Reset video element
              } catch (videoError) {
                console.debug("Video cleanup error (safe to ignore):", videoError);
              }
            });
          }
        }
      } catch (error) {
        // Ignore cleanup errors as component is unmounting
        console.debug("Scanner cleanup error (safe to ignore):", error);
      } finally {
        // Completely remove the scanner container to avoid React DOM conflicts
        try {
          const scannerElement = document.getElementById(scannerDivId);
          if (scannerElement && scannerElement.parentNode) {
            scannerElement.parentNode.removeChild(scannerElement);
          }
        } catch (domError) {
          console.debug("DOM cleanup error (safe to ignore):", domError);
        }
        scannerRef.current = null;
        setScanning(false);
      }
    }
  };

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

  // Check camera availability
  const checkCameraAvailability = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      return videoDevices.length > 0;
    } catch (error) {
      console.error('Error checking camera availability:', error);
      return false;
    }
  };

  // Start the QR scanner with enhanced error handling and DOM isolation
  const startScanner = async () => {
    if (scannerRef.current) {
      setScanning(true);
      return;
    }

    // Check if cameras are available
    const hasCameras = await checkCameraAvailability();
    if (!hasCameras) {
      toast({
        title: "No Camera Found",
        description: "No camera devices detected. Please ensure your device has a camera and try refreshing the page.",
        variant: "destructive"
      });
      return;
    }

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    try {
      // Create isolated scanner container
      createScannerContainer();
      
      // Create a new scanner instance
      const scanner = new Html5Qrcode(scannerDivId);
      scannerRef.current = scanner;
      
      // Try different camera access methods
      const startWithCamera = async () => {
        try {
          // First try with rear camera
          await scanner.start(
            { facingMode: "environment" },
            config,
            onScanSuccess,
            onScanFailure
          );
          return true;
        } catch (envError) {
          console.warn("Rear camera failed, trying front camera:", envError);
          try {
            // Fallback to front camera
            await scanner.start(
              { facingMode: "user" },
              config,
              onScanSuccess,
              onScanFailure
            );
            return true;
          } catch (userError) {
            console.warn("Front camera failed, trying any camera:", userError);
            try {
              // Final fallback to any available camera
              await scanner.start(
                { facingMode: "environment" },
                config,
                onScanSuccess,
                onScanFailure
              );
              return true;
            } catch (anyError) {
              throw anyError;
            }
          }
        }
      };

      await startWithCamera();
      setScanning(true);
      toast({
        title: "Camera Ready",
        description: "QR scanner is now active. Point your camera at a QR code.",
        variant: "default"
      });
      
    } catch (error: any) {
      console.error("Failed to start scanner:", error);
      
      // Provide specific error messages based on error type
      let errorTitle = "Camera Error";
      let errorDescription = "Failed to access camera. Please try the following:";
      
      if (error.name === 'NotFoundError') {
        errorTitle = "Camera Not Found";
        errorDescription = "No camera device found. Please ensure your device has a camera and refresh the page.";
      } else if (error.name === 'NotAllowedError') {
        errorTitle = "Camera Permission Denied";
        errorDescription = "Camera access was denied. Please allow camera permissions in your browser settings and refresh the page.";
      } else if (error.name === 'NotReadableError') {
        errorTitle = "Camera In Use";
        errorDescription = "Camera is being used by another application. Please close other camera apps and try again.";
      } else if (error.name === 'OverconstrainedError') {
        errorTitle = "Camera Constraints Error";
        errorDescription = "Camera doesn't support the requested settings. Try refreshing the page.";
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive"
      });
      
      setScanning(false);
      if (scannerRef.current) {
        scannerRef.current = null;
      }
    }
  };

  // Stop the QR scanner
  const stopScanner = async () => {
    if (scannerRef.current && scanning) {
      await cleanupScanner();
    }
  };

  // Handle successful QR scan with debounce
  const onScanSuccess = (decodedText: string) => {
    console.log('🎯 onScanSuccess CALLED with:', decodedText);
    console.log('loading:', loading, 'lastScanned:', lastScanned);
    
    // Prevent processing if already loading or same code scanned recently
    if (loading || lastScanned === decodedText) {
      console.log('❌ onScanSuccess BLOCKED: loading or duplicate');
      return;
    }
    
    console.log('✅ onScanSuccess PROCEEDING: calling processHashcode');
    setLastScanned(decodedText);
    processHashcode(decodedText);
    // Don't stop scanner immediately - let it continue for rapid scanning
  };

  // Handle QR scan failure
  const onScanFailure = (error: any) => {
    // Just log errors but don't show to user unless critical
    console.debug("QR scan error:", error);
  };

  // Process the scanned QR code
  const processHashcode = async (code: string) => {
    console.log('=== PROCESShashcode CALLED ===');
    console.log('Code:', code);
    console.log('inputDisabled:', inputDisabled);
    console.log('isProcessing:', isProcessing);
    console.log('lastProcessedHashcode.current:', lastProcessedHashcode.current);
    
    // Check if input is disabled
    if (inputDisabled) {
      console.log('❌ BLOCKED: Input is disabled, ignoring request');
      return;
    }
    
    // Prevent multiple simultaneous API calls
    if (isProcessing) {
      console.log('❌ BLOCKED: Already processing a request, ignoring duplicate');
      return;
    }
    
    // Prevent rapid duplicate hashcode processing (only block for 1 second)
    if (lastProcessedHashcode.current === code) {
      console.log('❌ BLOCKED: Same hashcode recently processed, ignoring rapid duplicate:', code);
      return;
    }
    
    console.log('✅ PROCEEDING: All checks passed, processing hashcode...');
    
    // Mark as processing and store last processed hashcode
    setIsProcessing(true);
    lastProcessedHashcode.current = code;
    
    // Disable input for 5 seconds
    setInputDisabled(true);
    if (disableTimer) {
      clearTimeout(disableTimer);
    }
    const newTimer = setTimeout(() => {
      setInputDisabled(false);
      // CRITICAL: Ensure input ref is restored after re-enabling
      setTimeout(() => {
        if (activeTab === 'manual' && manualInputRef.current) {
          manualInputRef.current.focus();
          console.log('🔄 REF RESTORED: Input ref reconnected after disable/enable cycle');
        } else {
          console.log('⚠️ REF LOST: manualInputRef.current is null after re-enabling');
        }
      }, 100);
    }, 5000);
    setDisableTimer(newTimer);
    
    setLoading(true);
    setMessage(null);
    
    try {
      console.log('Sending check-in request with:', {
        hashcode: code,
        eventId: String(eventId), // Ensure it's a string
        endpointhash: String(endpointhash) // Ensure it's a string
      });
      
      const response = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hashcode: code,
          eventId: String(eventId), // Convert to string to ensure it's not undefined
          endpointhash: String(endpointhash), // Convert to string to ensure it's not undefined
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Show welcome screen with contingent data
        if (data.contingent) {
          setWelcomeData({
            name: data.contingent.name,
            logoUrl: data.contingent.logoUrl,
            contingentName: data.contingent.name,
            stateName: data.contingent.stateName,
            institution: data.contingent.institution,
            managerCount: data.contingent.managerCount,
            contestantCount: data.contingent.contestantCount
          });
          setShowWelcome(true);
          
          // Hide welcome screen after 5 seconds and show success message
          setTimeout(() => {
            setShowWelcome(false);
            setWelcomeData(null);
            setMessage({
              title: "Success!",
              description: data.message || "Attendance registered successfully.",
              type: "success"
            });
            
            // Force cursor back to manual input box after welcome screen
            if (activeTab === 'manual' && manualInputRef.current) {
              setTimeout(() => {
                manualInputRef.current?.focus();
                console.log('Cursor refocused to manual input box after welcome screen');
              }, 200); // Small delay to ensure welcome screen is fully hidden
            }
          }, 5000);
        } else {
          // Fallback if no contingent data
          setMessage({
            title: "Success!",
            description: data.message || "Attendance registered successfully.",
            type: "success"
          });
        }
      } else {
        // Handle specific error cases with user-friendly messages
        let errorTitle = "Check-in Failed";
        let errorDescription = data.error || "Failed to register attendance.";
        
        if (data.error?.includes("Attendance not available")) {
          errorTitle = "Outside Check-in Hours";
          errorDescription = data.message || "Check-in is only allowed within 2 hours before the event starts until the event ends.";
        } else if (data.error?.includes("Already checked in")) {
          errorTitle = "Already Checked In";
          errorDescription = data.message || "This contingent has already been checked in for this event.";
        } else if (data.error?.includes("Invalid QR code")) {
          errorTitle = "Invalid QR Code";
          errorDescription = "This QR code is not registered for this event.";
        } else if (data.error?.includes("Only manager codes")) {
          errorTitle = "Manager Code Required";
          errorDescription = "Please scan a manager's QR code to check in the entire contingent.";
        }
        
        setMessage({
          title: errorTitle,
          description: errorDescription,
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
      
      // Reset processing state to allow new API calls
      setIsProcessing(false);
      
      // Reset lastScanned immediately to allow rapid scanning of different codes
      setTimeout(() => {
        setLastScanned(null);
        console.log('lastScanned reset - ready for new scans');
      }, 500); // Quick reset for rapid scanning
      
      // Force cursor back to manual input box for rapid scanning - CRITICAL for QR devices
      if (activeTab === 'manual' && manualInputRef.current) {
        console.log('🔍 DEBUG: activeTab is manual, manualInputRef exists');
        
        // Multiple focus attempts to ensure it works
        setTimeout(() => {
          if (manualInputRef.current) {
            manualInputRef.current.focus();
            console.log('🎯 FOCUS ATTEMPT 1: Called focus()');
            console.log('🎯 FOCUS CHECK 1: document.activeElement:', document.activeElement === manualInputRef.current ? 'SUCCESS' : 'FAILED');
            console.log('🎯 INPUT STATE 1: disabled=', manualInputRef.current.disabled, 'value=', manualInputRef.current.value);
          }
        }, 100);
        
        setTimeout(() => {
          if (manualInputRef.current) {
            manualInputRef.current.focus();
            console.log('🎯 FOCUS ATTEMPT 2: Called focus()');
            console.log('🎯 FOCUS CHECK 2: document.activeElement:', document.activeElement === manualInputRef.current ? 'SUCCESS' : 'FAILED');
            console.log('🎯 INPUT STATE 2: disabled=', manualInputRef.current.disabled, 'value=', manualInputRef.current.value);
          }
        }, 600); // After lastScanned reset
        
        setTimeout(() => {
          if (manualInputRef.current) {
            manualInputRef.current.focus();
            console.log('🎯 FOCUS ATTEMPT 3: Called focus()');
            console.log('🎯 FOCUS CHECK 3: document.activeElement:', document.activeElement === manualInputRef.current ? 'SUCCESS' : 'FAILED');
            console.log('🎯 INPUT STATE 3: disabled=', manualInputRef.current.disabled, 'value=', manualInputRef.current.value);
          }
        }, 1200); // After hashcode reset
      } else {
        console.log('❌ DEBUG: Focus not attempted - activeTab:', activeTab, 'manualInputRef.current:', !!manualInputRef.current);
      }
      
      // Reset the processed hashcode after short delay to allow different QR codes
      setTimeout(() => {
        lastProcessedHashcode.current = '';
        console.log('Hashcode duplicate protection reset - ready for new scans');
      }, 1000); // Shorter delay to allow rapid scanning of different codes
    }
  };

  // Handle manual QR code submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualHashcode.trim() || inputDisabled) return;
    
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
      {/* Animated Welcome Screen Overlay */}
      {showWelcome && welcomeData && (
        <div className="fixed inset-0 z-50 bg-gradient-to-b from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center animate-in fade-in duration-500">
          <div className="text-center px-8 animate-in slide-in-from-bottom-4 duration-700">
            {/* State Name */}
            {welcomeData.stateName && (
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 animate-in fade-in duration-1000">
                {welcomeData.stateName}
              </h2>
            )}
            
            {/* Main Title */}
            <h1 className="text-4xl md:text-6xl font-bold text-yellow-400 mb-8 animate-in zoom-in duration-1000 delay-200">
              MALAYSIA TECHLYMPICS 2025
            </h1>
            
            {/* Welcome Message */}
            <h2 className="text-3xl md:text-5xl font-semibold text-white mb-8 animate-in slide-in-from-left duration-1000 delay-300">
              SELAMAT DATANG
            </h2>
            
            {/* Contingent Logo */}
            {welcomeData.logoUrl && (
              <div className="mb-8 animate-in zoom-in duration-1000 delay-500">
                <img 
                  src={welcomeData.logoUrl} 
                  alt="Contingent Logo" 
                  className="mx-auto w-32 h-32 md:w-48 md:h-48 object-contain rounded-full border-4 border-yellow-400 shadow-2xl"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            
            {/* Contingent Name */}
            <h3 className="text-2xl md:text-4xl font-bold text-yellow-300 mb-4 animate-in slide-in-from-right duration-1000 delay-700">
              {welcomeData.contingentName}
            </h3>
            
            {/* Institution */}
            {welcomeData.institution && (
              <div className="mb-6 animate-in fade-in duration-1000 delay-800">
                <p className="text-lg md:text-xl text-blue-200">
                  {welcomeData.institution}
                </p>
              </div>
            )}
            
            {/* Participant Counts */}
            {(welcomeData.managerCount !== undefined || welcomeData.contestantCount !== undefined) && (
              <div className="mb-6 animate-in slide-in-from-bottom duration-1000 delay-900">
                <div className="flex justify-center space-x-8">
                  {welcomeData.managerCount !== undefined && (
                    <div className="text-center">
                      <div className="text-2xl md:text-3xl font-bold text-green-400">
                        {welcomeData.managerCount}
                      </div>
                      <div className="text-sm md:text-base text-gray-300">
                        Jumlah Pengurus/<br />Pengiring
                      </div>
                    </div>
                  )}
                  {welcomeData.contestantCount !== undefined && (
                    <div className="text-center">
                      <div className="text-2xl md:text-3xl font-bold text-blue-400">
                        {welcomeData.contestantCount}
                      </div>
                      <div className="text-sm md:text-base text-gray-300">
                        Jumlah Peserta
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Tagline */}
            <p className="text-xl md:text-2xl font-medium text-gray-200 animate-in fade-in duration-1000 delay-1000">
              Luar Biasa, Global, Inklusif
            </p>
            
            {/* Success Checkmark Animation */}
            <div className="mt-8 animate-in zoom-in duration-1000 delay-1200">
              <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
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
                    onClick={() => {
                      console.log('📷 TAB SWITCH: Switching to Camera Scanner mode');
                      setActiveTab('camera');
                    }}
                    variant={activeTab === 'camera' ? "default" : "outline"}
                    size="sm"
                    className={activeTab === 'camera' ? "bg-blue-600" : "bg-transparent"}
                  >
                    <Camera className="mr-2 h-4 w-4" /> Camera Scanner
                  </Button>
                  <Button
                    onClick={() => {
                      console.log('📱 TAB SWITCH: Switching to Manual Input mode');
                      setActiveTab('manual');
                      if (scanning) {
                        console.log('🛑 Stopping camera scanner for manual mode');
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
                      ref={scannerContainerRef}
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
                          ref={manualInputRef}
                          placeholder="Ready for QR code input"
                          value={manualHashcode}
                          maxLength={100} // Allow longer hashcodes
                          onChange={(e) => {
                            const currentValue = e.target.value;
                            console.log('Manual input onChange:', currentValue, 'Length:', currentValue.length);
                            
                            // PROGRAMMATIC DISABLE: Ignore input when disabled (preserve ref)
                            if (inputDisabled) {
                              console.log('🚫 INPUT IGNORED: Input is disabled, clearing value');
                              setManualHashcode('');
                              return;
                            }
                            
                            setManualHashcode(currentValue);
                            
                            // Clear existing debounce timer to prevent multiple overlapping calls
                            if (debounceTimer) {
                              clearTimeout(debounceTimer);
                            }
                            
                            // Auto-submit when input is detected via a device
                            if (currentValue.trim()) {
                              const hashcodeToProcess = currentValue.trim();
                              console.log('Auto-submitting hashcode (debounced):', hashcodeToProcess, 'Length:', hashcodeToProcess.length);
                              
                              // Set new debounce timer
                              console.log('🕐 Setting debounce timer for:', hashcodeToProcess);
                              const timer = setTimeout(() => {
                                console.log('⏰ DEBOUNCE TIMER FIRED - Processing hashcode:', hashcodeToProcess, 'Length:', hashcodeToProcess.length);
                                processHashcode(hashcodeToProcess);
                                setManualHashcode('');
                              }, 1000); // Debounced delay to ensure complete input from QR scanners
                              
                              setDebounceTimer(timer);
                              console.log('✅ Debounce timer set successfully');
                            }
                          }}
                          onFocus={() => {
                            console.log('🔄 INPUT FOCUS: Manual input focused');
                            setInputFocused(true);
                          }}
                          onBlur={() => {
                            console.log('🔄 INPUT BLUR: Manual input blurred');
                            setInputFocused(false);
                          }}
                          className="opacity-0 absolute inset-0 h-full w-full cursor-default"
                          autoFocus={activeTab === 'manual'}
                          // NEVER disable to preserve ref - handle disabling programmatically
                        />
                        <div 
                          className={`rounded-md p-4 text-center min-h-[50px] flex flex-col justify-center items-center transition-all duration-300 ${
                            inputDisabled
                              ? "bg-red-600/80 border border-red-500"
                              : (!windowFocused || !inputFocused) && activeTab === 'manual'
                              ? "bg-yellow-600/80 border border-yellow-500 cursor-pointer hover:bg-yellow-600/90"
                              : "bg-green-600/80 border border-green-500"
                          }`}
                          onClick={() => {
                            if ((!windowFocused || !inputFocused) && activeTab === 'manual' && !inputDisabled) {
                              manualInputRef.current?.focus();
                            }
                          }}
                        >
                          <Smartphone className={`h-8 w-8 mb-2 ${
                            inputDisabled 
                              ? "text-red-200" 
                              : (!windowFocused || !inputFocused) && activeTab === 'manual'
                              ? "text-yellow-200"
                              : "text-green-200"
                          }`} />
                          <p className="text-white font-semibold">
                            {inputDisabled 
                              ? "Wait..." 
                              : (!windowFocused || !inputFocused) && activeTab === 'manual'
                              ? "Click here to focus for QR scanner input"
                              : "Ready to accept QR code input"
                            }
                          </p>
                          {!inputDisabled && windowFocused && inputFocused && (
                            <p className="text-white/80 text-xs mt-1">Point your device at the QR code</p>
                          )}
                          {(!windowFocused || !inputFocused) && activeTab === 'manual' && !inputDisabled && (
                            <p className="text-yellow-200 text-xs mt-1">Window or input field is not focused</p>
                          )}
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

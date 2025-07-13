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

export default function PublicQRCodeAgentAttendancePage() {
  const params = useParams();
  const { eventId, endpointhash } = params;
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
  const scannerDivId = "qr-reader-agent";
  const [manualHashcode, setManualHashcode] = useState('');
  // Define tab types as a constant to ensure consistency
  const TAB_TYPES = {
    CAMERA: 'camera',
    MANUAL: 'manual'
  } as const;
  
  type TabType = typeof TAB_TYPES[keyof typeof TAB_TYPES];
  const [activeTab, setActiveTab] = useState<TabType>(TAB_TYPES.CAMERA);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [passcodeValidated, setPasscodeValidated] = useState(false);
  const [endpointData, setEndpointData] = useState<EndpointData | null>(null);
  const [endpointLoading, setEndpointLoading] = useState(true);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [focusWarning, setFocusWarning] = useState<{ visible: boolean; id: number }>({ visible: false, id: 0 });
  const [windowFocused, setWindowFocused] = useState(true);
  const [welcomeDialog, setWelcomeDialog] = useState<{
    open: boolean;
    participant: {
      name: string;
      ic: string;
      contingentName: string;
      team: string;
      state?: string;
      contestName?: string;
      contingentLogo?: string;
    } | null;
  }>({ open: false, participant: null });
  const manualInputRef = useRef<HTMLInputElement>(null);
  const [scannerMounted, setScannerMounted] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [cameras, setCameras] = useState<{ deviceId: string; label: string }[]>([]);

  // Check endpoint validity on component mount
  useEffect(() => {
    checkEndpointValidity();
  }, []);

  // Focus management
  useEffect(() => {
    const handleWindowFocus = () => setWindowFocused(true);
    const handleWindowBlur = () => setWindowFocused(false);
    
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  // Focus warning for manual input mode
  useEffect(() => {
    if (activeTab === TAB_TYPES.MANUAL && passcodeValidated && !inputDisabled) {
      const warningId = Date.now();
      setFocusWarning({ visible: !windowFocused, id: warningId });
      
      if (!windowFocused) {
        const timer = setTimeout(() => {
          setFocusWarning(prev => prev.id === warningId ? { visible: false, id: warningId } : prev);
        }, 5000);
        return () => clearTimeout(timer);
      }
    } else {
      setFocusWarning({ visible: false, id: 0 });
    }
  }, [activeTab, passcodeValidated, inputDisabled, windowFocused]);

  // Auto-focus manual input
  useEffect(() => {
    if (activeTab === TAB_TYPES.MANUAL && passcodeValidated && !inputDisabled && manualInputRef.current) {
      const timer = setTimeout(() => {
        manualInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, passcodeValidated, inputDisabled]);
  
  // Clean up scanner when component unmounts
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);
  
  // Setup scanner when tab changes to camera
  useEffect(() => {
    if (activeTab === TAB_TYPES.CAMERA && passcodeValidated) {
      console.log('Camera tab active, scanner container should mount');
      setScannerMounted(true);
    } else {
      stopScanning();
    }
  }, [activeTab, passcodeValidated]);

  const checkEndpointValidity = async () => {
    setEndpointLoading(true);
    try {
      const response = await fetch(`/api/attendance/agent/validate/${eventId}/${endpointhash}`);
      if (response.ok) {
        const data = await response.json();
        setEndpointData(data);
      } else {
        const errorData = await response.json();
        setMessage({
          title: "Invalid Endpoint",
          description: errorData.error || "This attendance agent endpoint is not valid or has expired.",
          type: 'error'
        });
      }
    } catch (error) {
      console.error("Error validating agent endpoint:", error);
      setMessage({
        title: "Connection Error",
        description: "Unable to validate agent endpoint. Please check your internet connection.",
        type: 'error'
      });
    } finally {
      setEndpointLoading(false);
    }
  };

  const validatePasscode = async () => {
    if (!passcode.trim()) {
      setPasscodeError('Please enter the passcode');
      return;
    }

    setLoading(true);
    setPasscodeError('');

    try {
      const response = await fetch(`/api/attendance/agent/validate-passcode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          endpointhash,
          passcode,
        }),
      });

      if (response.ok) {
        setPasscodeValidated(true);
        toast({
          title: "Access Granted",
          description: "You can now scan QR codes or enter attendance manually.",
        });
      } else {
        const errorData = await response.json();
        setPasscodeError(errorData.error || 'Invalid passcode');
      }
    } catch (error) {
      console.error("Error validating passcode:", error);
      setPasscodeError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (hashcode: string) => {
    try {
      setLoading(true);
      setMessage(null);
      console.log('📡 API Request: Checking participant details for hashcode', hashcode);
      
      const response = await fetch(`/api/attendance/agent/check-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hashcode,
          endpointHash: params.endpointhash,
        }),
      });

      const data = await response.json();
      console.log('📡 API Response:', data);

      if (data.success) {
        setMessage({ 
          title: "Participant Found!", 
          description: `Details retrieved for ${data.participant?.name || 'Participant'}`, 
          type: 'success' 
        });
        
        // Show participant details dialog
        if (data.participant) {
          setWelcomeDialog({
            open: true,
            participant: data.participant
          });
        }

        // Clear input and disable temporarily
        if (activeTab === TAB_TYPES.MANUAL) {
          setManualHashcode('');
          setInputDisabled(true);
          // Re-enable input after 5 seconds and refocus
          setTimeout(() => {
            setInputDisabled(false);
            if (manualInputRef.current) {
              manualInputRef.current.focus();
            }
          }, 5000);
        }
      } else {
        setMessage({ 
          title: "Participant Not Found", 
          description: data.message || 'No participant found with this QR code', 
          type: 'error' 
        });
      }
    } catch (error) {
      console.error('📡 API Error:', error);
      setMessage({ 
        title: "Connection Error", 
        description: 'Unable to connect to the server', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const processHashcode = async (hashcode: string) => {
    if (hashcode === lastScanned) {
      console.log("Duplicate scan detected, ignoring");
      return;
    }
    
    if (!endpointData?.exists) {
      toast({
        title: "Invalid Endpoint",
        description: "This attendance endpoint is not valid.",
        variant: "destructive",
      });
      return;
    }
    
    setLastScanned(hashcode);
    setInputDisabled(true);
    setLoading(true);
    
    try {
      await handleSubmit(hashcode);
    } catch (error) {
      console.error('Error during check-in:', error);
      setMessage({
        title: "Check-in Error",
        description: "An error occurred during check-in. Please try again.",
        type: 'error'
      });
    } finally {
      setLoading(false);
      setTimeout(() => {
        setInputDisabled(false);
        // Focus back on manual input after processing if in manual mode
        if (activeTab === TAB_TYPES.MANUAL && manualInputRef.current) {
          manualInputRef.current.focus();
        }
      }, 1500); // Short delay to prevent accidental duplicate scans
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
    processHashcode(decodedText);
    // Don't stop scanner immediately - let it continue for rapid scanning
  };

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
      scannerContainerRef.current.innerHTML = ''; // Clear any existing content
      scannerContainerRef.current.appendChild(container);
      console.log("Scanner container created with ID:", scannerDivId);
      return true;
    } else {
      console.error("Scanner container ref not available");
      return false;
    }
  };

  // State to track selected camera
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>(undefined);
  const [currentFacingMode, setCurrentFacingMode] = useState<'environment' | 'user'>('environment');
  const [isMobile, setIsMobile] = useState(false);
  const [frontCamera, setFrontCamera] = useState<{deviceId: string; label: string} | null>(null);
  const [backCamera, setBackCamera] = useState<{deviceId: string; label: string} | null>(null);
  
  // Function to detect if device is mobile
  const detectMobile = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           !!(navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
  };

  // Function to classify cameras as front or back
  const classifyCamera = (device: MediaDeviceInfo, index: number) => {
    const label = device.label.toLowerCase();
    
    // Check for explicit front/back indicators in label
    const isFront = label.includes('front') || label.includes('user') || label.includes('face');
    const isBack = label.includes('back') || label.includes('rear') || label.includes('environment');
    
    if (isFront) return 'front';
    if (isBack) return 'back';
    
    // Fallback: first camera is usually back, second is front on mobile
    return index === 0 ? 'back' : 'front';
  };

  // Function to get available cameras
  const getAvailableCameras = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.error("MediaDevices API not supported");
        return [];
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      const camerasList = videoDevices.map((device, index) => {
        const classification = classifyCamera(device, index);
        return {
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
          type: classification
        };
      });
      
      console.log("Available cameras:", camerasList);
      
      // Set front and back camera references
      const front = camerasList.find(cam => cam.type === 'front');
      const back = camerasList.find(cam => cam.type === 'back');
      
      if (front) setFrontCamera({ deviceId: front.deviceId, label: front.label });
      if (back) setBackCamera({ deviceId: back.deviceId, label: back.label });
      
      return camerasList;
    } catch (error) {
      console.error("Error enumerating cameras:", error);
      return [];
    }
  };
  
  // Initialize mobile detection and cameras
  useEffect(() => {
    const initializeMobile = async () => {
      const mobile = detectMobile();
      setIsMobile(mobile);
      
      if (mobile) {
        const availableCameras = await getAvailableCameras();
        setCameras(availableCameras);
      }
    };
    
    initializeMobile();
  }, []);

  // Switch camera function
  const switchCamera = async (deviceId: string) => {
    await stopScanning();
    setSelectedCamera(deviceId);
    await startScanning(deviceId);
  };

  // Toggle between front and back camera for mobile
  const toggleMobileCamera = async () => {
    if (!isMobile) return;
    
    const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    setCurrentFacingMode(newFacingMode);
    
    await stopScanning();
    await startScanning(undefined, newFacingMode);
  };

  // Switch to specific camera (front or back)
  const switchToCamera = async (cameraType: 'front' | 'back') => {
    const targetCamera = cameraType === 'front' ? frontCamera : backCamera;
    if (!targetCamera) return;
    
    const facingMode = cameraType === 'front' ? 'user' : 'environment';
    setCurrentFacingMode(facingMode);
    
    await stopScanning();
    await startScanning(targetCamera.deviceId, facingMode);
  };

  // Start the QR scanner with enhanced error handling and DOM isolation
  const startScanning = async (deviceId?: string, facingMode?: 'environment' | 'user') => {
    try {
      setScanning(true);
      setMessage(null);
      
      // Stop any existing scanner first
      await stopScanning();
      
      // Check if cameras are available
      const hasCameras = await checkCameraAvailability();
      if (!hasCameras) {
        setMessage({
          title: "No Camera Found",
          description: "No camera devices detected. Please ensure your device has a camera and try refreshing the page.",
          type: 'error'
        });
        setScanning(false);
        return;
      }

      // Create container with a delay to ensure DOM is ready
      setTimeout(async () => {
        try {
          console.log("Creating scanner container...");
          const containerCreated = createScannerContainer();
          if (!containerCreated) {
            setMessage({
              title: "Scanner Setup Failed",
              description: "Unable to create scanner interface. Please refresh the page and try again.",
              type: 'error'
            });
            setScanning(false);
            return;
          }
          
          // Initialize scanner after container is ready
          await initializeScanner(deviceId, facingMode);
        } catch (error) {
          console.error("Error during scanner setup:", error);
          setMessage({
            title: "Scanner Error",
            description: "Failed to set up scanner: " + (error instanceof Error ? error.message : 'Unknown error'),
            type: 'error'
          });
          setScanning(false);
        }
      }, 300);
    } catch (error) {
      console.error("Error in startScanning:", error);
      setMessage({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions and try again.",
        type: 'error'
      });
      setScanning(false);
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
  
  // Initialize the QR scanner
  const initializeScanner = async (deviceId?: string, facingMode?: 'environment' | 'user') => {
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    try {  
      // Verify scanner container exists
      const container = document.getElementById(scannerDivId);
      if (!container) {
        throw new Error("Scanner container not found in DOM");
      }
      
      // Create a new scanner instance
      const scanner = new Html5Qrcode(scannerDivId);
      scannerRef.current = scanner;
      
      // Use specified facing mode or default to rear camera
      const targetFacingMode = facingMode || currentFacingMode;
      
      // Try different camera access methods
      const startWithCamera = async () => {
        try {
          // Use specific device ID if provided
          if (deviceId) {
            await scanner.start(
              deviceId,
              config,
              onScanSuccess,
              onScanFailure
            );
            return true;
          }
          
          // Use specified facing mode or default to rear camera
          const targetFacingMode = facingMode || currentFacingMode;
          
          await scanner.start(
            { facingMode: targetFacingMode },
            config,
            onScanSuccess,
            onScanFailure
          );
          return true;
        } catch (specificError) {
          console.warn(`Camera failed with ${deviceId ? 'deviceId' : 'facingMode'}: ${deviceId || targetFacingMode}:`, specificError);
          
          // Fallback logic
          try {
            const fallbackMode = targetFacingMode === 'environment' ? 'user' : 'environment';
            await scanner.start(
              { facingMode: fallbackMode },
              config,
              onScanSuccess,
              onScanFailure
            );
            return true;
          } catch (fallbackError) {
            console.warn("Fallback camera failed, trying any available:", fallbackError);
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
      console.log("Scanner started successfully");
      
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
      
      setMessage({
        title: errorTitle,
        description: errorDescription,
        type: 'error'
      });
      
      setScanning(false);
      if (scannerRef.current) {
        scannerRef.current = null;
      }
    }
  };
  
  // Handle QR scan failure
  const onScanFailure = (error: any) => {
    // Just log errors but don't show to user unless critical
    console.debug("QR scan error:", error);
  };

  // Complete scanner cleanup with DOM isolation
  const cleanupScanner = async () => {
    if (scannerRef.current) {
      try {
        console.log("Stopping scanner...");
        // Check if scanner is actually running before stopping
        try {
          const scannerState = scannerRef.current.getState();
          if (scannerState === 2) { // Scanner is running (Html5QrcodeScannerState.SCANNING = 2)
            // Stop the scanner first (this should stop the video stream)
            await scannerRef.current.stop();
            console.log("Scanner stopped successfully");
          }
        } catch (stateError) {
          console.debug("Error getting scanner state:", stateError);
          // Still attempt to stop the scanner
          try {
            await scannerRef.current.stop();
          } catch (stopError) {
            console.debug("Additional stop error:", stopError);
          }
        }
        
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

  const stopScanning = async () => {
    await cleanupScanner();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualHashcode.trim()) {
      processHashcode(manualHashcode.trim());
      setManualHashcode('');
    }
  };

  const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (inputDisabled) {
      e.target.value = '';
      return;
    }
    setManualHashcode(e.target.value);
  };

  const closeWelcomeDialog = () => {
    setWelcomeDialog({ open: false, participant: null });
    // Force focus back to manual input
    if (activeTab === TAB_TYPES.MANUAL && manualInputRef.current) {
      setTimeout(() => {
        manualInputRef.current?.focus();
      }, 100);
    }
  };

  if (endpointLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Validating agent endpoint...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!endpointData?.exists) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-red-600">Invalid Endpoint</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              This attendance agent endpoint is not valid or has expired. Please contact the event organizer for a valid link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!passcodeValidated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle>Agent Access Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label htmlFor="passcode" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter Agent Passcode
                </label>
                <Input
                  id="passcode"
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && validatePasscode()}
                  placeholder="Enter passcode"
                  className={passcodeError ? 'border-red-500' : ''}
                />
                {passcodeError && (
                  <p className="text-red-500 text-sm mt-1">{passcodeError}</p>
                )}
              </div>
              <Button 
                onClick={validatePasscode} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating
                  </>
                ) : (
                  'Access Agent Portal'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Main Content */}
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">QR Code Attendance Agent</h1>
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
            <h2 className="text-lg font-semibold mb-1 text-white">{message.title}</h2>
            <p className="text-white/90">{message.description}</p>
          </div>
        )}

        {/* Content based on authorization state */}
        <div className="space-y-6">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white">QR Code Scanner</CardTitle>
              <div className="flex space-x-2 mt-2">
                <Button
                  onClick={() => {
                    console.log('📷 TAB SWITCH: Switching to Camera Scanner mode');
                    setActiveTab(TAB_TYPES.CAMERA);
                  }}
                  variant={activeTab === TAB_TYPES.CAMERA ? "default" : "outline"}
                  size="sm"
                  className={activeTab === TAB_TYPES.CAMERA ? "bg-blue-600" : "bg-transparent"}
                >
                  <Camera className="mr-2 h-4 w-4" /> Camera Scanner
                </Button>
                <Button
                  onClick={() => {
                    console.log('📱 TAB SWITCH: Switching to Manual Input mode');
                    setActiveTab(TAB_TYPES.MANUAL);
                    if (scanning) {
                      console.log('🛑 Stopping camera scanner for manual mode');
                      stopScanning();
                    }
                  }}
                  variant={activeTab === TAB_TYPES.MANUAL ? "default" : "outline"}
                  size="sm"
                  className={activeTab === TAB_TYPES.MANUAL ? "bg-blue-600" : "bg-transparent"}
                >
                  <Smartphone className="mr-2 h-4 w-4" /> Manual Input
                </Button>
              </div>

              {/* Camera selector dropdown - only show when camera tab is active and multiple cameras */}
              {activeTab === TAB_TYPES.CAMERA && cameras.length > 1 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="mt-2">
                      Switch Camera
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {cameras.map((camera) => (
                      <DropdownMenuItem
                        key={camera.deviceId}
                        onClick={() => switchCamera(camera.deviceId)}
                      >
                        {camera.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Mobile-specific camera toggle buttons */}
              {activeTab === TAB_TYPES.CAMERA && isMobile && (frontCamera || backCamera) && (
                <div className="mt-3 flex gap-2 justify-center">
                  {frontCamera && (
                    <Button
                      variant={currentFacingMode === 'user' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => switchToCamera('front')}
                      className="flex-1"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Front Camera
                    </Button>
                  )}
                  {backCamera && (
                    <Button
                      variant={currentFacingMode === 'environment' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => switchToCamera('back')}
                      className="flex-1"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Back Camera
                    </Button>
                  )}
                </div>
              )}

              {/* Quick toggle button for mobile */}
              {activeTab === TAB_TYPES.CAMERA && isMobile && (frontCamera && backCamera) && (
                <div className="mt-2 flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleMobileCamera}
                    className="text-white/70 hover:text-white"
                  >
                    🔄 Toggle Camera ({currentFacingMode === 'environment' ? 'Back' : 'Front'})
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {activeTab === TAB_TYPES.CAMERA && (
                <>
                  <div className="mb-4">
                    <p className="text-white/80">Use your device's camera to scan attendance QR codes.</p>
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
                        onClick={stopScanning} 
                        className="w-full bg-red-700 hover:bg-red-800 border-none"
                      >
                        Stop Scanner
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => startScanning()} 
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 border-none"
                      >
                        Start Scanner
                      </Button>
                    )}
                  </div>
                </>
              )}
              
              {activeTab === TAB_TYPES.MANUAL && (
                <>
                  <div className="mb-4">
                    <p className="text-white/80">Enter the QR code using a keyboard wedge scanner or manually type/paste the code.</p>
                  </div>
                  
                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div className="relative">
                      <Input
                        ref={manualInputRef}
                        placeholder="Ready for QR code input"
                        value={manualHashcode}
                        maxLength={100}
                        onChange={handleManualInputChange}
                        onFocus={() => {
                          setInputFocused(true);
                          console.log('📱 Manual input focused');
                        }}
                        onBlur={() => {
                          setInputFocused(false);
                          console.log('📱 Manual input blurred');
                        }}
                        className="text-lg"
                        style={{
                          opacity: inputDisabled ? 0.5 : 1,
                          backgroundColor: inputDisabled ? '#374151' : 'white'
                        }}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={loading || !manualHashcode.trim() || inputDisabled}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Submit'
                      )}
                    </Button>
                    
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
      </div>

      {/* Welcome Dialog with Professional Participant Details */}
      <Dialog open={welcomeDialog.open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-green-600">
              Participant Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {welcomeDialog.participant?.contingentLogo && (
              <div className="flex justify-center">
                <Image
                  src={welcomeDialog.participant.contingentLogo}
                  alt="Contingent Logo"
                  width={80}
                  height={80}
                  className="rounded-full"
                />
              </div>
            )}
            
            {/* State & Contingent */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              {welcomeDialog.participant?.state && (
                <div className="text-center mb-1 font-semibold text-gray-700">
                  {welcomeDialog.participant.state}
                </div>
              )}
              <div className="text-center font-medium text-lg text-indigo-700">
                {welcomeDialog.participant?.contingentName || ''}
              </div>
            </div>
            
            {/* Participant Name */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="text-center text-xl font-semibold text-blue-900">
                {welcomeDialog.participant?.name || ''}
              </div>
              <div className="text-center text-sm text-gray-600">
                {welcomeDialog.participant?.ic || ''}
              </div>
            </div>
            
            {/* Team & Contest */}
            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
              <div className="text-center font-medium text-emerald-800">
                {welcomeDialog.participant?.team || ''}
              </div>
              {welcomeDialog.participant?.contestName && (
                <div className="text-center text-sm text-emerald-600 mt-1">
                  {welcomeDialog.participant.contestName}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex gap-2 mt-4">
            <Button onClick={closeWelcomeDialog} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, QrCode, AlertCircle } from 'lucide-react';
import QRCode from 'qrcode';

interface AttendanceData {
  contingent: {
    id: number;
    name: string;
  };
  attendanceContingent: {
    id: number;
    hashcode: string;
    contingentId: number;
    eventId: number;
    attendanceDate: string;
    attendanceTime: string;
    attendanceStatus: string;
  };
}

export default function QRCodeButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);


  const fetchAttendanceData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/participants/attendance-contingent');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch attendance data');
      }
      
      setAttendanceData(result.data);
      
      // Generate QR code
      if (result.data?.attendanceContingent?.hashcode) {
        const qrDataUrl = await QRCode.toDataURL(result.data.attendanceContingent.hashcode, {
          width: 256,
          margin: 2,
          color: {
            dark: '#DC2626',
            light: '#FFFFFF'
          }
        });
        setQrCodeDataUrl(qrDataUrl);
      }
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !attendanceData) {
      fetchAttendanceData();
    }
  };



  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <QrCode className="h-4 w-4 mr-2" />
          QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode size={20} />
            Attendance QR Code
          </DialogTitle>
          <DialogDescription>
            Your unique QR code for event attendance registration
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading attendance data...</span>
            </div>
          )}
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {attendanceData && !loading && (
            <div className="space-y-4">
              {/* QR Code Display */}
              {qrCodeDataUrl && (
                <div className="flex flex-col items-center space-y-3">
                  <div className="bg-white p-4 rounded-lg border">
                    <img 
                      src={qrCodeDataUrl} 
                      alt="Attendance QR Code" 
                      className="w-48 h-48"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

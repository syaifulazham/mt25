import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { CalendarCheck, Users, QrCode, Clipboard } from 'lucide-react';

export default async function AttendanceLogPage({ params }: { params: { id: string } }) {
  // Get user session for access control
  const session = await getServerSession(authOptions);

  // Redirect if not authenticated or not authorized
  if (!session) {
    redirect('/auth/signin');
  }

  // Check for proper role
  const { role } = session.user;
  if (!['ADMIN', 'OPERATOR'].includes(role)) {
    redirect('/dashboard');
  }

  const eventId = params.id;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Attendance Log</h1>
      
      <Tabs defaultValue="qrcode" className="w-full">
        <TabsList className="grid grid-cols-2 mb-8">
          <TabsTrigger value="qrcode" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            <span>QR Code Attendance</span>
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Clipboard className="h-4 w-4" />
            <span>Manual Attendance</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="qrcode">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                QR Code Attendance Management
              </CardTitle>
              <CardDescription>
                Manage QR code attendance endpoints, generate QR codes, and view attendance records.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link 
                href={`/organizer/events/${eventId}/attendance/log/byqrcode`}
                className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md inline-flex items-center gap-2"
              >
                <QrCode className="h-4 w-4" />
                Go to QR Code Attendance
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clipboard className="h-5 w-5" />
                Manual Attendance Entry
              </CardTitle>
              <CardDescription>
                Manually record attendance for contingents, teams, and contestants.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link 
                href={`/organizer/events/${eventId}/attendance/log/bymanual`}
                className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md inline-flex items-center gap-2"
              >
                <Clipboard className="h-4 w-4" />
                Go to Manual Attendance
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" />
              Attendance Dashboard
            </CardTitle>
            <CardDescription>
              View attendance statistics and analytics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              href={`/organizer/events/${eventId}/attendance/dashboard`}
              className="bg-secondary hover:bg-secondary/90 text-white px-4 py-2 rounded-md inline-flex items-center gap-2"
            >
              <CalendarCheck className="h-4 w-4" />
              View Dashboard
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Attendance Sections
            </CardTitle>
            <CardDescription>
              Manage attendance sections and assignments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              href={`/organizer/events/${eventId}/attendance/sections`}
              className="bg-secondary hover:bg-secondary/90 text-white px-4 py-2 rounded-md inline-flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Manage Sections
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

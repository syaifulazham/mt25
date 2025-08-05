"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  FileText,
  Download,
  Users,
  Calendar,
  Building,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { toast } from "@/components/ui/use-toast";

interface EventInfo {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

export default function ReportsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  useEffect(() => {
    fetchEventInfo();
  }, [eventId]);

  const fetchEventInfo = async () => {
    try {
      const response = await fetch(`/api/organizer/events/${eventId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch event info");
      }
      const data = await response.json();
      setEventInfo(data);
    } catch (error) {
      console.error("Error fetching event info:", error);
      toast({
        title: "Error",
        description: "Failed to load event information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEvent = () => {
    router.push(`/organizer/events/${eventId}`);
  };

  const handleDownloadReport = async (reportType: string) => {
    setGeneratingReport(reportType);
    
    try {
      let endpoint = "";
      let filename = "";
      
      switch (reportType) {
        case "endlist-full":
          endpoint = `/api/organizer/events/${eventId}/endlist/docx`;
          filename = `endlist-full-${eventInfo?.name?.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.docx`;
          break;
        case "endlist-basic":
          endpoint = `/api/organizer/events/${eventId}/reports/endlist-basic`;
          filename = `endlist-basic-${eventInfo?.name?.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.docx`;
          break;
        case "endlist-basic-xlsx":
          endpoint = `/api/organizer/events/${eventId}/reports/endlist-basic-xlsx`;
          filename = `endlist-basic-${eventInfo?.name?.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
          break;
        case "contingents-list":
          endpoint = `/api/organizer/events/${eventId}/reports/contingents-list`;
          filename = `contingents-list-${eventInfo?.name?.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.docx`;
          break;
        case "contingents-list-xlsx":
          endpoint = `/api/organizer/events/${eventId}/reports/contingents-list-xlsx`;
          filename = `contingents-list-${eventInfo?.name?.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
          break;
        case "competitions-overview-docx":
          endpoint = `/api/organizer/events/${eventId}/reports/competitions-overview-docx`;
          filename = `competitions-overview-${eventInfo?.name?.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.docx`;
          break;
        case "competitions-overview-xlsx":
          endpoint = `/api/organizer/events/${eventId}/reports/competitions-overview-xlsx`;
          filename = `competitions-overview-${eventInfo?.name?.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
          break;
        case "endlist-full-xlsx":
          endpoint = `/api/organizer/events/${eventId}/reports/endlist-full-xlsx`;
          filename = `endlist-full-${eventInfo?.name?.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
          break;
        default:
          throw new Error("Invalid report type");
      }

      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Report downloaded successfully",
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setGeneratingReport(null);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  if (!eventInfo) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h3 className="text-lg font-semibold">Event not found</h3>
            <p className="text-muted-foreground">The requested event could not be found.</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6 mx-4 md:mx-6 lg:mx-8">
        <PageHeader
          title="Event Reports"
          description={`Generate and download reports for ${eventInfo.name}`}
        >
          <Button
            variant="outline"
            onClick={handleBackToEvent}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Event
          </Button>
        </PageHeader>

        {/* Event Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Event Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Event Name</p>
                <p className="text-lg font-semibold">{eventInfo.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                <p className="text-lg">{format(new Date(eventInfo.startDate), "PPP")}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">End Date</p>
                <p className="text-lg">{format(new Date(eventInfo.endDate), "PPP")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Report 1: Full Endlist */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Full Endlist Report
              </CardTitle>
              <CardDescription>
                Complete participant list with all details including IC, phone, and email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>• Team information</p>
                  <p>• Participant names and details</p>
                  <p>• IC numbers</p>
                  <p>• Phone numbers and emails</p>
                  <p>• Class/Grade information</p>
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={() => handleDownloadReport("endlist-full")}
                    disabled={generatingReport === "endlist-full"}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {generatingReport === "endlist-full" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download DOCX
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleDownloadReport("endlist-full-xlsx")}
                    disabled={generatingReport === "endlist-full-xlsx"}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {generatingReport === "endlist-full-xlsx" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download XLSX
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report 2: Basic Endlist */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Basic Endlist Report
              </CardTitle>
              <CardDescription>
                Participant list without sensitive information (no IC, phone, email)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>• Team information</p>
                  <p>• Participant names</p>
                  <p>• Class/Grade information</p>
                  <p>• Age information</p>
                  <p>• No personal contact details</p>
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={() => handleDownloadReport("endlist-basic")}
                    disabled={generatingReport === "endlist-basic"}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {generatingReport === "endlist-basic" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download DOCX
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleDownloadReport("endlist-basic-xlsx")}
                    disabled={generatingReport === "endlist-basic-xlsx"}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {generatingReport === "endlist-basic-xlsx" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download XLSX
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report 3: Contingents List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Contingents List
              </CardTitle>
              <CardDescription>
                List of all contingents with state and PPD information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>• Contingent names</p>
                  <p>• State information</p>
                  <p>• PPD (for school contingents)</p>
                  <p>• Contingent types</p>
                  <p>• Institution details</p>
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={() => handleDownloadReport("contingents-list")}
                    disabled={generatingReport === "contingents-list" || generatingReport === "contingents-list-xlsx"}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {generatingReport === "contingents-list" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download DOCX
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleDownloadReport("contingents-list-xlsx")}
                    disabled={generatingReport === "contingents-list-xlsx" || generatingReport === "contingents-list"}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {generatingReport === "contingents-list-xlsx" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download XLSX
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report 4: Competitions Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Competitions Overview
              </CardTitle>
              <CardDescription>
                Summary of all competitions with participation statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>• Competition details by contest group</p>
                  <p>• Contingent participation counts</p>
                  <p>• Team and contestant statistics</p>
                  <p>• Grouped by state (for ZONE events)</p>
                </div>
                <div className="space-y-2">
                  <Link href={`/organizer/events/${eventId}/reports/competitions`} className="w-full block">
                    <Button className="w-full" variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </Link>
                  <Button
                    onClick={() => handleDownloadReport("competitions-overview-docx")}
                    disabled={generatingReport === "competitions-overview-docx"}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {generatingReport === "competitions-overview-docx" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download DOCX
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleDownloadReport("competitions-overview-xlsx")}
                    disabled={generatingReport === "competitions-overview-xlsx"}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {generatingReport === "competitions-overview-xlsx" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download XLSX
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>Report Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong>Full Endlist Report:</strong> Contains complete participant information including personal details. 
                Use this for internal administrative purposes.
              </p>
              <p>
                <strong>Basic Endlist Report:</strong> Contains participant information without sensitive personal data. 
                Suitable for sharing with external parties or public distribution.
              </p>
              <p>
                <strong>Contingents List:</strong> Provides an overview of all participating contingents with their 
                institutional affiliations and geographical information.
              </p>
              <p>
                <strong>Competitions Overview:</strong> Summarizes all competitions with participation statistics 
                grouped by contest group and state (for ZONE events). Shows contingent, team, and contestant counts 
                for each competition.
              </p>
              <p className="text-xs">
                All reports are generated in Microsoft Word (.docx) or Excel (.xlsx) format and include only approved and accepted teams.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

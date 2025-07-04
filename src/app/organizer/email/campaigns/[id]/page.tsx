import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeftIcon, CalendarIcon, Edit2Icon, Send, UsersIcon } from 'lucide-react';
import RecipientsList from './recipients';

export default async function CampaignDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  const campaignId = parseInt(params.id);

  // Define interfaces for campaign data types
  interface EmailTemplate {
    id: number;
    template_name: string;
  }

  interface EmailCampaign {
    id: number;
    campaign_name: string;
    description: string | null;
    status: string;
    template_id: number | null;
    template: EmailTemplate | null;
    created_at: Date;
    updated_at: Date;
    scheduled_datetime: Date | null;
    completed_datetime: Date | null;
    created_by: number | null;
    total_recipients: number;
    successful_sends: number;
    failed_sends: number;
    open_count: number;
    click_count: number;
  }

  interface EmailRecipient {
    id: number;
    campaign_id: number;
    email: string;
    name: string | null;
    source: string;
    status: string;
    sent_at: Date | null;
  }
  
  if (isNaN(campaignId)) {
    notFound();
  }
  
  // Fetch campaign with template and counts
  // @ts-ignore - Ignore the TypeScript error about email_campaign not existing on PrismaClient
  const campaign = await prisma.email_campaign.findUnique({
    where: { id: campaignId },
    include: {
      template: true,
      _count: {
        select: {
          recipients: true,
          outgoing_emails: true,
        },
      },
    },
  });
  
  if (!campaign) {
    notFound();
  }
  
  // Get recipient sources counts
  // @ts-ignore - Ignore the TypeScript error about email_recipient not existing on PrismaClient
  const recipientsBySource = await prisma.email_recipient.groupBy({
    by: ['source'],
    where: { campaign_id: campaignId },
    _count: { _all: true },
  });
  
  const recipientSourceMap: Record<string, number> = {};
  recipientsBySource.forEach((item: { source: string; _count: { _all: number } }) => {
    recipientSourceMap[item.source] = item._count._all;
  });
  
  // Helper function to get badge color based on status
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'DRAFT': return 'bg-gray-200 text-gray-800';
      case 'SCHEDULED': return 'bg-blue-200 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-200 text-yellow-800';
      case 'COMPLETED': return 'bg-green-200 text-green-800';
      case 'CANCELLED': return 'bg-red-200 text-red-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  // Determine if campaign is editable (not in progress or completed)
  const isEditable = !['IN_PROGRESS', 'COMPLETED'].includes(campaign.status);
  const canSend = ['DRAFT', 'SCHEDULED'].includes(campaign.status) && campaign._count.recipients > 0 && campaign.template_id !== null;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link href="/organizer/email/campaigns" className="flex items-center text-sm text-blue-600 hover:text-blue-800">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Campaigns
        </Link>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column - Campaign details */}
        <div className="lg:w-1/3 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl">{campaign.campaign_name}</CardTitle>
                <Badge className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaign.description && (
                  <p className="text-gray-600">{campaign.description}</p>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                    Created: {format(new Date(campaign.created_at), 'MMM d, yyyy')}
                  </div>
                  
                  {campaign.created_by_user && (
                    <div className="text-sm text-gray-600">
                      Created by: {campaign.created_by_user.name || campaign.created_by_user.email}
                    </div>
                  )}
                  
                  {campaign.scheduled_datetime && (
                    <div className="text-sm text-gray-600">
                      Scheduled: {format(new Date(campaign.scheduled_datetime), 'MMM d, yyyy HH:mm')}
                    </div>
                  )}
                  
                  {campaign.completed_at && (
                    <div className="text-sm text-gray-600">
                      Completed: {format(new Date(campaign.completed_at), 'MMM d, yyyy HH:mm')}
                    </div>
                  )}
                </div>
                
                <div className="pt-2 border-t">
                  <h3 className="font-medium mb-2">Recipients</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Total:</span> {campaign._count.recipients}
                    </div>
                    {Object.entries(recipientSourceMap).map(([source, count]) => (
                      <div key={source}>
                        <span className="text-gray-600">{source}:</span> {count}
                      </div>
                    ))}
                  </div>
                </div>
                
                {campaign.template && (
                  <div className="pt-2 border-t">
                    <h3 className="font-medium mb-2">Email Template</h3>
                    <div className="text-sm">
                      <Link href={`/organizer/email/templates/${campaign.template.id}`} className="text-blue-600 hover:underline">
                        {campaign.template.template_name}
                      </Link>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Subject: {campaign.template.subject}
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                  {isEditable && (
                    <Link href={`/organizer/email/campaigns/${campaign.id}/edit`} passHref>
                      <Button variant="outline" className="w-full sm:w-auto">
                        <Edit2Icon className="mr-2 h-4 w-4" />
                        Edit Campaign
                      </Button>
                    </Link>
                  )}
                  
                  {canSend && (
                    <Link href={`/organizer/email/campaigns/${campaign.id}/send`} passHref>
                      <Button className="w-full sm:w-auto">
                        <Send className="mr-2 h-4 w-4" />
                        Send Campaign
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right column - Recipients and other tabs */}
        <div className="lg:flex-1">
          <Tabs defaultValue="recipients">
            <TabsList>
              <TabsTrigger value="recipients">
                <UsersIcon className="h-4 w-4 mr-2" />
                Recipients
              </TabsTrigger>
              <TabsTrigger value="analytics">
                Analytics
              </TabsTrigger>
            </TabsList>
            <TabsContent value="recipients">
              <Card>
                <CardContent className="pt-6">
                  <RecipientsList campaignId={campaignId} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Email Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="text-sm text-gray-500">Sent</div>
                      <div className="text-2xl font-semibold">{campaign._count.outgoing_emails}</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="text-sm text-gray-500">Opened</div>
                      <div className="text-2xl font-semibold">{campaign.open_count || 0}</div>
                      {campaign._count.outgoing_emails > 0 && (
                        <div className="text-xs text-gray-500">
                          ({Math.round((campaign.open_count || 0) / campaign._count.outgoing_emails * 100)}%)
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="text-sm text-gray-500">Clicked</div>
                      <div className="text-2xl font-semibold">{campaign.click_count || 0}</div>
                      {campaign._count.outgoing_emails > 0 && (
                        <div className="text-xs text-gray-500">
                          ({Math.round((campaign.click_count || 0) / campaign._count.outgoing_emails * 100)}%)
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

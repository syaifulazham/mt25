import Link from 'next/link';
import { format } from 'date-fns';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, ChevronRightIcon, Edit2Icon, PlusIcon, SendIcon, TrashIcon, UsersIcon } from 'lucide-react';

export default async function EmailCampaignsPage() {
  const user = await getCurrentUser();
  
  // Define types for campaign data
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
    template: EmailTemplate | null;
    _count: {
      recipients: number;
      outgoing_emails: number;
    };
  }

  // Fetch all campaigns with template information and recipient counts
  // @ts-ignore - Using prisma.email_campaign until types are properly generated
  const campaigns = await prisma.email_campaign.findMany({
    include: {
      template: {
        select: {
          id: true,
          template_name: true,
        },
      },
      _count: {
        select: {
          recipients: true,
          outgoing_emails: true,
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
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

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Email Campaigns</h1>
        <Link href="/organizer/email/campaigns/new" passHref>
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>
      
      {campaigns.length === 0 ? (
        <div className="text-center py-12 border rounded-md bg-gray-50">
          <p className="text-lg text-gray-500 mb-4">No campaigns created yet</p>
          <Link href="/organizer/email/campaigns/new" passHref>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Create your first campaign
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign: EmailCampaign) => (
            <Card key={campaign.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{campaign.campaign_name}</CardTitle>
                    <CardDescription>
                      {campaign.description || 'No description'}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(campaign.status)}>
                    {campaign.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                    Created: {format(new Date(campaign.created_at), 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center text-sm">
                    <UsersIcon className="mr-2 h-4 w-4 text-gray-500" />
                    Recipients: {campaign._count.recipients}
                  </div>
                  {campaign.template && (
                    <div className="flex items-center text-sm text-gray-600">
                      Template: {campaign.template.template_name}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <Link href={`/organizer/email/campaigns/${campaign.id}/edit`} passHref>
                  <Button variant="outline" size="sm">
                    <Edit2Icon className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                </Link>
                <Link href={`/organizer/email/campaigns/${campaign.id}`} passHref>
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                    Details
                    <ChevronRightIcon className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateOrganizerApi } from '@/lib/auth';

// Mark route as dynamic since it uses request headers
export const dynamic = 'force-dynamic';

// GET handler for listing recipients in a campaign
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // @ts-ignore - Property 'error' access issue with authenticateOrganizerApi return type
  const { user, error } = await authenticateOrganizerApi(['ADMIN', 'OPERATOR']);
  
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  try {
    const campaignId = parseInt(params.id);
    
    // Check if campaign exists
    const campaign = await prisma.email_campaign.findUnique({
      where: { id: campaignId }
    });
    
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    
    // Parse pagination params
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    
    // Get search query if any
    const search = req.nextUrl.searchParams.get('search') || '';
    
    // Build where clause
    let whereClause: any = {
      campaign_id: campaignId
    };
    
    // Add search filter if provided
    if (search) {
      whereClause.OR = [
        { email: { contains: search } },
        { name: { contains: search } }
      ];
    }
    
    // Count total recipients matching criteria
    const totalCount = await prisma.email_recipient.count({
      where: whereClause
    });
    
    // Get paginated recipients
    const recipients = await prisma.email_recipient.findMany({
      where: whereClause,
      include: {
        outgoing_email: {
          select: {
            id: true,
            delivery_status: true,
            sent_at: true
          }
        }
      },
      skip,
      take: limit,
      orderBy: {
        id: 'desc'
      }
    });
    
    return NextResponse.json({
      recipients,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching campaign recipients:', err);
    return NextResponse.json({ error: 'Failed to fetch recipients' }, { status: 500 });
  }
}

// DELETE handler for removing recipients from a campaign
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await authenticateOrganizerApi(['ADMIN', 'OPERATOR']);
  
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  try {
    const campaignId = parseInt(params.id);
    
    // Check if campaign exists
    const campaign = await prisma.email_campaign.findUnique({
      where: { id: campaignId }
    });
    
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    
    // Get request body
    const data = await req.json();
    const { recipientIds } = data;
    
    if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return NextResponse.json({ error: 'No recipient IDs provided' }, { status: 400 });
    }
    
    // Count recipients to be deleted
    const countToDelete = await prisma.email_recipient.count({
      where: {
        id: { in: recipientIds },
        campaign_id: campaignId
      }
    });
    
    // Delete recipients
    await prisma.email_recipient.deleteMany({
      where: {
        id: { in: recipientIds },
        campaign_id: campaignId
      }
    });
    
    // Update campaign total_recipients count
    if (countToDelete > 0) {
      await prisma.email_campaign.update({
        where: { id: campaignId },
        data: {
          total_recipients: {
            decrement: countToDelete
          }
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      deleted: countToDelete
    });
  } catch (err) {
    console.error('Error deleting campaign recipients:', err);
    return NextResponse.json({ error: 'Failed to delete recipients' }, { status: 500 });
  }
}

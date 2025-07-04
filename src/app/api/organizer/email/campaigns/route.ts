import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateOrganizerApi } from '@/lib/auth';

// GET handler for listing all campaigns
export async function GET(req: NextRequest) {
  // @ts-ignore - Property 'error' access issue with authenticateOrganizerApi return type
  const { user, error } = await authenticateOrganizerApi(['ADMIN', 'OPERATOR']);
  
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  try {
    // Fetch all campaigns with their associated templates
    // @ts-ignore - email_campaign not recognized on PrismaClient type
    const campaigns = await prisma.email_campaign.findMany({
      include: {
        template: {
          select: {
            id: true,
            template_name: true,
            subject: true,
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
    
    return NextResponse.json(campaigns);
  } catch (err) {
    console.error('Error fetching email campaigns:', err);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

// POST handler for creating a new campaign
export async function POST(req: NextRequest) {
  // @ts-ignore - Property 'error' access issue with authenticateOrganizerApi return type
  const { user, error } = await authenticateOrganizerApi(['ADMIN', 'OPERATOR']);
  
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  try {
    const data = await req.json();
    const { campaign_name, description, template_id } = data;
    
    if (!campaign_name) {
      return NextResponse.json({ error: 'Campaign name is required' }, { status: 400 });
    }
    
    // Create the campaign
    // @ts-ignore - email_campaign not recognized on PrismaClient type
    const campaign = await prisma.email_campaign.create({
      data: {
        campaign_name,
        description,
        template_id: template_id ? parseInt(template_id) : null,
        status: 'DRAFT',
        created_by: user.id ? Number(user.id) : null,
      },
    });
    
    return NextResponse.json(campaign, { status: 201 });
  } catch (err) {
    console.error('Error creating email campaign:', err);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}

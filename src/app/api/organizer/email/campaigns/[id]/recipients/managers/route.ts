import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateOrganizerApi } from '@/lib/auth';

// POST handler for collecting emails from manager table
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
    const { filters } = data;
    
    // Build query based on filters
    let whereClause: any = {
      // Only include managers with email addresses
      email: { not: null }
    };
    
    // Apply optional filters if provided
    if (filters) {
      // Filter by creator/participant if provided
      if (filters.createdBy && filters.createdBy.length > 0) {
        whereClause.createdBy = {
          in: filters.createdBy
        };
      }
      
      // Filter by teams if provided
      if (filters.teamIds && filters.teamIds.length > 0) {
        whereClause.teams = {
          some: {
            teamId: {
              in: filters.teamIds
            }
          }
        };
      }
    }
    
    // Query managers based on filters
    const managers = await prisma.manager.findMany({
      where: whereClause,
      include: {
        creator: {
          select: {
            name: true
          }
        },
        teams: {
          include: {
            team: {
              select: {
                name: true,
                contest: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    // Get existing recipients for this campaign to avoid duplicates
    const existingRecipients = await prisma.email_recipient.findMany({
      where: { campaign_id: campaignId },
      select: { email: true }
    });
    
    const existingEmails = new Set(existingRecipients.map(r => r.email.toLowerCase()));
    
    // Prepare data for batch insert
    const recipients = [];
    
    for (const manager of managers) {
      if (!manager.email) continue;
      
      const email = manager.email.toLowerCase();
      
      // Skip if email already exists in campaign
      if (existingEmails.has(email)) {
        continue;
      }
      
      existingEmails.add(email);
      
      // Get first team name and contest name for placeholders
      const firstTeam = manager.teams[0]?.team;
      const teamName = firstTeam?.name || '';
      const contestName = firstTeam?.contest?.name || '';
      
      recipients.push({
        campaign_id: campaignId,
        email: email,
        name: manager.name,
        source: 'MANAGER',
        source_id: manager.id,
        placeholders: {
          name: manager.name,
          ic: manager.ic || '',
          team: teamName,
          contest: contestName,
          created_by: manager.creator?.name || ''
        }
      });
    }
    
    // Save recipients to database
    if (recipients.length > 0) {
      await prisma.email_recipient.createMany({
        data: recipients
      });
      
      // Update campaign total_recipients count
      await prisma.email_campaign.update({
        where: { id: campaignId },
        data: {
          total_recipients: {
            increment: recipients.length
          }
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      added: recipients.length,
      skipped: managers.length - recipients.length,
      total: managers.length
    });
  } catch (err) {
    console.error('Error collecting manager emails:', err);
    return NextResponse.json({ error: 'Failed to collect manager emails' }, { status: 500 });
  }
}

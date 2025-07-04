import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateOrganizerApi } from '@/lib/auth';

// POST handler for collecting emails from participant table
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
      // Only include participants with non-empty email addresses
      email: {
        not: ""
      }
    };
    
    // Apply optional filters if provided
    if (filters) {
      // Filter by states if provided
      if (filters.stateIds && filters.stateIds.length > 0) {
        whereClause.stateId = {
          in: filters.stateIds
        };
      }
      
      // Filter by higher institution if provided
      if (filters.higherInstIds && filters.higherInstIds.length > 0) {
        whereClause.higherInstId = {
          in: filters.higherInstIds
        };
      }
      
      // Filter by role if provided
      if (filters.roles && filters.roles.length > 0) {
        whereClause.role = {
          in: filters.roles
        };
      }
    }
    
    // Query participants based on filters
    const participants = await prisma.user_participant.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        // No direct state field exists, using higherInstitution instead
        higherInstitution: {
          select: {
            name: true
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
    
    for (const participant of participants) {
      if (!participant.email) continue;
      
      const email = participant.email.toLowerCase();
      
      // Skip if email already exists in campaign
      if (existingEmails.has(email)) {
        continue;
      }
      
      existingEmails.add(email);
      
      recipients.push({
        campaign_id: campaignId,
        email: email,
        name: participant.name,
        source: 'PARTICIPANT',
        source_id: participant.id,
        placeholders: {
          name: participant.name,
          institution: participant.higherInstitution?.name || ''
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
      skipped: participants.length - recipients.length,
      total: participants.length
    });
  } catch (err) {
    console.error('Error collecting participant emails:', err);
    return NextResponse.json({ error: 'Failed to collect participant emails' }, { status: 500 });
  }
}

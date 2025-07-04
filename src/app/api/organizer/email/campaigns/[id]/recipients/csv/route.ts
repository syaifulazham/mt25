import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateOrganizerApi } from '@/lib/auth';
import { parse } from 'csv-parse/sync';

// POST handler for uploading CSV of recipients
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
    
    // Get form data from request
    const formData = await req.formData();
    const csvFile = formData.get('file') as File;
    
    if (!csvFile) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    // Read the CSV file
    const csvText = await csvFile.text();
    
    // Parse CSV
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    if (!records.length) {
      return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 });
    }
    
    // Validate required fields
    const missingEmails = records.filter((record: any) => !record.email);
    if (missingEmails.length > 0) {
      return NextResponse.json({ 
        error: 'Some rows are missing email addresses', 
        details: missingEmails 
      }, { status: 400 });
    }
    
    // Create recipients from CSV data
    const recipients = [];
    
    // First, get all existing emails for this campaign to avoid duplicates
    const existingRecipients = await prisma.email_recipient.findMany({
      where: { campaign_id: campaignId },
      select: { email: true }
    });
    const existingEmails = new Set(existingRecipients.map(r => r.email.toLowerCase()));
    
    // Process records for insertion
    for (const record of records) {
      const email = record.email.toLowerCase();
      
      // Skip duplicates
      if (existingEmails.has(email)) {
        continue;
      }
      
      // Extract name and add to Set of emails being processed
      const name = record.name || null;
      existingEmails.add(email);
      
      // Create placeholders object from remaining columns
      const placeholders = { ...record };
      delete placeholders.email;
      delete placeholders.name;
      
      recipients.push({
        campaign_id: campaignId,
        email: email,
        name: name,
        source: 'CSV',
        placeholders: Object.keys(placeholders).length > 0 ? placeholders : null
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
      skipped: records.length - recipients.length,
      total: records.length
    });
  } catch (err) {
    console.error('Error processing CSV recipients:', err);
    return NextResponse.json({ error: 'Failed to process CSV file' }, { status: 500 });
  }
}

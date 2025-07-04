import nodemailer from 'nodemailer';
import { prisma } from './db';
import { processEmailForSending } from './email-tracking';

// Configuration for SMTP transport
const getSmtpConfig = () => {
  // Check for required SMTP configuration variables
  if (process.env.SMTP_SERVICE) {
    // If using a service like Gmail, Outlook, etc.
    return {
      service: process.env.SMTP_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    };
  } else if (process.env.SMTP_HOST) {
    // If using a custom SMTP server
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    };
  }
  
  // If no SMTP configuration is found
  return null;
};

// Create a transporter instance once
let transporter: nodemailer.Transporter | null = null;

// Initialize the transporter if needed
const initializeTransporter = () => {
  if (transporter) return transporter;
  
  const smtpConfig = getSmtpConfig();
  if (!smtpConfig) return null;
  
  transporter = nodemailer.createTransport(smtpConfig);
  return transporter;
};

// Function to check if SMTP is configured
export const getSmtpStatus = async () => {
  try {
    const config = getSmtpConfig();
    if (!config) return { configured: false, status: 'Not Configured' };
    
    const transport = initializeTransporter();
    if (!transport) return { configured: false, status: 'Configuration Error' };
    
    // Test the connection
    await transport.verify();
    
    return { 
      configured: true, 
      status: 'Ready',
      service: process.env.SMTP_SERVICE || null,
      host: process.env.SMTP_HOST || null,
      port: process.env.SMTP_PORT || null,
      user: process.env.EMAIL_USER || null 
    };
  } catch (error) {
    console.error('SMTP verification error:', error);
    return { 
      configured: false, 
      status: 'Connection Error',
      error: (error as Error).message 
    };
  }
};

// Main function to send an email
export const sendMail = async ({
  to,
  subject,
  html,
  text,
  from = process.env.EMAIL_FROM || process.env.EMAIL_USER,
  attachments = [],
  trackingId = null, // For tracking opens and clicks
  outgoingEmailId = null // For updating status in database
}: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  attachments?: any[];
  trackingId?: string | null;
  outgoingEmailId?: number | null;
}) => {
  try {
    const transport = initializeTransporter();
    if (!transport) {
      throw new Error('SMTP not configured');
    }
    
    // Process email content with tracking if trackingId is provided
    let htmlContent = html || '';
    if (trackingId && html) {
      // Import dynamically to avoid circular dependencies
      const { prepareEmailContent } = await import('./email-tracking');
      htmlContent = prepareEmailContent(html, trackingId);
    }
    
    // Send the email
    const info = await transport.sendMail({
      from,
      to,
      subject,
      text: text || '',
      html: htmlContent,
      attachments
    });
    
    // Update outgoing email status in database if ID is provided
    if (outgoingEmailId) {
      await prisma.email_outgoing.update({
        where: { id: outgoingEmailId },
        data: {
          delivery_status: 'SENT',
          sent_at: new Date(),
          message_id: info.messageId || null
        }
      });
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending error:', error);
    
    // Update outgoing email status in database if ID is provided
    if (outgoingEmailId) {
      await prisma.email_outgoing.update({
        where: { id: outgoingEmailId },
        data: {
          delivery_status: 'FAILED',
          error_message: (error as Error).message
        }
      });
    }
    
    return { success: false, error: (error as Error).message };
  }
};

// Process and send emails for a campaign batch
export const sendCampaignBatch = async (campaignId: number, batchSize = 50) => {
  try {
    // Get campaign with template
    const campaign = await prisma.email_campaign.findUnique({
      where: { id: campaignId },
      include: { template: true }
    });
    
    if (!campaign || !campaign.template) {
      throw new Error('Campaign or template not found');
    }
    
    // Update campaign status to IN_PROGRESS if it's not already
    if (campaign.status !== 'IN_PROGRESS') {
      await prisma.email_campaign.update({
        where: { id: campaignId },
        data: { status: 'IN_PROGRESS' }
      });
    }
    
    // Get recipients with queued status
    const queuedRecipients = await prisma.email_recipient.findMany({
      where: {
        campaign_id: campaignId,
        status: 'QUEUED'
      },
      take: batchSize
    });
    
    if (queuedRecipients.length === 0) {
      // If no more queued recipients, check if all recipients are processed
      const pendingCount = await prisma.email_recipient.count({
        where: {
          campaign_id: campaignId,
          status: { in: ['QUEUED', 'PENDING'] }
        }
      });
      
      // If no more pending recipients, mark campaign as completed
      if (pendingCount === 0) {
        await prisma.email_campaign.update({
          where: { id: campaignId },
          data: { 
            status: 'COMPLETED',
            completed_at: new Date()
          }
        });
      }
      
      return { success: true, processed: 0, message: 'No more recipients to process' };
    }
    
    // Process each recipient in the batch
    for (const recipient of queuedRecipients) {
      // Create a tracking ID
      const trackingId = `${campaignId}-${recipient.id}-${Date.now()}`;
      
      // Create an outgoing email record
      const { subject, content } = processEmailForSending(
        campaign.template,
        recipient,
        trackingId
      );
      
      const outgoingEmail = await prisma.email_outgoing.create({
        data: {
          campaign_id: campaignId,
          recipient_id: recipient.id,
          template_id: campaign.template.id,
          recipient_email: recipient.email,
          subject,
          content,
          tracking_id: trackingId,
          delivery_status: 'PENDING'
        }
      });
      
      // Send the email
      await sendMail({
        to: recipient.email,
        subject,
        html: content,
        trackingId,
        outgoingEmailId: outgoingEmail.id
      });
      
      // Update recipient status
      await prisma.email_recipient.update({
        where: { id: recipient.id },
        data: { status: 'SENT' }
      });
    }
    
    // Return success information
    return {
      success: true,
      processed: queuedRecipients.length,
      remaining: await prisma.email_recipient.count({
        where: {
          campaign_id: campaignId,
          status: { in: ['QUEUED', 'PENDING'] }
        }
      })
    };
  } catch (error) {
    console.error('Error processing campaign batch:', error);
    return { success: false, error: (error as Error).message };
  }
};

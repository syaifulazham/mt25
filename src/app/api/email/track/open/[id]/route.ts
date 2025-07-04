import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET handler for tracking email opens via tracking pixel
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const trackingId = params.id;
    
    if (!trackingId) {
      // Return a transparent 1x1 pixel GIF even if tracking fails
      return new NextResponse(Buffer.from('R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=', 'base64'), {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }
    
    // Find the email with this tracking ID
    const email = await prisma.email_outgoing.findFirst({
      where: { tracking_id: trackingId }
    });
    
    if (email) {
      // Update email with open information
      await prisma.email_outgoing.update({
        where: { id: email.id },
        data: {
          opened: true,
          opened_at: email.opened_at || new Date(), // Only update if not already tracked
          open_count: {
            increment: 1
          }
        }
      });
      
      // Also update campaign stats if this email has a campaign
      if (email.campaign_id) {
        await prisma.email_campaign.update({
          where: { id: email.campaign_id },
          data: {
            open_count: {
              increment: 1
            }
          }
        });
      }
    }
    
    // Return a transparent 1x1 pixel GIF
    return new NextResponse(Buffer.from('R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=', 'base64'), {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error tracking email open:', error);
    
    // Still return a pixel even if tracking fails
    return new NextResponse(Buffer.from('R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=', 'base64'), {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}

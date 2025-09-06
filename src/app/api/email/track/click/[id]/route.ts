import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Mark route as dynamic since it uses request headers
export const dynamic = 'force-dynamic';

// GET handler for tracking email link clicks
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const trackingId = params.id;
    const destination = req.nextUrl.searchParams.get('url');
    
    if (!trackingId || !destination) {
      return NextResponse.redirect(destination || '/');
    }
    
    // Find the email with this tracking ID
    const email = await prisma.email_outgoing.findFirst({
      where: { tracking_id: trackingId }
    });
    
    if (email) {
      // Update email with click information
      await prisma.email_outgoing.update({
        where: { id: email.id },
        data: {
          clicked: true,
          clicked_at: email.clicked_at || new Date(), // Only update first click time if not set
          click_count: {
            increment: 1
          }
        }
      });
      
      // Also update campaign stats if this email has a campaign
      if (email.campaign_id) {
        await prisma.email_campaign.update({
          where: { id: email.campaign_id },
          data: {
            click_count: {
              increment: 1
            }
          }
        });
      }
    }
    
    // Redirect to the original destination URL
    return NextResponse.redirect(destination);
  } catch (error) {
    console.error('Error tracking email click:', error);
    
    // Redirect to the destination URL even if tracking fails
    const destination = req.nextUrl.searchParams.get('url') || '/';
    return NextResponse.redirect(destination);
  }
}

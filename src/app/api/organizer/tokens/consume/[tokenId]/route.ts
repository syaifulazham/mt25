import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { sendTokenEmail } from '@/lib/email-utils';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { tokenId } = params;
  const { emailedTo } = await req.json();
  const prisma = new PrismaClient();

  try {
    // First, retrieve the token to get its value using raw SQL
    const tokens = await prisma.$queryRaw<{id: number, eventToken: string, consumed: boolean}[]>`
      SELECT id, eventToken, consumed
      FROM eventcontesttoken
      WHERE id = ${parseInt(tokenId)}
      LIMIT 1
    `;
    
    const token = tokens[0];
    
    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }
    
    // Send the email
    const emailSent = await sendTokenEmail({
      to: emailedTo,
      token: token.eventToken
    });
    
    if (!emailSent) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
    
    // Update the token to store the email address using raw SQL (without marking as consumed)
    await prisma.$executeRaw`
      UPDATE eventcontesttoken
      SET emailedTo = ${emailedTo}
      WHERE id = ${parseInt(tokenId)}
    `;
    
    // Get the updated token
    const updatedTokens = await prisma.$queryRaw<{id: number, eventToken: string, consumed: boolean, emailedTo: string}[]>`
      SELECT id, eventToken, consumed, emailedTo
      FROM eventcontesttoken
      WHERE id = ${parseInt(tokenId)}
      LIMIT 1
    `;
    
    const updatedToken = updatedTokens[0];

    return NextResponse.json(updatedToken);
  } catch (error) {
    console.error('Error processing token email:', error);
    return NextResponse.json(
      { error: 'Failed to process token email request' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

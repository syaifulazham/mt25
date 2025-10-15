import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';
import { CertificateSerialService } from '@/lib/services/certificate-serial-service';

// Allowed roles for viewing serial number statistics
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR'];

/**
 * GET /api/certificates/serial-stats
 * Get statistics for certificate serial number generation
 * Query params:
 * - year: Year to get stats for (defaults to current year)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user using NextAuth
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and has required role
    if (!session?.user || !session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;

    // Get serial number statistics
    const stats = await CertificateSerialService.getSerialStats(year);

    return NextResponse.json({ 
      stats,
      year: year || new Date().getFullYear()
    });
  } catch (error) {
    console.error('Failed to fetch serial stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch serial statistics' },
      { status: 500 }
    );
  }
}

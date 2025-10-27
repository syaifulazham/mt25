import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';
import { CertificateService } from '@/lib/services/certificate-service';

// Allowed roles for certificate access
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR', 'VIEWER'];

/**
 * GET /api/certificates
 * List certificates with pagination and filters
 */
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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
    const queryParams = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10,
      search: searchParams.get('search'),
      templateId: searchParams.get('templateId') ? parseInt(searchParams.get('templateId')!) : undefined,
      status: searchParams.get('status'),
      recipientType: searchParams.get('recipientType'),
      targetType: searchParams.get('targetType'),
    };

    // Fetch certificates
    const result = await CertificateService.listCertificates(queryParams);

    // Format certificates to include template data at the top level
    const formattedCertificates = result.certificates.map((cert: any) => ({
      ...cert,
      templateName: cert.template?.templateName || 'Unknown Template',
      templateTargetType: cert.template?.targetType
    }));

    return NextResponse.json({
      certificates: formattedCertificates,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Failed to fetch certificates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch certificates' },
      { status: 500 }
    );
  }
}

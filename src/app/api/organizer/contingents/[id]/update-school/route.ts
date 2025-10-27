import { NextRequest, NextResponse } from 'next/server';
import { prismaExecute } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    
    // If not authenticated or not ADMIN, return 401/403
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get contingent ID from URL params
    const contingentId = parseInt(params.id);
    
    if (isNaN(contingentId)) {
      return NextResponse.json({ message: 'Invalid contingent ID' }, { status: 400 });
    }

    // Get new schoolId from request body
    const body = await req.json();
    const { schoolId } = body;

    if (!schoolId || typeof schoolId !== 'number') {
      return NextResponse.json({ message: 'Invalid school ID' }, { status: 400 });
    }

    // Verify contingent exists and is of type SCHOOL
    const contingent = await prismaExecute(prisma => 
      prisma.contingent.findUnique({
        where: { id: contingentId },
        select: { contingentType: true }
      })
    );

    if (!contingent) {
      return NextResponse.json({ message: 'Contingent not found' }, { status: 404 });
    }

    if (contingent.contingentType !== 'SCHOOL') {
      return NextResponse.json(
        { message: 'Cannot update school for non-school contingent' }, 
        { status: 400 }
      );
    }

    // Verify the school exists
    const schoolExists = await prismaExecute(prisma => 
      prisma.school.findUnique({
        where: { id: schoolId },
        select: { id: true }
      })
    );

    if (!schoolExists) {
      return NextResponse.json({ message: 'School not found' }, { status: 404 });
    }

    // Update the contingent's schoolId
    const updatedContingent = await prismaExecute(prisma => 
      prisma.contingent.update({
        where: { id: contingentId },
        data: { 
          schoolId,
          // Set other institution IDs to null to maintain data consistency
          higherInstId: null,
          independentId: null
        }
      })
    );

    // Log the change for audit purposes
    console.log(`[AUDIT] Admin ${session.user.email} changed contingent ${contingentId} school to ID ${schoolId}`);

    return NextResponse.json({
      message: 'School updated successfully',
      contingent: {
        id: updatedContingent.id,
        schoolId: updatedContingent.schoolId
      }
    });
  } catch (error) {
    console.error('Error updating contingent school:', error);
    return NextResponse.json(
      { message: 'Failed to update contingent school' },
      { status: 500 }
    );
  }
}
